'use client';

import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getV0901Answers,
  setV0901Answers,
  type V0901AnswerKey,
  type V0901AnswersState,
} from '@/lib/admin-api';
import { ErrorText, Pill, formatDate } from '@/components/ui';

const yn = (v: boolean) => (v ? 'Ja' : 'Nein');

/**
 * V0901 answers 5.1 / 6.1 / 6.3 / 8.1 for a DRV refund case (owner answer,
 * 20 Oct 2026: fixed by default, but ops can change them, e.g. for a
 * survivor case). Editable until the firm's first download freezes the
 * pack. Renders nothing for cases without a V0901 (the case type is only
 * known to the backend), so the page passes its section chrome as `wrap`.
 */
export function V0901AnswersCard({
  claimId,
  wrap,
}: {
  claimId: string;
  wrap: (body: ReactNode) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-claim-v0901', claimId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => getV0901Answers(claimId),
  });
  const save = useMutation({
    mutationFn: (answers: Partial<Record<V0901AnswerKey, boolean | null>>) =>
      setV0901Answers(claimId, answers),
    onSuccess: (s: V0901AnswersState) => {
      queryClient.setQueryData(key, s);
      queryClient.invalidateQueries({ queryKey: ['admin-claim', claimId] });
    },
  });

  if (q.isLoading) return null;
  if (q.isError) {
    return wrap(
      <ErrorText error={q.error} fallback="Could not load the V0901 answers" />
    );
  }
  const s = q.data;
  if (!s?.applicable) return null;
  const locked = s.frozen || save.isPending;

  return wrap(
    <div>
      <p className="mb-3 text-xs text-gray-500">
        {s.frozen
          ? `The submission pack was generated${s.packGeneratedAt ? ` on ${formatDate(s.packGeneratedAt, true)}` : ''} and is frozen, so these answers can no longer change.`
          : 'Fixed answers from the annotated form unless changed here. Changes apply when the law firm downloads the pack; details for a "Ja" answer are completed by the lawyer.'}
      </p>
      <ul className="divide-y divide-gray-100">
        {s.questions.map((question) => {
          const changed = question.override !== null;
          const radioName = `v0901-${question.key}`;
          return (
            <li
              key={question.key}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="mr-1.5 tabular-nums text-gray-500">
                    {question.number}
                  </span>
                  {question.label}
                </p>
                <p className="text-xs text-gray-500" lang="de">
                  {question.textDe}
                </p>
              </div>
              <div className="flex flex-none items-center gap-3">
                <fieldset
                  className="flex gap-3 text-sm"
                  disabled={locked}
                  aria-label={`${question.number} ${question.label}`}
                >
                  {[true, false].map((v) => (
                    <label
                      key={String(v)}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="radio"
                        name={radioName}
                        checked={question.effective === v}
                        onChange={() => save.mutate({ [question.key]: v })}
                      />
                      {yn(v)}
                    </label>
                  ))}
                </fieldset>
                {changed ? (
                  <span className="flex items-center gap-2">
                    <Pill tone="wait">Changed</Pill>
                    {!s.frozen && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => save.mutate({ [question.key]: null })}
                        className="text-xs text-gray-600 underline hover:text-gray-900 disabled:opacity-50"
                      >
                        Reset to {yn(question.defaultValue)}
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Default</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {save.isError && (
        <div className="mt-2">
          <ErrorText error={save.error} fallback="Could not save the answer" />
        </div>
      )}
    </div>
  );
}
