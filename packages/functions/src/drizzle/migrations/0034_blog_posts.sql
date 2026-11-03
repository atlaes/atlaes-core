-- Blog / article CMS: posts written in the admin (Blog) for the GPR site
-- (/post/<slug>) and companypension.de (/blog/<slug>). The body is the
-- editor's block JSON; status 'published' + published_at <= now() makes a
-- post public (a future published_at schedules it). Idempotent.
CREATE TABLE IF NOT EXISTS "shared"."blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site" varchar(10) NOT NULL,
	"lang" varchar(2) DEFAULT 'en' NOT NULL,
	"slug" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"title" varchar(200) NOT NULL,
	"seo_title" varchar(200),
	"meta_description" varchar(400),
	"excerpt" varchar(400),
	"focus_keyword" varchar(100),
	"cover_image_url" text,
	"cover_image_alt" varchar(250),
	"author_name" varchar(120),
	"canonical_url" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ctas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_site_slug_unique" ON "shared"."blog_posts" USING btree ("site","slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_site_status_published_idx" ON "shared"."blog_posts" USING btree ("site","status","published_at");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."blog_posts" ADD CONSTRAINT "blog_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
