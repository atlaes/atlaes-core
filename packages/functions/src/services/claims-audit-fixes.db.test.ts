/**
 * Audit fixes (2026-11-02) against PostgreSQL: submission validation by
 * case type, the submit guards (draft only, deposit paid, one dispatch per
 * claim), the GPR origin on create, the default law-firm assignment at
 * submission and once a hold clears, and the claimant-side guards
 * (non-draft edits, foreign signatures). Package building, the lettershop
 * and the ops email are stubbed; everything else runs for real.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../utils/db';
import { AuthService } from '../utils/auth';
import { claimsTable, claimWorkflowStates } from '../drizzle/schema/claims';
import { clientUpdateTasks } from '../drizzle/schema/client-updates';
import {
  auditLogs,
  documents,
  signatures,
  users,
} from '../drizzle/schema/shared';
import { ClaimsApplicationService } from './claims-application';
import { ClaimHoldService } from './claim-holds';
import { BavLetterPackageService } from './bav-letters';
import { ClaimPdfService } from './claim-pdf';
import { LettershopService } from './lettershop';
import { DEFAULT_LAW_FIRM_ID } from './law-firm';
import { drvPackClientFromClaim } from './law-firm-pack';
import { DrvPackDataService } from './drv-pack-data-admin';
import claimsRouter from '../routes/claims';

const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];

async function newUser(role: 'user' | 'admin' = 'user') {
  const email = `audit-${role}-${tag}-${userIds.length}@example.com`;
  const [u] = await db
    .insert(users)
    .values({ email, emailVerified: true, authProvider: 'magic_link', role })
    .returning();
  userIds.push(u.id);
  const token = AuthService.generateTokens({
    userId: u.id,
    email,
    emailVerified: true,
    role,
  }).accessToken;
  return { id: u.id, email, token };
}

async function attachDoc(userId: string, claimId: string, role: string) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      fileName: `${role}.pdf`,
      fileType: 'application/pdf',
      fileSize: 1024,
      s3Key: `test/${userId}/${role}.pdf`,
      documentType: role,
      status: 'completed',
    })
    .returning();
  await ClaimsApplicationService.addDocument(
    claimId,
    userId,
    doc.id,
    role as any
  );
  return doc.id;
}

async function newSignature(userId: string): Promise<string> {
  const [sig] = await db
    .insert(signatures)
    .values({ userId, signatureData: 'data:image/png;base64,iVBORw0KGgo=' })
    .returning();
  return sig.id;
}

const PERSON = {
  claimType: 'own_refund',
  firstName: 'Juan',
  lastName: 'Specimen',
  dateOfBirth: '1985-11-03',
  gender: 'male',
  placeOfBirth: 'Sample City',
  nationality: 'PHL',
  passportNumber: 'P0000000A',
  currentAddressLine1: '1 Specimen Street',
  currentPostalCode: '1000',
  currentCity: 'Sample City',
  currentCountry: 'PH',
};

const DRV_STEPS = [
  'claimType',
  'passportUpload',
  'currentAddress',
  'lastAddressInGermany',
  'bankDetails',
  'signDocuments',
  'identityConfirmationForm',
  'reviewInformation',
  'finalConfirmation',
] as const;

/** A DRV refund claim as the GPR account flow leaves it before submit. */
async function drvClaim(
  overrides: Record<string, unknown> = {},
  docRoles: string[] = ['passport', 'certified_id_form']
) {
  const user = await newUser();
  const claim = await ClaimsApplicationService.createClaim(
    user.id,
    undefined,
    'drv_refund'
  );
  await ClaimsApplicationService.updateClaim(claim.id, user.id, {
    ...PERSON,
    germanStreet: 'Musterstraße 1',
    germanPostalCode: '10115',
    germanCity: 'Berlin',
    moveOutDate: '2024-07-15',
    svNummer: '12 150785 S 123',
    germanContributionMonths: 38,
    accountHolderName: 'Juan Specimen',
    bankName: 'Commerzbank',
    iban: 'DE89370400440532013000',
    swiftBic: 'COBADEFFXXX',
    preferredCurrency: 'EUR',
    confirmationAccuracyAccepted: true,
    confirmationAuthorizationAccepted: true,
    ...overrides,
  } as any);
  for (const role of docRoles) await attachDoc(user.id, claim.id, role);
  for (const step of DRV_STEPS) {
    await ClaimsApplicationService.markStepComplete(claim.id, user.id, step);
  }
  await ClaimsApplicationService.attachSignature(
    claim.id,
    user.id,
    await newSignature(user.id)
  );
  return { user, claimId: claim.id };
}

