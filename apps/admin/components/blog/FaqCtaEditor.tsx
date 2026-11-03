'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { BLOG_CTA_MAX, type BlogCta, type BlogFaqItem } from '@/lib/blog-api';
import { Button, inputClass } from '@/components/ui';
import { InlineTextArea } from './bits';

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function FaqEditor({
  faq,
  onChange,
}: {
  faq: BlogFaqItem[];
  onChange: (faq: BlogFaqItem[]) => void;
}) {
  const set = (i: number, patch: Partial<BlogFaqItem>) =>
    onChange(faq.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Shown as an FAQ section and marked up for Google (FAQPage). Answers
        allow **bold** and links; a blank line starts a new paragraph.
      </p>
      {faq.map((f, i) => (
        <div key={i} className="rounded-md border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Question {i + 1}
            </span>
            <div className="flex gap-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => onChange(move(faq, i, i - 1))}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move down"
                disabled={i === faq.length - 1}
                onClick={() => onChange(move(faq, i, i + 1))}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                aria-label="Remove question"
                onClick={() => {
                  if (
                    (!f.q.trim() && !f.a.trim()) ||
                    window.confirm('Remove this question?')
                  ) {
                    onChange(faq.filter((_, j) => j !== i));
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <input
              value={f.q}
              onChange={(e) => set(i, { q: e.target.value })}
              placeholder="Question"
              className={`${inputClass} font-medium`}
            />
            <InlineTextArea
              value={f.a}
              rows={3}
              placeholder="Answer"
              onChange={(a) => set(i, { a })}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        disabled={faq.length >= 50}
        onClick={() => onChange([...faq, { q: '', a: '' }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add question
      </Button>
    </div>
  );
}

export function CtaEditor({
  ctas,
  onChange,
}: {
  ctas: BlogCta[];
  onChange: (ctas: BlogCta[]) => void;
}) {
  const set = (i: number, patch: Partial<BlogCta>) =>
    onChange(ctas.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Buttons shown at the end of the article (up to {BLOG_CTA_MAX}).
      </p>
      {ctas.map((c, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
        >
          <input
            value={c.label}
            onChange={(e) => set(i, { label: e.target.value })}
            placeholder="Button label"
            aria-label={`Button ${i + 1} label`}
            className={`${inputClass} sm:w-56 sm:flex-none`}
          />
          <input
            value={c.href}
            onChange={(e) => set(i, { href: e.target.value })}
            placeholder="/check or https://…"
            aria-label={`Button ${i + 1} link`}
            spellCheck={false}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <div className="flex flex-none">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => onChange(move(ctas, i, i - 1))}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label="Remove button"
              onClick={() => onChange(ctas.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        disabled={ctas.length >= BLOG_CTA_MAX}
        onClick={() => onChange([...ctas, { label: '', href: '' }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add button
      </Button>
    </div>
  );
}
