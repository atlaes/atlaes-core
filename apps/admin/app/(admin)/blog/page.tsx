'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Plus, Trash2 } from 'lucide-react';
import {
  BLOG_SITE_LABEL,
  deleteBlogPost,
  listBlogPosts,
  type BlogPostSummary,
  type BlogSite,
  type BlogStatus,
} from '@/lib/blog-api';
import {
  Button,
  EmptyState,
  ErrorText,
  LinkButton,
  PageHeader,
  Pill,
  Spinner,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatDate,
  inputClass,
} from '@/components/ui';
import { PostStatusPill, ScoreBadge } from '@/components/blog/bits';

/**
 * Blog → posts for both sites. Status filter "scheduled" is client-side:
 * the API only knows draft / published, scheduled = published in future.
 */
type StatusFilter = '' | BlogStatus | 'scheduled';

export default function BlogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [site, setSite] = useState<'' | BlogSite>('');
  const [status, setStatus] = useState<StatusFilter>('');

  const apiStatus: BlogStatus | undefined =
    status === 'scheduled' ? 'published' : status || undefined;
  const posts = useQuery({
    queryKey: ['admin-blog-posts', site, apiStatus],
    queryFn: () =>
      listBlogPosts({ site: site || undefined, status: apiStatus }),
  });

  const remove = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }),
  });

  const rows = (posts.data ?? []).filter((p) => {
    if (status === 'scheduled') return p.scheduled;
    if (status === 'published') return !p.scheduled;
    return true;
  });

  const confirmDelete = (p: BlogPostSummary) => {
    const live = p.status === 'published' && !p.scheduled;
    if (
      window.confirm(
        `Delete “${p.title || p.slug}”?${live ? '\n\nIt is live; the page will disappear from the site.' : ''}\n\nThis cannot be undone.`
      )
    ) {
      remove.mutate(p.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Blog"
        subtitle="Articles for germanypensionrefund.com and companypension.de. Every post is checked for SEO before it can go live."
        actions={
          <LinkButton href="/blog/new" variant="primary">
            <Plus className="h-4 w-4" />
            New post
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="Site"
          value={site}
          onChange={(e) => setSite(e.target.value as '' | BlogSite)}
          className={`${inputClass} w-auto`}
        >
          <option value="">All sites</option>
          <option value="gpr">{BLOG_SITE_LABEL.gpr}</option>
          <option value="vbl">{BLOG_SITE_LABEL.vbl}</option>
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className={`${inputClass} w-auto`}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {remove.isError && (
        <div className="mb-3">
          <ErrorText
            error={remove.error}
            fallback="Could not delete the post"
          />
        </div>
      )}

      {posts.isLoading ? (
        <Spinner full />
      ) : posts.isError ? (
        <ErrorText error={posts.error} fallback="Could not load the posts" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-10 w-10" />}
          title={site || status ? 'No posts match the filters' : 'No posts yet'}
          hint={
            site || status
              ? undefined
              : 'Write the first article with “New post”.'
          }
        />
      ) : (
        <Table minWidth={860}>
          <TableHead>
            <Th>Title</Th>
            <Th>Site</Th>
            <Th>Lang</Th>
            <Th>Status</Th>
            <Th>SEO</Th>
            <Th align="right">Words</Th>
            <Th>Updated</Th>
            <Th />
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/blog/${p.id}`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <Td nowrap={false} className="max-w-[320px]">
                  <span className="block font-medium text-gray-900">
                    {p.title || <span className="text-gray-400">Untitled</span>}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {p.path}
                  </span>
                </Td>
                <Td>
                  <Pill tone={p.site === 'gpr' ? 'info' : 'brand'}>
                    {BLOG_SITE_LABEL[p.site] ?? p.site}
                  </Pill>
                </Td>
                <Td className="uppercase">{p.lang}</Td>
                <Td>
                  <PostStatusPill
                    status={p.status}
                    publishedAt={p.publishedAt}
                    scheduled={p.scheduled}
                  />
                </Td>
                <Td>
                  <ScoreBadge score={p.seoScore} errors={p.seoErrors} />
                </Td>
                <Td align="right">{p.wordCount}</Td>
                <Td>{formatDate(p.updatedAt, true)}</Td>
                <Td align="right">
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`Delete ${p.title}`}
                    disabled={remove.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(p);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
