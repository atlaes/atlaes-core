'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError, fmtDayTime, PortalColumn } from '@/components/portal/ui';
import { PageHead, SmallChip } from '@/components/portal-payouts/bits';
import {
  getLetters,
  LETTER_ACCEPT,
  LETTER_MAX_BYTES,
  LETTER_TYPE_LABELS,
  uploadLetter,
  type FirmLetter,
} from './api';

/**
 * Return channel — bulk letter upload (owner answer 6; styled after Figma
 * 07 "Statement upload", 1036:5253, and the 05 "Return channel" card).
 * The firm drops any number of scanned DRV letters, not tied to a case;
 * each file is read and matched server-side, two at a time. Letters that
 * cannot be matched safely go to ATLAES.
 */

const PARALLEL = 2;
const ALLOWED = new Set(LETTER_ACCEPT.split(','));

type ItemState =
  | { kind: 'waiting' }
  | { kind: 'uploading' }
  | { kind: 'processing' }
  | { kind: 'done'; letter: FirmLetter; duplicate: boolean }
  | { kind: 'failed'; error: string };

interface Item {
  key: string;
  file: File;
  state: ItemState;
}

const caseLine = (l: FirmLetter) =>
  l.case
    ? [l.case.name, l.case.lawFirmRef ? `AZ ${l.case.lawFirmRef}` : l.case.vsnr]
        .filter(Boolean)
        .join(' · ')
    : null;

function resultChip(l: FirmLetter) {
  if (l.status === 'matched')
    return <SmallChip tone="green">Matched</SmallChip>;
  if (l.status === 'resolved')
    return <SmallChip tone="green">Filed by ATLAES</SmallChip>;
  if (l.status === 'dismissed')
    return <SmallChip tone="gray">Not filed</SmallChip>;
  return <SmallChip tone="warn">Needs review</SmallChip>;
}

function resultText(l: FirmLetter): string {
  const c = caseLine(l);
  if (c) return `Case ${c}`;
  if (l.status === 'dismissed') return 'ATLAES: not a case letter';
  return 'With ATLAES — no safe match';
}

