import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema/shared';
import blog, { adminBlog } from './blog';
import { AuthService } from '../utils/auth';

// Blog CMS against a real database (migration 0030).
//   pnpm vitest run src/routes/blog.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let app: Hono;
const stamp = Date.now();
const userIds: string[] = [];
const slug = (name: string) => `${name}-${stamp}`;

async function makeUser(role: string, tag: string) {
  const [user] = await drizzle(testClient)
    .insert(users)
    .values({
      email: `test-blog-${tag}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(user.id);
  return AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const call = async (
  method: string,
  path: string,
  token: string | null,
  body?: unknown
) => {
  const res = await app.request(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: () => res.json() as Promise<Json> };
};

const filler = Array.from({ length: 120 }, (_, i) =>
  i % 20 === 0 ? 'VBL refund' : 'word'
).join(' ');

const post = (overrides: Record<string, unknown> = {}) => ({
  site: 'vbl',
  lang: 'en',
  slug: slug('vbl-refund-guide'),
  title: 'VBL refund guide for people leaving Germany',
  seoTitle: 'VBL refund guide: how to get your contributions back',
  metaDescription:
    'Left public-sector work in Germany? This VBL refund guide explains who qualifies, the waiting time and how to apply.',
  focusKeyword: 'VBL refund',
  blocks: [
    { t: 'p', md: 'A **VBL refund** pays back [your share](/vbl-refund).' },
    { t: 'h2', text: 'Who gets a VBL refund' },
    { t: 'p', md: filler },
    { t: 'p', md: filler },
    { t: 'p', md: `${filler} See [the VBL](https://www.vbl.de).` },
  ],
  faq: [{ q: 'How long?', a: 'About **3 months**.' }],
  ctas: [{ label: 'Check eligibility', href: '/get-started' }],
  ...overrides,
});

describe('blog CMS', () => {
  let adminToken: string;
  let userToken: string;
  let postId: string;

  beforeAll(async () => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/admin/blog', adminBlog);
    app.route('/api/blog', blog);
    adminToken = await makeUser('admin', 'admin');
    userToken = await makeUser('user', 'user');
  });

  afterAll(async () => {
    try {
      await testClient`DELETE FROM shared.blog_posts WHERE slug LIKE ${`%-${stamp}`}`;
      for (const id of userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${id}::uuid`;
      }
    } finally {
      await testClient.end();
    }
  });

  it('is admin-only', async () => {
    expect((await call('GET', '/api/admin/blog', null)).status).toBe(401);
    expect((await call('GET', '/api/admin/blog', userToken)).status).toBe(403);
    expect(
      (await call('POST', '/api/admin/blog', userToken, post())).status
    ).toBe(403);
  });

  it('validates a draft without saving it', async () => {
    const res = await call('POST', '/api/admin/blog/validate', adminToken, {
      post: post({ metaDescription: '' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seo.canPublish).toBe(false);
    expect(body.preview.blocks[0]).toEqual({
      t: 'p',
      x: 'A VBL refund pays back your share.',
      sp: [
        { k: 'b', x: 'VBL refund' },
        { k: 'a', x: 'your share', href: '/vbl-refund' },
      ],
    });
  });

  it('rejects malformed bodies', async () => {
    const res = await call('POST', '/api/admin/blog', adminToken, {
      ...post(),
      site: 'web',
      blocks: [{ t: 'script', md: 'x' }],
    });
    expect(res.status).toBe(400);
  });

  it('creates a draft that is not public', async () => {
    const res = await call(
      'POST',
      '/api/admin/blog',
      adminToken,
      post({ metaDescription: '' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    postId = body.post.id;
    expect(body.post.status).toBe('draft');
    expect(body.seo.canPublish).toBe(false);

    const pub = await call(
      'GET',
      `/api/blog/vbl/posts/${slug('vbl-refund-guide')}`,
      null
    );
    expect(pub.status).toBe(404);
  });

  it('refuses a duplicate slug on the same site only', async () => {
    expect(
      (await call('POST', '/api/admin/blog', adminToken, post())).status
    ).toBe(409);
    const gpr = await call(
      'POST',
      '/api/admin/blog',
      adminToken,
      post({ site: 'gpr' })
    );
    expect(gpr.status).toBe(201);
  });

  it('refuses to publish while there are SEO errors', async () => {
    const res = await call(
      'POST',
      `/api/admin/blog/${postId}/publish`,
      adminToken,
      {}
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.seo.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'meta-length', level: 'error' }),
      ])
    );
  });

  it('publishes once fixed and serves it publicly', async () => {
    expect(
      (await call('PUT', `/api/admin/blog/${postId}`, adminToken, post()))
        .status
    ).toBe(200);
    const res = await call(
      'POST',
      `/api/admin/blog/${postId}/publish`,
      adminToken,
      {}
    );
    expect(res.status).toBe(200);
    expect((await res.json()).post.status).toBe('published');

    const list = await (await call('GET', '/api/blog/vbl/posts', null)).json();
    expect(list.posts.map((p: { slug: string }) => p.slug)).toContain(
      slug('vbl-refund-guide')
    );

    const one = await call(
      'GET',
      `/api/blog/vbl/posts/${slug('vbl-refund-guide')}`,
      null
    );
    expect(one.status).toBe(200);
    const { post: page } = await one.json();
    expect(page.path).toBe(`/blog/${slug('vbl-refund-guide')}`);
    expect(page.blocks.at(-1)).toEqual({ t: 'faq' });
    expect(page.blocks[1]).toEqual({
      t: 'h2',
      x: 'Who gets a VBL refund',
      id: 'who-gets-a-vbl-refund',
    });
    expect(page.faq[0].a).toBe('About 3 months.');
  });

  it('keeps a published post valid on save', async () => {
    const res = await call(
      'PUT',
      `/api/admin/blog/${postId}`,
      adminToken,
      post({ metaDescription: '' })
    );
    expect(res.status).toBe(422);
  });

  it('hides scheduled posts until their date', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const created = await (
      await call(
        'POST',
        '/api/admin/blog',
        adminToken,
        post({
          slug: slug('scheduled'),
          seoTitle: 'Scheduled VBL refund post about contributions',
        })
      )
    ).json();
    const res = await call(
      'POST',
      `/api/admin/blog/${created.post.id}/publish`,
      adminToken,
      { publishedAt: future }
    );
    expect(res.status).toBe(200);
    expect(
      (await call('GET', `/api/blog/vbl/posts/${slug('scheduled')}`, null))
        .status
    ).toBe(404);
    const admin = await (
      await call('GET', '/api/admin/blog?site=vbl', adminToken)
    ).json();
    const row = admin.posts.find(
      (p: { id: string }) => p.id === created.post.id
    );
    expect(row.scheduled).toBe(true);

    // Unpublish, then publish without a date: live now, not on the old date.
    await call(
      'POST',
      `/api/admin/blog/${created.post.id}/unpublish`,
      adminToken
    );
    await call(
      'POST',
      `/api/admin/blog/${created.post.id}/publish`,
      adminToken,
      {}
    );
    expect(
      (await call('GET', `/api/blog/vbl/posts/${slug('scheduled')}`, null))
        .status
    ).toBe(200);
  });

  it('unpublishes and deletes', async () => {
    await call('POST', `/api/admin/blog/${postId}/unpublish`, adminToken);
    expect(
      (
        await call(
          'GET',
          `/api/blog/vbl/posts/${slug('vbl-refund-guide')}`,
          null
        )
      ).status
    ).toBe(404);
    expect(
      (await call('DELETE', `/api/admin/blog/${postId}`, adminToken)).status
    ).toBe(200);
    expect(
      (await call('GET', `/api/admin/blog/${postId}`, adminToken)).status
    ).toBe(404);
    const [audit] = await testClient`
      SELECT action FROM shared.audit_logs
      WHERE resource_id = ${postId}::uuid AND action = 'blog_post_deleted'`;
    expect(audit).toBeTruthy();
  });

  it('404s unknown sites and image names', async () => {
    expect((await call('GET', '/api/blog/web/posts', null)).status).toBe(404);
    expect(
      (await call('GET', '/api/blog/images/..%2Fsecret.png', null)).status
    ).toBe(404);
  });
});
