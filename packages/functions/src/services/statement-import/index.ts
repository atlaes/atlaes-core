/**
 * Account-statement upload (platform brief Part 2, E1). The firm uploads
 * its escrow-account export (.xlsx or CSV); each credit line is matched to
 * a case by VSNR/name in the payment reference. A match records "funds
 * received" (amount and value date authoritative) via FundsService;
 * unmatched credits go to the ATLAES reconciliation queue.
 */

import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { uploadFile } from '../../utils/s3';
import { auditLogs, users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  statementImports,
  statementLines,
  type StatementImportRow,
  type StatementLineRow,
  type StatementLineStatus,
} from '../../drizzle/schema/payout-queue';
import { FundsService } from '../payout-queue/funds';
import {
  extractRows,
  findHeaderRow,
  headerLabels,
  cellText,
  isCompleteMap,
  suggestColumnMap,
  type StatementColumnMap,
} from './columns';
import {
  matchStatementLine,
  MATCH_REASON_TEXT,
  type MatchCandidate,
  type MatchReason,
} from './match';
import { readStatementGrid, statementLineHash } from './parse';

export * from './columns';
export * from './match';
export { readStatementGrid, detectFileKind, statementLineHash } from './parse';

export interface StatementPreview {
  fileKind: 'xlsx' | 'csv';
  headers: string[];
  headerRowIndex: number;
  sampleRows: string[][];
  suggestedMap: Partial<StatementColumnMap>;
  lastMap: StatementColumnMap | null;
}

export interface StatementLineView {
  id: string;
  lineNo: number;
  valueDate: string | null;
  amount: number | null;
  reference: string;
  payer: string;
  status: StatementLineStatus;
  matchReason: MatchReason | null;
  matchReasonText: string | null;
  matchedCase: { claimId: string; name: string; vsnr: string | null } | null;
  firmSuggestion: string | null;
  resolutionNote: string | null;
}

export interface StatementImportResult {
  id: string;
  fileName: string;
  fileKind: string;
  createdAt: string | null;
  uploadedBy: string | null;
  columnMap: StatementColumnMap;
  matchedCount: number;
  unmatchedCount: number;
  matchedTotal: number;
  lines: StatementLineView[];
}

export interface LastUpload {
  importId: string;
  fileName: string;
  createdAt: string | null;
  uploadedBy: string | null;
  columnMap: StatementColumnMap;
}

const nameOf = (c: { firstName: string | null; lastName: string | null }) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ').trim();

