import { describe, it, expect } from 'vitest';
import { canRecordEvent, maskIban, nextCaseState } from './law-firm';

// Pure case-state rules for the law-firm portal. No database needed.

describe('nextCaseState', () => {
  it('starts at new and moves forward per event', () => {
    expect(nextCaseState(null, 'downloaded')).toBe('downloaded');
    expect(nextCaseState('new', 'submitted')).toBe('submitted');
    expect(nextCaseState('downloaded', 'submitted')).toBe('submitted');
    expect(nextCaseState('submitted', 'response_received')).toBe(
      'response_received'
    );
    expect(nextCaseState('response_received', 'closed')).toBe('closed');
  });

  it('never moves backwards on a repeated earlier event', () => {
    expect(nextCaseState('submitted', 'downloaded')).toBe('submitted');
    expect(nextCaseState('response_received', 'submitted')).toBe(
      'response_received'
    );
    expect(nextCaseState('response_received', 'response_received')).toBe(
      'response_received'
    );
  });

  it('allows closing from any state', () => {
    expect(nextCaseState('new', 'closed')).toBe('closed');
    expect(nextCaseState('downloaded', 'closed')).toBe('closed');
  });
});

describe('canRecordEvent', () => {
  it('refuses anything on a closed case', () => {
    expect(canRecordEvent('closed', 'downloaded')).toEqual({
      ok: false,
      reason: 'The case is closed',
    });
    expect(canRecordEvent('closed', 'closed').ok).toBe(false);
  });

  it('needs a submission before a response', () => {
    expect(canRecordEvent('new', 'response_received').ok).toBe(false);
    expect(canRecordEvent('downloaded', 'response_received').ok).toBe(false);
    expect(canRecordEvent('submitted', 'response_received').ok).toBe(true);
    expect(canRecordEvent('response_received', 'response_received').ok).toBe(
      true
    );
  });

  it('lets the firm submit without a recorded download', () => {
    expect(canRecordEvent(null, 'submitted').ok).toBe(true);
    expect(canRecordEvent('new', 'closed').ok).toBe(true);
  });
});

describe('maskIban', () => {
  it('keeps the first and last four characters', () => {
    expect(maskIban('DE89 3704 0044 0532 0130 00')).toBe('DE89 **** **** 3000');
    expect(maskIban('DE89370400440532013000')).toBe('DE89 **** **** 3000');
  });

  it('passes through short or empty values', () => {
    expect(maskIban(null)).toBeNull();
    expect(maskIban('DE123')).toBe('DE123');
  });
});