function itemStatus(it: Item) {
  switch (it.state.kind) {
    case 'waiting':
      return { chip: <SmallChip tone="gray">Waiting</SmallChip>, text: '' };
    case 'uploading':
      return {
        chip: <SmallChip tone="blue">Uploading…</SmallChip>,
        text: '',
      };
    case 'processing':
      return {
        chip: <SmallChip tone="blue">Processing…</SmallChip>,
        text: 'Reading the letter and looking for the case',
      };
    case 'failed':
      return {
        chip: <SmallChip tone="warn">Not uploaded</SmallChip>,
        text: it.state.error,
      };
    case 'done': {
      const l = it.state.letter;
      if (it.state.duplicate) {
        return {
          chip: <SmallChip tone="gray">Already uploaded</SmallChip>,
          text: `Uploaded ${fmtDayTime(l.createdAt)} · ${resultText(l)}`,
        };
      }
      return {
        chip: resultChip(l),
        text: `${LETTER_TYPE_LABELS[l.letterType]} · ${resultText(l)}`,
      };
    }
  }
}

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onFiles(files);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`relative flex w-full flex-col items-center gap-2.5 rounded-[20px] px-5 py-12 text-center sm:px-10 ${
        over ? 'bg-[#e7eef9]' : 'bg-[#f1f1f1]'
      }`}
    >
      {/* Figma: 1.5px #5e8cd9 border, dash 8/6, radius 20 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <rect
          x="0.75"
          y="0.75"
          style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)' }}
          rx="20"
          fill="none"
          stroke="#5e8cd9"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
      </svg>
      <span className="flex h-[52px] w-11 items-center justify-center rounded-lg border border-[#c6c6c6] bg-white">
        <span className="text-[9px] font-bold leading-none text-[#b42318]">
          PDF
        </span>
      </span>
      <p className="text-[18px] font-bold leading-[1.3] text-[#181818]">
        Drop scanned DRV letters here
      </p>
      <p className="text-[14px] leading-[1.5] text-[#8c8c8c]">
        or browse your files · PDF, JPG or PNG · max. 10 MB each · one letter
        per file, as many files as you like
      </p>
      <input
        ref={input}
        type="file"
        multiple
        accept={LETTER_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose letters"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex h-11 items-center rounded-full border border-[#002691] bg-white px-[22px] text-[14px] font-bold leading-[1.4] text-[#002691] hover:bg-[#f3f6fc]"
      >
        Choose files
      </button>
    </div>
  );
}

function Row({
  title,
  meta,
  chip,
  detail,
  first,
}: {
  title: string;
  meta?: string;
  chip: ReactNode;
  detail: string;
  first: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-4 ${
        first ? '' : 'border-t border-[#f1f1f1]'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="break-words text-[14px] font-semibold leading-[1.4] text-[#181818]">
          {title}
        </p>
        {(meta || detail) && (
          <p className="break-words text-[13px] leading-[1.5] text-[#4b4f58]">
            {[meta, detail].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <span className="self-start sm:self-center">{chip}</span>
    </li>
  );
}

export function LetterUpload() {
  const qc = useQueryClient();
  const recent = useQuery({ queryKey: ['firm-letters'], queryFn: getLetters });
  const [items, setItems] = useState<Item[]>([]);
  const queue = useRef<Item[]>([]);
  const running = useRef(0);

  const patch = (key: string, state: ItemState) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, state } : i)));

  const pump = () => {
    while (running.current < PARALLEL && queue.current.length) {
      const it = queue.current.shift()!;
      running.current += 1;
      patch(it.key, { kind: 'uploading' });
      uploadLetter(it.file, () => patch(it.key, { kind: 'processing' }))
        .then((r) =>
          patch(it.key, {
            kind: 'done',
            letter: r.letter,
            duplicate: r.duplicate,
          })
        )
        .catch((e) =>
          patch(it.key, {
            kind: 'failed',
            error: apiError(e, 'Upload failed. Try again.'),
          })
        )
        .finally(() => {
          running.current -= 1;
          if (!queue.current.length && running.current === 0) {
            qc.invalidateQueries({ queryKey: ['firm-letters'] });
          }
          pump();
        });
    }
  };

  const addFiles = (files: File[]) => {
    const added: Item[] = files.map((file, i) => {
      const key = `${Date.now()}-${i}-${file.name}`;
      if (!ALLOWED.has(file.type)) {
        return {
          key,
          file,
          state: { kind: 'failed', error: 'Only PDF, JPG or PNG files' },
        };
      }
      if (file.size > LETTER_MAX_BYTES) {
        return {
          key,
          file,
          state: { kind: 'failed', error: 'Larger than 10 MB' },
        };
      }
      return { key, file, state: { kind: 'waiting' } };
    });
    setItems((list) => [...added, ...list]);
    queue.current.push(...added.filter((i) => i.state.kind === 'waiting'));
    pump();
  };

  const done = items.filter(
    (i) => i.state.kind === 'done' && !i.state.duplicate
  );
  const matched = done.filter(
    (i) => i.state.kind === 'done' && i.state.letter.status === 'matched'
  ).length;
  const review = done.length - matched;
  const busy = items.some(
    (i) => i.state.kind === 'uploading' || i.state.kind === 'processing'
  );

  return (
    <PortalColumn>
      <PageHead eyebrow="Return channel" title="Letter upload" wide>
        Upload the letters the Deutsche Rentenversicherung sends you for our
        clients — Bescheide, requests for documents, rejections. You do not need
        to pick the case: each letter is read and filed to the case by VSNR plus
        client name, or by your Aktenzeichen. Letters without a safe match go to
        ATLAES for review.
      </PageHead>

      <DropZone onFiles={addFiles} />

      {items.length > 0 && (
        <section className="flex w-full flex-col gap-4 rounded-[20px] border border-[#c6c6c6] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
              This upload
            </h2>
            {busy && (
              <span className="text-[13px] text-[#8c8c8c]">
                Keep this page open until every letter is processed.
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <SmallChip tone="green" size={12}>
              {matched} matched
            </SmallChip>
            <SmallChip tone="warn" size={12}>
              {review} with ATLAES
            </SmallChip>
            <SmallChip tone="gray" size={12}>
              {items.length} files
            </SmallChip>
          </div>
          <ul className="flex w-full flex-col">
            {items.map((it, i) => {
              const s = itemStatus(it);
              return (
                <Row
                  key={it.key}
                  first={i === 0}
                  title={it.file.name}
                  chip={s.chip}
                  detail={s.text}
                />
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex w-full flex-col gap-4 rounded-[20px] border border-[#c6c6c6] bg-white p-5 sm:p-7">
        <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
          Recent uploads
        </h2>
        {recent.isLoading && (
          <p className="text-[13px] text-[#8c8c8c]">Loading…</p>
        )}
        {recent.data && recent.data.length === 0 && (
          <p className="text-[13px] text-[#8c8c8c]">No letters uploaded yet.</p>
        )}
        {recent.data && recent.data.length > 0 && (
          <ul className="flex w-full flex-col">
            {recent.data.map((l, i) => (
              <Row
                key={l.id}
                first={i === 0}
                title={l.fileName}
                meta={`${fmtDayTime(l.createdAt)}${
                  l.uploadedBy ? ` · ${l.uploadedBy}` : ''
                }`}
                chip={resultChip(l)}
                detail={`${LETTER_TYPE_LABELS[l.letterType]} · ${resultText(l)}`}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex w-full flex-col gap-2 rounded-[20px] bg-[#fbefc7] p-5 sm:p-7">
        <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
          How letters are matched
        </h2>
        <p className="text-[13px] leading-[1.5] text-[#6b4d00]">
          A letter is filed to a case only when its VSNR and client name, or
          your Aktenzeichen, point at exactly one of your cases. A client name
          alone is never enough. Everything else goes to the ATLAES review
          queue; ATLAES files it and decides the next step with the client.
        </p>
      </section>
    </PortalColumn>
  );
}
