/**
 * Submission against PostgreSQL for the claims the staging e2e suite could
 * not get out (2026-10-06): bAV cash-outs without a provider-matrix row,
 * and VddB/VddKO stage claims. Package building, the lettershop and the
 * ops email are stubbed; everything else (validation, holds, matrix
 * upsert, workflow/audit rows) runs for real.
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
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../utils/db';
import {
  bavProviders,
  claimsTable,
  claimWorkflowStates,
} from '../drizzle/schema/claims';
import {
  auditLogs,
  documents,
  signatures,
  users,
} from '../drizzle/schema/shared';
import { ClaimsApplicationService } from './claims-application';
import { ClaimHoldService } from './claim-holds';
import { BavLetterPackageService } from './bav-letters';
import { BavProviderService } from './bav-letters/providers';
import { ClaimPdfService } from './claim-pdf';
import { LettershopService } from './lettershop';
import { LawFirmService } from './law-firm';

const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];
const providerNames: string[] = [];

async function newUser(role: 'user' | 'admin' = 'user'): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `hold-${role}-${tag}-${userIds.length}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(u.id);
  return u.id;
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
}

async function signedClaim(
  data: Record<string, unknown>,
  docRoles: string[] = ['passport']
): Promise<{ userId: string; claimId: string }> {
  const userId = await newUser();
  const claim = await ClaimsApplicationService.createClaim(userId);
  await ClaimsApplicationService.updateClaim(claim.id, userId, {
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
    iban: 'DE89370400440532013000',
    accountHolderName: 'Juan Specimen',
    ...data,
  } as any);
  for (const role of docRoles) await attachDoc(userId, claim.id, role);
  const [sig] = await db
    .insert(signatures)
    .values({ userId, signatureData: 'data:image/png;base64,iVBORw0KGgo=' })
    .returning();
  await ClaimsApplicationService.attachSignature(claim.id, userId, sig.id);
  return { userId, claimId: claim.id };
}

/** Route A bAV claim as the VBL app saves it (no recipient address). */
function bavClaim(provider: string, overrides: Record<string, unknown> = {}) {
  return signedClaim(
    {
      pensionType: 'private',
      salutation: 'herr',
      taxId: '12345678903',
      employerName: 'SPECIMEN Muster GmbH',
      employmentEndDate: '2024-06-30',
      employerPersonnelNumber: 'SPECIMEN-0001',
      moveOutDate: '2024-07-15',
      bavProviderName: provider,
      bavDurchfuehrungsweg: 'Direktversicherung',
      bavContractReference: 'SPECIMEN-VN-0001',
      bavContractReferenceLabel: 'Vertrags-Nr.',
      bavAddresseeType: 'provider',
      bavRecipientName: provider,
      drvRefundReceived: true,
      drvOffice: 'Deutsche Rentenversicherung Bund',
      drvDecisionDate: '2025-03-01',
      swiftBic: 'COBADEFFXXX',
      bankName: 'Commerzbank',
      ...overrides,
    },
    ['passport', 'drv_refund_decision']
  );
}

const fakePackage = {
  pdfS3Key: 'claims/x/bav-package-1.pdf',
  bytes: new Uint8Array([1, 2, 3]),
  templateId: 'A-LAW',
  signer: 'LAW',
  copy: null,
  missingPlaceholders: [],
} as any;

let notify: ReturnType<typeof vi.spyOn>;
let lettershop: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  notify = vi.spyOn(ClaimHoldService, 'notifyOps').mockResolvedValue(true);
  lettershop = vi
    .spyOn(LettershopService, 'sendClaimPdf')
    .mockResolvedValue({ submissionId: 'job-1' });
});

