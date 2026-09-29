import { describe, expect, it } from 'vitest';
import {
  addCalendarMonths,
  addDays,
  computeWarnings,
  draftReadyDate,
  initialNextUpdateDue,
  isDraftDue,
  isFortnightlyPhase,
  isPostingDateUnconfirmed,
  latestNextUpdate,
  milestones,
  nextScheduledOfficeAction,
  nextUpdateDueAfterSend,
  previousWorkingDay,
  stageFor,
  transferConfirmReceiptDue,
  updateIntervalDays,
} from './schedule';

describe('addCalendarMonths (month-end clamping)', () => {
  it('keeps the day when it exists in the target month', () => {
    expect(addCalendarMonths('2026-09-15', 3)).toBe('2026-12-15');
  });
  it('clamps 31 Jan + 1 to the last day of February', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addCalendarMonths('2028-01-31', 1)).toBe('2028-02-29'); // leap year
  });
  it('clamps 31 Aug + 3 to 30 Nov', () => {
    expect(addCalendarMonths('2026-08-31', 3)).toBe('2026-11-30');
  });
  it('rolls over the year', () => {
    expect(addCalendarMonths('2026-10-31', 6)).toBe('2027-04-30');
    expect(addCalendarMonths('2026-11-30', 5)).toBe('2027-04-30');
  });
});

describe('milestones (all from the submission date)', () => {
  it('computes +28 days, +3, +5, +6 months', () => {
    const m = milestones('2026-09-16');
    expect(m.firstUpdateDue).toBe('2026-10-14');
    expect(m.statusEnquiryDue).toBe('2026-12-16');
    expect(m.writtenReminderReviewDue).toBe('2027-02-16');
    expect(m.seniorReviewDue).toBe('2027-03-16');
    expect(m.fortnightlyFrom).toBe('2027-03-16');
  });
  it('clamps the milestones for a month-end submission', () => {
    const m = milestones('2026-08-31');
    expect(m.statusEnquiryDue).toBe('2026-11-30');
    expect(m.writtenReminderReviewDue).toBe('2027-01-31');
    expect(m.seniorReviewDue).toBe('2027-02-28');
  });
  it('first update due = M0 + 28 days', () => {
    expect(initialNextUpdateDue('2026-09-16')).toBe('2026-10-14');
  });
});

describe('update interval (≤ 28 days, ≤ 14 from + 6 months)', () => {
  const submitted = '2026-09-16'; // six months = 2027-03-16
  it('is 28 days while well before six months', () => {
    expect(updateIntervalDays(submitted, '2026-10-14')).toBe(28);
    expect(latestNextUpdate(submitted, '2026-10-14')).toBe('2026-11-11');
  });
  it('is 14 days from the six-month mark', () => {
    expect(updateIntervalDays(submitted, '2027-03-16')).toBe(14);
    expect(updateIntervalDays(submitted, '2027-05-01')).toBe(14);
  });
  it('pulls the next update forward when 28 days would cross six months', () => {
    // 2027-02-20 + 28 = 2027-03-20 ≥ 2027-03-16 → 14-day gap instead.
    expect(updateIntervalDays(submitted, '2027-02-20')).toBe(14);
    expect(latestNextUpdate(submitted, '2027-02-20')).toBe('2027-03-06');
    // 2027-02-10 + 28 = 2027-03-10 < 2027-03-16 → still 28.
    expect(updateIntervalDays(submitted, '2027-02-10')).toBe(28);
  });
  it('fortnightly phase flag', () => {
    expect(isFortnightlyPhase(submitted, '2027-03-15')).toBe(false);
    expect(isFortnightlyPhase(submitted, '2027-03-16')).toBe(true);
  });
});

describe('nextUpdateDueAfterSend', () => {
  const submissionDate = '2026-09-16';
  it('uses the promised date when inside the interval', () => {
    expect(
      nextUpdateDueAfterSend({
        submissionDate,
        sentOn: '2026-10-14',
        promisedDate: '2026-11-01',
      })
    ).toBe('2026-11-01');
  });
  it('clamps a promise beyond 28 days', () => {
    expect(
      nextUpdateDueAfterSend({
        submissionDate,
        sentOn: '2026-10-14',
        promisedDate: '2026-12-01',
      })
    ).toBe('2026-11-11');
  });
  it('falls back to the interval without a promise or with a past date', () => {
    expect(
      nextUpdateDueAfterSend({ submissionDate, sentOn: '2026-10-14' })
    ).toBe('2026-11-11');
    expect(
      nextUpdateDueAfterSend({
        submissionDate,
        sentOn: '2026-10-14',
        promisedDate: '2026-10-01',
      })
    ).toBe('2026-11-11');
  });
  it('clamps to 14 days after six months', () => {
    expect(
      nextUpdateDueAfterSend({
        submissionDate,
        sentOn: '2027-04-01',
        promisedDate: '2027-04-28',
      })
    ).toBe('2027-04-15');
  });
});

