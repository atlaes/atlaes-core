/**
 * Orchestrates the bAV submission pack for a claim (owner spec 29 Oct
 * 2026): loads the claim, its documents, signature and the runtime
 * settings (postal agent, Anderkonto, letterhead), plans the route ×
 * status letters, refuses while required fields are missing, renders the
 * cover letter and the authority, assembles the pack in order and stores
 * it on the claim row. Mirrors claim-pdf/index.ts for the VBL package.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { downloadFile, uploadFile } from '../../utils/s3';
import { logger } from '../../utils/logger';
import { auditLogs, signatures } from '../../drizzle/schema/shared';
import {
  claimCorrespondence,
  claimWorkflowStates,
  claimsTable,
  defaultHandlingRoute,
  isBavCashout,
} from '../../drizzle/schema/claims';
import {
  ClaimsApplicationService,
  type Claim,
  type ClaimDocument,
} from '../claims-application';
import { OpsSettingsService } from '../ops-settings';
import {
  blockingIssues,
  buildBavLetterPlan,
  LAW_FIRM_SENDER_LINE,
  type BavClaimStatus,
  type BavLetterClaimFields,
  type BavLetterIssue,
  type BavLetterPlan,
  type BavLetterRoute,
  type BavPlanDocument,
} from './context';
import { loadLawFirmAccount, loadLawFirmLetterhead } from './law-firm-config';
import {
  assembleBavPackage,
  type EnclosureFile,
  type EnclosureKind,
} from './package';
import { HAND_SIGNATURE_SPACE_MARKER, SIGNATURE_MARKER } from './render-letter';
import { getBavTemplate, type BavCoverTemplateId } from './templates';

const PNG_DATA_URL_PREFIX = /^data:image\/png;base64,/i;
const NON_PNG_DATA_URL_PREFIX = /^data:image\/(\w+);base64,/i;

export type BavSigner = 'LAW' | 'DIRECT';

export interface BavPackageGenerationResult {
  pdfS3Key: string;
  bytes: Uint8Array;
  templateId: BavCoverTemplateId;
  signer: BavSigner;
  /**
   * Letter-only print for another party. The route × status letters have
   * no copy recipient, so this is always null (kept for callers).
   */
  copy: { s3Key: string; bytes: Uint8Array; recipientName: string } | null;
  /** Always empty: a letter with gaps is never generated. */
  missingPlaceholders: string[];
  /** Attachment list as printed, in pack order. */
  attachments: string[];
}

/** What the admin card shows (GET bav-letter-settings). */
export interface BavLetterPreview {
  status: BavClaimStatus | null;
  statusSource: 'admin' | 'derived' | null;
  /** The admin's explicit choice (null = derived). */
  statusOverride: BavClaimStatus | null;
  applicationTitle: string | null;
  route: BavLetterRoute;
  templateId: BavCoverTemplateId | null;
  templateName: string | null;
  authority: 'PEV' | 'VOLL';
  attachments: string[];
  issues: BavLetterIssue[];
  canGenerate: boolean;
  /** Why the settings can no longer change (submitted / frozen pack). */
  lockedReason: string | null;
}

export interface BavLetterSettingsInput {
  /** null = derive from the DRV refund answer. */
  status: BavClaimStatus | null;
  applicationTitle: string | null;
}

/** Extra claim columns the Claim DTO does not carry. */
async function loadLetterColumns(claimId: string) {
  const [row] = await db
    .select({
      bavClaimStatus: claimsTable.bavClaimStatus,
      bavApplicationTitle: claimsTable.bavApplicationTitle,
      submissionPackS3Key: claimsTable.submissionPackS3Key,
      submissionDispatchedAt: claimsTable.submissionDispatchedAt,
      lawFirmSubmittedAt: claimsTable.lawFirmSubmittedAt,
    })
    .from(claimsTable)
    .where(eq(claimsTable.id, claimId))
    .limit(1);
  return row ?? null;
}

type LetterColumns = NonNullable<Awaited<ReturnType<typeof loadLetterColumns>>>;

function letterRoute(claim: Claim): BavLetterRoute {
  const route = claim.handlingRoute ?? defaultHandlingRoute(claim.caseType);
  return route === 'law_firm' ? 'law_firm' : 'direct';
}