afterEach(() => {
  notify.mockClear();
  lettershop.mockClear();
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (userIds.length) {
    await db.delete(claimsTable).where(inArray(claimsTable.userId, userIds));
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(signatures).where(inArray(signatures.userId, userIds));
    await db.delete(documents).where(inArray(documents.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  for (const name of providerNames) {
    await db.delete(bavProviders).where(eq(bavProviders.name, name));
  }
});

async function row(claimId: string) {
  const [r] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.id, claimId));
  return r;
}

describe('bAV submission without a provider-matrix row', () => {
  it('submits, holds for provider data, builds no package and tells ops', async () => {
    const provider = `Allianz ${tag}`;
    const { userId, claimId } = await bavClaim(provider);
    const generate = vi.spyOn(
      BavLetterPackageService,
      'generateAndStoreForClaim'
    );

    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);

    expect(claim.status).toBe('submitted');
    expect(claim.submissionHold).toBe('awaiting_provider_data');
    expect(claim.submissionHoldReason).toContain(provider);
    expect(claim.pdfS3Key).toBeNull();
    expect(claim.lettershopSubmissionId).toBeNull();
    expect(claim.handlingRoute).toBe('law_firm');
    expect(generate).not.toHaveBeenCalled();
    expect(lettershop).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].subject).toContain(
      'Waiting for provider data'
    );

    const trail = await db
      .select()
      .from(claimWorkflowStates)
      .where(eq(claimWorkflowStates.claimId, claimId));
    expect(
      trail.some((t) => (t.metadata as any)?.action === 'submission_hold_set')
    ).toBe(true);
    generate.mockRestore();
  });

  it('still requires the client bank block (BIC, bank name)', async () => {
    const { userId, claimId } = await bavClaim(`Allianz ${tag}`, {
      swiftBic: 'NOTABIC',
      bankName: '',
    });
    await expect(
      ClaimsApplicationService.submitClaim(claimId, userId)
    ).rejects.toThrow(
      /BIC must have 8 or 11 characters.*Bank name is required/
    );
    const errors = (
      await ClaimsApplicationService.validateForSubmission(claimId, userId)
    ).errors;
    expect(errors.some((e) => e.startsWith('Recipient'))).toBe(false);
    expect((await row(claimId)).status).toBe('draft');
  });
});

describe('bAV submission with a provider-matrix row', () => {
  it('fills the recipient from the matrix and builds the package', async () => {
    const provider = `BVV ${tag}`;
    providerNames.push(provider);
    await BavProviderService.create({
      name: provider,
      defaultAddresseeType: 'provider',
      street: 'Straße der Pariser Kommune 8',
      postalCode: '10243',
      city: 'Berlin',
    });
    const { userId, claimId } = await bavClaim(provider);
    const generate = vi
      .spyOn(BavLetterPackageService, 'generateAndStoreForClaim')
      .mockResolvedValue(fakePackage);

    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);

    expect(claim.status).toBe('submitted');
    expect(claim.submissionHold).toBeNull();
    expect(claim.bavRecipientStreet).toBe('Straße der Pariser Kommune 8');
    expect(claim.bavRecipientCity).toBe('Berlin');
    expect(generate).toHaveBeenCalledWith(claimId, userId);
    // Law firm route: stored for the firm, never mailed by us.
    expect(lettershop).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    generate.mockRestore();
  });

  it('holds the claim when the package build itself fails', async () => {
    const provider = `BVV ${tag}`;
    const { userId, claimId } = await bavClaim(provider);
    const generate = vi
      .spyOn(BavLetterPackageService, 'generateAndStoreForClaim')
      .mockRejectedValue(
        new Error('Cannot assemble A-LAW package, missing enclosures: passport')
      );

    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);

    expect(claim.status).toBe('submitted');
    expect(claim.submissionHold).toBe('package_generation_failed');
    expect(claim.submissionHoldReason).toContain('missing enclosures');
    expect(notify).toHaveBeenCalledTimes(1);
    generate.mockRestore();
  });
});

