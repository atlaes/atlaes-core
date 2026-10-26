'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  BLOG_SITE_LABEL,
  SEO_LIMITS,
  createBlogPost,
  deleteBlogPost,
  getBlogPost,
  isScheduled,
  postUrl,
  publishBlogPost,
  slugify,
  toBlogApiError,
  unpublishBlogPost,
  updateBlogPost,
  validateBlogPost,
  type BlogApiError,
  type BlogCta,
  type BlogFaqItem,
  type BlogLang,
  type BlogPost,
  type BlogPostInput,
  type BlogPostResult,
  type BlogSite,
  type PublicPost,
  type SeoReport,
} from '@/lib/blog-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';
import {
  BlockEditor,
  stripKey,
  withKey,
  type EditorBlock,
} from './BlockEditor';
import { CtaEditor, FaqEditor } from './FaqCtaEditor';
import { CharCount, ImageUrlInput } from './bits';
import { PostPreview } from './PostPreview';
import { SeoPanel } from './SeoPanel';

// ------------------------------------------------------------- form state

interface FormState {
  site: BlogSite;
  lang: BlogLang;
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  focusKeyword: string;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  canonicalUrl: string;
  noindex: boolean;
  blocks: EditorBlock[];
  faq: BlogFaqItem[];
  ctas: BlogCta[];
}

const EMPTY_FORM: FormState = {
  site: 'gpr',
  lang: 'en',
  slug: '',
  title: '',
  seoTitle: '',
  metaDescription: '',
  excerpt: '',
  focusKeyword: '',
  coverImageUrl: '',
  coverImageAlt: '',
  authorName: '',
  canonicalUrl: '',
  noindex: false,
  blocks: [],
  faq: [],
  ctas: [],
};

function fromPost(p: BlogPostInput): FormState {
  return {
    site: p.site,
    lang: p.lang,
    slug: p.slug,
    title: p.title,
    seoTitle: p.seoTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    excerpt: p.excerpt ?? '',
    focusKeyword: p.focusKeyword ?? '',
    coverImageUrl: p.coverImageUrl ?? '',
    coverImageAlt: p.coverImageAlt ?? '',
    authorName: p.authorName ?? '',
    canonicalUrl: p.canonicalUrl ?? '',
    noindex: p.noindex,
    blocks: (p.blocks ?? []).map(withKey),
    faq: p.faq ?? [],
    ctas: p.ctas ?? [],
  };
}

/** What the API stores: trimmed, empty optional text → null. */
function toInput(f: FormState): BlogPostInput {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    site: f.site,
    lang: f.lang,
    slug: f.slug.trim(),
    title: f.title.trim(),
    seoTitle: opt(f.seoTitle),
    metaDescription: opt(f.metaDescription),
    excerpt: opt(f.excerpt),
    focusKeyword: opt(f.focusKeyword),
    coverImageUrl: opt(f.coverImageUrl),
    coverImageAlt: opt(f.coverImageAlt),
    authorName: opt(f.authorName),
    canonicalUrl: opt(f.canonicalUrl),
    noindex: f.noindex,
    blocks: f.blocks.map(stripKey),
    faq: f.faq,
    ctas: f.ctas,
  };
}

const serialize = (input: BlogPostInput) => JSON.stringify(input);

