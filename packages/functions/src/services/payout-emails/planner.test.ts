/**
 * Acceptance checks of the escrow payout spec (30 Oct 2026, "Build checks
 * and launch settings") against the pure planner.
 */
import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  planPayoutActions,
  type PlannedAction,
  type PlannerCase,
  type PlannerRelease,
} from './planner';
import { DEFAULT_PAYOUT_TIMERS } from '../ops-settings';

const timers = DEFAULT_PAYOUT_TIMERS.gpr;

const decision = {
  id: 'd1',
  atlaesReceivedAt: '2026-11-02',
  reviewBy: '2026-11-25',
  reviewOutcome: null,
} as const;

function release(over: Partial<PlannerRelease> = {}): PlannerRelease {
  return {
    id: 'r1',
    status: 'open',
    fundsRecordedOn: '2026-11-03',
    invitedOn: null,
    signable: true,
    route: 'A',
    queued: false,
    clientLinePaidOn: null,
    onward: { transferDate: null, hasReceipt: false, expectedArrival: null },
    expectedArrival: null,
    receiptStatus: null,
    ...over,
  };
}

function kase(over: Partial<PlannerCase> = {}): PlannerCase {
  return {
    claimId: 'c1',
    product: 'gpr',
    today: '2026-11-03',
    decision: { ...decision },
    pendingUpload: false,
    releases: [],
    payoutHold: false,
    contactPaused: false,
    decisionDirectToClient: false,
    sent: new Set(),
    timers,
    ...over,
  };
}

const emails = (a: PlannedAction[]) =>
  a.filter((x) => x.kind === 'email').map((x) => x.template);
const tasks = (a: PlannedAction[]) =>
  a.flatMap((x) => (x.kind === 'task' ? [x.task] : []));

