import { describe, expect, it } from 'vitest';
import {
  caseIdentifier,
  caseTypeForPensionType,
  caseTypeLabel,
  defaultHandlingRoute,
  deriveCaseTypeOnCreate,
  isBavCashout,
  resolveCaseType,
} from './claims';

describe('defaultHandlingRoute(caseType, pensionType)', () => {
  it('sends bAV cash-outs and DRV refunds to the law firm, VBL direct', () => {
    expect(defaultHandlingRoute('bav_cashout')).toBe('law_firm');
    expect(defaultHandlingRoute('drv_refund')).toBe('law_firm');
    expect(defaultHandlingRoute('vbl_refund')).toBe('direct');
  });

  it('falls back to the legacy pension type when case_type is missing', () => {
    expect(defaultHandlingRoute(null, 'private')).toBe('law_firm');
    expect(defaultHandlingRoute(undefined, 'public')).toBe('direct');
    expect(defaultHandlingRoute(null, null)).toBe('direct');
    expect(defaultHandlingRoute('garbage', 'private')).toBe('law_firm');
  });
});

describe('resolveCaseType / backfill rule', () => {
  it('prefers the stored case type', () => {
    expect(
      resolveCaseType({ caseType: 'drv_refund', pensionType: 'private' })
    ).toBe('drv_refund');
  });

  it('mirrors migration 0014 for legacy rows', () => {
    expect(resolveCaseType({ pensionType: 'private' })).toBe('bav_cashout');
    expect(resolveCaseType({ pensionType: null, applicationId: 'app-1' })).toBe(
      'drv_refund'
    );
    expect(resolveCaseType({ pensionType: 'public' })).toBe('vbl_refund');
    expect(resolveCaseType({})).toBe('vbl_refund');
  });

  it('caseTypeForPensionType follows the VBL app', () => {
    expect(caseTypeForPensionType('private')).toBe('bav_cashout');
    expect(caseTypeForPensionType('public')).toBe('vbl_refund');
  });

  it('isBavCashout', () => {
    expect(isBavCashout({ caseType: 'bav_cashout' })).toBe(true);
    expect(isBavCashout({ caseType: null, pensionType: 'private' })).toBe(true);
    expect(isBavCashout({ caseType: 'drv_refund' })).toBe(false);
  });
});

describe('deriveCaseTypeOnCreate (POST /claims)', () => {
  it('explicit caseType wins', () => {
    expect(
      deriveCaseTypeOnCreate({ caseType: 'bav_cashout', applicationId: 'x' })
    ).toBe('bav_cashout');
  });

  it('GPR app: applicationId or GPR origin → drv_refund', () => {
    expect(deriveCaseTypeOnCreate({ applicationId: 'app' })).toBe('drv_refund');
    expect(
      deriveCaseTypeOnCreate({
        origin: 'https://www.germanypensionrefund.com',
      })
    ).toBe('drv_refund');
    expect(deriveCaseTypeOnCreate({ origin: 'http://localhost:3002' })).toBe(
      'drv_refund'
    );
  });

  it('VBL app: nothing passed → vbl_refund', () => {
    expect(deriveCaseTypeOnCreate({})).toBe('vbl_refund');
    expect(deriveCaseTypeOnCreate({ origin: 'https://vblrefund.com' })).toBe(
      'vbl_refund'
    );
    expect(deriveCaseTypeOnCreate({ caseType: 'nope' })).toBe('vbl_refund');
  });
});

describe('law-firm portal labels', () => {
  it('labels cases by case type', () => {
    expect(caseTypeLabel('drv_refund')).toBe('DRV refund');
    expect(caseTypeLabel('bav_cashout')).toBe('Company pension');
    expect(caseTypeLabel('vbl_refund')).toBe('Pension refund');
    expect(caseTypeLabel(null)).toBe('Pension refund');
  });

  it('caseIdentifier: VSNR for DRV, contract number for bAV, none for VBL', () => {
    expect(
      caseIdentifier({
        caseType: 'drv_refund',
        vsnr: '65 120390 S 512',
        bavContractReference: 'K-1',
      })
    ).toEqual({ label: 'VSNR', value: '65 120390 S 512' });
    expect(
      caseIdentifier({
        caseType: 'bav_cashout',
        vsnr: '65 120390 S 512',
        bavContractReference: ' 4711-0815 ',
      })
    ).toEqual({ label: 'Contract number', value: '4711-0815' });
    expect(caseIdentifier({ caseType: 'bav_cashout' })).toEqual({
      label: 'Contract number',
      value: null,
    });
    expect(caseIdentifier({ caseType: 'vbl_refund', vsnr: 'x' })).toBeNull();
  });
});
