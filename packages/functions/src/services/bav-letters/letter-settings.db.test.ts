/**
 * bAV route × status letters against PostgreSQL: the admin preview and
 * settings (status, application title, regeneration, lock after
 * submission), the full pack build with S3 stubbed, and the provider
 * dropdown labels. Specimen data only.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../utils/db';
import {
  bavProviders,
  claimDocuments,
  claimsTable,
} from '../../drizzle/schema/claims';
import {
  auditLogs,
  documents,
  signatures,
  users,
} from '../../drizzle/schema/shared';
import * as s3 from '../../utils/s3';
import { BavLetterPackageService } from '.';
import { BavProviderService } from './providers';
import { TINY_PNG } from './test-fixtures';

const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];
const providerIds: string[] = [];

async function bavClaim(
  overrides: Record<string, unknown> = {},
  roles: string[] = ['passport', 'drv_refund_decision']
): Promise<{ claimId: string; adminId: string }> {
  const [u] = await db
    .insert(users)
    .values({
      email: `bavls-${tag}-${userIds.length}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role: 'user',
    })
    .returning();
  userIds.push(u.id);
  const [admin] = await db
    .insert(users)
    .values({
      email: `bavls-admin-${tag}-${userIds.length}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role: 'admin',
    })
    .returning();
  userIds.push(admin.id);
  const [sig] = await db
    .insert(signatures)
    .values({
      userId: u.id,
      signatureData: `data:image/png;base64,${Buffer.from(TINY_PNG).toString('base64')}`,
    })
    .returning();
  const [claim] = await db
    .insert(claimsTable)
    .values({
      userId: u.id,
      caseType: 'bav_cashout',
      status: 'submitted',
      firstName: 'Juan',
      lastName: 'Specimen',
      dateOfBirth: '1985-11-03',
      currentAddressLine1: '1 Specimen Street',
      currentPostalCode: '1000',
      currentCity: 'Sample City',
      currentCountry: 'Philippines',
      employerName: 'SPECIMEN Muster GmbH',
      employmentEndDate: '2024-06-30',
      bavContractReference: '000777',
      bavContractReferenceLabel: 'Mitgliedsnummer',
      drvRefundReceived: true,
      drvOffice: 'Deutsche Rentenversicherung Bund',
      drvDecisionDate: '2025-03-01',
      bavAddresseeType: 'provider',
      bavRecipientName: 'VBL Versorgungsanstalt des Bundes und der Länder',
      bavRecipientDepartment: 'Kundenservice',
      bavRecipientPostalCode: '76240',
      bavRecipientCity: 'Karlsruhe',
      accountHolderName: 'Juan Specimen',
      bankName: 'Commerzbank',
      iban: 'DE89370400440532013000',
      swiftBic: 'COBADEFFXXX',
      handlingRoute: 'direct',
      signatureId: sig.id,
      ...overrides,
    } as any)
    .returning();
  for (const role of roles) {
    const [doc] = await db
      .insert(documents)
      .values({
        userId: u.id,
        fileName: `${role}.png`,
        fileType: 'image/png',
        fileSize: 100,
        s3Key: `test/${u.id}/${role}.png`,
        documentType: role,
        status: 'completed',
      })
      .returning();
    await db.insert(claimDocuments).values({
      claimId: claim.id,
      documentId: doc.id,
      documentRole: role as any,
    });
  }
  return { claimId: claim.id, adminId: admin.id };
}

// The suite runs with isolate: false, so S3 is stubbed by spies rather
// than vi.mock (the module is already loaded by earlier files).
let upload: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  upload = vi.spyOn(s3, 'uploadFile').mockResolvedValue(undefined as any);
  vi.spyOn(s3, 'downloadFile').mockResolvedValue(Buffer.from(TINY_PNG));
});

beforeEach(() => {
  upload.mockClear();
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (userIds.length) {
    const claims = await db
      .select({ id: claimsTable.id })
      .from(claimsTable)
      .where(inArray(claimsTable.userId, userIds));
    if (claims.length) {
      await db.delete(claimDocuments).where(
        inArray(
          claimDocuments.claimId,
          claims.map((c) => c.id)
        )
      );
    }
    await db.delete(claimsTable).where(inArray(claimsTable.userId, userIds));
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(signatures).where(inArray(signatures.userId, userIds));
    await db.delete(documents).where(inArray(documents.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (providerIds.length) {
    await db.delete(bavProviders).where(inArray(bavProviders.id, providerIds));
  }
});

describe('bAV letter preview', () => {
  it('derives Vested, selects the direct letter and lists the pack', async () => {
    const { claimId } = await bavClaim();
    const preview = await BavLetterPackageService.previewForClaim(claimId);
    expect(preview).toMatchObject({
      status: 'vested',
      statusSource: 'derived',
      statusOverride: null,
      route: 'direct',
      templateId: 'DIRECT-VESTED',
      templateName: 'bAV_Cover_Letter_Direct_Vested',
      authority: 'PEV',
      canGenerate: true,
      lockedReason: null,
      issues: [],
    });
    expect(preview.attachments).toEqual([
      '1. Postempfangsvollmacht',
      '2. Erstattungsbescheid der Deutschen Rentenversicherung vom 01.03.2025',
      '3. Kopie des Reisepasses',
    ]);
  });

  it('defaults an unrouted bAV claim to the law-firm letter', async () => {
    const { claimId } = await bavClaim({ handlingRoute: null });
    const preview = await BavLetterPackageService.previewForClaim(claimId);
    expect(preview.templateId).toBe('LAW-VESTED');
    expect(preview.authority).toBe('VOLL');
  });
});

describe('bAV letter settings', () => {
  it('blocks Non-Vested without a title, then regenerates once it is set', async () => {
    const { claimId, adminId } = await bavClaim();
    const generate = vi.spyOn(
      BavLetterPackageService,
      'generateAndStoreForClaim'
    );

    const first = await BavLetterPackageService.updateLetterSettings(
      claimId,
      adminId,
      { status: 'non_vested', applicationTitle: null }
    );
    expect(first.preview.templateId).toBe('DIRECT-NON_VESTED');
    expect(first.preview.canGenerate).toBe(false);
    expect(first.preview.issues.map((i) => i.field)).toEqual([
      'application_title',
    ]);
    expect(first.regenerated).toBe(false);
    expect(first.signedContentChanged).toBe(true);
    expect(generate).not.toHaveBeenCalled();

    const second = await BavLetterPackageService.updateLetterSettings(
      claimId,
      adminId,
      {
        status: 'non_vested',
        applicationTitle: '  Antrag auf  Beitragserstattung ',
      }
    );
    expect(second.preview.applicationTitle).toBe(
      'Antrag auf Beitragserstattung'
    );
    expect(second.preview.canGenerate).toBe(true);
    expect(second.regenerated).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);

    const [row] = await db
      .select({
        status: claimsTable.bavClaimStatus,
        pdf: claimsTable.pdfS3Key,
      })
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(row.status).toBe('non_vested');
    expect(row.pdf).toMatch(/bav-package-/);
    generate.mockRestore();
  });

  it('refuses a change once the pack was submitted', async () => {
    const { claimId, adminId } = await bavClaim({
      submissionDispatchedAt: new Date(),
    });
    await expect(
      BavLetterPackageService.updateLetterSettings(claimId, adminId, {
        status: 'non_vested',
        applicationTitle: 'Antrag auf Beitragserstattung',
      })
    ).rejects.toThrow(/^Invalid settings: The pack has been submitted/);
  });
});

describe('bAV pack generation', () => {
  it('builds the pack and stores it; refuses with the missing-field list', async () => {
    const { claimId, adminId } = await bavClaim();
    const result = await BavLetterPackageService.generateAndStoreForClaim(
      claimId,
      adminId,
      { asAdmin: true }
    );
    expect(result.templateId).toBe('DIRECT-VESTED');
    expect(result.attachments).toHaveLength(3);
    expect(upload).toHaveBeenCalledTimes(1);

    const bad = await bavClaim({ bavContractReference: null, iban: null }, [
      'passport',
    ]);
    await expect(
      BavLetterPackageService.generateAndStoreForClaim(
        bad.claimId,
        bad.adminId,
        { asAdmin: true }
      )
    ).rejects.toThrow(
      /^Cannot generate bAV package: A contract, policy or membership number.*Client bank details incomplete: IBAN or account number.*DRV refund decision/
    );
  });
});

describe('provider short names', () => {
  it('stores the dropdown label, matches by it and keeps it on a matrix save', async () => {
    const created = await BavProviderService.create({
      name: `Specimen Pensionskasse ${tag}`,
      shortName: `SPK ${tag}`,
      postalCode: '10115',
      city: 'Berlin',
    });
    providerIds.push(created.id);
    expect(created.shortName).toBe(`SPK ${tag}`);
    expect((await BavProviderService.findByName(`spk  ${tag}`))?.id).toBe(
      created.id
    );
    await expect(
      BavProviderService.create({
        name: `Other ${tag}`,
        shortName: `SPK ${tag}`,
      })
    ).rejects.toThrow(/short name/);

    // The claim page's "save to provider matrix" sends no shortName.
    const updated = await BavProviderService.update(created.id, {
      name: created.name,
      street: 'Musterweg 1',
      postalCode: '10115',
      city: 'Berlin',
    });
    expect(updated?.shortName).toBe(`SPK ${tag}`);
    expect(updated?.street).toBe('Musterweg 1');
  });

  it('migration 0031 seeded the six owner providers', async () => {
    const all = await BavProviderService.list();
    const labels = all.map((p) => p.shortName);
    for (const label of [
      'BVV',
      'VBL',
      'KVBW ZVK',
      'Versorgungsausgleichskasse',
      'VddB',
      'VddKO',
    ]) {
      expect(labels).toContain(label);
    }
    const vbl = all.find((p) => p.shortName === 'VBL')!;
    expect(vbl.street).toBeNull();
    expect(vbl.postalCode).toBe('76240');
  });
});
