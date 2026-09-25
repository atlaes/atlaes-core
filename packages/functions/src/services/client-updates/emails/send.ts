/**
 * SES delivery for client updates and owner task notices. Same guard as
 * `services/email.ts`: without the SES resource (local dev) the mail is
 * logged, not sent. Client e-mails come from the named client account
 * manager (display name), replies go to that person's mailbox.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger, toErrorMeta } from '../../../utils/logger';
import { env } from '../../../utils/env';

const sesClient = new SESClient({ region: env.SES_REGION });
const isSesAvailable = !!process.env.SST_RESOURCE_AtlaesEmail;

export const GPR_BRAND = 'Germany Pension Refund';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Plain paragraphs → simple HTML. A paragraph of the form `Label: url`
 * whose url matches `button.url` becomes the CTA button; line breaks
 * inside a paragraph are kept.
 */
export function renderClientUpdateHtml(input: {
  subject: string;
  paragraphs: string[];
  button?: { label: string; url: string } | null;
}): string {
  const blocks = input.paragraphs
    .map((p) => {
      if (input.button && p === `${input.button.label}: ${input.button.url}`) {
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                <tr>
                  <td style="background-color:#002691;border-radius:999px;">
                    <a href="${input.button.url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(input.button.label)}</a>
                  </td>
                </tr>
              </table>`;
      }
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#181818;white-space:pre-line;">${escapeHtml(p)}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f1f1;font-family:Inter,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f1f1;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#002691;padding:24px 32px;border-radius:20px 20px 0 0;">
              <span style="font-size:18px;font-weight:600;color:#ffffff;">${GPR_BRAND}</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              ${blocks}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f1f1;padding:24px 32px;border-radius:0 0 20px 20px;border-top:1px solid #c6c6c6;">
              <p style="margin:0;font-size:12px;color:#8c8c8c;">${GPR_BRAND} is operated by ATLAES GmbH. &copy; ATLAES GmbH</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ClientUpdateMail {
  to: string;
  subject: string;
  paragraphs: string[];
  button?: { label: string; url: string } | null;
  /** Display name of the named client account manager. */
  fromName: string;
  replyTo?: string | null;
}

/** Send a client update. Returns true on success (or when logged in dev). */
export async function sendClientUpdateEmail(
  mail: ClientUpdateMail
): Promise<boolean> {
  const text = mail.paragraphs.join('\n\n');
  const html = renderClientUpdateHtml(mail);
  if (!isSesAvailable) {
    logger.info(`[Email] Would send client update to: ${mail.to}`, {
      subject: mail.subject,
      from: mail.fromName,
    });
    return true;
  }
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `${mail.fromName} <${env.SES_FROM_EMAIL}>`,
        Destination: { ToAddresses: [mail.to] },
        ReplyToAddresses: mail.replyTo ? [mail.replyTo] : undefined,
        Message: {
          Subject: { Data: mail.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: text, Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`Client update sent to: ${mail.to}`, { subject: mail.subject });
    return true;
  } catch (error) {
    logger.error('Failed to send client update:', toErrorMeta(error));
    return false;
  }
}

/**
 * In-app task + e-mail with the case link for the communication owner (or
 * the named reviewer). Goes to the owner's mailbox, else the ops mailbox;
 * with neither set it is logged only.
 */
export async function sendTaskNoticeEmail(input: {
  to: string | null | undefined;
  subject: string;
  lines: string[];
  caseUrl: string;
}): Promise<boolean> {
  const to = input.to || env.OPS_NOTIFICATION_EMAIL;
  if (!to) {
    logger.info('[Email] No owner/ops mailbox; task notice logged only', {
      subject: input.subject,
    });
    return false;
  }
  return sendClientUpdateEmail({
    to,
    subject: input.subject,
    paragraphs: [...input.lines, `Open the case: ${input.caseUrl}`],
    button: { label: 'Open the case', url: input.caseUrl },
    fromName: `${GPR_BRAND} platform`,
  });
}
