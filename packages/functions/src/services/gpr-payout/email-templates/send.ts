/**
 * SES delivery for the payout e-mails A1–A3. Same conventions as
 * `services/email.ts` / client updates: sender address SES_FROM_EMAIL with
 * a display name, HTML + plain-text parts, and without the SES resource
 * (local dev) the mail is logged instead of sent. A send failure is logged
 * and returned as `false`; it never throws.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger, toErrorMeta } from '../../../utils/logger';
import { env } from '../../../utils/env';
import { DEFAULT_COMMUNICATION_OWNER } from '../../client-updates/case-columns';
import type { PayoutNotification } from '../notifications';
import { GPR_BRAND } from './layout';

const sesClient = new SESClient({ region: env.SES_REGION });
const isSesAvailable = !!process.env.SST_RESOURCE_AtlaesEmail;

export async function sendPayoutNotificationEmail(
  to: string,
  mail: PayoutNotification,
  opts: {
    /** Display name; defaults to "<owner> — Germany Pension Refund". */
    fromName?: string | null;
    replyTo?: string | null;
  } = {}
): Promise<boolean> {
  const fromName =
    opts.fromName || `${DEFAULT_COMMUNICATION_OWNER} — ${GPR_BRAND}`;
  if (!isSesAvailable) {
    logger.info(`[Email] Would send payout e-mail ${mail.kind} to: ${to}`, {
      subject: mail.subject,
      from: fromName,
    });
    return true;
  }
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `${fromName} <${env.SES_FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        ReplyToAddresses: opts.replyTo ? [opts.replyTo] : undefined,
        Message: {
          Subject: { Data: mail.subject, Charset: 'UTF-8' },
          Body: {
            ...(mail.html
              ? { Html: { Data: mail.html, Charset: 'UTF-8' } }
              : {}),
            Text: { Data: mail.text, Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`Payout e-mail ${mail.kind} sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error(
      `Failed to send payout e-mail ${mail.kind}:`,
      toErrorMeta(error)
    );
    return false;
  }
}
