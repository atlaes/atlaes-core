import { describe, expect, it } from 'vitest';
import {
  caseCopyBlock,
  caseVisibility,
  downloadGate,
  isSubmissionOverdue,
  isValidAktenzeichen,
  normalizeAktenzeichen,
  rereleaseUntil,
  submissionDeadline,
  submissionPackFileName,
} from './law-firm-rules';

const d = (iso: string) => new Date(iso);

describe('Aktenzeichen', () => {
  it('accepts 12345-YY and trims', () => {
    expect(normalizeAktenzeichen(' 06152-26 ')).toBe('06152-26');
    expect(isValidAktenzeichen('00001-99')).toBe(true);
  });

  it('rejects other shapes', () => {
    for (const v of [
      '6152-26',
      '06152-2026',
      '06152/26',
      'AZ 06152-26',
      '',
      null,
      undefined,
      '061526',
    ]) {
      expect(isValidAktenzeichen(v)).toBe(false);
    }
  });
});

describe('caseVisibility', () => {
  const now = d('2026-09-24T10:00:00Z');

  it('is hidden until released, visible after, hidden once submitted', () => {
    expect(
      caseVisibility({
        releasedAt: null,
        firmSubmittedAt: null,
        rereleasedUntil: null,
        now,
      })
    ).toBe('not_released');
    expect(
      caseVisibility({
        releasedAt: d('2026-09-21T00:00:00Z'),
        firmSubmittedAt: null,
        rereleasedUntil: null,
        now,
      })
    ).toBe('visible');
    expect(
      caseVisibility({
        releasedAt: d('2026-09-21T00:00:00Z'),
        firmSubmittedAt: d('2026-09-23T00:00:00Z'),
        rereleasedUntil: null,
        now,
      })
    ).toBe('submitted');
  });

  it('re-opens for the re-release window only', () => {
    const base = {
      releasedAt: d('2026-09-21T00:00:00Z'),
      firmSubmittedAt: d('2026-09-23T00:00:00Z'),
    };
    expect(
      caseVisibility({
        ...base,
        rereleasedUntil: d('2026-09-25T10:00:00Z'),
        now,
      })
    ).toBe('rereleased');
    expect(
      caseVisibility({
        ...base,
        rereleasedUntil: d('2026-09-24T09:59:00Z'),
        now,
      })
    ).toBe('submitted');
  });
});

describe('downloadGate', () => {
  const released = {
    releasedAt: d('2026-09-21T00:00:00Z'),
    firmSubmittedAt: null,
    rereleasedUntil: null,
  };

  it('needs release first, then a valid AZ', () => {
    expect(
      downloadGate({ ...released, releasedAt: null, lawFirmRef: '06152-26' })
    ).toEqual({
      ok: false,
      reason: 'The case is not released to the firm',
    });
    expect(downloadGate({ ...released, lawFirmRef: null }).ok).toBe(false);
    expect(downloadGate({ ...released, lawFirmRef: 'abc' }).ok).toBe(false);
    expect(downloadGate({ ...released, lawFirmRef: '06152-26' })).toEqual({
      ok: true,
    });
  });
});

describe('overdue submission', () => {
  it('warns 7 days after download when nothing was submitted and no warning was sent', () => {
    const downloadedAt = d('2026-09-22T09:00:00Z');
    expect(
      isSubmissionOverdue({
        downloadedAt,
        firmSubmittedAt: null,
        overdueWarnedAt: null,
        now: d('2026-09-29T08:59:00Z'),
      })
    ).toBe(false);
    expect(
      isSubmissionOverdue({
        downloadedAt,
        firmSubmittedAt: null,
        overdueWarnedAt: null,
        now: d('2026-09-29T09:00:00Z'),
      })
    ).toBe(true);
    expect(
      isSubmissionOverdue({
        downloadedAt,
        firmSubmittedAt: d('2026-09-25T00:00:00Z'),
        overdueWarnedAt: null,
        now: d('2026-10-05T00:00:00Z'),
      })
    ).toBe(false);
    expect(
      isSubmissionOverdue({
        downloadedAt,
        firmSubmittedAt: null,
        overdueWarnedAt: d('2026-09-29T09:01:00Z'),
        now: d('2026-10-05T00:00:00Z'),
      })
    ).toBe(false);
    expect(
      isSubmissionOverdue({
        downloadedAt: null,
        firmSubmittedAt: null,
        overdueWarnedAt: null,
      })
    ).toBe(false);
  });

  it('computes the deadline and the re-release window', () => {
    expect(submissionDeadline(d('2026-09-22T09:00:00Z')).toISOString()).toBe(
      '2026-09-29T09:00:00.000Z'
    );
    expect(rereleaseUntil(d('2026-09-24T10:00:00Z')).toISOString()).toBe(
      '2026-09-26T10:00:00.000Z'
    );
  });
});

describe('copy helpers', () => {
  it('builds the file name and the copy block', () => {
    expect(submissionPackFileName('06152-26', 'Sharma', 'Priya')).toBe(
      'Einreichung_06152-26_Sharma_Priya.pdf'
    );
    expect(
      submissionPackFileName('06152-26', 'Müller-Lüdenscheidt', null)
    ).toBe('Einreichung_06152-26_Muller-Ludenscheidt.pdf');
    expect(
      caseCopyBlock([
        { label: 'Name', value: 'Priya Sharma' },
        { label: 'VSNR', value: '  65 120390 S 512 ' },
        { label: 'Phone', value: '' },
        { label: 'Tax ID', value: null },
      ])
    ).toBe('Name: Priya Sharma\nVSNR: 65 120390 S 512');
  });
});