describe('package generation without a recipient', () => {
  it('refuses cleanly and leaves the claim waiting', async () => {
    const adminId = await newUser('admin');
    const { userId, claimId } = await bavClaim(`Axa ${tag}`);
    await ClaimsApplicationService.submitClaim(claimId, userId);

    await expect(
      BavLetterPackageService.generateAndStoreForClaim(claimId, adminId, {
        asAdmin: true,
      })
    ).rejects.toThrow(
      /^Cannot generate bAV package: .*Recipient street is required/
    );
    const result = await ClaimsApplicationService.completeBavPackage(
      claimId,
      adminId
    );
    expect(result.generated).toBe(false);
    expect(result.error).toContain('Recipient street is required');

    const r = await row(claimId);
    expect(r.pdfS3Key).toBeNull();
    expect(r.submissionHold).toBe('awaiting_provider_data');
    expect(lettershop).not.toHaveBeenCalled();
  });

  it('cannot be released to the law firm while held', async () => {
    const adminId = await newUser('admin');
    const { userId, claimId } = await bavClaim(`Axa ${tag}`);
    await ClaimsApplicationService.submitClaim(claimId, userId);
    // Migration 0010 seeds the partner firm (Vividius).
    const firm = await LawFirmService.getDefaultFirm();
    expect(firm).toBeTruthy();
    await db
      .update(claimsTable)
      .set({ handlingRoute: 'law_firm', lawFirmId: firm!.id })
      .where(eq(claimsTable.id, claimId));
    await expect(
      LawFirmService.releaseToFirm(claimId, adminId)
    ).rejects.toThrow(/Invalid release: the claim is on hold/);
    expect((await row(claimId)).lawFirmReleasedAt).toBeNull();
  });
});