function lockedReason(cols: LetterColumns): string | null {
  if (cols.lawFirmSubmittedAt || cols.submissionDispatchedAt) {
    return 'The pack has been submitted; changes follow the correction workflow';
  }
  if (cols.submissionPackS3Key) {
    return 'The law firm has downloaded the frozen submission pack; it must be reset before the letters can change';
  }
  return null;
}

function planDocuments(docs: ClaimDocument[]): {
  documents: BavPlanDocument[];
  sources: ClaimDocument[];
} {
  const latest = [...latestDocumentsByRole(docs).values()];
  const sources = [...latest, ...extraDocumentsInOrder(docs)];
  return {
    sources,
    documents: sources.map((d) => ({
      role: d.documentRole,
      fileName: d.document?.fileName ?? '',
    })),
  };
}

async function buildPlan(
  claim: Claim,
  cols: LetterColumns,
  docs: ClaimDocument[],
  now: Date
) {
  const route = letterRoute(claim);
  const { documents, sources } = planDocuments(docs);
  const plan = buildBavLetterPlan(
    {
      ...(claim as unknown as BavLetterClaimFields),
      bavClaimStatus: cols.bavClaimStatus,
      bavApplicationTitle: cols.bavApplicationTitle,
    },
    {
      route,
      letterDate: now,
      postalAgent: await OpsSettingsService.postalAgent(),
      lawFirmAccount: route === 'law_firm' ? loadLawFirmAccount() : null,
      documents,
      signatureText: SIGNATURE_MARKER,
      lawyerSignatureSpace: HAND_SIGNATURE_SPACE_MARKER,
    }
  );
  return { plan, sources };
}

const attachmentLines = (plan: BavLetterPlan) =>
  plan.enclosures.map((e, i) => `${i + 1}. ${e.label}`);

