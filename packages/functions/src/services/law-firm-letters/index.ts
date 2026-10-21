/**
 * Return channel (owner answer 6, 20 Oct 2026). The firm bulk-uploads
 * scanned DRV letters in the portal; each file is stored, OCR'd (Mistral),
 * classified and matched within the firm's own cases (rules in
 * ./extract.ts).
 *
 *  - One confident match → filed to the case: correspondence entry
 *    (provider_in, source 'return_channel'), case event "DRV letter
 *    received", audit row. The next step stays pending for ATLAES.
 *  - Anything else → needs_review in the ATLAES "needs attention" queue.
 *  - ATLAES files or moves a letter by hand, dismisses it, and releases
 *    the next step: record the refund decision (PayoutFlowService), notify
 *    the client (client-update contact → E2A/E2B draft), or mark handled.
 *    Nothing downstream starts automatically.
 *
 * OCR and storage reads go through `deps` so tests can replace them.
 */

import { createHash, randomUUID } from 'crypto';
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { downloadFile, getPresignedUrl, uploadFile } from '../../utils/s3';
import { auditLogs, documents, users } from '../../drizzle/schema/shared';
import {
  claimCorrespondence,
  claimsTable,
  claimWorkflowStates,
} from '../../drizzle/schema/claims';
import {
  lawFirmLetters,
  type LetterExtraction,
  type LetterMatchMethod,
  type LetterMatchReason,
  type LetterNextStep,
  type LetterStatus,
  type LetterType,
} from '../../drizzle/schema/law-firm-letters';
import { ocrDocumentText } from '../drv-refund-decision-extraction';
import {
  CORRESPONDENCE_ALLOWED_TYPES,
  CORRESPONDENCE_MAX_BYTES,
  firmClaimScope,
} from '../law-firm';
import { PayoutFlowService } from '../payout-flow';
import { ClientUpdatesService } from '../client-updates';
import {
  classifyLetter,
  extractLetterFields,
  LETTER_TYPE_LABELS,
  matchLetter,
  type LetterCandidate,
} from './extract';

export { LETTER_TYPE_LABELS, MATCH_REASON_LABELS } from './extract';

/** Stored OCR text is for the admin view only; the letter itself is the PDF. */
const OCR_TEXT_MAX = 20_000;
const FILE_URL_TTL_SECONDS = 300;

export const deps = {
  ocr: (file: { buf: Buffer; name: string; type: string }) =>
    ocrDocumentText({
      fileBuffer: file.buf,
      fileName: file.name,
      mimeType: file.type,
    }),
  download: (key: string) => downloadFile(key),
};

export interface Actor {
  id: string;
  email: string;
}

export interface CaseRef {
  claimId: string;
  name: string | null;
  vsnr: string | null;
  lawFirmRef: string | null;
}

export interface FirmLetterView {
  id: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string | null;
  status: LetterStatus;
  letterType: LetterType;
  matchReason: LetterMatchReason;
  case: CaseRef | null;
}

export interface UploadResult {
  duplicate: boolean;
  letter: FirmLetterView;
}

export interface AdminLetterView extends FirmLetterView {
  firm: { id: string; name: string };
  fileType: string;
  fileSize: number;
  ocrStatus: string;
  ocrError: string | null;
  ocrText: string | null;
  extracted: LetterExtraction | null;
  matchMethod: LetterMatchMethod | null;
  candidates: CaseRef[];
  nextStepStatus: 'pending' | 'done' | null;
  nextStepAction: LetterNextStep | null;
  handledBy: string | null;
  handledAt: string | null;
  handledNote: string | null;
}

export class LetterError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400
  ) {
    super(message);
  }
}

type LetterRow = typeof lawFirmLetters.$inferSelect;

const CASE_COLUMNS = {
  claimId: claimsTable.id,
  firstName: claimsTable.firstName,
  lastName: claimsTable.lastName,
  birthName: claimsTable.birthName,
  vsnr: claimsTable.vsnr,
  svNummer: claimsTable.svNummer,
  lawFirmRef: claimsTable.lawFirmRef,
  status: claimsTable.status,
};

