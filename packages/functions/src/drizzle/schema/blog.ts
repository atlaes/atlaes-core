import {
  boolean,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { shared, users } from './shared';
import type {
  BlogBlock,
  BlogCta,
  BlogFaqItem,
} from '../../services/blog/content';

/**
 * Blog posts written by ops in the admin (Blog → editor, migration 0030) for
 * the GPR site (/post/<slug>) and companypension.de (/blog/<slug>). The body
 * is stored in the editor's block format (`services/blog/content.ts`); the
 * public API converts it to the sites' render format.
 *
 * A post is public when status = 'published' and published_at <= now(), so
 * a future published_at schedules it.
 */
export const blogPosts = shared.table(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    site: varchar('site', { length: 10 }).notNull(),
    lang: varchar('lang', { length: 2 }).notNull().default('en'),
    slug: varchar('slug', { length: 120 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    /** Visible H1. */
    title: varchar('title', { length: 200 }).notNull(),
    /** <title> tag; falls back to `title`. */
    seoTitle: varchar('seo_title', { length: 200 }),
    metaDescription: varchar('meta_description', { length: 400 }),
    /** Listing teaser; falls back to the meta description. */
    excerpt: varchar('excerpt', { length: 400 }),
    focusKeyword: varchar('focus_keyword', { length: 100 }),
    coverImageUrl: text('cover_image_url'),
    coverImageAlt: varchar('cover_image_alt', { length: 250 }),
    authorName: varchar('author_name', { length: 120 }),
    canonicalUrl: text('canonical_url'),
    noindex: boolean('noindex').notNull().default(false),
    blocks: jsonb('blocks').$type<BlogBlock[]>().notNull().default([]),
    faq: jsonb('faq').$type<BlogFaqItem[]>().notNull().default([]),
    ctas: jsonb('ctas').$type<BlogCta[]>().notNull().default([]),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    siteSlug: uniqueIndex('blog_posts_site_slug_unique').on(t.site, t.slug),
    sitePublished: index('blog_posts_site_status_published_idx').on(
      t.site,
      t.status,
      t.publishedAt
    ),
  })
);

export type BlogPostRow = typeof blogPosts.$inferSelect;
