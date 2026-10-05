'use client';

import type { PayoutTask } from '@/lib/payout-api';
import { formatLongDate } from '../format';
import { LinkButton } from '../primitives';
import { usePayoutStateQuery } from './usePayout';

/**
 * Open payout tasks on `/account` (E2 → "Review your refund decision",
 * E1 → "Release your refund"), as amber task banners linking to
 * `/account/payout/…`. Button labels are the A1/A2 e-mail buttons.
 */
const BUTTON: Record<PayoutTask['kind'], string> = {
  review_decision: 'Review my decision',
  release_refund: 'Authorise my payout',
};

export function PayoutTaskBanners() {
  const query = usePayoutStateQuery(true);
  const tasks = query.data?.tasks ?? [];
  if (!tasks.length) return null;
  return (
    <>
      {tasks.map((t) => (
        <div className="acc-banner" role="status" key={t.kind + t.id}>
          <div className="acc-banner-text">
            {t.dueDate ? (
              <p className="acc-banner-title">
                Review by {formatLongDate(t.dueDate)}
              </p>
            ) : null}
            <p className="acc-banner-body">{t.title}</p>
          </div>
          <LinkButton href={t.href} size="sm">
            {BUTTON[t.kind]}
          </LinkButton>
        </div>
      ))}
    </>
  );
}
