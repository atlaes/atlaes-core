/**
 * Orchestrates the bAV Abfindung package for a claim: loads the claim, its
 * documents and signature, builds the template context, renders the letter
 * and the power of attorney, assembles the package in Anlagen order, and
 * stores it in S3 on the claim row. Mirrors claim-pdf/index.ts for the
 * VBL package.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { downloadFile, uploadFile } from '../../utils/s3';
import { logger } from '../../utils/logger';
import { auditLogs, signatures } from '../../drizzle/schema/shared';
import {
  claimCorrespondence,
  claimsTable,
  type ClaimDocumentRole,
} from '../../drizzle/schema/claims';
import {
  ClaimsApplicationService,
  type Claim,
  type ClaimDocument,
} from '../claims-application';
import { buildBavLetterContext, type BavSigner } from './context';
import { validateBavIntake } from './intake-validation';
import { loadLawFirmAccount, loadLawFirmLetterhead } from './law-firm-config';
import {
  assembleBavPackage,
  type BavLetterTemplateId,
  type EnclosureFile,
  type EnclosureKind,
} from './package';
import { renderLetterPdf, SIGNATURE_MARKER } from './render-letter';
import type { TemplateContext } from './template-engine';
import { getBavTemplate } from './templates';

const PNG_DATA_URL_PREFIX = /^data:image\/png;base64,/i;
const NON_PNG_DATA_URL_PREFIX = /^data:image\/(\w+);base64,/i;

/** Claim document roles that become package enclosures, by enclosure kind. */
const DOCUMENT_ENCLOSURES: Array<{
  kind: Exclude<EnclosureKind, 'voll' | 'pev'>;
  role: ClaimDocumentRole;
}> = [
  { kind: 'passport', role: 'passport' },
  { kind: 'drv_refund_decision', role: 'drv_refund_decision' },
  { kind: 'pension_statement', role: 'pension_statement' },
  { kind: 'provider_form', role: 'provider_form' },
  { kind: 'employer_consent', role: 'employer_consent' },
  { kind: 'employment_end_proof', role: 'employment_end_proof' },
  { kind: 'foreign_health_insurance', role: 'foreign_health_insurance' },
  { kind: 'bank_proof', role: 'bank_proof' },
];

export interface BavPackageGenerationResult {
  pdfS3Key: string;
  bytes: Uint8Array;
  templateId: BavLetterTemplateId;
  signer: BavSigner;
  /** Letter-only print for the other party, when a copy is due. */
  copy: { s3Key: string; bytes: Uint8Array; recipientName: string } | null;
  /** Placeholders the context builder could not fill (informational). */
  missingPlaceholders: string[];
}

export class BavLetterPackageService {
  /**
   * Generates and stores the package. `userId` is the claim owner for the
   * ownership check and the audit trail; pass `asAdmin` to skip the
   * ownership check (admin regeneration).
   */
  static async generateAndStoreForClaim(
    claimId: string,
    userId: string,
    options: { asAdmin?: boolean; now?: Date } = {}
  ): Promise<BavPackageGenerationResult> {
    const claim = options.asAdmin
      ? await ClaimsApplicationService.getClaimAsAdmin(claimId)
      : await ClaimsApplicationService.getClaim(claimId, userId);
    if (!claim) throw new Error('Claim not found');
    if (claim.pensionType !== 'private') {
      throw new Error(
        'bAV package requested for a claim that is not a bAV cash-out'
      );
    }

    const docs = options.asAdmin
      ? await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId)
      : await ClaimsApplicationService.getClaimDocuments(claimId, userId);
    const latestByRole = latestDocumentsByRole(docs);
    const roles = [...latestByRole.keys()];

    const errors = validateBavIntake(claim, roles, options.now);
    if (!claim.signatureId) errors.push('Signature is required');
    if (!latestByRole.has('passport'))
      errors.push('Passport document is required');
    if (errors.length > 0) {
      throw new Error(`Cannot generate bAV package: ${errors.join('; ')}`);
    }

    const signer: BavSigner =
      claim.handlingRoute === 'law_firm' ? 'LAW' : 'DIRECT';
    const lawFirmAccount = signer === 'LAW' ? loadLawFirmAccount() : null;
    const letterhead = signer === 'LAW' ? loadLawFirmLetterhead() : null;
    if (signer === 'LAW' && !letterhead) {
      logger.warn(
        'LAW package rendered without letterhead: asset not present',
        {
          claimId,
        }
      );
    }

    // The provider is asked to obtain the employer's declaration itself
    // when we do not enclose one; the employer then gets a copy so both
    // parties hold the same request. Employer-addressed letters copy the
    // provider so it knows a request is coming.
    const employerConsentEnclosed = latestByRole.has('employer_consent');
    const sendCopy =
      claim.bavAddresseeType === 'provider'
        ? !employerConsentEnclosed
        : !!claim.bavProviderName;

    const built = buildBavLetterContext(claim, roles, {
      signer,
      letterDate: options.now ?? new Date(),
      payoutTarget: claim.payoutTarget === 'law_firm' ? 'law_firm' : 'client',
      sendCopy,
      lawFirmRef: claim.lawFirmRef ?? undefined,
      lawFirmAccount: lawFirmAccount ?? undefined,
      signatureText: SIGNATURE_MARKER,
    });
    const userInfo = await ClaimsApplicationService.getClaimUserInfo(claimId);
    const context: TemplateContext = {
      ...built.context,
      client_email: userInfo?.email ?? '',
    };
    const templateId = built.templateId as BavLetterTemplateId;

