/**
 * Blog posts for the GPR site and companypension.de: admin CRUD with SEO
 * validation (seo.ts) and the public read API used by both sites.
 */
import { randomUUID } from 'crypto';
import { and, desc, eq, lte, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../utils/db';
import { auditLogs } from '../../drizzle/schema/shared';
import { blogPosts, type BlogPostRow } from '../../drizzle/schema/blog';
import { downloadFile, uploadFile } from '../../utils/s3';
import {
  BLOG_LANGS,
  BLOG_SITES,
  blogBlockSchema,
  blogCtaSchema,
  blogFaqItemSchema,
  countWords,
  postPath,
  renderBlocks,
  renderFaq,
  type BlogSite,
  type RenderedBlock,
  type RenderedFaqItem,
} from './content';
import { validatePost, type SeoReport } from './seo';

export class BlogError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 | 422,
    public report?: SeoReport
  ) {
    super(message);
  }
}

export interface Actor {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

/** Editable fields; status changes go through publish / unpublish. */
export const blogPostInputSchema = z.object({
  site: z.enum(BLOG_SITES),
  lang: z.enum(BLOG_LANGS).default('en'),
  slug: z.string().trim().max(120),
  title: z.string().trim().max(200),
  seoTitle: optionalText(200),
  metaDescription: optionalText(400),
  excerpt: optionalText(400),
  focusKeyword: optionalText(100),
  coverImageUrl: optionalText(2000),
  coverImageAlt: optionalText(250),
  authorName: optionalText(120),
  canonicalUrl: optionalText(2000),
  noindex: z.boolean().default(false),
  blocks: z.array(blogBlockSchema).max(400).default([]),
  faq: z.array(blogFaqItemSchema).max(50).default([]),
  ctas: z.array(blogCtaSchema).max(5).default([]),
});
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export interface BlogPostSummary {
  id: string;
  site: BlogSite;
  lang: string;
  slug: string;
  path: string;
  title: string;
  status: string;
  /** published + publishedAt in the future. */
  scheduled: boolean;
  publishedAt: string | null;
  updatedAt: string;
  seoScore: number;
  seoErrors: number;
  wordCount: number;
}

export interface PublicPostSummary {
  slug: string;
  path: string;
  lang: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string | null;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
}

export interface PublicPost extends PublicPostSummary {
  site: BlogSite;
  seoTitle: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  blocks: RenderedBlock[];
  faq: RenderedFaqItem[];
  ctas: { label: string; href: string }[];
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const readingMinutes = (row: BlogPostRow) =>
  Math.max(1, Math.round(countWords(row.blocks, row.faq) / 220));

function toInput(row: BlogPostRow): BlogPostInput {
  return {
    site: row.site as BlogSite,
    lang: row.lang as BlogPostInput['lang'],
    slug: row.slug,
    title: row.title,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    excerpt: row.excerpt,
    focusKeyword: row.focusKeyword,
    coverImageUrl: row.coverImageUrl,
    coverImageAlt: row.coverImageAlt,
    authorName: row.authorName,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    blocks: row.blocks,
    faq: row.faq,
    ctas: row.ctas,
  };
}

async function siblings(site: BlogSite, excludeId?: string) {
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      seoTitle: blogPosts.seoTitle,
    })
    .from(blogPosts)
    .where(
      excludeId
        ? and(eq(blogPosts.site, site), ne(blogPosts.id, excludeId))
        : eq(blogPosts.site, site)
    );
  return rows.map((r) => ({ slug: r.slug, seoTitle: r.seoTitle || r.title }));
}

const isUniqueViolation = (error: unknown) =>
  /duplicate key|unique/i.test(error instanceof Error ? error.message : '');

async function audit(
  actor: Actor,
  action: string,
  postId: string,
  details: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    userId: actor.id,
    action,
    resource: 'blog_post',
    resourceId: postId,
    details,
    ipAddress: actor.ipAddress ?? null,
    userAgent: actor.userAgent ?? null,
  });
}

export const BLOG_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$/;

