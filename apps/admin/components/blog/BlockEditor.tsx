'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { BlogBlock, BlogBlockType } from '@/lib/blog-api';
import { Button, inputClass } from '@/components/ui';
import { INLINE_HINT, ImageUrlInput, InlineTextArea } from './bits';

/** Editor-side block: the stored block plus a stable React key. */
export type EditorBlock = BlogBlock & { _k: number };

let nextKey = 1;
export const withKey = (b: BlogBlock): EditorBlock => ({ ...b, _k: nextKey++ });
export const stripKey = ({ _k, ...b }: EditorBlock): BlogBlock => {
  void _k;
  return b as BlogBlock;
};

export const BLOCK_LABEL: Record<BlogBlockType, string> = {
  p: 'Paragraph',
  h2: 'Heading (H2)',
  h3: 'Subheading (H3)',
  ul: 'Bullet list',
  ol: 'Numbered list',
  quote: 'Quote',
  note: 'Note',
  table: 'Table',
  img: 'Image',
};

const BLOCK_ORDER: BlogBlockType[] = [
  'p',
  'h2',
  'h3',
  'ul',
  'ol',
  'quote',
  'note',
  'table',
  'img',
];

export function emptyBlock(t: BlogBlockType): BlogBlock {
  switch (t) {
    case 'p':
    case 'quote':
    case 'note':
      return { t, md: '' };
    case 'h2':
    case 'h3':
      return { t, text: '' };
    case 'ul':
    case 'ol':
      return { t, items: [''] };
    case 'table':
      return {
        t,
        rows: [
          ['', ''],
          ['', ''],
        ],
      };
    case 'img':
      return { t, url: '', alt: '' };
  }
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
}) {
  const update = (i: number, b: BlogBlock) =>
    onChange(blocks.map((x, j) => (j === i ? { ...b, _k: x._k } : x)));
  const insert = (i: number, t: BlogBlockType) => {
    const next = blocks.slice();
    next.splice(i, 0, withKey(emptyBlock(t)));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{INLINE_HINT}</p>
      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
          The body is empty. Add a paragraph or heading to start.
        </p>
      )}
      {blocks.map((b, i) => (
        <div
          key={b._k}
          className="rounded-md border border-gray-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {BLOCK_LABEL[b.t]}
            </span>
            <div className="flex gap-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move up"
                title="Move up"
                disabled={i === 0}
                onClick={() => onChange(move(blocks, i, i - 1))}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move down"
                title="Move down"
                disabled={i === blocks.length - 1}
                onClick={() => onChange(move(blocks, i, i + 1))}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                aria-label="Delete block"
                title="Delete block"
                onClick={() => {
                  const empty =
                    JSON.stringify(stripKey(b)) ===
                    JSON.stringify(emptyBlock(b.t));
                  if (empty || window.confirm('Delete this block?')) {
                    onChange(blocks.filter((_, j) => j !== i));
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <BlockFields block={b} onChange={(nb) => update(i, nb)} />
          <AddBlockMenu
            compact
            onAdd={(t) => insert(i + 1, t)}
            label="Insert below"
          />
        </div>
      ))}
      <AddBlockMenu onAdd={(t) => insert(blocks.length, t)} label="Add block" />
    </div>
  );
}

function AddBlockMenu({
  onAdd,
  label,
  compact,
}: {
  onAdd: (t: BlogBlockType) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${compact ? 'mt-2 border-t border-gray-100 pt-2' : ''}`}
    >
      <span className="mr-1 inline-flex items-center gap-1 text-xs text-gray-500">
        <Plus className="h-3.5 w-3.5" />
        {label}:
      </span>
      {BLOCK_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onAdd(t)}
          className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          {BLOCK_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: BlogBlock;
  onChange: (b: BlogBlock) => void;
}) {
  switch (block.t) {
    case 'p':
      return (
        <InlineTextArea
          value={block.md}
          rows={4}
          onChange={(md) => onChange({ ...block, md })}
        />
      );
    case 'quote':
    case 'note':
      return (
        <InlineTextArea
          value={block.md}
          rows={3}
          placeholder={block.t === 'note' ? 'Highlighted note' : 'Quote'}
          onChange={(md) => onChange({ ...block, md })}
        />
      );
    case 'h2':
    case 'h3':
      return (
        <input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Heading text"
          className={`${inputClass} font-semibold`}
        />
      );
    case 'ul':
    case 'ol':
      return <ListFields block={block} onChange={onChange} />;
    case 'table':
      return <TableFields block={block} onChange={onChange} />;
    case 'img':
      return (
        <div className="space-y-2">
          <ImageUrlInput
            value={block.url}
            alt={block.alt}
            onChange={(url) => onChange({ ...block, url })}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={block.alt}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              placeholder="Alt text (required): what the image shows"
              className={inputClass}
            />
            <input
              value={block.caption ?? ''}
              onChange={(e) => {
                const caption = e.target.value;
                onChange(
                  caption
                    ? { ...block, caption }
                    : { t: 'img', url: block.url, alt: block.alt }
                );
              }}
              placeholder="Caption (optional)"
              className={inputClass}
            />
          </div>
        </div>
      );
  }
}

function ListFields({
  block,
  onChange,
}: {
  block: Extract<BlogBlock, { t: 'ul' | 'ol' }>;
  onChange: (b: BlogBlock) => void;
}) {
  const set = (items: string[]) => onChange({ ...block, items });
  return (
    <div className="space-y-2">
      {block.items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-9 w-5 flex-none text-right text-xs text-gray-400">
            {block.t === 'ol' ? `${i + 1}.` : '•'}
          </span>
          <InlineTextArea
            className="min-w-0 flex-1"
            value={item}
            rows={1}
            onChange={(v) => set(block.items.map((x, j) => (j === i ? v : x)))}
          />
          <div className="mt-8 flex flex-none">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Move item up"
              disabled={i === 0}
              onClick={() => set(move(block.items, i, i - 1))}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label="Remove item"
              disabled={block.items.length === 1}
              onClick={() => set(block.items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        disabled={block.items.length >= 50}
        onClick={() => set([...block.items, ''])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}

function TableFields({
  block,
  onChange,
}: {
  block: Extract<BlogBlock, { t: 'table' }>;
  onChange: (b: BlogBlock) => void;
}) {
  const rows = block.rows.length ? block.rows : [['']];
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const set = (next: string[][]) => onChange({ ...block, rows: next });
  const setCell = (r: number, c: number, v: string) =>
    set(
      rows.map((row, i) =>
        i === r
          ? Array.from({ length: cols }, (_, j) =>
              j === c ? v : (row[j] ?? '')
            )
          : row
      )
    );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c} className="p-0.5">
                    <input
                      value={row[c] ?? ''}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      placeholder={r === 0 ? 'Header' : ''}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      className={`${inputClass} min-w-[120px] ${r === 0 ? 'bg-gray-50 font-semibold' : ''}`}
                    />
                  </td>
                ))}
                <td className="p-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    aria-label={`Remove row ${r + 1}`}
                    title="Remove row"
                    disabled={rows.length === 1}
                    onClick={() => set(rows.filter((_, i) => i !== r))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c} className="p-0.5 text-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Remove column"
                    aria-label={`Remove column ${c + 1}`}
                    disabled={cols === 1}
                    onClick={() =>
                      set(rows.map((row) => row.filter((_, j) => j !== c)))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Column
                  </Button>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={rows.length >= 60}
          onClick={() => set([...rows, Array.from({ length: cols }, () => '')])}
        >
          <Plus className="h-3.5 w-3.5" />
          Row
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={cols >= 10}
          onClick={() =>
            set(
              rows.map((row) => [
                ...Array.from({ length: cols }, (_, j) => row[j] ?? ''),
                '',
              ])
            )
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Column
        </Button>
        <span className="self-center text-xs text-gray-400">
          The first row is the header.
        </span>
      </div>
    </div>
  );
}