function caseRef(c: {
  claimId: string;
  firstName: string | null;
  lastName: string | null;
  vsnr: string | null;
  svNummer?: string | null;
  lawFirmRef: string | null;
}): CaseRef {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || null;
  return {
    claimId: c.claimId,
    name,
    vsnr: c.vsnr ?? c.svNummer ?? null,
    lawFirmRef: c.lawFirmRef,
  };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** The firm's cases the letter may belong to (never another firm's). */
async function firmCandidates(firmId: string): Promise<LetterCandidate[]> {
  const rows = await db
    .select(CASE_COLUMNS)
    .from(claimsTable)
    .where(and(firmClaimScope(firmId), ne(claimsTable.status, 'draft')));
  return rows;
}

async function firmCase(firmId: string, claimId: string) {
  const [row] = await db
    .select(CASE_COLUMNS)
    .from(claimsTable)
    .where(
      and(
        firmClaimScope(firmId),
        ne(claimsTable.status, 'draft'),
        eq(claimsTable.id, claimId)
      )
    )
    .limit(1);
  return row ?? null;
}

async function casesById(ids: string[]): Promise<Map<string, CaseRef>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select(CASE_COLUMNS)
    .from(claimsTable)
    .where(inArray(claimsTable.id, ids));
  return new Map(rows.map((r: (typeof rows)[number]) => [r.claimId, caseRef(r)]));
}

async function loadLetter(letterId: string): Promise<LetterRow> {
  const [row] = await db
    .select()
    .from(lawFirmLetters)
    .where(eq(lawFirmLetters.id, letterId))
    .limit(1);
  if (!row) throw new LetterError('Letter not found', 404);
  return row;
}

/**
 * Correspondence entry + case event + audit row for a letter filed to a
 * case. Runs inside the caller's transaction.
 */
async function fileToCase(
  tx: any,
  letter: LetterRow,
  claim: { claimId: string; status: string | null },
  by: { userId: string | null; role: 'law_firm' | 'admin' },
  method: LetterMatchMethod
): Promise<string> {
  const [corr] = await tx
    .insert(claimCorrespondence)
    .values({
      claimId: claim.claimId,
      documentId: letter.documentId,
      direction: 'provider_in',
      source: 'return_channel',
      lawFirmId: letter.lawFirmId,
      uploadedBy: letter.uploadedBy,
      receivedDate: dayOf(letter.createdAt),
      note: `${LETTER_TYPE_LABELS[letter.letterType]} · return channel`,
    })
    .returning({ id: claimCorrespondence.id });
  await tx.insert(claimWorkflowStates).values({
    claimId: claim.claimId,
    state: claim.status ?? 'submitted',
    previousState: claim.status,
    triggeredBy: by.role,
    metadata: {
      type: 'law_firm_event',
      event: 'drv_letter_received',
      letterId: letter.id,
      letterType: letter.letterType,
      letterDate: letter.extracted?.letterDate ?? null,
      fileName: letter.fileName,
      correspondenceId: corr.id,
      matchMethod: method,
      firmId: letter.lawFirmId,
      userId: by.userId,
    },
  });
  await tx.insert(auditLogs).values({
    userId: by.userId,
    action: 'drv_letter_filed',
    resource: 'claim',
    resourceId: claim.claimId,
    details: {
      letterId: letter.id,
      correspondenceId: corr.id,
      matchMethod: method,
      letterType: letter.letterType,
    },
  });
  return corr.id;
}

