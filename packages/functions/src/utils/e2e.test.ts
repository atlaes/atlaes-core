import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { SESClient } from '@aws-sdk/client-ses';
import {
  E2E_EMAIL_DOMAIN,
  E2E_SECRET_HEADER,
  evaluateE2eRequest,
  getE2eConfig,
  isE2eRequest,
  isE2eTestAddress,
} from './e2e';
import { e2eEnvSchema } from './env';
import { logger } from './logger';
import {
  sendClaimStoppedEmail,
  sendContractWithdrawalEmail,
  sendLawFirmInviteEmail,
  sendMagicLinkEmail,
} from '../services/email';
import { sendClientUpdateEmail } from '../services/client-updates/emails/send';
import { sendLeadMail } from '../services/leads/emails/send';

const SECRET = 'e2e-secret-for-unit-tests-0123456789abcdef';
const STAGING = { secret: SECRET, stage: 'staging' };

describe('e2eEnvSchema', () => {
  it('treats empty strings (SST unset value) as unset', () => {
    const parsed = e2eEnvSchema.parse({ APP_STAGE: '', E2E_LOGIN_SECRET: '' });
    expect(parsed.APP_STAGE).toBeUndefined();
    expect(parsed.E2E_LOGIN_SECRET).toBeUndefined();
  });

  it('accepts a 32+ character secret', () => {
    const parsed = e2eEnvSchema.parse({
      APP_STAGE: 'staging',
      E2E_LOGIN_SECRET: 'x'.repeat(32),
    });
    expect(parsed.E2E_LOGIN_SECRET).toHaveLength(32);
  });

  it('rejects a secret shorter than 32 characters', () => {
    const parsed = e2eEnvSchema.safeParse({ E2E_LOGIN_SECRET: 'x'.repeat(31) });
    expect(parsed.success).toBe(false);
  });

  it('leaves both values optional', () => {
    expect(e2eEnvSchema.parse({})).toEqual({});
  });
});

describe('isE2eTestAddress', () => {
  it('matches only the reserved e2e domain', () => {
    expect(E2E_EMAIL_DOMAIN).toBe('e2e.test');
    expect(isE2eTestAddress('vbl-login-abc@e2e.test')).toBe(true);
    expect(isE2eTestAddress('  VBL-Login@E2E.TEST ')).toBe(true);
    expect(isE2eTestAddress('someone@example.com')).toBe(false);
    expect(isE2eTestAddress('someone@e2e.test.example.com')).toBe(false);
    expect(isE2eTestAddress('someone@note2e.test')).toBe(false);
    expect(isE2eTestAddress('')).toBe(false);
    expect(isE2eTestAddress(null)).toBe(false);
  });
});

describe('evaluateE2eRequest', () => {
  it('accepts a matching secret on a non-production stage', () => {
    expect(
      evaluateE2eRequest({ config: STAGING, headerSecret: SECRET })
    ).toBeNull();
    expect(
      evaluateE2eRequest({
        config: STAGING,
        headerSecret: SECRET,
        email: 'a@e2e.test',
      })
    ).toBeNull();
  });

  it('refuses on the production stage even with a valid secret', () => {
    expect(
      evaluateE2eRequest({
        config: { secret: SECRET, stage: 'production' },
        headerSecret: SECRET,
        email: 'a@e2e.test',
      })
    ).toBe('production_stage');
    expect(
      evaluateE2eRequest({
        config: { secret: SECRET, stage: ' Production ' },
        headerSecret: SECRET,
      })
    ).toBe('production_stage');
  });

  it('refuses when the stage is missing', () => {
    expect(
      evaluateE2eRequest({ config: { secret: SECRET }, headerSecret: SECRET })
    ).toBe('no_stage');
    expect(
      evaluateE2eRequest({
        config: { secret: SECRET, stage: '' },
        headerSecret: SECRET,
      })
    ).toBe('no_stage');
  });

  it('refuses when no secret is configured', () => {
    expect(
      evaluateE2eRequest({
        config: { stage: 'staging' },
        headerSecret: SECRET,
      })
    ).toBe('no_secret');
  });

  it('refuses a configured secret shorter than 32 characters', () => {
    const short = 'x'.repeat(31);
    expect(
      evaluateE2eRequest({
        config: { secret: short, stage: 'staging' },
        headerSecret: short,
      })
    ).toBe('short_secret');
  });

  it('refuses a missing or wrong header', () => {
    expect(
      evaluateE2eRequest({ config: STAGING, headerSecret: undefined })
    ).toBe('missing_header');
    expect(evaluateE2eRequest({ config: STAGING, headerSecret: '' })).toBe(
      'missing_header'
    );
    expect(
      evaluateE2eRequest({ config: STAGING, headerSecret: `${SECRET}x` })
    ).toBe('wrong_secret');
    expect(evaluateE2eRequest({ config: STAGING, headerSecret: 'short' })).toBe(
      'wrong_secret'
    );
  });

  it('refuses an e-mail outside the e2e domain', () => {
    expect(
      evaluateE2eRequest({
        config: STAGING,
        headerSecret: SECRET,
        email: 'real.person@gmail.com',
      })
    ).toBe('wrong_email_domain');
    expect(
      evaluateE2eRequest({
        config: STAGING,
        headerSecret: SECRET,
        email: null,
      })
    ).toBe('wrong_email_domain');
  });
});

