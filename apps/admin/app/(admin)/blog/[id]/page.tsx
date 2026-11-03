'use client';

import { useParams } from 'next/navigation';
import { PostEditor } from '@/components/blog/PostEditor';

export default function BlogPostPage() {
  const { id } = useParams<{ id: string }>();
  return <PostEditor id={id} />;
}
