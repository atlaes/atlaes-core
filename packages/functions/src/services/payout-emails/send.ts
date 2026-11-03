/**
 * SES delivery for the escrow payout e-mails. Raw MIME (SendRawEmail)
 * because E4B attaches the TransferMate receipt and E5 carries the
 * Trustpilot BCC. Same conventions as the other senders: SES_FROM_EMAIL
 * with a display name, reply-to the case manager, @e2e.test never handed
 * to SES, logged instead of sent without the SES resource (local dev).
 * A failure is logged and returned as false; it never throws.
 */

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { randomBytes } from 'crypto';
import { logger, toErrorMeta } from '../../utils/logger';
import { env } from '../../utils/env';
import { isE2eTestAddress } from '../../utils/e2e';

const sesClient = new SESClient({ region: env.SES_REGION });
const isSesAvailable = !!process.env.SST_RESOURCE_AtlaesEmail;

export interface RawMailAttachment {
  fileName: string;
  contentType: string;
  bytes: Buffer;
}

export interface RawMail {
  fromName: string;
  to: string;
  bcc?: string | null;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  attachments?: RawMailAttachment[];
}

/** RFC 2047 encoded-word for non-ASCII header text. */
export function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function base64Lines(data: Buffer | string): string {
  const b64 = Buffer.from(data).toString('base64');
  return b64.replace(/.{1,76}/g, (m) => `${m}\r\n`).trimEnd();
}

/** Display name in quotes unless it is a plain atom. */
function mailbox(name: string, address: string): string {
  const enc = encodeHeader(name);
  const quoted =
    enc === name && /[^A-Za-z0-9 ]/.test(name)
      ? `"${name.replace(/(["\\])/g, '\\$1')}"`
      : enc;
  return `${quoted} <${address}>`;
}

/** multipart/mixed (attachments) around multipart/alternative. */
export function buildRawMime(mail: RawMail, fromAddress: string): string {
  const alt = `alt_${randomBytes(8).toString('hex')}`;
  const mixed = `mix_${randomBytes(8).toString('hex')}`;
  const headers = [
    `From: ${mailbox(mail.fromName, fromAddress)}`,
    `To: ${mail.to}`,
    ...(mail.replyTo ? [`Reply-To: ${mail.replyTo}`] : []),
    `Subject: ${encodeHeader(mail.subject)}`,
    'MIME-Version: 1.0',
  ];
  const alternative = [
    `--${alt}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(mail.text),
    `--${alt}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(mail.html),
    `--${alt}--`,
  ].join('\r\n');
  const files = mail.attachments ?? [];
  if (!files.length) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      '',
      alternative,
      '',
    ].join('\r\n');
  }
  const parts = files.map((f) =>
    [
      `--${mixed}`,
      `Content-Type: ${f.contentType}; name="${encodeHeader(f.fileName)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${encodeHeader(f.fileName)}"`,
      '',
      base64Lines(f.bytes),
    ].join('\r\n')
  );
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    alternative,
    ...parts,
    `--${mixed}--`,
    '',
  ].join('\r\n');
}

export async function sendRawPayoutEmail(mail: RawMail): Promise<boolean> {
  if (isE2eTestAddress(mail.to)) {
    logger.info(
      `[Email] Not sending payout e-mail to e2e address: ${mail.to}`,
      {
        subject: mail.subject,
      }
    );
    return true;
  }
  if (!isSesAvailable) {
    logger.info(`[Email] Would send payout e-mail to: ${mail.to}`, {
      subject: mail.subject,
      from: mail.fromName,
      bcc: mail.bcc ?? null,
      attachments: (mail.attachments ?? []).map((a) => a.fileName),
    });
    return true;
  }
  try {
    const destinations = [mail.to, ...(mail.bcc ? [mail.bcc] : [])];
    await sesClient.send(
      new SendRawEmailCommand({
        Source: env.SES_FROM_EMAIL,
        // The BCC goes in the envelope only, never in a header.
        Destinations: destinations,
        RawMessage: {
          Data: Buffer.from(buildRawMime(mail, env.SES_FROM_EMAIL)),
        },
      })
    );
    logger.info(`Payout e-mail sent to: ${mail.to}`, { subject: mail.subject });
    return true;
  } catch (error) {
    logger.error('Failed to send payout e-mail:', toErrorMeta(error));
    return false;
  }
}