export class LawFirmLettersService {
  /**
   * One file per call: store, OCR, classify, match. OCR failure keeps the
   * file and sends it to review. The same file twice (sha256, per firm) is
   * not stored again.
   */
  static async upload(input: {
    firmId: string;
    userId: string;
    file: File;
    ip?: string | null;
  }): Promise<UploadResult> {
    const { firmId, userId, file } = input;
    if (file.size === 0) throw new LetterError('Invalid file: the file is empty');
    if (file.size > CORRESPONDENCE_MAX_BYTES) {
      throw new LetterError('Invalid file: size exceeds 10MB limit');
    }
    if (!CORRESPONDENCE_ALLOWED_TYPES.has(file.type)) {
      throw new LetterError('Invalid file: allowed types are PDF, JPG, PNG');
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const sha = createHash('sha256').update(buf).digest('hex');
    const fileName = (file.name || 'letter').slice(0, 255);

    const [existing] = await db
      .select({ id: lawFirmLetters.id })
      .from(lawFirmLetters)
      .where(
        and(
          eq(lawFirmLetters.lawFirmId, firmId),
          eq(lawFirmLetters.fileSha256, sha),
          ne(lawFirmLetters.status, 'dismissed')
        )
      )
      .limit(1);
    if (existing) {
      await db.insert(auditLogs).values({
        userId,
        action: 'law_firm_letter_duplicate',
        resource: 'law_firm_letter',
        resourceId: existing.id,
        details: { firmId, fileName },
        ipAddress: input.ip ?? null,
      });
      const [view] = await this.listForFirm(firmId, { ids: [existing.id] });
      return { duplicate: true, letter: view };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const s3Key = `law-firm-letters/${firmId}/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, buf, file.type);

    let text: string | null = null;
    let ocrError: string | null = null;
    try {
      text = await deps.ocr({ buf, name: fileName, type: file.type });
    } catch (error) {
      ocrError = error instanceof Error ? error.message : String(error);
      logger.warn('Return channel: OCR failed', { firmId, ocrError });
    }

    const extracted = text ? extractLetterFields(text) : null;
    const letterType: LetterType = text ? classifyLetter(text) : 'other';
    const match =
      text && extracted
        ? matchLetter(text, extracted, await firmCandidates(firmId))
        : null;
    const claim = match?.claimId ? await firmCase(firmId, match.claimId) : null;

    const letterId = await db.transaction(async (tx: any) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          userId,
          fileName,
          fileType: file.type,
          fileSize: file.size,
          s3Key,
          documentType: 'drv_letter',
          status: 'completed',
        })
        .returning({ id: documents.id });
      const [row] = await tx
        .insert(lawFirmLetters)
        .values({
          lawFirmId: firmId,
          uploadedBy: userId,
          documentId: doc.id,
          fileName,
          fileType: file.type,
          fileSize: file.size,
          fileSha256: sha,
          s3Key,
          status: claim ? 'matched' : 'needs_review',
          ocrStatus: text ? 'done' : 'failed',
          ocrError,
          ocrText: text ? text.slice(0, OCR_TEXT_MAX) : null,
          extracted,
          letterType,
          matchMethod: claim ? match!.method : null,
          matchReason: claim ? match!.reason : (match?.reason ?? 'ocr_failed'),
          claimId: claim?.claimId ?? null,
          candidateClaimIds: match?.candidates.length ? match.candidates : null,
          nextStepStatus: claim ? 'pending' : null,
        })
        .returning();
      if (claim) {
        const correspondenceId = await fileToCase(
          tx,
          row,
          claim,
          { userId, role: 'law_firm' },
          match!.method!
        );
        await tx
          .update(lawFirmLetters)
          .set({ correspondenceId })
          .where(eq(lawFirmLetters.id, row.id));
      }
      await tx.insert(auditLogs).values({
        userId,
        action: 'law_firm_letter_uploaded',
        resource: 'law_firm_letter',
        resourceId: row.id,
        details: {
          firmId,
          fileName,
          fileSize: file.size,
          letterType,
          status: row.status,
          matchReason: row.matchReason,
          claimId: row.claimId,
        },
        ipAddress: input.ip ?? null,
      });
      return row.id as string;
    });

    const [view] = await this.listForFirm(firmId, { ids: [letterId] });
    return { duplicate: false, letter: view };
  }

  /** The firm's own uploads, newest first. */
  static async listForFirm(
    firmId: string,
    opts: { ids?: string[]; limit?: number } = {}
  ): Promise<FirmLetterView[]> {
    const rows = await db
      .select({ letter: lawFirmLetters, uploadedBy: users.email })
      .from(lawFirmLetters)
      .leftJoin(users, eq(users.id, lawFirmLetters.uploadedBy))
      .where(
        and(
          eq(lawFirmLetters.lawFirmId, firmId),
          opts.ids ? inArray(lawFirmLetters.id, opts.ids) : undefined
        )
      )
      .orderBy(desc(lawFirmLetters.createdAt))
      .limit(opts.limit ?? 50);
    const cases = await casesById(
      rows
        .map((r: { letter: LetterRow }) => r.letter.claimId)
        .filter((id: string | null): id is string => !!id)
    );
    return rows.map((r: { letter: LetterRow; uploadedBy: string | null }) => ({
      id: r.letter.id,
      fileName: r.letter.fileName,
      createdAt: r.letter.createdAt.toISOString(),
      uploadedBy: r.uploadedBy,
      status: r.letter.status,
      letterType: r.letter.letterType,
      matchReason: r.letter.matchReason,
      case: r.letter.claimId ? (cases.get(r.letter.claimId) ?? null) : null,
    }));
  }

  // -------------------------------------------------------------------------
  // ATLAES admin
  // -------------------------------------------------------------------------

  private static attentionWhere() {
    return or(
      eq(lawFirmLetters.status, 'needs_review'),
      eq(lawFirmLetters.nextStepStatus, 'pending')
    );
  }

  static async attentionCount(): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(lawFirmLetters)
      .where(this.attentionWhere());
    return Number(row?.n ?? 0);
  }

  /** 'attention' = waiting for a human; 'handled' = the last 50 closed. */
  static async listAdmin(
    view: 'attention' | 'handled' = 'attention',
    ids?: string[]
  ): Promise<AdminLetterView[]> {
    const rows = await db
      .select({
        letter: lawFirmLetters,
        uploadedBy: users.email,
        firmName: sql<string>`(select name from shared.law_firms f where f.id = ${lawFirmLetters.lawFirmId})`,
        handledBy: sql<
          string | null
        >`(select h.email from shared.users h where h.id = ${lawFirmLetters.handledBy})`,
      })
      .from(lawFirmLetters)
      .leftJoin(users, eq(users.id, lawFirmLetters.uploadedBy))
      .where(
        ids
          ? inArray(lawFirmLetters.id, ids)
          : view === 'attention'
            ? this.attentionWhere()
            : and(
                ne(lawFirmLetters.status, 'needs_review'),
                or(
                  sql`${lawFirmLetters.nextStepStatus} is null`,
                  eq(lawFirmLetters.nextStepStatus, 'done')
                )
              )
      )
      .orderBy(
        view === 'attention'
          ? lawFirmLetters.createdAt
          : desc(lawFirmLetters.updatedAt)
      )
      .limit(view === 'attention' ? 200 : 50);

    type Row = (typeof rows)[number];
    const caseIds = new Set<string>();
    for (const r of rows as Row[]) {
      if (r.letter.claimId) caseIds.add(r.letter.claimId);
      for (const id of r.letter.candidateClaimIds ?? []) caseIds.add(id);
    }
    const cases = await casesById([...caseIds]);
    return (rows as Row[]).map((r) => ({
      id: r.letter.id,
      fileName: r.letter.fileName,
      createdAt: r.letter.createdAt.toISOString(),
      uploadedBy: r.uploadedBy,
      status: r.letter.status,
      letterType: r.letter.letterType,
      matchReason: r.letter.matchReason,
      case: r.letter.claimId ? (cases.get(r.letter.claimId) ?? null) : null,
      firm: { id: r.letter.lawFirmId, name: r.firmName },
      fileType: r.letter.fileType,
      fileSize: r.letter.fileSize,
      ocrStatus: r.letter.ocrStatus,
      ocrError: r.letter.ocrError,
      ocrText: r.letter.ocrText,
      extracted: r.letter.extracted ?? null,
      matchMethod: r.letter.matchMethod ?? null,
      candidates: (r.letter.candidateClaimIds ?? [])
        .map((id) => cases.get(id))
        .filter((c): c is CaseRef => !!c),
      nextStepStatus:
        (r.letter.nextStepStatus as 'pending' | 'done' | null) ?? null,
      nextStepAction: r.letter.nextStepAction ?? null,
      handledBy: r.handledBy,
      handledAt: iso(r.letter.handledAt),
      handledNote: r.letter.handledNote,
    }));
  }

  static async getAdmin(letterId: string): Promise<AdminLetterView> {
    const [view] = await this.listAdmin('attention', [letterId]);
    if (!view) throw new LetterError('Letter not found', 404);
    return view;
  }

  static async fileUrl(
    letterId: string,
    actor: Actor
  ): Promise<{ url: string | null; fileName: string; fileType: string }> {
    const letter = await loadLetter(letterId);
    const url = await getPresignedUrl(letter.s3Key, FILE_URL_TTL_SECONDS);
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'drv_letter_viewed',
      resource: 'law_firm_letter',
      resourceId: letterId,
      details: { fileName: letter.fileName },
    });
    return { url, fileName: letter.fileName, fileType: letter.fileType };
  }

  /** The letter's firm's cases matching a name, VSNR or AZ. */
  static async searchCases(letterId: string, q: string): Promise<CaseRef[]> {
    const letter = await loadLetter(letterId);
    const term = q.trim();
    if (term.length < 2) return [];
    const like = `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const compactTerm = `%${term.replace(/\s+/g, '').toUpperCase()}%`;
    const rows = await db
      .select(CASE_COLUMNS)
      .from(claimsTable)
      .where(
        and(
          firmClaimScope(letter.lawFirmId),
          ne(claimsTable.status, 'draft'),
          or(
            sql`(coalesce(${claimsTable.firstName}, '') || ' ' || coalesce(${claimsTable.lastName}, '')) ilike ${like}`,
            sql`${claimsTable.birthName} ilike ${like}`,
            sql`${claimsTable.lawFirmRef} ilike ${like}`,
            sql`upper(replace(coalesce(${claimsTable.vsnr}, ''), ' ', '')) like ${compactTerm}`,
            sql`upper(replace(coalesce(${claimsTable.svNummer}, ''), ' ', '')) like ${compactTerm}`
          )
        )
      )
      .orderBy(desc(claimsTable.updatedAt))
      .limit(20);
    return rows.map(caseRef);
  }

  /**
   * File a letter to a case of its firm, or move it to another one. The
   * next step becomes pending again (ATLAES has not acted on this case).
   */
  static async assign(
    letterId: string,
    claimId: string,
    actor: Actor,
    note: string | null
  ): Promise<AdminLetterView> {
    const letter = await loadLetter(letterId);
    if (letter.status === 'dismissed') {
      throw new LetterError('Invalid: the letter was dismissed', 409);
    }
    if (letter.nextStepStatus === 'done') {
      throw new LetterError(
        'Invalid: the next step was already released for this letter',
        409
      );
    }
    if (letter.claimId === claimId) {
      throw new LetterError('Invalid: the letter is already on this case');
    }
    const claim = await firmCase(letter.lawFirmId, claimId);
    if (!claim) throw new LetterError('Claim not found', 404);

    await db.transaction(async (tx: any) => {
      if (letter.correspondenceId && letter.claimId) {
        // Moved: the wrong case loses the correspondence entry and gets a
        // note; the first event stays as history.
        await tx
          .delete(claimCorrespondence)
          .where(eq(claimCorrespondence.id, letter.correspondenceId));
        const [prev] = await tx
          .select({ status: claimsTable.status })
          .from(claimsTable)
          .where(eq(claimsTable.id, letter.claimId))
          .limit(1);
        if (prev) {
          await tx.insert(claimWorkflowStates).values({
            claimId: letter.claimId,
            state: prev.status,
            previousState: prev.status,
            triggeredBy: 'admin',
            metadata: {
              type: 'admin_note',
              note: `DRV letter ${letter.fileName} moved to another case by ATLAES (wrong match).`,
              letterId: letter.id,
              adminId: actor.id,
            },
          });
        }
      }
      const correspondenceId = await fileToCase(
        tx,
        letter,
        claim,
        { userId: actor.id, role: 'admin' },
        'admin'
      );
      await tx
        .update(lawFirmLetters)
        .set({
          status: 'resolved',
          matchMethod: 'admin',
          claimId,
          correspondenceId,
          nextStepStatus: 'pending',
          handledNote: note,
          updatedAt: new Date(),
        })
        .where(eq(lawFirmLetters.id, letterId));
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: letter.claimId ? 'drv_letter_moved' : 'drv_letter_assigned',
        resource: 'law_firm_letter',
        resourceId: letterId,
        details: { from: letter.claimId, to: claimId, note },
      });
    });
    return this.getAdmin(letterId);
  }

