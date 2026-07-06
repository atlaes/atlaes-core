import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { downloadFile, uploadFile } from '../../utils/s3';
import { auditLogs, signatures } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import { ClaimsApplicationService, Claim } from '../claims-application';
import { assembleClaimPdf } from './assemble';

const REQUIRED_CLAIM_FIELDS: Array<{ key: keyof Claim; label: string }> = [
  { key: 'firstName', label: 'firstName' },
  { key: 'lastName', label: 'lastName' },
  { key: 'dateOfBirth', label: 'dateOfBirth' },
  { key: 'placeOfBirth', label: 'placeOfBirth' },
  { key: 'currentAddressLine1', label: 'currentAddressLine1' },
  { key: 'currentCity', label: 'currentCity' },
  { key: 'currentPostalCode', label: 'currentPostalCode' },
  { key: 'svNummer', label: 'svNummer' },
  { key: 'iban', label: 'iban' },
  { key: 'signatureId', label: 'signatureId' },
];

const PNG_DATA_URL_PREFIX = /^data:image\/png;base64,/i;
const NON_PNG_DATA_URL_PREFIX = /^data:image\/(\w+);base64,/i;

export class ClaimPdfService {
  /**
   * Returns a list of human-readable field names that are missing from
   * `claim` and required to generate the combined claim PDF. Also
   * requires a `passport`-role claim document, checked separately by the
   * caller (this pure check only has access to the claim row itself).
   */
  static getRequiredFieldErrors(claim: Claim): string[] {
    const missing: string[] = [];
    for (const { key, label } of REQUIRED_CLAIM_FIELDS) {
      const value = claim[key];
      if (value === null || value === undefined || value === '') {
        missing.push(label);
      }
    }
    return missing;
  }

  /**
   * Orchestrates the full combined VBL claim PDF generation: loads the
   * claim + signature + passport document, assembles the PDF (pure), and
   * persists it to S3 + the claim row.
   */
  static async generateAndStoreForClaim(
    claimId: string,
    userId: string
  ): Promise<{ pdfS3Key: string; bytes: Uint8Array }> {
    const claim = await ClaimsApplicationService.getClaim(claimId, userId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const fieldErrors = this.getRequiredFieldErrors(claim);
    const docs = await ClaimsApplicationService.getClaimDocuments(
      claimId,
      userId
    );
    const passportDocs = docs
      .filter((d) => d.documentRole === 'passport' && d.document)
      .sort(
        (a, b) =>
          (b.createdAt ? b.createdAt.getTime() : 0) -
          (a.createdAt ? a.createdAt.getTime() : 0)
      );
    const passportDoc = passportDocs[0];
    if (!passportDoc) {
      fieldErrors.push('passport document');
    }

    if (fieldErrors.length > 0) {
      throw new Error(
        `Cannot generate PDF, missing: ${fieldErrors.join(', ')}`
      );
    }

    const signaturePng = await this.loadSignaturePng(claim.signatureId!);

    const passportBytes = await downloadFile(passportDoc!.document!.s3Key);

    const bytes = await assembleClaimPdf({
      claim: {
        firstName: claim.firstName!,
        lastName: claim.lastName!,
        dateOfBirth: claim.dateOfBirth!,
        placeOfBirth: claim.placeOfBirth!,
        currentAddressLine1: claim.currentAddressLine1!,
        currentAddressLine2: claim.currentAddressLine2,
        currentCity: claim.currentCity!,
        currentPostalCode: claim.currentPostalCode!,
        currentCountry: claim.currentCountry,
        svNummer: claim.svNummer!,
        iban: claim.iban!,
        swiftBic: claim.swiftBic,
        accountHolderName: claim.accountHolderName,
        bankName: claim.bankName,
        bankCity: claim.bankCity,
      },
      signaturePng,
      passport: {
        bytes: passportBytes,
        fileType: passportDoc!.document!.fileType,
      },
    });

    const pdfKey = `claims/${claimId}/vbl-claim-package-${Date.now()}.pdf`;
    await uploadFile(pdfKey, Buffer.from(bytes), 'application/pdf');

    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ pdfS3Key: pdfKey, updatedAt: new Date() })
        .where(eq(claimsTable.id, claimId));

      await tx.insert(auditLogs).values({
        userId,
        action: 'claim_pdf_generated',
        resource: 'claim',
        resourceId: claimId,
        details: { pdfS3Key: pdfKey },
      });
    });

    return { pdfS3Key: pdfKey, bytes };
  }

  /**
   * Loads a signature row and decodes its base64 PNG payload. Signatures
   * are stored PNG-only (see the signatures upload route); any other
   * image type throws a clear, signature-id-scoped error rather than
   * silently feeding non-PNG bytes to pdf-lib's `embedPng`.
   */
  private static async loadSignaturePng(
    signatureId: string
  ): Promise<Uint8Array> {
    const [signature] = await db
      .select()
      .from(signatures)
      .where(eq(signatures.id, signatureId))
      .limit(1);

    if (!signature) {
      throw new Error(`Signature not found: ${signatureId}`);
    }

    const raw = signature.signatureData;
    if (NON_PNG_DATA_URL_PREFIX.test(raw) && !PNG_DATA_URL_PREFIX.test(raw)) {
      throw new Error(
        `Signature ${signatureId} is not PNG-encoded (expected image/png data URL)`
      );
    }

    const base64 = raw.replace(PNG_DATA_URL_PREFIX, '');
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}