describe('draft ready ≥ 1 working day before the promised date', () => {
  it('previous working day skips the weekend', () => {
    expect(previousWorkingDay('2026-10-12')).toBe('2026-10-09'); // Mon → Fri
    expect(previousWorkingDay('2026-10-14')).toBe('2026-10-13'); // Wed → Tue
    expect(previousWorkingDay('2026-10-11')).toBe('2026-10-09'); // Sun → Fri
  });
  it('draft is due from the previous working day on', () => {
    expect(draftReadyDate('2026-10-14')).toBe('2026-10-13');
    expect(isDraftDue('2026-10-14', '2026-10-12')).toBe(false);
    expect(isDraftDue('2026-10-14', '2026-10-13')).toBe(true);
    expect(isDraftDue('2026-10-14', '2026-10-14')).toBe(true);
  });
});

describe('posting date unconfirmed 7 days after handoff', () => {
  it('fires on day 7 without a submission date', () => {
    expect(isPostingDateUnconfirmed('2026-09-01', null, '2026-09-07')).toBe(
      false
    );
    expect(isPostingDateUnconfirmed('2026-09-01', null, '2026-09-08')).toBe(
      true
    );
  });
  it('never fires with a submission date or without a handoff', () => {
    expect(
      isPostingDateUnconfirmed('2026-09-01', '2026-09-03', '2026-09-30')
    ).toBe(false);
    expect(isPostingDateUnconfirmed(null, null, '2026-09-30')).toBe(false);
  });
});

describe('computeWarnings', () => {
  const base = {
    handoffDate: '2026-09-01',
    submissionDate: '2026-09-03',
    nextClientUpdateDue: '2026-10-01',
    lastClientUpdateSent: '2026-09-03',
    nextOfficeAction: null,
    decisionReceivedAt: null,
    fundsReceivedAt: null,
    stoppedAt: null,
  };
  it('customer update overdue the day after the promised date', () => {
    expect(computeWarnings(base, '2026-10-01')).toEqual([]);
    expect(computeWarnings(base, '2026-10-02').map((w) => w.kind)).toEqual([
      'customer_update_overdue',
    ]);
  });
  it('office action overdue does not suppress the customer warning', () => {
    const kinds = computeWarnings(
      {
        ...base,
        nextOfficeAction: {
          type: 'status_enquiry',
          label: 'Status enquiry',
          dueDate: '2026-09-20',
          status: 'open',
        },
      },
      '2026-10-02'
    ).map((w) => w.kind);
    expect(kinds).toEqual(['customer_update_overdue', 'office_action_overdue']);
  });
  it('a completed office action clears only its own warning', () => {
    const kinds = computeWarnings(
      {
        ...base,
        nextOfficeAction: {
          type: 'status_enquiry',
          label: 'Status enquiry',
          dueDate: '2026-09-20',
          status: 'done',
        },
      },
      '2026-10-02'
    ).map((w) => w.kind);
    expect(kinds).toEqual(['customer_update_overdue']);
  });
  it('posting date unconfirmed and funds before decision', () => {
    const kinds = computeWarnings(
      {
        ...base,
        submissionDate: null,
        nextClientUpdateDue: null,
        fundsReceivedAt: '2026-09-20',
      },
      '2026-09-30'
    ).map((w) => w.kind);
    expect(kinds).toEqual([
      'posting_date_unconfirmed',
      'funds_before_decision',
    ]);
  });
  it('a stopped sequence raises no update/office warnings', () => {
    const kinds = computeWarnings(
      {
        ...base,
        stoppedAt: '2026-09-25',
        decisionReceivedAt: '2026-09-25',
        nextOfficeAction: {
          type: 'status_enquiry',
          label: 'x',
          dueDate: '2026-09-20',
          status: 'open',
        },
      },
      '2026-10-10'
    );
    expect(kinds).toEqual([]);
  });
});

describe('office actions and stage', () => {
  it('next scheduled office action walks the milestones', () => {
    expect(nextScheduledOfficeAction('2026-09-16', '2026-09-20')?.type).toBe(
      'status_enquiry'
    );
    expect(nextScheduledOfficeAction('2026-09-16', '2026-12-17')?.type).toBe(
      'written_reminder_review'
    );
    expect(nextScheduledOfficeAction('2026-09-16', '2027-02-17')?.type).toBe(
      'senior_review'
    );
    expect(nextScheduledOfficeAction('2026-09-16', '2027-03-17')).toBeNull();
  });
  it('transfer adds a confirm-receipt action without moving the clock', () => {
    expect(transferConfirmReceiptDue('2026-11-02')).toBe('2026-11-16');
    expect(addDays('2026-11-02', 14)).toBe('2026-11-16');
  });
  it('stage never shows payout without a decision', () => {
    expect(
      stageFor({
        submissionDate: null,
        decisionReceivedAt: null,
        fundsReceivedAt: null,
      })
    ).toBe('preparing');
    expect(
      stageFor({
        submissionDate: '2026-09-16',
        decisionReceivedAt: null,
        fundsReceivedAt: null,
      })
    ).toBe('submitted');
    expect(
      stageFor({
        submissionDate: '2026-09-16',
        decisionReceivedAt: null,
        fundsReceivedAt: '2026-12-01',
      })
    ).toBe('submitted');
    expect(
      stageFor({
        submissionDate: '2026-09-16',
        decisionReceivedAt: '2026-12-01',
        fundsReceivedAt: null,
      })
    ).toBe('decision');
    expect(
      stageFor({
        submissionDate: '2026-09-16',
        decisionReceivedAt: '2026-12-01',
        fundsReceivedAt: '2026-12-05',
      })
    ).toBe('payout');
  });
});