  /** Not a case letter (e.g. a general notice): leaves the queue. */
  static async dismiss(
    letterId: string,
    actor: Actor,
    note: string
  ): Promise<AdminLetterView> {
    const letter = await loadLetter(letterId);
    if (letter.claimId) {
      throw new LetterError(
        'Invalid: the letter is filed to a case; mark it handled instead',
        409
      );
    }
    if (letter.status === 'dismissed') {
      throw new LetterError('Invalid: the letter was already dismissed', 409);
    }
    await db
      .update(lawFirmLetters)
      .set({
        status: 'dismissed',
        nextStepStatus: null,
        handledBy: actor.id,
        handledAt: new Date(),
        handledNote: note,
        updatedAt: new Date(),
      })
      .where(eq(lawFirmLetters.id, letterId));
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'drv_letter_dismissed',
      resource: 'law_firm_letter',
      resourceId: letterId,
      details: { note },
    });
    return this.getAdmin(letterId);
  }

  /**
   * ATLAES releases the next step for a filed letter. Each action runs
   * the existing flow; the letter is only closed when that flow succeeds.
   */
  static async complete(
    letterId: string,
    input:
      | { action: 'record_decision'; receivedAt?: string | null; note?: string | null }
      | {
          action: 'notify_client';
          customerAction: string;
          customerActionDue?: string | null;
          infoRequestSource: 'customer' | 'file';
          note?: string | null;
        }
      | { action: 'mark_handled'; note: string },
    actor: Actor
  ): Promise<{ letter: AdminLetterView; result: Record<string, unknown> }> {
    const letter = await loadLetter(letterId);
    if (!letter.claimId) {
      throw new LetterError('Invalid: file the letter to a case first', 409);
    }
    if (letter.nextStepStatus !== 'pending') {
      throw new LetterError('Invalid: the next step was already released', 409);
    }
    const claimId = letter.claimId;
    let result: Record<string, unknown> = {};

    if (input.action === 'record_decision') {
      const bytes = await deps.download(letter.s3Key);
      const file = new File([new Uint8Array(bytes)], letter.fileName, {
        type: letter.fileType,
      });
      const decision = await PayoutFlowService.recordDecision(
        claimId,
        {
          file,
          // The objection deadline runs from the firm's receipt; the upload
          // day is the closest we know unless ATLAES enters it.
          receivedAt: input.receivedAt || dayOf(letter.createdAt),
        },
        actor
      );
      result = { decisionId: decision.id };
    } else if (input.action === 'notify_client') {
      const contact = await ClientUpdatesService.logContact(
        claimId,
        {
          contactDate: letter.extracted?.letterDate ?? dayOf(new Date()),
          channel: 'written',
          type: 'info_request',
          outcome: `DRV letter received via the law firm (${letter.fileName}).`,
          summaryEn: input.note ?? null,
          updateWarranted: true,
          infoRequestSource: input.infoRequestSource,
          customerAction: input.customerAction,
          customerActionDue: input.customerActionDue ?? null,
        },
        actor
      );
      result = { ...contact };
    }

    const note =
      input.action === 'mark_handled' ? input.note : (input.note ?? null);
    await db
      .update(lawFirmLetters)
      .set({
        nextStepStatus: 'done',
        nextStepAction: input.action,
        handledBy: actor.id,
        handledAt: new Date(),
        handledNote: note,
        updatedAt: new Date(),
      })
      .where(eq(lawFirmLetters.id, letterId));
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'drv_letter_next_step',
      resource: 'claim',
      resourceId: claimId,
      details: { letterId, action: input.action, note, ...result },
    });
    return { letter: await this.getAdmin(letterId), result };
  }
}