/** A VBL public-sector claim as the VBL app leaves it (deposit pending). */
async function vblClaim(paid: boolean) {
  const user = await newUser();
  const claim = await ClaimsApplicationService.createClaim(user.id);
  await ClaimsApplicationService.updateClaim(claim.id, user.id, {
    ...PERSON,
    pensionType: 'public',
    pensionProvider: 'VBL',
    svNummer: '12 345678 S 123',
    iban: 'DE89370400440532013000',
    accountHolderName: 'Juan Specimen',
  } as any);
  if (paid) {
    await db
      .update(claimsTable)
      .set({ paymentStatus: 'paid', paidAt: new Date() })
      .where(eq(claimsTable.id, claim.id));
  }
  await attachDoc(user.id, claim.id, 'passport');
  await ClaimsApplicationService.attachSignature(
    claim.id,
    user.id,
    await newSignature(user.id)
  );
  return { user, claimId: claim.id };
}

/** Route A bAV claim without a provider-matrix row (held at submission). */
async function bavClaim() {
  const user = await newUser();
  const claim = await ClaimsApplicationService.createClaim(user.id);
  await db
    .update(claimsTable)
    .set({ paymentStatus: 'paid', paidAt: new Date() })
    .where(eq(claimsTable.id, claim.id));
  await ClaimsApplicationService.updateClaim(claim.id, user.id, {
    ...PERSON,
    pensionType: 'private',
    salutation: 'herr',
    taxId: '12345678903',
    employerName: 'SPECIMEN Muster GmbH',
    employmentEndDate: '2024-06-30',
    employerPersonnelNumber: 'SPECIMEN-0001',
    moveOutDate: '2024-07-15',
    bavProviderName: `Nowhere Leben ${tag}`,
    bavDurchfuehrungsweg: 'Direktversicherung',
    bavContractReference: 'SPECIMEN-VN-0001',
    bavContractReferenceLabel: 'Vertrags-Nr.',
    bavAddresseeType: 'provider',
    bavRecipientName: `Nowhere Leben ${tag}`,
    drvRefundReceived: true,
    drvOffice: 'Deutsche Rentenversicherung Bund',
    drvDecisionDate: '2025-03-01',
    iban: 'DE89370400440532013000',
    swiftBic: 'COBADEFFXXX',
    bankName: 'Commerzbank',
    accountHolderName: 'Juan Specimen',
  } as any);
  for (const role of ['passport', 'drv_refund_decision']) {
    await attachDoc(user.id, claim.id, role);
  }
  await ClaimsApplicationService.attachSignature(
    claim.id,
    user.id,
    await newSignature(user.id)
  );
  return { user, claimId: claim.id };
}

async function row(claimId: string) {
  const [r] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.id, claimId));
  return r;
}

async function handoffTasks(claimId: string) {
  return db
    .select()
    .from(clientUpdateTasks)
    .where(eq(clientUpdateTasks.claimId, claimId));
}

async function audits(claimId: string, action: string) {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(eq(auditLogs.resourceId, claimId), eq(auditLogs.action, action))
    );
}

let notify: ReturnType<typeof vi.spyOn>;
let lettershop: ReturnType<typeof vi.spyOn>;
let l203: ReturnType<typeof vi.spyOn>;
let app: Hono;

beforeAll(() => {
  notify = vi.spyOn(ClaimHoldService, 'notifyOps').mockResolvedValue(true);
  lettershop = vi
    .spyOn(LettershopService, 'sendClaimPdf')
    .mockResolvedValue({ submissionId: 'job-audit' });
  l203 = vi.spyOn(ClaimPdfService, 'generateAndStoreForClaim');
  app = new Hono();
  app.route('/api/claims', claimsRouter);
});

