/**
 * Blog / articles for the GPR site and companypension.de.
 *
 * Public (mounted at /api/blog, no auth, exempt from the rate limiter):
 *   GET /:site/posts?lang=en|de   published posts, newest first
 *   GET /:site/posts/:slug        one published post in render format
 *   GET /images/:name             an uploaded blog image (long cache)
 *
 * Admin (mounted at /api/admin/blog, auth + admin):
 *   GET    /?site=&status=        all posts with SEO score
 *   POST   /validate              { post, id? } → SEO report + preview
 *   POST   /                      create a draft
 *   GET    /:id                   post + SEO report + preview
 *   PUT    /:id                   save (a published post must stay valid)
 *   DELETE /:id                   delete
 *   POST   /:id/publish           { publishedAt? } — refused on SEO errors
 *   POST   /:id/unpublish         back to draft
 *   POST   /images                multipart `file` → { url }
 */
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateUuidParams } from '../middleware/validate-uuid';
import { env } from '../utils/env';
import { logger, toErrorMeta } from '../utils/logger';
import {
  BlogError,
  BlogService,
  blogPostInputSchema,
  type Actor,
} from '../services/blog';
import {
  BLOG_LANGS,
  BLOG_SITES,
  type BlogSite,
} from '../services/blog/content';

function fail(c: Context, error: unknown, label: string) {
  if (error instanceof BlogError) {
    return c.json(
      {
        success: false,
        error: error.message,
        ...(error.report ? { seo: error.report } : {}),
      },
      error.status
    );
  }
  logger.error(`[Blog] ${label} failed`, toErrorMeta(error));
  return c.json({ success: false, error: `${label} failed` }, 500);
}

const siteParam = (c: Context): BlogSite | null => {
  const site = c.req.param('site');
  return (BLOG_SITES as readonly string[]).includes(site ?? '')
    ? (site as BlogSite)
    : null;
};

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

const blog = new Hono();

blog.get('/images/:name', async (c) => {
  try {
    const { body, type } = await BlogService.readImage(c.req.param('name'));
    return c.body(new Uint8Array(body), 200, {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  } catch (error) {
    return fail(c, error, 'Loading the image');
  }
});

blog.get('/:site/posts', async (c) => {
  const site = siteParam(c);
  if (!site) return c.json({ success: false, error: 'Not found' }, 404);
  const lang = c.req.query('lang');
  try {
    const posts = await BlogService.listPublished(
      site,
      lang && (BLOG_LANGS as readonly string[]).includes(lang)
        ? lang
        : undefined
    );
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ success: true, posts });
  } catch (error) {
    return fail(c, error, 'Loading posts');
  }
});

blog.get('/:site/posts/:slug', async (c) => {
  const site = siteParam(c);
  if (!site) return c.json({ success: false, error: 'Not found' }, 404);
  try {
    const post = await BlogService.getPublished(site, c.req.param('slug'));
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ success: true, post });
  } catch (error) {
    return fail(c, error, 'Loading the post');
  }
});

export default blog;

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminBlog = new Hono();
adminBlog.use('*', authMiddleware, requireRole('admin'));

const actorOf = (c: Context): Actor => {
  const fwd = c.req.header('x-forwarded-for');
  return {
    id: (c.get('user') as { id: string }).id,
    ipAddress: fwd?.split(',')[0]?.trim() || c.req.header('x-real-ip') || null,
    userAgent: c.req.header('user-agent') ?? null,
  };
};

async function parsePost(c: Context) {
  return blogPostInputSchema.safeParse(await c.req.json().catch(() => ({})));
}

const invalid = (c: Context, error: z.ZodError) =>
  c.json(
    {
      success: false,
      error: 'Invalid post',
      issues: error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    400
  );

const withPreview = (result: Awaited<ReturnType<typeof BlogService.get>>) => ({
  success: true,
  post: result.post,
  seo: result.seo,
  preview: BlogService.render(result.post),
});

adminBlog.get('/', async (c) => {
  const site = c.req.query('site');
  const status = c.req.query('status');
  try {
    const posts = await BlogService.listAdmin({
      site: (BLOG_SITES as readonly string[]).includes(site ?? '')
        ? (site as BlogSite)
        : undefined,
      status: status === 'draft' || status === 'published' ? status : undefined,
    });
    return c.json({ success: true, posts });
  } catch (error) {
    return fail(c, error, 'Loading posts');
  }
});

const validateSchema = z.object({
  id: z.string().uuid().optional(),
  post: blogPostInputSchema,
});

adminBlog.post('/validate', async (c) => {
  const parsed = validateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return invalid(c, parsed.error);
  try {
    const seo = await BlogService.validate(parsed.data.post, parsed.data.id);
    const now = new Date();
    const preview = BlogService.render({
      id: parsed.data.id ?? '00000000-0000-0000-0000-000000000000',
      status: 'draft',
      publishedAt: null,
      createdBy: null,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      ...parsed.data.post,
    });
    return c.json({ success: true, seo, preview });
  } catch (error) {
    return fail(c, error, 'Checking the post');
  }
});

adminBlog.post('/images', async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    const { name } = await BlogService.uploadImage(file, actorOf(c));
    const origin = (env.PUBLIC_API_URL || new URL(c.req.url).origin).replace(
      /\/$/,
      ''
    );
    return c.json(
      { success: true, url: `${origin}/api/blog/images/${name}` },
      201
    );
  } catch (error) {
    return fail(c, error, 'Uploading the image');
  }
});

adminBlog.post('/', async (c) => {
  const parsed = await parsePost(c);
  if (!parsed.success) return invalid(c, parsed.error);
  try {
    return c.json(
      withPreview(await BlogService.create(parsed.data, actorOf(c))),
      201
    );
  } catch (error) {
    return fail(c, error, 'Creating the post');
  }
});

adminBlog.get('/:id', validateUuidParams('id'), async (c) => {
  try {
    return c.json(
      withPreview(await BlogService.get(c.req.param('id') as string))
    );
  } catch (error) {
    return fail(c, error, 'Loading the post');
  }
});

adminBlog.put('/:id', validateUuidParams('id'), async (c) => {
  const parsed = await parsePost(c);
  if (!parsed.success) return invalid(c, parsed.error);
  try {
    return c.json(
      withPreview(
        await BlogService.update(
          c.req.param('id') as string,
          parsed.data,
          actorOf(c)
        )
      )
    );
  } catch (error) {
    return fail(c, error, 'Saving the post');
  }
});

adminBlog.delete('/:id', validateUuidParams('id'), async (c) => {
  try {
    await BlogService.remove(c.req.param('id') as string, actorOf(c));
    return c.json({ success: true });
  } catch (error) {
    return fail(c, error, 'Deleting the post');
  }
});

const publishSchema = z.object({
  publishedAt: z.string().datetime({ offset: true }).optional(),
});

adminBlog.post('/:id/publish', validateUuidParams('id'), async (c) => {
  const parsed = publishSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return invalid(c, parsed.error);
  try {
    return c.json(
      withPreview(
        await BlogService.publish(
          c.req.param('id') as string,
          actorOf(c),
          parsed.data.publishedAt
            ? new Date(parsed.data.publishedAt)
            : undefined
        )
      )
    );
  } catch (error) {
    return fail(c, error, 'Publishing the post');
  }
});

adminBlog.post('/:id/unpublish', validateUuidParams('id'), async (c) => {
  try {
    return c.json(
      withPreview(
        await BlogService.unpublish(c.req.param('id') as string, actorOf(c))
      )
    );
  } catch (error) {
    return fail(c, error, 'Unpublishing the post');
  }
});
