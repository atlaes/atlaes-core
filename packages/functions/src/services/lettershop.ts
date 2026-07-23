import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { auditLogs } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';

// Print specification per "API-Schnittstelle Dokumentation" (01.04.2025).
// Mirrors the old SFTP filecode 1001000000000: colour, single-sided, DIN
// lang auto (c4 = 0 lets the vendor upgrade the envelope past 8 sheets),
// national shipping. No registered mail, no payment slip.
const LETTER_SPECIFICATION = {
  color: '4', // 1 = black/white, 4 = colour
  mode: 'simplex', // simplex | duplex
  shipping: 'national', // national | international | auto
  c4: 0,
} as const;

// The vendor rejects anything larger, per PDF and per request.
const MAX_PDF_BYTES = 50 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 60_000;

interface PrintjobResponse {
  status?: number;
  message?: string;
  data?: { id?: number; status?: string };
}

export class LettershopService {
  /**
   * Filename reported to the vendor as `filename_original`. Purely for
   * traceability: it is echoed back by GET /v1/printjobs and shown in the
   * Kundencenter, which is how a support query gets tied to a claim.
   *
   * Unlike the retired SFTP filecode, this carries no print parameters —
   * those live in `specification` now — so it needs no 13-digit prefix.
   */
  static buildOriginalFilename(claimId: string): string {
    return `vbl-claim-${claimId}-${Date.now()}.pdf`;
  }

  /** True when both halves of the API credential pair are present. */
  private static hasCredentials(): boolean {
    return !!(env.LETTERSHOP_API_KEY && env.LETTERSHOP_API_SECRET);
  }

  /**
   * Sends the combined claim PDF to the lettershop provider
   * (onlinebrief24.de) via POST /v1/printjobs.
   *
   * `LETTERSHOP_MODE` is passed straight through as the vendor's
   * `auth.mode`: `test` parks the order in their shopping cart — visible,
   * deletable, auto-purged after 7 days, never printed or billed — while
   * `live` sends it into processing. `off` skips the call entirely.
   *
   * Returns null when delivery is off or unconfigured (either credential
   * missing), mirroring the s3 util's local-dev no-op guard style so local
   * dev and most test runs proceed without lettershop credentials.
   * Otherwise posts the PDF and records the submission (claim row + audit
   * log) atomically. Errors are logged and rethrown; the caller
   * (ClaimsApplicationService.submitClaim) treats lettershop failures as
   * non-fatal, same as PDF generation failures.
   */
  static async sendClaimPdf(
    claimId: string,
    pdfBytes: Uint8Array,
    userId: string
  ): Promise<{ submissionId: string } | null> {
    const mode = env.LETTERSHOP_MODE;
    const hasCredentials = this.hasCredentials();

    if (mode === 'off' || !hasCredentials) {
      logger.warn('Lettershop delivery skipped (off or unconfigured)', {
        claimId,
        mode,
        missingCredentials: !hasCredentials,
      });
      return null;
    }

    if (pdfBytes.byteLength > MAX_PDF_BYTES) {
      throw new Error(
        `Claim PDF is ${pdfBytes.byteLength} bytes, over the vendor's ` +
          `${MAX_PDF_BYTES}-byte limit`
      );
    }

    const base64File = Buffer.from(pdfBytes).toString('base64');
    // Checksum is over the base64 STRING, not the decoded PDF bytes.
    const checksum = createHash('md5').update(base64File).digest('hex');
    const filenameOriginal = this.buildOriginalFilename(claimId);

    const url = `${env.LETTERSHOP_API_BASE_URL}/printjobs`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          auth: {
            apiKey: env.LETTERSHOP_API_KEY,
            apiSecret: env.LETTERSHOP_API_SECRET,
            mode,
          },
          letter: {
            base64_file: base64File,
            base64_file_checksum: checksum,
            specification: LETTER_SPECIFICATION,
            filename_original: filenameOriginal,
          },
        }),
      });

      // The vendor answers auth failures with a bare {"message": "..."} and
      // no status field, so treat a missing/!=200 status as a failure too
      // rather than trusting the HTTP code alone.
      const body = (await response
        .json()
        .catch(() => null)) as PrintjobResponse | null;

      const printjobId = body?.data?.id;
      if (!response.ok || body?.status !== 200 || printjobId === undefined) {
        throw new Error(
          `Lettershop API rejected the job (HTTP ${response.status}): ` +
            `${body?.message ?? 'no message'}`
        );
      }

      const submissionId = String(printjobId);

      await db.transaction(async (tx: any) => {
        await tx
          .update(claimsTable)
          .set({ lettershopSubmissionId: submissionId, updatedAt: new Date() })
          .where(eq(claimsTable.id, claimId));

        await tx.insert(auditLogs).values({
          userId,
          action: 'lettershop_submitted',
          resource: 'claim',
          resourceId: claimId,
          details: {
            submissionId,
            filenameOriginal,
            mode,
            jobStatus: body?.data?.status,
          },
        });
      });

      logger.info('Claim PDF delivered to lettershop', {
        claimId,
        submissionId,
        filenameOriginal,
        mode,
        jobStatus: body?.data?.status,
        // In test mode the job sits in the vendor's cart and is deleted
        // after 7 days unless someone releases it by hand.
        parkedInCart: mode === 'test',
      });

      return { submissionId };
    } catch (error) {
      logger.error('Failed to deliver claim PDF to lettershop', {
        claimId,
        filenameOriginal,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