export class BavLetterPackageService {
  /**
   * The selected template, the pack's attachment list and every field
   * still missing, without rendering anything (admin claim card).
   */
  static async previewForClaim(
    claimId: string,
    options: { now?: Date } = {}
  ): Promise<BavLetterPreview> {
    const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
    if (!claim) throw new Error('Claim not found');
    if (!isBavCashout(claim)) {
      throw new Error('Invalid settings: the claim is not a bAV cash-out');
    }
    const cols = await loadLetterColumns(claimId);
    if (!cols) throw new Error('Claim not found');
    const docs =
      await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId);
    const { plan } = await buildPlan(
      claim,
      cols,
      docs,
      options.now ?? new Date()
    );
    const override =
      cols.bavClaimStatus === 'vested' || cols.bavClaimStatus === 'non_vested'
        ? cols.bavClaimStatus
        : null;
    return {
      status: plan.status,
      statusSource: plan.statusSource,
      statusOverride: override,
      applicationTitle: cols.bavApplicationTitle,
      route: plan.route,
      templateId: plan.templateId,
      templateName: plan.templateName,
      authority: plan.authority,
      attachments: attachmentLines(plan),
      issues: plan.issues,
      canGenerate: blockingIssues(plan).length === 0,
      lockedReason: lockedReason(cols),
    };
  }

  /**
   * Admin sets the claim status and the non-vested application title. A
   * change before submission regenerates the pack when the claim is past
   * draft and nothing blocks it; the client signature is stamped again on
   * the changed content, which the audit row records so ops can obtain a
   * fresh signature where the content the client signs changed.
   */
  static async updateLetterSettings(
    claimId: string,
    adminUserId: string,
    input: BavLetterSettingsInput
  ): Promise<{
    preview: BavLetterPreview;
    regenerated: boolean;
    regenerationError: string | null;
    signedContentChanged: boolean;
  }> {
    const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
    if (!claim) throw new Error('Claim not found');
    if (!isBavCashout(claim)) {
      throw new Error('Invalid settings: the claim is not a bAV cash-out');
    }
    const cols = await loadLetterColumns(claimId);
    if (!cols) throw new Error('Claim not found');
    const title =
      typeof input.applicationTitle === 'string' &&
      input.applicationTitle.trim() !== ''
        ? input.applicationTitle.trim().replace(/\s+/g, ' ')
        : null;
    const before = {
      status: cols.bavClaimStatus ?? null,
      applicationTitle: cols.bavApplicationTitle ?? null,
    };
    const after = { status: input.status, applicationTitle: title };
    const changed =
      before.status !== after.status ||
      before.applicationTitle !== after.applicationTitle;

    if (changed) {
      const locked = lockedReason(cols);
      if (locked) throw new Error(`Invalid settings: ${locked}`);
    }

    const docs =
      await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId);
    const now = new Date();
    const beforePlan = (await buildPlan(claim, cols, docs, now)).plan;

    if (changed) {
      await db.transaction(async (tx: any) => {
        await tx
          .update(claimsTable)
          .set({
            bavClaimStatus: after.status,
            bavApplicationTitle: after.applicationTitle,
            updatedAt: now,
          })
          .where(eq(claimsTable.id, claimId));
        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: claim.status,
          previousState: claim.status,
          triggeredBy: 'admin',
          metadata: {
            adminUserId,
            action: 'bav_letter_settings_update',
            before,
            after,
          },
        });
        await tx.insert(auditLogs).values({
          userId: adminUserId,
          action: 'claim_bav_letter_settings_updated',
          resource: 'claim',
          resourceId: claimId,
          details: { before, after },
        });
      });
    }

    const afterCols = {
      ...cols,
      bavClaimStatus: after.status,
      bavApplicationTitle: after.applicationTitle,
    };
    const afterPlan = (await buildPlan(claim, afterCols, docs, now)).plan;
    // Direct letters carry the client's signature on the cover letter;
    // both routes on the authority (whose procedure follows the status).
    const signedContentChanged =
      changed &&
      (beforePlan.templateId !== afterPlan.templateId ||
        beforePlan.context.procedure_description !==
          afterPlan.context.procedure_description ||
        (afterPlan.route === 'direct' &&
          beforePlan.context.application_title !==
            afterPlan.context.application_title));

    let regenerated = false;
    let regenerationError: string | null = null;
    if (changed && claim.status !== 'draft') {
      if (blockingIssues(afterPlan).length === 0) {
        try {
          await this.generateAndStoreForClaim(claimId, adminUserId, {
            asAdmin: true,
            now,
          });
          regenerated = true;
        } catch (error) {
          regenerationError =
            error instanceof Error ? error.message : String(error);
          logger.warn('bAV pack regeneration after settings change failed', {
            claimId,
            error: regenerationError,
          });
        }
      } else {
        regenerationError =
          'Not regenerated: required fields are missing (see the list)';
      }
    }
    if (signedContentChanged) {
      await db.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_bav_signed_content_changed',
        resource: 'claim',
        resourceId: claimId,
        details: {
          before: beforePlan.templateId,
          after: afterPlan.templateId,
          note: 'The content the client signs changed; obtain a new client signature before release.',
        },
      });
    }

    return {
      preview: await this.previewForClaim(claimId, { now }),
      regenerated,
      regenerationError,
      signedContentChanged,
    };
  }

  /**
   * Generates and stores the pack. `userId` is the claim owner for the
   * ownership check and the audit trail; pass `asAdmin` to skip the
   * ownership check (admin regeneration). Throws "Cannot generate bAV
   * package: …" listing every missing field.
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
    if (!isBavCashout(claim)) {
      throw new Error(
        'bAV package requested for a claim that is not a bAV cash-out'
      );
    }
    const cols = await loadLetterColumns(claimId);
    if (!cols) throw new Error('Claim not found');

    const docs = options.asAdmin
      ? await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId)
      : await ClaimsApplicationService.getClaimDocuments(claimId, userId);
    const { plan, sources } = await buildPlan(
      claim,
      cols,
      docs,
      options.now ?? new Date()
    );

    const blocking = blockingIssues(plan);
    if (blocking.length > 0 || !plan.templateId) {
      throw new Error(
        `Cannot generate bAV package: ${blocking.map((i) => i.message).join('; ')}`
      );
    }
    const templateId = plan.templateId;
    const signer: BavSigner = plan.route === 'law_firm' ? 'LAW' : 'DIRECT';

    const letter = getBavTemplate(templateId).render(plan.context);
    const authority = getBavTemplate(plan.authority).render(plan.context);
    const unresolved = Array.from(
      new Set([...letter.missing, ...authority.missing])
    );
    if (unresolved.length > 0) {
      // A template references a field the plan does not set: a code bug,
      // never a data gap. Refuse rather than print a gap.
      throw new Error(
        `Cannot generate bAV package: unresolved placeholders ${unresolved.join(', ')}`
      );
    }

    const letterhead = signer === 'LAW' ? loadLawFirmLetterhead() : null;
    if (signer === 'LAW' && !letterhead) {
      logger.warn(
        'LAW package rendered without letterhead: asset not present',
        {
          claimId,
        }
      );
    }

    const signaturePng = await this.loadSignaturePng(claim.signatureId!);
    const files = new Map<number, EnclosureFile>();
    for (const enclosure of plan.enclosures) {
      if (enclosure.documentIndex === undefined) continue;
      const doc = sources[enclosure.documentIndex];
      const bytes = await downloadFile(doc.document!.s3Key);
      files.set(enclosure.documentIndex, {
        bytes: new Uint8Array(bytes),
        fileType: doc.document!.fileType,
      });
    }

    const result = await assembleBavPackage({
      letterText: letter.text,
      authorityText: authority.text,
      enclosures: plan.enclosures,
      files,
      signaturePng,
      letterheadPdf: letterhead ?? undefined,
      subjectLine:
        plan.status === 'non_vested'
          ? String(plan.context.application_title)
          : undefined,
      smallLines: signer === 'LAW' ? [LAW_FIRM_SENDER_LINE] : undefined,
    });

    const pdfKey = `claims/${claimId}/bav-package-${Date.now()}.pdf`;
    await uploadFile(pdfKey, Buffer.from(result.bytes), 'application/pdf');
    const attachments = attachmentLines(plan);

    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ pdfS3Key: pdfKey, copyPdfS3Key: null, updatedAt: new Date() })
        .where(eq(claimsTable.id, claimId));

      // Law-firm cases: log the outgoing package in the claim's
      // correspondence so the portal shows what was handed over.
      if (signer === 'LAW' && claim.lawFirmId) {
        await tx.insert(claimCorrespondence).values({
          claimId,
          documentId: null,
          direction: 'package_out',
          source: 'ops',
          lawFirmId: claim.lawFirmId,
          uploadedBy: userId,
          note: `Letter package ${templateId} generated${
            plan.context.law_firm_az
              ? ` (Unser Zeichen ${plan.context.law_firm_az})`
              : ''
          }`,
        });
      }

      await tx.insert(auditLogs).values({
        userId,
        action: 'claim_pdf_generated',
        resource: 'claim',
        resourceId: claimId,
        details: {
          package: 'bav',
          templateId,
          status: plan.status,
          statusSource: plan.statusSource,
          signer,
          pdfS3Key: pdfKey,
          enclosures: result.enclosures,
          attachments,
          letterPageCount: result.letterPageCount,
          letterheadEmbedded: !!letterhead,
        },
      });
    });

    logger.info('bAV package generated', {
      claimId,
      templateId,
      enclosures: result.enclosures,
    });

    return {
      pdfS3Key: pdfKey,
      bytes: result.bytes,
      templateId,
      signer,
      copy: null,
      missingPlaceholders: [],
      attachments,
    };
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

/** Extra documents ('bav_extra') in upload order, oldest first. */
export function extraDocumentsInOrder(docs: ClaimDocument[]): ClaimDocument[] {
  return docs
    .filter((d) => d.documentRole === 'bav_extra' && !!d.document)
    .sort(
      (a, b) =>
        (a.createdAt ? a.createdAt.getTime() : 0) -
        (b.createdAt ? b.createdAt.getTime() : 0)
    );
}

/**
 * Newest claim document per role (a re-upload replaces the older file).
 * Extras are excluded: any number of them may exist (see extraDocumentsInOrder).
 */
export function latestDocumentsByRole(
  docs: ClaimDocument[]
): Map<ClaimDocument['documentRole'], ClaimDocument> {
  const byRole = new Map<ClaimDocument['documentRole'], ClaimDocument>();
  for (const doc of docs) {
    if (!doc.document || doc.documentRole === 'bav_extra') continue;
    const existing = byRole.get(doc.documentRole);
    const t = doc.createdAt ? doc.createdAt.getTime() : 0;
    const te = existing?.createdAt ? existing.createdAt.getTime() : -1;
    if (!existing || t >= te) byRole.set(doc.documentRole, doc);
  }
  return byRole;
}

export type { Claim, EnclosureKind };
