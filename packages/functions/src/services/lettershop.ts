import { existsSync } from 'fs';
import SftpClient from 'ssh2-sftp-client';
import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { auditLogs } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';

const UPLOAD_DIR = '/upload/api';

// Live parameter code per "SFTP Schnittstelle Dokumentation 5.0" (26.02.2025):
// position 1 print=1 (color), 2 mode=0 (simplex), 3 envelope=0 (DIN lang
// auto), 4 zone=1 (national DE), 5 registered mail=0 (none), 6 payment
// slip=0 (none), 7-13 reserve=0. Matches the vendor doc's own example code.
const LIVE_PARAMETER_CODE = '1001000000000';

export class LettershopService {
  /**
   * Builds the vendor filecode filename.
   *
   * Live: `{13-digit parameter code}-vbl-claim-{claimId}-{Date.now()}.pdf`
   * Test: `TESTMODE-vbl-claim-{claimId}-{Date.now()}.pdf` — deliberately
   * lacks the 13-digit prefix so the vendor's validation rejects it. Per
   * the vendor's documented no-cost test method, this triggers an error
   * e-mail to the registered address without producing or billing a
   * letter, proving connectivity + processing without cost.
   */
  static buildFilename(claimId: string, mode: 'test' | 'live'): string {
    const prefix = mode === 'live' ? LIVE_PARAMETER_CODE : 'TESTMODE';
    return `${prefix}-vbl-claim-${claimId}-${Date.now()}.pdf`;
  }

  /**
   * True when there's a usable private key file on disk at
   * `LETTERSHOP_SFTP_PRIVATE_KEY_PATH`. Shared by the "are we configured at
   * all" check and the actual connect auth-method selection so the two
   * can't drift apart.
   */
  private static hasReadablePrivateKey(): boolean {
    return (
      !!env.LETTERSHOP_SFTP_PRIVATE_KEY_PATH &&
      existsSync(env.LETTERSHOP_SFTP_PRIVATE_KEY_PATH)
    );
  }

  /**
   * True when we have at least one usable auth method: a non-empty
   * password, or a private key file that actually exists on disk.
   */
  private static hasCredentials(): boolean {
    return !!env.LETTERSHOP_SFTP_PASSWORD || this.hasReadablePrivateKey();
  }

  /**
   * Sends the combined claim PDF to the lettershop provider
   * (onlinebrief24.de) over SFTP.
   *
   * Returns null when lettershop delivery is off or unconfigured (missing
   * host/user, or missing both a password and a readable private-key
   * file), mirroring the s3 util's local-dev no-op guard style — this lets
   * local dev and most test runs proceed without any lettershop
   * credentials, and avoids attempting a doomed SFTP handshake with no
   * auth material. Otherwise connects, uploads the PDF, and records the
   * submission (claim row + audit log) atomically. Errors are logged and
   * rethrown; the caller (ClaimsApplicationService.submitClaim) treats
   * lettershop failures as non-fatal, same as PDF generation failures.
   */
  static async sendClaimPdf(
    claimId: string,
    pdfBytes: Uint8Array,
    userId: string
  ): Promise<{ submissionId: string } | null> {
    const mode = env.LETTERSHOP_MODE;
    const hasHostAndUser = !!(
      env.LETTERSHOP_SFTP_HOST && env.LETTERSHOP_SFTP_USER
    );
    const hasCredentials = this.hasCredentials();
    const isConfigured = hasHostAndUser && hasCredentials;

    if (mode === 'off' || !isConfigured) {
      logger.warn('Lettershop delivery skipped (off or unconfigured)', {
        claimId,
        mode,
        missingHostOrUser: !hasHostAndUser,
        missingCredentials: !hasCredentials,
      });
      return null;
    }

    const filename = this.buildFilename(claimId, mode);
    const remotePath = `${UPLOAD_DIR}/${filename}`;

    const sftp = new SftpClient();
    try {
      const usePrivateKey = this.hasReadablePrivateKey();

      await sftp.connect({
        host: env.LETTERSHOP_SFTP_HOST,
        port: env.LETTERSHOP_SFTP_PORT,
        username: env.LETTERSHOP_SFTP_USER,
        ...(usePrivateKey
          ? { privateKey: env.LETTERSHOP_SFTP_PRIVATE_KEY_PATH }
          : { password: env.LETTERSHOP_SFTP_PASSWORD }),
      });

      await sftp.put(Buffer.from(pdfBytes), remotePath);

      await db.transaction(async (tx: any) => {
        await tx
          .update(claimsTable)
          .set({ lettershopSubmissionId: filename, updatedAt: new Date() })
          .where(eq(claimsTable.id, claimId));

        await tx.insert(auditLogs).values({
          userId,
          action: 'lettershop_submitted',
          resource: 'claim',
          resourceId: claimId,
          details: { filename, mode },
        });
      });

      logger.info('Claim PDF delivered to lettershop', {
        claimId,
        filename,
        mode,
      });

      return { submissionId: filename };
    } catch (error) {
      logger.error('Failed to deliver claim PDF to lettershop', {
        claimId,
        filename,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await sftp.end();
    }
  }
}