const pad = (n: number) => `0${n}`.slice(-2);
/** ISO → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------- loading

export function PostEditor({ id }: { id?: string }) {
  const query = useQuery({
    queryKey: ['admin-blog-post', id],
    queryFn: () => getBlogPost(id as string),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  if (!id) return <Editor />;
  if (query.isLoading) return <Spinner full />;
  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <BackLink dirty={false} />
        <ErrorText error={query.error} fallback="Could not load the post" />
      </div>
    );
  }
  return <Editor key={id} initial={query.data} />;
}

function BackLink({ dirty }: { dirty: boolean }) {
  return (
    <Link
      href="/blog"
      onClick={(e) => {
        if (dirty && !window.confirm('Leave without saving your changes?')) {
          e.preventDefault();
        }
      }}
      className="mb-2 inline-block text-sm text-gray-500 hover:text-gray-800"
    >
      ← Blog
    </Link>
  );
}

// ----------------------------------------------------------------- editor

function Editor({ initial }: { initial?: BlogPostResult }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [post, setPost] = useState<BlogPost | null>(initial?.post ?? null);
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromPost(initial.post) : EMPTY_FORM
  );
  const [saved, setSaved] = useState<string>(() =>
    serialize(toInput(initial ? fromPost(initial.post) : EMPTY_FORM))
  );
  const [slugTouched, setSlugTouched] = useState(!!initial?.post.slug);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [schedule, setSchedule] = useState(() =>
    initial && isScheduled(initial.post)
      ? toLocalInput(initial.post.publishedAt)
      : ''
  );

  const [seo, setSeo] = useState<SeoReport | null>(initial?.seo ?? null);
  const [preview, setPreview] = useState<PublicPost | null>(
    initial?.preview ?? null
  );
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<BlogApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const id = post?.id;
  const input = useMemo(() => toInput(form), [form]);
  const current = useMemo(() => serialize(input), [input]);
  const dirty = current !== saved;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // -- live SEO check (debounced) -----------------------------------------
  const seq = useRef(0);
  const skipFirst = useRef(!!initial);
  useEffect(() => {
    if (skipFirst.current) {
      // The GET already returned the report for the saved state.
      skipFirst.current = false;
      return;
    }
    const n = ++seq.current;
    setChecking(true);
    const t = setTimeout(() => {
      validateBlogPost(JSON.parse(current) as BlogPostInput, id)
        .then((r) => {
          if (n !== seq.current) return;
          setSeo(r.seo);
          setPreview(r.preview);
          setCheckError(null);
        })
        .catch((e) => {
          if (n !== seq.current) return;
          const err = toBlogApiError(e, 'The SEO check failed');
          setCheckError(
            err.issues.length
              ? `${err.message}: ${err.issues
                  .slice(0, 3)
                  .map((i) => `${i.path} ${i.message}`)
                  .join('; ')}`
              : err.message
          );
        })
        .finally(() => {
          if (n === seq.current) setChecking(false);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [current, id]);

  // -- unsaved-changes guard ------------------------------------------------
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // -- actions ----------------------------------------------------------------
  /** `sent`: the serialized form the API now stores (after a save). */
  const applyResult = (r: BlogPostResult, sent?: string) => {
    setPost(r.post);
    if (sent !== undefined) setSaved(sent);
    setSeo(r.seo);
    setPreview(r.preview);
    setActionError(null);
    queryClient.setQueryData(['admin-blog-post', r.post.id], r);
    queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
  };

  const onError = (fallback: string) => (e: unknown) => {
    const err = toBlogApiError(e, fallback);
    setActionError(err);
    setNotice(null);
    if (err.seo) setSeo(err.seo);
  };

  /** Create or update with the current form; returns the result. */
  const persist = async (): Promise<BlogPostResult> => {
    const sent = current;
    const body = JSON.parse(sent) as BlogPostInput;
    const r = id ? await updateBlogPost(id, body) : await createBlogPost(body);
    applyResult(r, sent);
    return r;
  };

  const goToPost = (r: BlogPostResult) => {
    if (!id) router.replace(`/blog/${r.post.id}`);
  };

  const save = useMutation({
    mutationFn: persist,
    onSuccess: (r) => {
      setNotice(
        r.post.status !== 'published'
          ? 'Draft saved.'
          : isScheduled(r.post)
            ? 'Changes saved; the post is still scheduled.'
            : 'Changes saved and live.'
      );
      goToPost(r);
    },
    onError: onError('Could not save the post'),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const persisted = !id || dirty ? await persist() : null;
      const postId = persisted?.post.id ?? (id as string);
      const stored = persisted?.post ?? post;
      let when: string | undefined;
      if (schedule) {
        const d = new Date(schedule);
        if (Number.isNaN(d.getTime())) throw new Error('Invalid schedule date');
        when = d.toISOString();
      } else if (stored && isScheduled(stored)) {
        // "Publish now" on a post that was scheduled: the API would keep
        // the old future date otherwise.
        when = new Date().toISOString();
      }
      const r = await publishBlogPost(postId, when);
      applyResult(r);
      return r;
    },
    onSuccess: (r) => {
      setNotice(
        isScheduled(r.post)
          ? `Scheduled for ${formatDate(r.post.publishedAt, true)}.`
          : 'Published.'
      );
      goToPost(r);
    },
    onError: onError('Could not publish the post'),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishBlogPost(id as string),
    onSuccess: (r) => {
      applyResult(r);
      setNotice('Unpublished; the post is a draft again.');
    },
    onError: onError('Could not unpublish the post'),
  });

  const remove = useMutation({
    mutationFn: () => deleteBlogPost(id as string),
    onSuccess: () => {
      setSaved(current); // no unsaved-changes prompt on the way out
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      queryClient.removeQueries({ queryKey: ['admin-blog-post', id] });
      router.push('/blog');
    },
    onError: onError('Could not delete the post'),
  });

  const busy =
    save.isPending ||
    publish.isPending ||
    unpublish.isPending ||
    remove.isPending;

  // -- derived ----------------------------------------------------------------
  const published = post?.status === 'published';
  const scheduled = !!post && isScheduled(post);
  const errorChecks = seo?.checks.filter((c) => c.level === 'error') ?? [];
  const publishBlock = !seo
    ? 'Waiting for the SEO check.'
    : !seo.canPublish
      ? `Fix ${errorChecks.length} error${errorChecks.length === 1 ? '' : 's'} first: ${errorChecks
          .slice(0, 2)
          .map((c) => c.message)
          .join(' ')}${errorChecks.length > 2 ? ' …' : ''}`
      : null;
  const scheduleInFuture =
    !!schedule && new Date(schedule).getTime() > Date.now();
  const publishLabel = publish.isPending
    ? 'Publishing…'
    : scheduleInFuture
      ? published
        ? 'Reschedule'
        : 'Schedule'
      : published
        ? scheduled
          ? 'Publish now'
          : 'Update date'
        : 'Publish';
  // A published, live post only needs the button to change its date.
  const showPublish = !published || scheduled || !!schedule;

  const onTitle = (title: string) =>
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : slugify(title),
    }));

  const onSite = (site: BlogSite) => setForm((f) => ({ ...f, site }));

  const liveUrl = post ? postUrl(post.site, post.slug) : null;
  const effectiveSeoTitle = form.seoTitle.trim() || form.title.trim();

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <BackLink dirty={dirty} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold text-gray-900">
              {form.title.trim() || (id ? 'Untitled post' : 'New post')}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <StatusDot
                tone={!published ? 'neutral' : scheduled ? 'wait' : 'good'}
              >
                {!post
                  ? 'Not saved yet'
                  : !published
                    ? 'Draft'
                    : scheduled
                      ? `Scheduled for ${formatDate(post.publishedAt, true)}`
                      : `Published ${formatDate(post.publishedAt, true)}`}
              </StatusDot>
              <span>{BLOG_SITE_LABEL[form.site]}</span>
              {post && <span>Saved {formatDate(post.updatedAt, true)}</span>}
              {dirty && (
                <span className="font-medium text-amber-700">
                  Unsaved changes
                </span>
              )}
              {published && !scheduled && liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                >
                  View live
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={published ? 'primary' : 'secondary'}
              disabled={busy || (!dirty && !!id)}
              onClick={() => {
                setNotice(null);
                save.mutate();
              }}
            >
              {save.isPending
                ? 'Saving…'
                : published
                  ? 'Save changes'
                  : 'Save draft'}
            </Button>
            {id && (
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${post?.title || 'this post'}”?${published && !scheduled ? '\n\nIt is live; the page will disappear from the site.' : ''}\n\nThis cannot be undone.`
                    )
                  ) {
                    remove.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Publishing bar */}
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-3">
          <div className="w-full sm:w-auto">
            <Field
              label={published ? 'Publish date' : 'Schedule (optional)'}
              htmlFor="publish-at"
            >
              <input
                id="publish-at"
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className={`${inputClass} sm:w-56`}
              />
            </Field>
          </div>
          {showPublish && (
            <Button
              variant={published ? 'secondary' : 'primary'}
              disabled={busy || !!publishBlock}
              title={publishBlock ?? undefined}
              onClick={() => {
                setNotice(null);
                publish.mutate();
              }}
            >
              {publishLabel}
            </Button>
          )}
          {published && (
            <Button
              disabled={busy || dirty}
              title={dirty ? 'Save or discard your changes first' : undefined}
              onClick={() => {
                if (
                  window.confirm(
                    'Unpublish this post? It disappears from the site until it is published again.'
                  )
                ) {
                  setNotice(null);
                  unpublish.mutate();
                }
              }}
            >
              Unpublish
            </Button>
          )}
          <p className="min-w-0 flex-1 basis-full text-xs text-gray-500 sm:basis-0">
            {publishBlock ? (
              <span className="text-red-700">{publishBlock}</span>
            ) : !published ? (
              schedule ? (
                scheduleInFuture ? (
                  'The post goes live automatically at this time.'
                ) : (
                  'A past date publishes now with that date.'
                )
              ) : (
                'Leave the date empty to publish now. Unsaved changes are saved first.'
              )
            ) : (
              'Saving keeps a published post live; it must stay free of SEO errors.'
            )}
          </p>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        {actionError && <ActionError error={actionError} />}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(
          [
            ['edit', 'Edit', Pencil],
            ['preview', 'Preview', Eye],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              tab === key
                ? 'border-brand-dark font-medium text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {tab === 'preview' ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-8">
              <PostPreview post={preview} />
            </div>
          ) : (
            <div className="space-y-8">
              <Section title="Post">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Site" htmlFor="site">
                    <select
                      id="site"
                      value={form.site}
                      onChange={(e) => onSite(e.target.value as BlogSite)}
                      className={inputClass}
                    >
                      <option value="gpr">
                        GPR (germanypensionrefund.com)
                      </option>
                      <option value="vbl">
                        CompanyPension (companypension.de)
                      </option>
                    </select>
                  </Field>
                  <Field label="Language" htmlFor="lang">
                    <select
                      id="lang"
                      value={form.lang}
                      onChange={(e) => set('lang', e.target.value as BlogLang)}
                      className={inputClass}
                    >
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Title (H1)" htmlFor="title">
                      <input
                        id="title"
                        value={form.title}
                        onChange={(e) => onTitle(e.target.value)}
                        className={`${inputClass} text-base font-semibold`}
                        maxLength={200}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="URL slug"
                      htmlFor="slug"
                      hint={
                        slugTouched
                          ? undefined
                          : 'Follows the title until you edit it.'
                      }
                    >
                      <div className="flex items-stretch">
                        <span className="hidden items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2 text-xs text-gray-500 sm:flex">
                          {form.site === 'gpr' ? '/post/' : '/blog/'}
                        </span>
                        <input
                          id="slug"
                          value={form.slug}
                          spellCheck={false}
                          onChange={(e) => {
                            setSlugTouched(true);
                            set('slug', e.target.value);
                          }}
                          className={`${inputClass} font-mono sm:rounded-l-none`}
                          maxLength={120}
                        />
                      </div>
                    </Field>
                    {slugTouched && form.title.trim() && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-sky-700 hover:underline"
                        onClick={() => {
                          setSlugTouched(false);
                          set('slug', slugify(form.title));
                        }}
                      >
                        Generate from title
                      </button>
                    )}
                    {published &&
                      !scheduled &&
                      post &&
                      form.slug.trim() !== post.slug && (
                        <p className="mt-1 text-xs text-amber-700">
                          Changing the slug of a live post breaks existing links
                          to {post.slug}.
                        </p>
                      )}
                  </div>
                </div>
              </Section>

              <Section title="Search & sharing">
                <div className="grid gap-3">
                  <Field label="SEO title" htmlFor="seo-title">
                    <input
                      id="seo-title"
                      value={form.seoTitle}
                      onChange={(e) => set('seoTitle', e.target.value)}
                      placeholder={form.title || 'Defaults to the title'}
                      className={inputClass}
                      maxLength={200}
                    />
                    <span className="mt-1 flex justify-between gap-2 text-xs text-gray-400">
                      <span>
                        {form.seoTitle.trim()
                          ? 'The <title> shown in Google.'
                          : 'Empty: the title is used.'}
                      </span>
                      <CharCount
                        value={effectiveSeoTitle}
                        min={SEO_LIMITS.titleMin}
                        max={SEO_LIMITS.titleMax}
                      />
                    </span>
                  </Field>
                  <Field label="Meta description" htmlFor="meta">
                    <textarea
                      id="meta"
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => set('metaDescription', e.target.value)}
                      className={`${inputClass} resize-y`}
                      maxLength={400}
                    />
                    <span className="mt-1 flex justify-between gap-2 text-xs text-gray-400">
                      <span>The text under the title in search results.</span>
                      <CharCount
                        value={form.metaDescription}
                        min={SEO_LIMITS.metaMin}
                        max={SEO_LIMITS.metaMax}
                      />
                    </span>
                  </Field>
                  <Field
                    label="Excerpt"
                    htmlFor="excerpt"
                    hint={`Teaser on the blog listing (up to ${SEO_LIMITS.excerptMax} characters); falls back to the meta description.`}
                  >
                    <textarea
                      id="excerpt"
                      rows={2}
                      value={form.excerpt}
                      onChange={(e) => set('excerpt', e.target.value)}
                      className={`${inputClass} resize-y`}
                      maxLength={400}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Focus keyword"
                      htmlFor="keyword"
                      hint="The search phrase this post should rank for."
                    >
                      <input
                        id="keyword"
                        value={form.focusKeyword}
                        onChange={(e) => set('focusKeyword', e.target.value)}
                        className={inputClass}
                        maxLength={100}
                      />
                    </Field>
                    <Field
                      label="Canonical URL (optional)"
                      htmlFor="canonical"
                      hint="Only when the article was first published elsewhere."
                    >
                      <input
                        id="canonical"
                        value={form.canonicalUrl}
                        onChange={(e) => set('canonicalUrl', e.target.value)}
                        placeholder="https://…"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.noindex}
                      onChange={(e) => set('noindex', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <span>
                      noindex
                      <span className="block text-xs text-gray-500">
                        Keep the page out of search engines (it stays reachable
                        by link).
                      </span>
                    </span>
                  </label>
                </div>
              </Section>

              <Section title="Cover image & author">
                <div className="grid gap-3">
                  <Field label="Cover image" htmlFor="cover">
                    <ImageUrlInput
                      id="cover"
                      value={form.coverImageUrl}
                      alt={form.coverImageAlt}
                      onChange={(url) => set('coverImageUrl', url)}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Cover alt text"
                      htmlFor="cover-alt"
                      hint="Required when there is a cover image."
                    >
                      <input
                        id="cover-alt"
                        value={form.coverImageAlt}
                        onChange={(e) => set('coverImageAlt', e.target.value)}
                        className={inputClass}
                        maxLength={250}
                      />
                    </Field>
                    <Field label="Author" htmlFor="author">
                      <input
                        id="author"
                        value={form.authorName}
                        onChange={(e) => set('authorName', e.target.value)}
                        className={inputClass}
                        maxLength={120}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section title="Body">
                <BlockEditor
                  blocks={form.blocks}
                  onChange={(blocks) => set('blocks', blocks)}
                />
              </Section>

              <Section title="FAQ">
                <FaqEditor faq={form.faq} onChange={(faq) => set('faq', faq)} />
              </Section>

              <Section title="Call-to-action buttons">
                <CtaEditor
                  ctas={form.ctas}
                  onChange={(ctas) => set('ctas', ctas)}
                />
              </Section>
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          <SeoPanel
            seo={seo}
            checking={checking}
            error={checkError}
            site={form.site}
            slug={form.slug.trim()}
            seoTitle={effectiveSeoTitle}
            metaDescription={form.metaDescription.trim()}
          />
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 pt-4">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

const STATUS_HINT: Record<number, string> = {
  400: 'Some fields are invalid.',
  404: 'The post no longer exists.',
  409: 'Another post on this site already uses this slug; choose another.',
  422: 'The SEO check found errors that block this; see the SEO panel.',
};

function ActionError({ error }: { error: BlogApiError }) {
  const hint = error.status ? STATUS_HINT[error.status] : undefined;
  const seoErrors = error.seo?.checks.filter((c) => c.level === 'error') ?? [];
  return (
    <div
      role="alert"
      className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      <p className="font-medium">
        {error.message}
        {error.status ? ` (${error.status})` : ''}
      </p>
      {hint && <p className="mt-0.5">{hint}</p>}
      {error.issues.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {error.issues.slice(0, 8).map((i, n) => (
            <li key={n}>
              <span className="font-mono text-xs">{i.path || 'post'}</span>:{' '}
              {i.message}
            </li>
          ))}
        </ul>
      )}
      {seoErrors.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {seoErrors.map((c) => (
            <li key={c.id}>{c.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