export const BlogService = {
  async validate(input: BlogPostInput, excludeId?: string) {
    return validatePost(input, {
      siblings: await siblings(input.site, excludeId),
    });
  },

  async listAdmin(filter: {
    site?: BlogSite;
    status?: string;
  }): Promise<BlogPostSummary[]> {
    const conditions = [
      filter.site ? eq(blogPosts.site, filter.site) : undefined,
      filter.status ? eq(blogPosts.status, filter.status) : undefined,
    ].filter(Boolean);
    const rows = await db
      .select()
      .from(blogPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(blogPosts.updatedAt));
    const all = await db
      .select({
        id: blogPosts.id,
        site: blogPosts.site,
        slug: blogPosts.slug,
        title: blogPosts.title,
        seoTitle: blogPosts.seoTitle,
      })
      .from(blogPosts);
    const now = Date.now();
    return rows.map((row) => {
      const report = validatePost(toInput(row), {
        siblings: all
          .filter((p) => p.site === row.site && p.id !== row.id)
          .map((p) => ({ slug: p.slug, seoTitle: p.seoTitle || p.title })),
      });
      return {
        id: row.id,
        site: row.site as BlogSite,
        lang: row.lang,
        slug: row.slug,
        path: postPath(row.site as BlogSite, row.slug),
        title: row.title,
        status: row.status,
        scheduled:
          row.status === 'published' &&
          !!row.publishedAt &&
          row.publishedAt.getTime() > now,
        publishedAt: iso(row.publishedAt),
        updatedAt: row.updatedAt.toISOString(),
        seoScore: report.score,
        seoErrors: report.checks.filter((c) => c.level === 'error').length,
        wordCount: report.wordCount,
      };
    });
  },

  async get(id: string) {
    const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!row) throw new BlogError('Post not found', 404);
    return { post: row, seo: await this.validate(toInput(row), id) };
  },

  async create(input: BlogPostInput, actor: Actor) {
    try {
      const [row] = await db
        .insert(blogPosts)
        .values({
          ...input,
          status: 'draft',
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .returning();
      await audit(actor, 'blog_post_created', row.id, {
        site: row.site,
        slug: row.slug,
      });
      return { post: row, seo: await this.validate(input, row.id) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BlogError('Another post already uses this slug', 409);
      }
      throw error;
    }
  },

  async update(id: string, input: BlogPostInput, actor: Actor) {
    const { post: before } = await this.get(id);
    const seo = await this.validate(input, id);
    // A live post may not be saved into a state that could not be published.
    if (before.status === 'published' && !seo.canPublish) {
      throw new BlogError(
        'This post is published; fix the errors before saving, or unpublish it first',
        422,
        seo
      );
    }
    try {
      const [row] = await db
        .update(blogPosts)
        .set({ ...input, updatedBy: actor.id, updatedAt: new Date() })
        .where(eq(blogPosts.id, id))
        .returning();
      const changed = (Object.keys(input) as (keyof BlogPostInput)[]).filter(
        (k) => JSON.stringify(before[k]) !== JSON.stringify(input[k])
      );
      await audit(actor, 'blog_post_updated', id, {
        slug: row.slug,
        fields: changed,
      });
      return { post: row, seo };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BlogError('Another post already uses this slug', 409);
      }
      throw error;
    }
  },

  /** Publish now, or schedule with a future `publishedAt`. */
  async publish(id: string, actor: Actor, publishedAt?: Date) {
    const { post: before, seo } = await this.get(id);
    if (!seo.canPublish) {
      throw new BlogError('Fix the SEO errors before publishing', 422, seo);
    }
    const when = publishedAt ?? before.publishedAt ?? new Date();
    const [row] = await db
      .update(blogPosts)
      .set({
        status: 'published',
        publishedAt: when,
        updatedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    await audit(actor, 'blog_post_published', id, {
      slug: row.slug,
      publishedAt: when.toISOString(),
    });
    return { post: row, seo };
  },

  async unpublish(id: string, actor: Actor) {
    await this.get(id);
    const [row] = await db
      .update(blogPosts)
      .set({ status: 'draft', updatedBy: actor.id, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    await audit(actor, 'blog_post_unpublished', id, { slug: row.slug });
    return { post: row, seo: await this.validate(toInput(row), id) };
  },

  async remove(id: string, actor: Actor) {
    const { post } = await this.get(id);
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    await audit(actor, 'blog_post_deleted', id, {
      site: post.site,
      slug: post.slug,
      title: post.title,
      status: post.status,
    });
  },

  /** Render format for the admin preview (same as the public API). */
  render(row: BlogPostRow): PublicPost {
    const site = row.site as BlogSite;
    return {
      site,
      slug: row.slug,
      path: postPath(site, row.slug),
      lang: row.lang,
      title: row.title,
      seoTitle: row.seoTitle || row.title,
      metaDescription: row.metaDescription,
      excerpt: row.excerpt ?? row.metaDescription,
      coverImageUrl: row.coverImageUrl,
      coverImageAlt: row.coverImageAlt,
      authorName: row.authorName,
      canonicalUrl: row.canonicalUrl,
      noindex: row.noindex,
      publishedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      readingMinutes: readingMinutes(row),
      blocks: renderBlocks(row.blocks, row.faq.length > 0),
      faq: renderFaq(row.faq),
      ctas: row.ctas,
    };
  },

  async listPublished(
    site: BlogSite,
    lang?: string
  ): Promise<PublicPostSummary[]> {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.site, site),
          eq(blogPosts.status, 'published'),
          lte(blogPosts.publishedAt, sql`now()`),
          lang ? eq(blogPosts.lang, lang) : undefined
        )
      )
      .orderBy(desc(blogPosts.publishedAt));
    return rows.map((row) => ({
      slug: row.slug,
      path: postPath(site, row.slug),
      lang: row.lang,
      title: row.title,
      excerpt: row.excerpt ?? row.metaDescription,
      coverImageUrl: row.coverImageUrl,
      coverImageAlt: row.coverImageAlt,
      authorName: row.authorName,
      publishedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      readingMinutes: readingMinutes(row),
    }));
  },

  async getPublished(site: BlogSite, slug: string): Promise<PublicPost> {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.site, site),
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, 'published'),
          lte(blogPosts.publishedAt, sql`now()`)
        )
      );
    if (!row) throw new BlogError('Post not found', 404);
    return this.render(row);
  },

  async uploadImage(file: File, actor: Actor) {
    const ext = BLOG_IMAGE_TYPES[file.type];
    if (!ext) {
      throw new BlogError('Use a JPG, PNG, WebP, GIF or AVIF image', 400);
    }
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
      throw new BlogError('Images must be 5 MB or smaller', 400);
    }
    const name = `${randomUUID()}.${ext}`;
    await uploadFile(
      `blog/${name}`,
      Buffer.from(await file.arrayBuffer()),
      file.type
    );
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'blog_image_uploaded',
      resource: 'blog_image',
      details: { name, size: file.size, type: file.type },
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    return { name };
  },

  async readImage(name: string) {
    if (!IMAGE_FILE.test(name)) throw new BlogError('Image not found', 404);
    const ext = name.split('.').pop() as string;
    const type = Object.entries(BLOG_IMAGE_TYPES).find(
      ([, e]) => e === ext
    )?.[0] as string;
    try {
      return { body: await downloadFile(`blog/${name}`), type };
    } catch {
      throw new BlogError('Image not found', 404);
    }
  },
};