    const letter = getBavTemplate(templateId).render(context);
    const poaTemplate = signer === 'LAW' ? 'VOLL' : 'PEV';
    const poa = getBavTemplate(poaTemplate).render(context);
    const missingPlaceholders = Array.from(
      new Set([...built.missing, ...letter.missing, ...poa.missing])
    );
    if (missingPlaceholders.length > 0) {
      logger.warn('bAV letter rendered with empty placeholders', {
        claimId,
        templateId,
        missingPlaceholders,
      });
    }

    const signaturePng = await this.loadSignaturePng(claim.signatureId!);
    const files = await this.downloadEnclosures(latestByRole);

    const result = await assembleBavPackage({
      templateId,
      letterText: letter.text,
      powerOfAttorneyText: poa.text,
      signaturePng,
      letterheadPdf: letterhead ?? undefined,
      files,
    });

    const stamp = Date.now();
    const pdfKey = `claims/${claimId}/bav-package-${stamp}.pdf`;
    await uploadFile(pdfKey, Buffer.from(result.bytes), 'application/pdf');

    let copy: BavPackageGenerationResult['copy'] = null;
    if (sendCopy && context.copy_recipient_name) {
      const copyLetter = await renderLetterPdf({
        text: letter.text,
        signaturePng,
        letterheadPdf: letterhead ?? undefined,
      });
      const copyKey = `claims/${claimId}/bav-copy-${stamp}.pdf`;
      await uploadFile(
        copyKey,
        Buffer.from(copyLetter.bytes),
        'application/pdf'
      );
      copy = {
        s3Key: copyKey,
        bytes: copyLetter.bytes,
        recipientName: String(context.copy_recipient_name),
      };
    }

    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({
          pdfS3Key: pdfKey,
          copyPdfS3Key: copy?.s3Key ?? null,
          updatedAt: new Date(),
        })
        .where(eq(claimsTable.id, claimId));

      // Law-firm cases: log the outgoing package (and copy) in the
      // claim's correspondence so the portal shows what was handed over.
      if (signer === 'LAW' && claim.lawFirmId) {
        const outgoing = [
          {
            direction: 'package_out',
            note: `Letter package ${templateId} generated${
              claim.lawFirmRef ? ` (Unser Zeichen ${claim.lawFirmRef})` : ''
            }`,
          },
          ...(copy
            ? [
                {
                  direction: 'copy_out',
                  note: `Copy print for ${copy.recipientName} generated`,
                },
              ]
            : []),
        ];
        await tx.insert(claimCorrespondence).values(
          outgoing.map((o) => ({
            claimId,
            documentId: null,
            direction: o.direction,
            source: 'ops',
            lawFirmId: claim.lawFirmId,
            uploadedBy: userId,
            note: o.note,
          }))
        );
      }

      await tx.insert(auditLogs).values({
        userId,
        action: 'claim_pdf_generated',
        resource: 'claim',
        resourceId: claimId,
        details: {
          package: 'bav',
          templateId,
          signer,
          pdfS3Key: pdfKey,
          copyS3Key: copy?.s3Key ?? null,
          enclosures: result.enclosures,
          letterPageCount: result.letterPageCount,
          missingPlaceholders,
          letterheadEmbedded: !!letterhead,
        },
      });
    });

    logger.info('bAV package generated', {
      claimId,
      templateId,
      enclosures: result.enclosures,
      copy: !!copy,
    });

    return {
      pdfS3Key: pdfKey,
      bytes: result.bytes,
      templateId,
      signer,
      copy,
      missingPlaceholders,
    };
  }

  private static async downloadEnclosures(
    latestByRole: Map<ClaimDocumentRole, ClaimDocument>
  ): Promise<
    Partial<Record<Exclude<EnclosureKind, 'voll' | 'pev'>, EnclosureFile>>
  > {
    const files: Partial<
      Record<Exclude<EnclosureKind, 'voll' | 'pev'>, EnclosureFile>
    > = {};
    for (const { kind, role } of DOCUMENT_ENCLOSURES) {
      const doc = latestByRole.get(role);
      if (!doc?.document) continue;
      const bytes = await downloadFile(doc.document.s3Key);
      files[kind] = {
        bytes: new Uint8Array(bytes),
        fileType: doc.document.fileType,
      };
    }
    return files;
  }

  // Same guard as claim-pdf/index.ts: the signatures upload route accepts
  // any image data URL, pdf-lib only embeds PNG.
  private static async loadSignaturePng(
    signatureId: string
  ): Promise<Uint8Array> {
    const [signature] = await db
      .select()
      .from(signatures)
      .where(eq(signatures.id, signatureId))
      .limit(1);
    if (!signature) throw new Error(`Signature not found: ${signatureId}`);
    const raw = signature.signatureData;
    if (NON_PNG_DATA_URL_PREFIX.test(raw) && !PNG_DATA_URL_PREFIX.test(raw)) {
      throw new Error(
        `Signature ${signatureId} is not PNG-encoded (expected image/png data URL)`
      );
    }
    return new Uint8Array(
      Buffer.from(raw.replace(PNG_DATA_URL_PREFIX, ''), 'base64')
    );
  }
}

/** Newest claim document per role (a re-upload replaces the older file). */
export function latestDocumentsByRole(
  docs: ClaimDocument[]
): Map<ClaimDocumentRole, ClaimDocument> {
  const byRole = new Map<ClaimDocumentRole, ClaimDocument>();
  for (const doc of docs) {
    if (!doc.document) continue;
    const existing = byRole.get(doc.documentRole);
    const t = doc.createdAt ? doc.createdAt.getTime() : 0;
    const te = existing?.createdAt ? existing.createdAt.getTime() : -1;
    if (!existing || t >= te) byRole.set(doc.documentRole, doc);
  }
  return byRole;
}

export type { Claim };