describe('isE2eRequest (Hono context)', () => {
  const saved = {
    APP_STAGE: process.env.APP_STAGE,
    E2E_LOGIN_SECRET: process.env.E2E_LOGIN_SECRET,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  async function probe(headers: Record<string, string>, email?: string) {
    const app = new Hono();
    app.get('/probe', (c) => c.json({ e2e: isE2eRequest(c, email) }));
    const res = await app.request('/probe', { headers });
    return (await res.json()) as { e2e: boolean };
  }

  it('reads the header and the test-mode config', async () => {
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET = SECRET;
    expect(getE2eConfig()).toEqual({ secret: SECRET, stage: 'staging' });
    expect(await probe({ [E2E_SECRET_HEADER]: SECRET })).toEqual({ e2e: true });
    expect(
      await probe({ [E2E_SECRET_HEADER.toLowerCase()]: SECRET }, 'x@e2e.test')
    ).toEqual({ e2e: true });
    expect(await probe({ [E2E_SECRET_HEADER]: 'nope' })).toEqual({
      e2e: false,
    });
    expect(await probe({})).toEqual({ e2e: false });
    expect(
      await probe({ [E2E_SECRET_HEADER]: SECRET }, 'x@example.com')
    ).toEqual({ e2e: false });
  });

  it('logs accepted requests without the secret', async () => {
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET = SECRET;
    const info = vi.spyOn(logger, 'info');
    await probe({ [E2E_SECRET_HEADER]: SECRET }, 'x@e2e.test');
    const call = info.mock.calls.find(
      ([message]) => message === 'E2E test request accepted'
    );
    expect(call).toBeDefined();
    expect(JSON.stringify(call)).not.toContain(SECRET);
  });

  it('is off on production, without a stage and with a short secret', async () => {
    process.env.E2E_LOGIN_SECRET = SECRET;
    process.env.APP_STAGE = 'production';
    expect(await probe({ [E2E_SECRET_HEADER]: SECRET })).toEqual({
      e2e: false,
    });
    delete process.env.APP_STAGE;
    expect(await probe({ [E2E_SECRET_HEADER]: SECRET })).toEqual({
      e2e: false,
    });
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET = 'too-short';
    expect(await probe({ [E2E_SECRET_HEADER]: 'too-short' })).toEqual({
      e2e: false,
    });
    delete process.env.E2E_LOGIN_SECRET;
    expect(await probe({ [E2E_SECRET_HEADER]: SECRET })).toEqual({
      e2e: false,
    });
  });
});

describe('bounce protection for @e2e.test recipients', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never hands an e2e address to SES on any send path', async () => {
    const send = vi.spyOn(SESClient.prototype, 'send');
    const info = vi.spyOn(logger, 'info');
    const to = 'vbl-bounce@e2e.test';

    expect(await sendMagicLinkEmail(to, 'https://x.test/auth?token=t')).toBe(
      true
    );
    expect(await sendClaimStoppedEmail(to)).toBe(true);
    expect(
      await sendContractWithdrawalEmail(to, {
        fullName: 'SPECIMEN, ERIKA',
        claimId: '00000000-0000-0000-0000-000000000000',
        pensionTypeOrInstitution: 'VBL',
        declarationText: 'I withdraw.',
        receivedAt: new Date(),
        applicationAlreadySubmitted: false,
      })
    ).toBe(true);
    expect(
      await sendLawFirmInviteEmail(to, {
        firmName: 'Test firm',
        magicLinkUrl: 'https://x.test',
      })
    ).toBe(true);
    expect(
      await sendClientUpdateEmail({
        to,
        subject: 'Update',
        paragraphs: ['Hello'],
        fromName: 'Ops',
      })
    ).toBe(true);
    expect(
      await sendLeadMail({ to, subject: 'Guide', text: 'Hello' }, 'lead test')
    ).toBe(true);

    expect(send).not.toHaveBeenCalled();
    const suppressed = info.mock.calls.filter(([message]) =>
      /Not sending .* e2e test address/.test(String(message))
    );
    expect(suppressed).toHaveLength(6);
  });
});