describe('payout e-mail planner (spec acceptance checks)', () => {
  it('both items in either order: one E1A, no stale E1B', () => {
    const a = planPayoutActions(kase({ releases: [release()] }));
    expect(emails(a)).toEqual(['E1A']);
    const e1a = a[0] as Extract<PlannedAction, { kind: 'email' }>;
    expect(e1a).toMatchObject({
      key: 'E1:r1',
      marksInvitation: true,
      alsoKeys: ['RI:d1'],
    });
    // Sent once: a repeated event plans nothing new.
    expect(
      emails(
        planPayoutActions(
          kase({
            releases: [release({ invitedOn: '2026-11-03' })],
            sent: new Set(['E1:r1', 'RI:d1']),
          })
        )
      )
    ).toEqual([]);
  });

  it('decision only at day 10: admin task + E1B; nothing before', () => {
    expect(planPayoutActions(kase({ today: '2026-11-11' }))).toEqual([]);
    const a = planPayoutActions(kase({ today: '2026-11-12' }));
    expect(tasks(a)).toEqual(['missing_funds']);
    expect(emails(a)).toEqual(['E1B']);
  });

  it('decision only, review already done: admin only', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-12',
        decision: { ...decision, reviewOutcome: 'confirmed' },
      })
    );
    expect(tasks(a)).toEqual(['missing_funds']);
    expect(emails(a)).toEqual([]);
  });

  it('funds later: E1C after a completed review, E1A while it is open', () => {
    const done = planPayoutActions(
      kase({
        today: '2026-11-15',
        decision: { ...decision, reviewOutcome: 'confirmed' },
        releases: [release({ fundsRecordedOn: '2026-11-15' })],
        sent: new Set(['E1B:d1', 'RI:d1']),
      })
    );
    expect(emails(done)).toEqual(['E1C']);
    const open = planPayoutActions(
      kase({
        today: '2026-11-15',
        releases: [release({ fundsRecordedOn: '2026-11-15' })],
        sent: new Set(['E1B:d1', 'RI:d1']),
      })
    );
    expect(emails(open)).toEqual(['E1A']);
  });

  it('review due soon with funds missing: E1B at once and an admin alert', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-20',
        decision: { ...decision, atlaesReceivedAt: '2026-11-18' },
      })
    );
    expect(emails(a)).toEqual(['E1B']);
    expect(tasks(a)).toEqual(['review_late_document']);
  });

  it('funds only: EM at day 10, or at once when sent to the client directly', () => {
    const base = kase({ decision: null, releases: [release()] });
    expect(planPayoutActions(base)).toEqual([]);
    expect(
      emails(planPayoutActions({ ...base, decisionDirectToClient: true }))
    ).toEqual(['EM']);
    const day10 = planPayoutActions({ ...base, today: '2026-11-13' });
    expect(emails(day10)).toEqual(['EM']);
    expect(tasks(day10)).toEqual(['missing_decision']);
    // A client upload waits for admin verification: no further EM.
    expect(
      emails(
        planPayoutActions({ ...base, today: '2026-11-13', pendingUpload: true })
      )
    ).toEqual([]);
  });

  it('review done or issue reported: no further review requests', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-23',
        decision: { ...decision, reviewOutcome: 'disputed' },
        releases: [release({ invitedOn: '2026-11-03' })],
        sent: new Set(['E1:r1', 'RI:d1', 'E2:r1:7']),
      })
    );
    expect(emails(a)).toEqual(['E2C']);
  });

  it('reminders on day 7 and 14; one combined E2A when E2B is also due', () => {
    const sent = new Set(['E1:r1', 'RI:d1']);
    const day7 = planPayoutActions(
      kase({
        today: '2026-11-10',
        releases: [release({ invitedOn: '2026-11-03' })],
        sent,
      })
    );
    expect(emails(day7)).toEqual(['E2A']);
    const day14 = planPayoutActions(
      kase({
        today: '2026-11-22',
        decision: { ...decision, reviewBy: '2026-11-24' },
        releases: [release({ invitedOn: '2026-11-08' })],
        sent: new Set([...sent, 'E2:r1:7']),
      })
    );
    expect(emails(day14)).toEqual(['E2A']);
    expect(
      (day14[0] as Extract<PlannedAction, { kind: 'email' }>).alsoKeys
    ).toContain('E2B:d1');
  });

  it('review reminder E2B three days before the due date', () => {
    const a = planPayoutActions(
      kase({ today: '2026-11-22', sent: new Set(['E1B:d1', 'RI:d1']) })
    );
    expect(emails(a)).toEqual(['E2B']);
  });

  it('overdue review: urgent admin task, never a past-date reminder', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-26',
        sent: new Set(['E1B:d1', 'RI:d1', 'E2B:d1']),
      })
    );
    expect(emails(a)).toEqual([]);
    expect(a).toContainEqual(
      expect.objectContaining({ task: 'review_overdue', urgent: true })
    );
  });

  it('client unavailable: no routine reminders, deadline alerts stay', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-26',
        contactPaused: true,
        releases: [release({ invitedOn: '2026-11-10' })],
        sent: new Set(['E1:r1', 'RI:d1']),
      })
    );
    expect(emails(a)).toEqual([]);
    expect(tasks(a)).toEqual(['review_overdue']);
  });

  it('after a pause only the latest reminder goes; earlier ones settle', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-11-20',
        decision: { ...decision, reviewOutcome: 'confirmed' },
        releases: [release({ invitedOn: '2026-11-03' })],
        sent: new Set(['E1:r1', 'RI:d1']),
      })
    );
    expect(a).toEqual([
      expect.objectContaining({
        template: 'E2C',
        key: 'E2:r1:14',
        alsoKeys: ['E2:r1:7'],
      }),
    ]);
  });

  it('payout hold: no invitation or payout reminders', () => {
    expect(
      emails(
        planPayoutActions(kase({ payoutHold: true, releases: [release()] }))
      )
    ).toEqual([]);
  });

  it('30 days without a signature: personal follow-up, reminders stop', () => {
    const a = planPayoutActions(
      kase({
        today: '2026-12-03',
        decision: { ...decision, reviewOutcome: 'confirmed' },
        releases: [release({ invitedOn: '2026-11-03' })],
        sent: new Set(['E1:r1', 'E2:r1:7', 'E2:r1:14']),
      })
    );
    expect(emails(a)).toEqual([]);
    expect(tasks(a)).toEqual(['no_signature']);
  });

  it('signed and queued: E3 once', () => {
    const signed = release({ status: 'signed', queued: true });
    expect(emails(planPayoutActions(kase({ releases: [signed] })))).toEqual([
      'E3',
    ]);
    expect(
      emails(
        planPayoutActions(
          kase({ releases: [signed], sent: new Set(['E3:r1']) })
        )
      )
    ).toEqual([]);
  });

  it('weekend own-bank payment: E4A on Monday', () => {
    // 2026-11-07 is a Saturday.
    const paid = release({
      status: 'signed',
      queued: true,
      clientLinePaidOn: '2026-11-07',
    });
    const sent = new Set(['E3:r1']);
    expect(
      emails(
        planPayoutActions(kase({ today: '2026-11-08', releases: [paid], sent }))
      )
    ).toEqual([]);
    expect(
      emails(
        planPayoutActions(kase({ today: '2026-11-09', releases: [paid], sent }))
      )
    ).toEqual(['E4A']);
  });

  it('TransferMate funding alone never sends E4B; incomplete record → task', () => {
    const funded = release({
      status: 'signed',
      route: 'B',
      queued: true,
      clientLinePaidOn: '2026-11-09',
      onward: {
        transferDate: '2026-11-10',
        hasReceipt: false,
        expectedArrival: '2026-11-12',
      },
    });
    const a = planPayoutActions(
      kase({
        today: '2026-11-10',
        releases: [funded],
        sent: new Set(['E3:r1']),
      })
    );
    expect(emails(a)).toEqual([]);
    expect(tasks(a)).toEqual(['transfer_record_incomplete']);
    const done = planPayoutActions(
      kase({
        today: '2026-11-10',
        releases: [
          { ...funded, onward: { ...funded.onward, hasReceipt: true } },
        ],
        sent: new Set(['E3:r1']),
      })
    );
    expect(emails(done)).toEqual(['E4B']);
  });

  it('E5 two working days after the expected arrival, review invited once', () => {
    const r = release({
      status: 'signed',
      route: 'B',
      queued: true,
      clientLinePaidOn: '2026-11-09',
      onward: {
        transferDate: '2026-11-10',
        hasReceipt: true,
        expectedArrival: '2026-11-12',
      },
    });
    const sent = new Set(['E3:r1', 'E4:r1']);
    expect(
      emails(
        planPayoutActions(kase({ today: '2026-11-13', releases: [r], sent }))
      )
    ).toEqual([]);
    const a = planPayoutActions(
      kase({ today: '2026-11-16', releases: [r], sent })
    );
    expect(a).toEqual([
      expect.objectContaining({
        template: 'E5',
        inviteReview: true,
        alsoKeys: ['REVIEWINV:c1'],
      }),
    ]);
    // A later additional payout does not repeat the review invitation.
    const again = planPayoutActions(
      kase({
        today: '2026-11-16',
        releases: [{ ...r, id: 'r2' }],
        sent: new Set(['E3:r2', 'E4:r2', 'REVIEWINV:c1']),
      })
    );
    expect(again[0]).toMatchObject({ template: 'E5', inviteReview: false });
  });

  it('payment not received: investigation, no E5', () => {
    const r = release({
      status: 'signed',
      queued: true,
      clientLinePaidOn: '2026-11-09',
      expectedArrival: '2026-11-10',
      receiptStatus: 'not_received',
    });
    const a = planPayoutActions(
      kase({
        today: '2026-11-20',
        releases: [r],
        sent: new Set(['E3:r1', 'E4:r1']),
      })
    );
    expect(emails(a)).toEqual([]);
    expect(tasks(a)).toEqual(['payment_not_received']);
  });

  it('direct payment without an arrival estimate leaves E5 unscheduled', () => {
    const r = release({
      status: 'signed',
      queued: true,
      clientLinePaidOn: '2026-11-09',
    });
    expect(
      emails(
        planPayoutActions(
          kase({
            today: '2026-12-20',
            releases: [r],
            sent: new Set(['E3:r1', 'E4:r1']),
          })
        )
      )
    ).toEqual([]);
  });

  it('adds working days across a weekend', () => {
    expect(addWorkingDays('2026-11-06', 2)).toBe('2026-11-10');
  });
});
