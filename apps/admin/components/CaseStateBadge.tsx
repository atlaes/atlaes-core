import { CASE_STATE_LABELS, LawFirmCaseState } from '@/lib/law-firm-api';

export function CaseStateBadge({ state }: { state: LawFirmCaseState }) {
  const styles: Record<LawFirmCaseState, string> = {
    new: 'bg-blue-100 text-blue-700',
    downloaded: 'bg-gray-100 text-gray-700',
    submitted: 'bg-yellow-100 text-yellow-800',
    response_received: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-200 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[state]}`}
    >
      {CASE_STATE_LABELS[state]}
    </span>
  );
}