afterEach(() => {
  notify.mockClear();
  lettershop.mockClear();
  l203.mockClear();
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (userIds.length) {
    const claimIds = (
      await db
        .select({ id: claimsTable.id })
        .from(claimsTable)
        .where(inArray(claimsTable.userId, userIds))
    ).map((c) => c.id);
    if (claimIds.length) {
      await db
        .delete(clientUpdateTasks)
        .where(inArray(clientUpdateTasks.claimId, claimIds));
    }
    await db.delete(claimsTable).where(inArray(claimsTable.userId, userIds));
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(signatures).where(inArray(signatures.userId, userIds));
    await db.delete(documents).where(inArray(documents.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

describe('submission validation by case type', () => {
  it('drv_refund: an uploaded Abmeldung replaces the typed address and date', async () => {
    const { user, claimId } = await drvClaim({ moveOutDate: null });
    let v = await ClaimsApplicationService.validateForSubmission(
      claimId,
      user.id
    );
    expect(v.isValid).toBe(false);
    expect(v.errors).toEqual(['Move out date is required']);

    // The GPR app marks the upload choice before the file is attached.
    await ClaimsApplicationService.updateClaim(claimId, user.id, {
      abmeldungMethod: 'uploaded',
      germanStreet: null,
      germanCity: null,
    } as any);
    v = await ClaimsApplicationService.validateForSubmission(claimId, user.id);
    expect(v.errors).toEqual(['Abmeldung document is required']);

    await attachDoc(user.id, claimId, 'abmeldung');
    v = await ClaimsApplicationService.validateForSubmission(claimId, user.id);
    expect(v.isValid).toBe(true);
    // Fee on success: no deposit check for DRV refunds.
    expect(v.errors).not.toContain('Payment is required before submission');
  });

  it('drv_refund: signature, confirmations, final step, bank details and ID', async () => {
    const { user, claimId } = await drvClaim(
      {
        confirmationAccuracyAccepted: false,
        confirmationAuthorizationAccepted: false,
        accountHolderName: null,
        iban: null,
        accountNumber: null,
      },
      ['passport']
    );
    await ClaimsApplicationService.markStepIncomplete(
      claimId,
      user.id,
      'finalConfirmation'
    );
    await db
      .update(claimsTable)
      .set({ signatureId: null })
      .where(eq(claimsTable.id, claimId));

    const v = await ClaimsApplicationService.validateForSubmission(
      claimId,
      user.id
    );
    expect(v.isValid).toBe(false);
    expect(v.missingSteps).toEqual(['finalConfirmation']);
    expect(v.errors).toEqual(
      expect.arrayContaining([
        'Signature is required',
        'Accuracy confirmation is required',
        'Authorization confirmation is required',
        'Bank account holder name is required',
        'IBAN or account number is required',
        'Certified identity form is required',
      ])
    );
    expect(v.errors).not.toContain('German address is required');
  });

  it('vbl_refund: no German-address or step checks, but the deposit', async () => {
    const { user, claimId } = await vblClaim(false);
    let v = await ClaimsApplicationService.validateForSubmission(
      claimId,
      user.id
    );
    expect(v.missingSteps).toEqual([]);
    expect(v.errors).toEqual(['Payment is required before submission']);
    await expect(
      ClaimsApplicationService.submitClaim(claimId, user.id)
    ).rejects.toThrow(/Payment is required/);
    expect((await row(claimId)).status).toBe('draft');

    // A German address on a VBL claim does not make it a DRV claim.
    await ClaimsApplicationService.updateClaim(claimId, user.id, {
      germanStreet: 'Musterstraße 1',
      germanCity: 'Berlin',
    });
    await db
      .update(claimsTable)
      .set({ paymentStatus: 'paid' })
      .where(eq(claimsTable.id, claimId));
    v = await ClaimsApplicationService.validateForSubmission(claimId, user.id);
    expect(v.isValid).toBe(true);
  });
});

describe('submitting a DRV refund', () => {
  it('submits once, hands the case to the default firm, builds no L203', async () => {
    const { user, claimId } = await drvClaim();

    const claim = await ClaimsApplicationService.submitClaim(claimId, user.id);

    expect(claim.status).toBe('submitted');
    expect(claim.caseType).toBe('drv_refund');
    expect(claim.submissionHold).toBeNull();
    expect(claim.handlingRoute).toBe('law_firm');
    expect(claim.lawFirmId).toBe(DEFAULT_LAW_FIRM_ID);
    expect(claim.lawFirmCaseState).toBe('new');
    expect(claim.lawFirmReleasedAt).not.toBeNull();
    expect(claim.pdfS3Key).toBeNull();
    expect(l203).not.toHaveBeenCalled();
    expect(lettershop).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    // The route is stored, so the firm's scope queries match the row.
    expect((await row(claimId)).handlingRoute).toBe('law_firm');
    // Client-update handoff (T1) exactly once.
    expect(await handoffTasks(claimId)).toHaveLength(1);
    expect(await audits(claimId, 'law_firm_case_released')).toHaveLength(1);

    // Submitting again is refused and dispatches nothing new.
    await expect(
      ClaimsApplicationService.submitClaim(claimId, user.id)
    ).rejects.toThrow(/already been submitted/);
    expect(await handoffTasks(claimId)).toHaveLength(1);
    expect(await audits(claimId, 'claim_submitted')).toHaveLength(1);
  });

  it('a double click submits once (conditional status flip)', async () => {
    const { user, claimId } = await drvClaim();

    const results = await Promise.allSettled([
      ClaimsApplicationService.submitClaim(claimId, user.id),
      ClaimsApplicationService.submitClaim(claimId, user.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason)).toMatch(/already been submitted/);

    const submissions = (
      await db
        .select()
        .from(claimWorkflowStates)
        .where(eq(claimWorkflowStates.claimId, claimId))
    ).filter((s) => (s.metadata as any)?.action === 'user_submission');
    expect(submissions).toHaveLength(1);
    expect(await audits(claimId, 'claim_submitted')).toHaveLength(1);
    expect(await audits(claimId, 'law_firm_case_released')).toHaveLength(1);
    expect(await handoffTasks(claimId)).toHaveLength(1);
  });

  it('claimant edits are refused once submitted; foreign signatures always', async () => {
    const { user, claimId } = await drvClaim();
    const other = await newUser();
    const foreignSignature = await newSignature(other.id);
    await expect(
      ClaimsApplicationService.attachSignature(
        claimId,
        user.id,
        foreignSignature
      )
    ).rejects.toThrow(/does not belong/);

    await ClaimsApplicationService.submitClaim(claimId, user.id);

    await expect(
      ClaimsApplicationService.markStepComplete(
        claimId,
        user.id,
        'finalConfirmation'
      )
    ).rejects.toThrow(/Cannot update a submitted claim/);
    await expect(attachDoc(user.id, claimId, 'abmeldung')).rejects.toThrow(
      /Cannot update a submitted claim/
    );
    await expect(
      ClaimsApplicationService.attachSignature(
        claimId,
        user.id,
        await newSignature(user.id)
      )
    ).rejects.toThrow(/Cannot update a submitted claim/);
  });
});

describe('bAV claim held at submission', () => {
  it('is assigned to the firm but released only when the hold clears', async () => {
    const { user, claimId } = await bavClaim();
    const admin = await newUser('admin');

    const held = await ClaimsApplicationService.submitClaim(claimId, user.id);
    expect(held.submissionHold).toBe('awaiting_provider_data');
    expect(held.lawFirmId).toBe(DEFAULT_LAW_FIRM_ID);
    expect(held.lawFirmReleasedAt).toBeNull();
    expect(await handoffTasks(claimId)).toHaveLength(0);

    const generate = vi
      .spyOn(BavLetterPackageService, 'generateAndStoreForClaim')
      .mockResolvedValue({
        pdfS3Key: 'claims/x/bav-package-1.pdf',
        bytes: new Uint8Array([1, 2, 3]),
        templateId: 'A-LAW',
        signer: 'LAW',
        copy: null,
        missingPlaceholders: [],
      } as any);
    await ClaimsApplicationService.updateBavRecipientAsAdmin(
      claimId,
      admin.id,
      {
        addresseeType: 'provider',
        name: `Nowhere Leben ${tag}`,
        street: 'Nirgendwo 1',
        postalCode: '10115',
        city: 'Berlin',
      }
    );
    generate.mockRestore();

    const released = await row(claimId);
    expect(released.submissionHold).toBeNull();
    expect(released.lawFirmReleasedAt).not.toBeNull();
    expect(await handoffTasks(claimId)).toHaveLength(1);
    expect(await audits(claimId, 'law_firm_case_released')).toHaveLength(1);
    // Law-firm route: nothing goes to the lettershop.
    expect(lettershop).not.toHaveBeenCalled();
  });
});

describe('POST /api/claims', () => {
  const create = (
    token: string,
    body: Record<string, unknown>,
    origin?: string
  ) =>
    app.request('http://localhost/api/claims', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    });

  it('creates a DRV refund claim for the GPR hosts and for caseType', async () => {
    const { token } = await newUser();
    for (const origin of [
      'https://gpr.atlaes.de',
      'https://staging.gpr.atlaes.de',
      'https://de.germanypensionrefund.com',
    ]) {
      const res = await create(token, {}, origin);
      expect(res.status).toBe(200);
      expect((await res.json()).claim.caseType).toBe('drv_refund');
    }
    const explicit = await create(token, {
      caseType: 'drv_refund',
      identityCertifyingAuthority: 'embassy',
    });
    const body = await explicit.json();
    expect(body.claim.caseType).toBe('drv_refund');
    expect(body.claim.identityCertifyingAuthority).toBe('embassy');

    const vbl = await create(token, {}, 'https://staging.companypension.de');
    expect((await vbl.json()).claim.caseType).toBe('vbl_refund');
  });

  it('PUT round-trips eurAccountRequest and identityCertifyingAuthority; null clears', async () => {
    const { token } = await newUser();
    const created = (await (await create(token, {})).json()).claim;
    const put = (body: Record<string, unknown>) =>
      app.request(`http://localhost/api/claims/${created.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

    const request = {
      phone: '+63 912 345 6789',
      consent: true,
      requestedAt: '2026-11-02T10:00:00.000Z',
    };
    let res = await put({
      eurAccountRequest: request,
      identityCertifyingAuthority: 'notary_public',
    });
    expect(res.status).toBe(200);
    let claim = (await res.json()).claim;
    expect(claim.eurAccountRequest).toEqual(request);
    expect(claim.identityCertifyingAuthority).toBe('notary_public');

    res = await put({ eurAccountRequest: null });
    claim = (await res.json()).claim;
    expect(claim.eurAccountRequest).toBeNull();
    expect(claim.identityCertifyingAuthority).toBe('notary_public');

    const bad = await put({ eurAccountRequest: { consent: true } });
    expect(bad.status).toBe(400);
  });
});

describe('GPR claims produce a DRV pack (pre-UAT P0 #1)', () => {
  it('the wizard fields fill vsnr, sex and the contribution months', async () => {
    const { claimId } = await drvClaim();
    const r = await row(claimId);
    expect(r.vsnr).toBe('12150785S123');
    expect(r.sex).toBe('male');
    expect(r.germanContributionMonths).toBe(38);
    expect(drvPackClientFromClaim(r).missing).toEqual([]);
  });

  it('gender "other" maps to diverse; clearing the SV number clears vsnr', async () => {
    const { user, claimId } = await drvClaim();
    await ClaimsApplicationService.updateClaim(claimId, user.id, {
      gender: 'other',
      svNummer: '',
    } as any);
    const r = await row(claimId);
    expect(r.sex).toBe('diverse');
    expect(r.vsnr).toBeNull();
    expect(drvPackClientFromClaim(r).missing).toEqual([
      'insurance number (VSNR)',
    ]);
  });

  it('submit needs the contribution months', async () => {
    const { user, claimId } = await drvClaim({
      germanContributionMonths: undefined,
    });
    await db
      .update(claimsTable)
      .set({ germanContributionMonths: null })
      .where(eq(claimsTable.id, claimId));
    const v = await ClaimsApplicationService.validateForSubmission(
      claimId,
      user.id
    );
    expect(v.errors).toEqual(['German contribution months are required']);
  });

  it('ops complete the missing pack data until the pack is frozen', async () => {
    const admin = await newUser('admin');
    const { user, claimId } = await drvClaim();
    await ClaimsApplicationService.updateClaim(claimId, user.id, {
      svNummer: '',
    } as any);
    let s = await DrvPackDataService.get(claimId);
    expect(s.applicable).toBe(true);
    expect(s.missing).toEqual(['insurance number (VSNR)']);

    s = await DrvPackDataService.update(claimId, admin.id, {
      vsnr: '12150785S123',
    });
    expect(s.values.vsnr).toBe('12150785S123');
    expect(s.missing).toEqual([]);
    expect(await audits(claimId, 'claim_drv_pack_data_updated')).toHaveLength(
      1
    );

    await db
      .update(claimsTable)
      .set({ submissionPackS3Key: 'claims/x/submission-pack/frozen.pdf' })
      .where(eq(claimsTable.id, claimId));
    await expect(
      DrvPackDataService.update(claimId, admin.id, { sex: 'female' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('is not applicable to VBL claims', async () => {
    const { claimId } = await vblClaim(true);
    const s = await DrvPackDataService.get(claimId);
    expect(s.applicable).toBe(false);
    expect(s.missing).toEqual([]);
  });
});