describe('admin: save the recipient (optionally to the matrix)', () => {
  it('stores the recipient, creates the matrix row, builds the package and clears the hold', async () => {
    const adminId = await newUser('admin');
    const provider = `Allianz Leben ${tag}`;
    providerNames.push(provider);
    const { userId, claimId } = await bavClaim(provider);
    await ClaimsApplicationService.submitClaim(claimId, userId);
    expect((await row(claimId)).submissionHold).toBe('awaiting_provider_data');

    const generate = vi
      .spyOn(BavLetterPackageService, 'generateAndStoreForClaim')
      .mockResolvedValue(fakePackage);
    const result = await ClaimsApplicationService.updateBavRecipientAsAdmin(
      claimId,
      adminId,
      {
        addresseeType: 'provider',
        name: 'Allianz Lebensversicherungs-AG',
        department: 'Betriebliche Altersversorgung',
        street: 'Reinsburgstraße 19',
        postalCode: '70178',
        city: 'Stuttgart',
        country: 'Deutschland',
        reference: 'AZ-4711',
        saveToProviderMatrix: true,
      }
    );

    expect(result.claim.bavRecipientName).toBe(
      'Allianz Lebensversicherungs-AG'
    );
    expect(result.claim.bavRecipientStreet).toBe('Reinsburgstraße 19');
    expect(result.claim.bavRecipientCountry).toBe('Deutschland');
    expect(result.claim.bavRecipientRef).toBe('AZ-4711');
    expect(result.claim.submissionHold).toBeNull();
    expect(result.packageResult?.generated).toBe(true);
    // Law-firm route: generated for the firm, not mailed.
    expect(result.packageResult?.sentToLettershop).toBe(false);
    expect(lettershop).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledWith(claimId, adminId, { asAdmin: true });

    // Matrix row keyed by the claim's provider name, reused next time.
    const matrix = await BavProviderService.findByName(provider);
    expect(matrix).toMatchObject({
      name: provider,
      defaultAddresseeType: 'provider',
      department: 'Betriebliche Altersversorgung',
      street: 'Reinsburgstraße 19',
      postalCode: '70178',
      city: 'Stuttgart',
      country: 'Deutschland',
    });

    // A second save updates the same row instead of creating another.
    await ClaimsApplicationService.updateBavRecipientAsAdmin(claimId, adminId, {
      addresseeType: 'provider',
      name: 'Allianz Lebensversicherungs-AG',
      street: 'Reinsburgstraße 19a',
      postalCode: '70178',
      city: 'Stuttgart',
      saveToProviderMatrix: true,
    });
    const rows = await db
      .select()
      .from(bavProviders)
      .where(eq(bavProviders.name, provider));
    expect(rows).toHaveLength(1);
    expect(rows[0].street).toBe('Reinsburgstraße 19a');

    // The next claim for that provider is filled at submission.
    const next = await bavClaim(provider);
    const submitted = await ClaimsApplicationService.submitClaim(
      next.claimId,
      next.userId
    );
    expect(submitted.submissionHold).toBeNull();
    expect(submitted.bavRecipientStreet).toBe('Reinsburgstraße 19a');

    const audit = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceId, claimId),
          eq(auditLogs.action, 'claim_bav_recipient_updated')
        )
      );
    expect(audit).toHaveLength(2);
    generate.mockRestore();
  });

  it('on direct handling mails the package once the recipient is saved', async () => {
    const adminId = await newUser('admin');
    const { userId, claimId } = await bavClaim(`HDI ${tag}`);
    await db
      .update(claimsTable)
      .set({ handlingRoute: 'direct' })
      .where(eq(claimsTable.id, claimId));
    await ClaimsApplicationService.submitClaim(claimId, userId);
    expect(lettershop).not.toHaveBeenCalled();

    const generate = vi
      .spyOn(BavLetterPackageService, 'generateAndStoreForClaim')
      .mockResolvedValue(fakePackage);
    const result = await ClaimsApplicationService.updateBavRecipientAsAdmin(
      claimId,
      adminId,
      {
        addresseeType: 'provider',
        name: 'HDI Pensionskasse AG',
        street: 'HDI-Platz 1',
        postalCode: '30659',
        city: 'Hannover',
      }
    );
    expect(result.provider).toBeNull();
    expect(result.packageResult?.sentToLettershop).toBe(true);
    expect(lettershop).toHaveBeenCalledTimes(1);
    expect(result.claim.submissionHold).toBeNull();
    generate.mockRestore();
  });

  it('rejects an incomplete recipient and employer addresses for the matrix', async () => {
    const adminId = await newUser('admin');
    const { claimId } = await bavClaim(`Ergo ${tag}`);
    await expect(
      ClaimsApplicationService.updateBavRecipientAsAdmin(claimId, adminId, {
        addresseeType: 'provider',
        name: 'Ergo',
        street: ' ',
        postalCode: '40477',
        city: 'Düsseldorf',
      })
    ).rejects.toThrow('Invalid recipient: Recipient street is required');
    await expect(
      ClaimsApplicationService.updateBavRecipientAsAdmin(claimId, adminId, {
        addresseeType: 'employer',
        name: 'SPECIMEN Muster GmbH',
        street: 'Musterweg 1',
        postalCode: '10115',
        city: 'Berlin',
        saveToProviderMatrix: true,
      })
    ).rejects.toThrow(/only a provider address/);
  });
});

