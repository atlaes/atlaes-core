import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { auditLogs } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';

// Print specification per "API-Schnittstelle Dokumentation" (01.04.2025).
// Mirrors the old SFTP filecode 1001000000000: colour, single-sided,
// national shipping. No registered mail, no payment slip.
//
// `c4: 0` means "do not force a C4 envelope". The doc describes the flag
// only as "for C4 envelope under 9 sheets", so 1 buys a C4 envelope for a
// letter that would otherwise go DIN lang. What the vendor does at 9+
// sheets with c4: 0 is NOT stated anywhere in the doc — a full claim packet
// (cover letter + L203 + PoA + attachments) can cross that, so treat the
// envelope upgrade as unconfirmed until support says otherwise.
const LETTER_SPECIFICATION = {
  color: '4', // 1 = black/white, 4 = colour
  mode: 'simplex', // simplex | duplex — NOT auth.mode, which is test|live
  shipping: 'national', // national | international | auto
  c4: 0,
} as const;

// Doc §1: "Maximale Dateigröße darf 50 MB je PDF / Request nicht
// überschreiten" — the ceiling is on the request, so it has to be measured
// on the base64 payload we actually send, not the raw PDF. Base64 inflates
// by ~4/3, so a 40 MB PDF is already a ~54 MB request.
const MAX_REQUEST_BYTES = 50 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 60_000;

// Doc §4 (GET /v1/printjobs filters): a job parked in the Warenkorb reads
// as 'draft', one heading for production as 'queue'. Which one comes back
// is the only positive evidence that auth.mode did what we asked.
const EXPECTED_JOB_STATUS = {
  test: 'draft',
  live: 'queue',
} as const;

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

    const base64File = Buffer.from(pdfBytes).toString('base64');

    // Measured after encoding: the vendor's ceiling is on the request, and
    // base64 is what the request carries.
    if (base64File.length > MAX_REQUEST_BYTES) {
      throw new Error(
        `Claim PDF is ${pdfBytes.byteLength} bytes, which encodes to ` +
          `${base64File.length} base64 bytes — over the vendor's ` +
          `${MAX_REQUEST_BYTES}-byte request limit`
      );
    }

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
      const jobStatus = body?.data?.status;
      const expectedStatus = EXPECTED_JOB_STATUS[mode];

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
            jobStatus,
          },
        });
      });

      // Checked AFTER the row is written, deliberately. The job exists on
      // the vendor's side either way, and the printjob id is the only way
      // to delete it inside the 15-minute window — losing that to a throw
      // would be strictly worse than recording a job we're unhappy about.
      // Logged rather than thrown for the same reason: the send succeeded,
      // and reporting it as a failure invites a resend, i.e. two letters.
      if (jobStatus !== expectedStatus) {
        logger.error('Lettershop job landed in an unexpected state', {
          claimId,
          submissionId,
          mode,
          jobStatus,
          expectedStatus,
          // The case that matters: mode 'test' answering 'queue' means the
          // order is heading for production, not the Warenkorb.
          headedForProduction: mode === 'test' && jobStatus === 'queue',
          remedy:
            `DELETE ${env.LETTERSHOP_API_BASE_URL}/printjobs/${submissionId} ` +
            `within 15 minutes of submission, or delete it in the Kundencenter`,
        });
      }

      logger.info('Claim PDF delivered to lettershop', {
        claimId,
        submissionId,
        filenameOriginal,
        mode,
        jobStatus,
        // Read off the vendor's answer, not the mode we asked for: a job
        // in the cart is deleted after 7 days unless someone releases it
        // by hand, and that only holds if they actually parked it.
        parkedInCart: jobStatus === 'draft',
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