export class StatementImportService {
  static async lastUpload(firmId: string): Promise<LastUpload | null> {
    const [row] = await db
      .select({
        importId: statementImports.id,
        fileName: statementImports.fileName,
        createdAt: statementImports.createdAt,
        columnMap: statementImports.columnMap,
        email: users.email,
      })
      .from(statementImports)
      .leftJoin(users, eq(users.id, statementImports.uploadedBy))
      .where(eq(statementImports.lawFirmId, firmId))
      .orderBy(desc(statementImports.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      importId: row.importId,
      fileName: row.fileName,
      createdAt: row.createdAt?.toISOString() ?? null,
      uploadedBy: row.email ?? null,
      columnMap: row.columnMap as StatementColumnMap,
    };
  }

  static async preview(
    firmId: string,
    fileName: string,
    buf: Buffer
  ): Promise<StatementPreview> {
    const { kind, grid } = readStatementGrid(fileName, buf);
    const headerRowIndex = findHeaderRow(grid);
    const headers = headerLabels(grid[headerRowIndex] ?? []);
    const last = await this.lastUpload(firmId);
    const lastMap =
      last && isCompleteMap(last.columnMap) ? last.columnMap : null;
    return {
      fileKind: kind,
      headers,
      headerRowIndex,
      sampleRows: grid
        .slice(headerRowIndex + 1, headerRowIndex + 6)
        .map((r) => headers.map((_, i) => cellText(r?.[i]))),
      suggestedMap: suggestColumnMap(headers, lastMap),
      lastMap,
    };
  }

  private static async candidates(firmId: string): Promise<MatchCandidate[]> {
    const rows = await db
      .select({
        claimId: claimsTable.id,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        vsnr: claimsTable.vsnr,
      })
      .from(claimsTable)
      .where(
        and(eq(claimsTable.lawFirmId, firmId), isNotNull(claimsTable.lastName))
      );
    return rows;
  }

  static async importStatement(input: {
    firmId: string;
    userId: string;
    fileName: string;
    buf: Buffer;
    columnMap?: Partial<StatementColumnMap> | null;
    ip?: string | null;
  }): Promise<StatementImportResult> {
    const { kind, grid } = readStatementGrid(input.fileName, input.buf);
    const headerRowIndex = findHeaderRow(grid);
    const headers = headerLabels(grid[headerRowIndex] ?? []);
    let map = input.columnMap ?? null;
    if (!isCompleteMap(map)) {
      const last = await this.lastUpload(input.firmId);
      const suggested = suggestColumnMap(
        headers,
        last && isCompleteMap(last.columnMap) ? last.columnMap : null
      );
      map = { ...suggested, ...(map ?? {}) } as Partial<StatementColumnMap>;
    }
    if (!isCompleteMap(map)) {
      throw new Error(
        'Invalid column mapping: choose the columns for value date, amount and payment reference'
      );
    }
    const columnMap: StatementColumnMap = {
      valueDate: map.valueDate,
      amount: map.amount,
      reference: map.reference,
      payer: map.payer ?? null,
    };
    const parsed = extractRows(grid, columnMap, headerRowIndex);
    const candidates = await this.candidates(input.firmId);

    const hashes = parsed.rows.map((r) => statementLineHash(input.firmId, r));
    const known = new Set(
      hashes.length
        ? (
            await db
              .select({ h: statementLines.dedupeHash })
              .from(statementLines)
              .where(
                and(
                  eq(statementLines.lawFirmId, input.firmId),
                  inArray(statementLines.dedupeHash, hashes)
                )
              )
          ).map((r) => r.h)
        : []
    );

    const [imp] = await db
      .insert(statementImports)
      .values({
        lawFirmId: input.firmId,
        uploadedBy: input.userId,
        fileName: input.fileName.slice(0, 255),
        fileKind: kind,
        columnMap,
        lineCount: parsed.rows.length,
      })
      .returning();

    const s3Key = `law-firm/${input.firmId}/statements/${imp.id}/${input.fileName.replace(/[^\w.\-]+/g, '_')}`;
    try {
      await uploadFile(
        s3Key,
        input.buf,
        kind === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      );
    } catch (error) {
      logger.error('[Statement] file upload failed', toErrorMeta(error));
    }

    const seenInFile = new Set<string>();
    const values = parsed.rows.map((r, i) => {
      const hash = hashes[i];
      let status: StatementLineStatus;
      let match: ReturnType<typeof matchStatementLine> | null = null;
      if (r.amount == null || r.valueDate == null) status = 'invalid';
      else if (r.amount <= 0) status = 'debit';
      else if (known.has(hash) || seenInFile.has(hash)) status = 'duplicate';
      else {
        match = matchStatementLine(r.reference, candidates, r.payer);
        status = match.claimId ? 'matched' : 'unmatched';
      }
      seenInFile.add(hash);
      return {
        importId: imp.id,
        lawFirmId: input.firmId,
        lineNo: r.line,
        valueDate: r.valueDate,
        amount: r.amount == null ? null : r.amount.toFixed(2),
        reference: r.reference,
        payer: r.payer.slice(0, 255) || null,
        raw: r.raw,
        status,
        matchReason: match?.reason ?? null,
        claimId: match?.claimId ?? null,
        suggestedClaimIds: match?.suggestions.length ? match.suggestions : null,
        dedupeHash: hash,
      };
    });
    const lineRows = values.length
      ? await db.insert(statementLines).values(values).returning()
      : [];

    // E1 per matched line.
    for (const line of lineRows.filter((l) => l.status === 'matched')) {
      try {
        await FundsService.recordFundsReceived({
          claimId: line.claimId!,
          amountEur: Number(line.amount),
          valueDate: line.valueDate!,
          statementLineId: line.id,
          statementReference: line.reference,
          actorId: input.userId,
        });
      } catch (error) {
        logger.error('[Statement] recording funds failed', toErrorMeta(error));
        await db
          .update(statementLines)
          .set({
            status: 'unmatched',
            resolutionNote: `Recording funds failed: ${error instanceof Error ? error.message : 'error'}`,
          })
          .where(eq(statementLines.id, line.id));
      }
    }

    await this.refreshCounts(imp.id);
    await db.insert(auditLogs).values({
      userId: input.userId,
      action: 'law_firm_statement_upload',
      resource: 'law_firm',
      resourceId: input.firmId,
      details: {
        importId: imp.id,
        fileName: input.fileName,
        lines: parsed.rows.length,
      },
      ipAddress: input.ip ?? null,
    });
    return (await this.getImport(input.firmId, imp.id))!;
  }

  private static async refreshCounts(importId: string): Promise<void> {
    const lines = await db
      .select()
      .from(statementLines)
      .where(eq(statementLines.importId, importId));
    const matched = lines.filter(
      (l) => l.status === 'matched' || l.status === 'assigned'
    );
    const unmatched = lines.filter((l) => l.status === 'unmatched');
    const total = matched.reduce((s, l) => s + Number(l.amount ?? 0), 0);
    await db
      .update(statementImports)
      .set({
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        matchedTotal: total.toFixed(2),
      })
      .where(eq(statementImports.id, importId));
  }

  private static async viewLines(
    lines: StatementLineRow[]
  ): Promise<StatementLineView[]> {
    const claimIds = [
      ...new Set(lines.map((l) => l.claimId).filter(Boolean)),
    ] as string[];
    const claims = claimIds.length
      ? await db
          .select({
            id: claimsTable.id,
            firstName: claimsTable.firstName,
            lastName: claimsTable.lastName,
            vsnr: claimsTable.vsnr,
          })
          .from(claimsTable)
          .where(inArray(claimsTable.id, claimIds))
      : [];
    return lines
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((l) => {
        const c = claims.find((x) => x.id === l.claimId);
        const reason = (l.matchReason as MatchReason | null) ?? null;
        return {
          id: l.id,
          lineNo: l.lineNo,
          valueDate: l.valueDate,
          amount: l.amount == null ? null : Number(l.amount),
          reference: l.reference ?? '',
          payer: l.payer ?? '',
          status: l.status as StatementLineStatus,
          matchReason: reason,
          matchReasonText: reason ? MATCH_REASON_TEXT[reason] : null,
          matchedCase: c
            ? { claimId: c.id, name: nameOf(c), vsnr: c.vsnr }
            : null,
          firmSuggestion: l.firmSuggestion,
          resolutionNote: l.resolutionNote,
        };
      });
  }

  static async getImport(
    firmId: string | null,
    importId: string
  ): Promise<StatementImportResult | null> {
    const [imp] = await db
      .select({ row: statementImports, email: users.email })
      .from(statementImports)
      .leftJoin(users, eq(users.id, statementImports.uploadedBy))
      .where(
        firmId
          ? and(
              eq(statementImports.id, importId),
              eq(statementImports.lawFirmId, firmId)
            )
          : eq(statementImports.id, importId)
      )
      .limit(1);
    if (!imp) return null;
    const row: StatementImportRow = imp.row;
    const lines = await db
      .select()
      .from(statementLines)
      .where(eq(statementLines.importId, importId));
    return {
      id: row.id,
      fileName: row.fileName,
      fileKind: row.fileKind,
      createdAt: row.createdAt?.toISOString() ?? null,
      uploadedBy: imp.email ?? null,
      columnMap: row.columnMap as StatementColumnMap,
      matchedCount: row.matchedCount,
      unmatchedCount: row.unmatchedCount,
      matchedTotal: Number(row.matchedTotal),
      lines: await this.viewLines(lines),
    };
  }

  /** Reconciliation queue: unmatched credits (firm-scoped or all for ATLAES). */
  static async listReconciliation(firmId: string | null): Promise<
    (StatementLineView & {
      importId: string;
      fileName: string;
      suggestions: { claimId: string; name: string; vsnr: string | null }[];
    })[]
  > {
    const rows = await db
      .select({ line: statementLines, fileName: statementImports.fileName })
      .from(statementLines)
      .innerJoin(
        statementImports,
        eq(statementImports.id, statementLines.importId)
      )
      .where(
        firmId
          ? and(
              eq(statementLines.status, 'unmatched'),
              eq(statementLines.lawFirmId, firmId)
            )
          : eq(statementLines.status, 'unmatched')
      )
      .orderBy(desc(statementLines.createdAt));
    const views = await this.viewLines(rows.map((r) => r.line));
    const suggestionIds = [
      ...new Set(rows.flatMap((r) => r.line.suggestedClaimIds ?? [])),
    ];
    const sugg =
      suggestionIds.length && !firmId
        ? await db
            .select({
              id: claimsTable.id,
              firstName: claimsTable.firstName,
              lastName: claimsTable.lastName,
              vsnr: claimsTable.vsnr,
            })
            .from(claimsTable)
            .where(inArray(claimsTable.id, suggestionIds))
        : [];
    return views.map((v) => {
      const r = rows.find((x) => x.line.id === v.id)!;
      return {
        ...v,
        importId: r.line.importId,
        fileName: r.fileName,
        // Candidate cases are for ATLAES only; the firm never browses data.
        suggestions: (r.line.suggestedClaimIds ?? [])
          .map((id) => sugg.find((s) => s.id === id))
          .filter(Boolean)
          .map((s) => ({ claimId: s!.id, name: nameOf(s!), vsnr: s!.vsnr })),
      };
    });
  }

  /** "Suggest a case" — the firm adds a hint; ATLAES decides. */
  static async suggest(input: {
    firmId: string;
    lineId: string;
    note: string;
    userId: string;
  }): Promise<void> {
    const [line] = await db
      .update(statementLines)
      .set({
        firmSuggestion: input.note.slice(0, 1000),
        firmSuggestedAt: new Date(),
      })
      .where(
        and(
          eq(statementLines.id, input.lineId),
          eq(statementLines.lawFirmId, input.firmId),
          eq(statementLines.status, 'unmatched')
        )
      )
      .returning();
    if (!line) throw new Error('Line not found');
    await db.insert(auditLogs).values({
      userId: input.userId,
      action: 'statement_line_suggested',
      resource: 'law_firm',
      resourceId: input.firmId,
      details: { lineId: line.id, note: input.note },
    });
  }

  /** ATLAES assigns an unmatched receipt to a case → E1 on that case. */
  static async assign(input: {
    lineId: string;
    claimId: string;
    adminId: string;
    note?: string | null;
  }): Promise<void> {
    const [line] = await db
      .select()
      .from(statementLines)
      .where(eq(statementLines.id, input.lineId))
      .limit(1);
    if (!line) throw new Error('Line not found');
    if (line.status !== 'unmatched')
      throw new Error('Invalid state: line is not in the reconciliation queue');
    const [claim] = await db
      .select({ id: claimsTable.id, lawFirmId: claimsTable.lawFirmId })
      .from(claimsTable)
      .where(eq(claimsTable.id, input.claimId))
      .limit(1);
    if (!claim) throw new Error('Claim not found');
    if (claim.lawFirmId !== line.lawFirmId) {
      throw new Error(
        'Invalid claim: the case is not handled by the firm whose account received the funds'
      );
    }
    const [claimed] = await db
      .update(statementLines)
      .set({
        status: 'assigned',
        claimId: claim.id,
        resolvedBy: input.adminId,
        resolvedAt: new Date(),
        resolutionNote: input.note ?? null,
      })
      .where(
        and(
          eq(statementLines.id, line.id),
          eq(statementLines.status, 'unmatched')
        )
      )
      .returning();
    if (!claimed) throw new Error('Invalid state: line already resolved');
    try {
      await FundsService.recordFundsReceived({
        claimId: claim.id,
        amountEur: Number(line.amount),
        valueDate: line.valueDate!,
        statementLineId: line.id,
        statementReference: line.reference,
        actorId: input.adminId,
      });
    } catch (error) {
      await db
        .update(statementLines)
        .set({
          status: 'unmatched',
          claimId: null,
          resolvedAt: null,
          resolvedBy: null,
        })
        .where(eq(statementLines.id, line.id));
      throw error;
    }
    await this.refreshCounts(line.importId);
  }

  /** ATLAES: not a refund receipt (e.g. fee refund, wrong booking). */
  static async dismiss(input: {
    lineId: string;
    adminId: string;
    note: string;
  }): Promise<void> {
    const [line] = await db
      .update(statementLines)
      .set({
        status: 'dismissed',
        resolvedBy: input.adminId,
        resolvedAt: new Date(),
        resolutionNote: input.note,
      })
      .where(
        and(
          eq(statementLines.id, input.lineId),
          eq(statementLines.status, 'unmatched')
        )
      )
      .returning();
    if (!line) throw new Error('Line not found');
    await this.refreshCounts(line.importId);
  }
}