describe('VddB / VddKO stage submission', () => {
  const stageDetails = {
    stageName: 'SPECIMEN Stadttheater',
    rolePosition: 'Violinist',
    employmentEndDate: '2020-01-31',
    permanentlyStopped: 'yes' as const,
    reasonForLeaving: 'contract_ended',
    currentOccupation: 'Office employee',
    unableToWorkHealth: 'no' as const,
  };

  it('stores the number, provider and answers; holds for manual submission; no lettershop job', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VddB',
      svNummer: '0000000000',
      stageDetails,
    });
    const pdf = vi.spyOn(ClaimPdfService, 'generateAndStoreForClaim');

    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);

    expect(claim.status).toBe('submitted');
    expect(claim.caseType).toBe('vbl_refund');
    expect(claim.handlingRoute).toBe('direct');
    expect(claim.svNummer).toBe('0000000000');
    expect(claim.pensionProvider).toBe('VddB');
    expect(claim.stageDetails).toMatchObject(stageDetails);
    expect(claim.submissionHold).toBe('manual_submission_required');
    expect(claim.submissionHoldReason).toContain('no VddB claim form');
    expect(claim.pdfS3Key).toBeNull();
    expect(claim.lettershopSubmissionId).toBeNull();
    expect(pdf).not.toHaveBeenCalled();
    expect(lettershop).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].subject).toContain(
      'Manual submission required'
    );
    pdf.mockRestore();
  });

  it('requires the membership number', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VddKO',
      stageDetails,
    });
    await expect(
      ClaimsApplicationService.submitClaim(claimId, userId)
    ).rejects.toThrow('VddKO membership number is required');
  });

  it('never builds the VBL L203 for a stage claim', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VddKO',
      svNummer: '12345',
    });
    await expect(
      ClaimPdfService.generateAndStoreForClaim(claimId, userId)
    ).rejects.toThrow(/^Cannot generate PDF: there is no claim form for VddKO/);
  });

  it('ops resolve the manual-submission hold with a note', async () => {
    const adminId = await newUser('admin');
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VddB',
      svNummer: '0000000000',
      stageDetails,
    });
    await ClaimsApplicationService.submitClaim(claimId, userId);
    const resolved = await ClaimsApplicationService.resolveSubmissionHold(
      claimId,
      adminId,
      'Posted to VddB on 6 Oct 2026'
    );
    expect(resolved.submissionHold).toBeNull();
    await expect(
      ClaimsApplicationService.resolveSubmissionHold(claimId, adminId, 'again')
    ).rejects.toThrow('Invalid hold: the claim is not on hold');
  });

  it('refuses to resolve a provider-data hold without a recipient', async () => {
    const adminId = await newUser('admin');
    const { userId, claimId } = await bavClaim(`Nuernberger ${tag}`);
    await ClaimsApplicationService.submitClaim(claimId, userId);
    await expect(
      ClaimsApplicationService.resolveSubmissionHold(claimId, adminId, 'x')
    ).rejects.toThrow(/enter the letter recipient/);
  });
});

describe('public (VBL) submission', () => {
  it('flags a claim PDF build failure for ops instead of only logging it', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VBL',
    });
    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);
    expect(claim.status).toBe('submitted');
    expect(claim.pensionProvider).toBe('VBL');
    expect(claim.submissionHold).toBe('package_generation_failed');
    expect(claim.submissionHoldReason).toContain('missing: svNummer');
    expect(lettershop).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('mails a VBL claim whose PDF builds, without any hold', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VBL',
      svNummer: '1234567890',
    });
    const pdf = vi
      .spyOn(ClaimPdfService, 'generateAndStoreForClaim')
      .mockResolvedValue({ pdfS3Key: 'k', bytes: new Uint8Array([1]) });
    const claim = await ClaimsApplicationService.submitClaim(claimId, userId);
    expect(claim.submissionHold).toBeNull();
    expect(lettershop).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
    pdf.mockRestore();
  });
});

describe('admin claims list', () => {
  it('filters by submission hold', async () => {
    const { userId, claimId } = await signedClaim({
      pensionType: 'public',
      pensionProvider: 'VddKO',
      svNummer: '777',
    });
    await ClaimsApplicationService.submitClaim(claimId, userId);
    const list = await ClaimsApplicationService.getAllClaims({
      submissionHold: 'manual_submission_required',
      search: claimId,
    });
    expect(list.claims).toHaveLength(1);
    expect(list.claims[0]).toMatchObject({
      id: claimId,
      pensionProvider: 'VddKO',
      submissionHold: 'manual_submission_required',
    });
    const none = await ClaimsApplicationService.getAllClaims({
      submissionHold: 'awaiting_provider_data',
      search: claimId,
    });
    expect(none.claims).toHaveLength(0);
  });
});
