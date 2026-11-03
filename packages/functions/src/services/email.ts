import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Resource } from 'sst';
import { logger, toErrorMeta } from '../utils/logger';
import { env } from '../utils/env';
import { isE2eTestAddress } from '../utils/e2e';
import {
  GPR_BRAND,
  renderPayoutEmailHtml,
  renderPayoutEmailText,
  type PayoutEmailContent,
} from './gpr-payout/email-templates/layout';

const REGION = env.SES_REGION;
const FROM_EMAIL = env.SES_FROM_EMAIL;

const sesClient = new SESClient({ region: REGION });

/**
 * SES is linked on the Fargate backend (SST_RESOURCE_AtlaesEmail) and on
 * the crons (sst.aws.Function, which only get the encrypted link bundle
 * that `Resource` reads). Without either (local dev, tests) mail is logged
 * instead of sent.
 */
function detectSes(): boolean {
  if (process.env.SST_RESOURCE_AtlaesEmail) return true;
  try {
    return 'AtlaesEmail' in Resource;
  } catch {
    return false;
  }
}
const isSesAvailable = detectSes();

if (!isSesAvailable) {
  logger.info(
    'SES not available (local dev) — emails will be logged instead of sent'
  );
}

/**
 * Bounce protection: never hand an @e2e.test address (staging e2e suite,
 * reserved TLD) to SES, with or without the e2e secret. Logged instead;
 * reported as sent so callers behave as they would for a real address.
 */
function isSuppressedE2eRecipient(to: string, label: string): boolean {
  if (!isE2eTestAddress(to)) return false;
  logger.info(`[Email] Not sending ${label} email to e2e test address: ${to}`);
  return true;
}

/** Which site asked for the link; decides the branding of the e-mail. */
export type MagicLinkBrand = 'companypension' | 'gpr';

/** GPR sign-in mail in the GPR e-mail layout (shared with the payout mails). */
export function gprMagicLinkEmail(magicLinkUrl: string): PayoutEmailContent {
  return {
    subject: 'Your secure sign-in link',
    preheader: `Sign in to your ${GPR_BRAND} account. The link expires in 15 minutes.`,
    blocks: [
      {
        kind: 'p',
        text: `Click the button below to sign in to your ${GPR_BRAND} account. No password is needed.`,
      },
      { kind: 'button', label: 'Sign in securely', url: magicLinkUrl },
      { kind: 'p', text: 'This secure link expires in 15 minutes.' },
      {
        kind: 'p',
        text: `If the button does not work, copy and paste this link into your browser:\n${magicLinkUrl}`,
      },
      {
        kind: 'p',
        text: 'If you did not request this email, you can safely ignore it.',
      },
    ],
    closing: 'We look forward to helping you with your refund.',
    signature: `Your ${GPR_BRAND} team`,
  };
}

/**
 * Send a magic link email. In local dev (no SES resource), logs instead of sending.
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string,
  brand: MagicLinkBrand = 'companypension'
): Promise<boolean> {
  if (isSuppressedE2eRecipient(to, 'magic link')) return true;
  const gpr = brand === 'gpr' ? gprMagicLinkEmail(magicLinkUrl) : null;
  const html = gpr
    ? renderPayoutEmailHtml(gpr)
    : generateMagicLinkEmailHtml(magicLinkUrl);
  const plainText = gpr
    ? renderPayoutEmailText(gpr)
    : generateMagicLinkEmailText(magicLinkUrl);
  const fromName = gpr ? GPR_BRAND : 'CompanyPension';
  const subject = gpr
    ? gpr.subject
    : 'Your secure CompanyPension sign-in link';

  if (!isSesAvailable) {
    logger.info(`[Email] Would send magic link email to: ${to}`);
    return true;
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `${fromName} <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: plainText, Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`Magic link email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send magic link email:', error);
    return false;
  }
}

/**
 * Send the "refund application stopped" email, sent when the user stops their
 * refund at the Confirm step (a disqualifying "Yes" answer). Mirrors the magic
 * link email's branded table layout. In local dev (no SES resource), logs
 * instead of sending.
 */
export async function sendClaimStoppedEmail(to: string): Promise<boolean> {
  if (isSuppressedE2eRecipient(to, 'claim-stopped')) return true;
  const html = generateClaimStoppedEmailHtml();
  const plainText = generateClaimStoppedEmailText();

  if (!isSesAvailable) {
    logger.info(`[Email] Would send claim-stopped email to: ${to}`);
    return true;
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `CompanyPension <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: {
            Data: 'Your CompanyPension refund application has been stopped',
            Charset: 'UTF-8',
          },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: plainText, Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`Claim-stopped email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send claim-stopped email:', error);
    return false;
  }
}

export interface ContractWithdrawalEmailDetails {
  fullName: string;
  claimId: string;
  pensionTypeOrInstitution: string;
  declarationText: string;
  receivedAt: Date;
  applicationAlreadySubmitted: boolean;
}

/**
 * Send the immediate "contract withdrawal confirmation" email after a user
 * confirms an electronic contract withdrawal (public or logged-in path).
 * Mirrors the branded table layout of the other transactional emails. In
 * local dev (no SES resource), logs instead of sending.
 */
export async function sendContractWithdrawalEmail(
  to: string,
  details: ContractWithdrawalEmailDetails
): Promise<boolean> {
  if (isSuppressedE2eRecipient(to, 'contract-withdrawal')) return true;
  const html = generateContractWithdrawalEmailHtml(to, details);
  const plainText = generateContractWithdrawalEmailText(to, details);

  if (!isSesAvailable) {
    logger.info(`[Email] Would send contract-withdrawal email to: ${to}`);
    return true;
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `CompanyPension <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: {
            Data: 'Confirmation of your CompanyPension contract withdrawal',
            Charset: 'UTF-8',
          },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: plainText, Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`Contract-withdrawal email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send contract-withdrawal email:', error);
    return false;
  }
}

function formatWithdrawalTimestamp(date: Date): string {
  // Explicit UTC so the recorded moment is unambiguous in the confirmation.
  return `${date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')} UTC`;
}

export function generateContractWithdrawalEmailText(
  emailUsed: string,
  details: ContractWithdrawalEmailDetails
): string {
  const lines = [
    'Confirmation of your CompanyPension contract withdrawal',
    '',
    'We have received your contract withdrawal. The details are below.',
    '',
    `Full name: ${details.fullName || '—'}`,
    `Claim ID: ${details.claimId}`,
    `Pension type / institution: ${details.pensionTypeOrInstitution || '—'}`,
    `Email used: ${emailUsed}`,
    `Received: ${formatWithdrawalTimestamp(details.receivedAt)}`,
    `Application already submitted: ${
      details.applicationAlreadySubmitted ? 'Yes' : 'No'
    }`,
    '',
    'Your withdrawal declaration:',
    details.declarationText,
    '',
    'Any applicable refund, fee or outstanding amount under your CompanyPension contract will be communicated to you separately.',
  ];

  if (details.applicationAlreadySubmitted) {
    lines.push(
      '',
      'Because your refund application had already been submitted, withdrawing your CompanyPension contract does not withdraw the submitted refund application; the pension institution may continue processing it.',
      '',
      'CompanyPension will notify the pension institution that its authorization to receive correspondence has been revoked. Future correspondence should then be sent directly to you.'
    );
  }

  lines.push(
    '',
    `If you have any questions, contact us at ${SUPPORT_EMAIL}.`,
    '',
    'CompanyPension is operated by ATLAES GmbH.',
    '© ATLAES GmbH'
  );

  return lines.join('\n');
}

/**
 * Branded HTML confirmation email for a contract withdrawal. Same table-based,
 * inline-styled layout as the other transactional emails.
 */
export function generateContractWithdrawalEmailHtml(
  emailUsed: string,
  details: ContractWithdrawalEmailDetails
): string {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
  const logoUrl = `${frontendUrl}/companypension-cashouts-refunds.svg`;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const declarationHtml = esc(details.declarationText).replace(/\n/g, '<br>');

  const submittedBlock = details.applicationAlreadySubmitted
    ? `
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3f3f46;">
                Because your refund application had already been submitted, withdrawing your CompanyPension contract does not withdraw the submitted refund application; the pension institution may continue processing it.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#3f3f46;">
                CompanyPension will notify the pension institution that its authorization to receive correspondence has been revoked. Future correspondence should then be sent directly to you.
              </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation of your CompanyPension contract withdrawal</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#163300;padding:24px 32px;border-radius:12px 12px 0 0;">
              <img src="${logoUrl}" width="244" height="52" alt="CompanyPension Cash-outs &amp; Refunds" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:244px;width:100%;">
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#163300;">We have received your contract withdrawal</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#3f3f46;">
                Here is a confirmation of the contract withdrawal you submitted.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:14px;color:#3f3f46;">
                <tr><td style="padding:4px 0;color:#71717a;width:180px;">Full name</td><td style="padding:4px 0;">${esc(details.fullName || '—')}</td></tr>
                <tr><td style="padding:4px 0;color:#71717a;">Claim ID</td><td style="padding:4px 0;">${esc(details.claimId)}</td></tr>
                <tr><td style="padding:4px 0;color:#71717a;">Pension type / institution</td><td style="padding:4px 0;">${esc(details.pensionTypeOrInstitution || '—')}</td></tr>
                <tr><td style="padding:4px 0;color:#71717a;">Email used</td><td style="padding:4px 0;">${esc(emailUsed)}</td></tr>
                <tr><td style="padding:4px 0;color:#71717a;">Received</td><td style="padding:4px 0;">${esc(formatWithdrawalTimestamp(details.receivedAt))}</td></tr>
                <tr><td style="padding:4px 0;color:#71717a;">Application already submitted</td><td style="padding:4px 0;">${details.applicationAlreadySubmitted ? 'Yes' : 'No'}</td></tr>
              </table>
              <div style="margin:0 0 24px;padding:16px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${declarationHtml}
              </div>
              ${submittedBlock}
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#3f3f46;">
                Any applicable refund, fee or outstanding amount under your CompanyPension contract will be communicated to you separately.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#71717a;">
                If you have any questions, contact us at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#163300;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                CompanyPension is operated by ATLAES GmbH.
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                &copy; ATLAES GmbH
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const SUPPORT_EMAIL = 'support@companypension.de';

function generateClaimStoppedEmailText(): string {
  return [
    'Your refund application has been stopped',
    '',
    'Based on your answer, your CompanyPension refund application has been stopped and will not be submitted.',
    '',
    'Your €199 deposit will be refunded to the same payment method you used. No further action is needed from you.',
    '',
    `If you have any questions, contact us at ${SUPPORT_EMAIL}.`,
    '',
    'CompanyPension is operated by ATLAES GmbH.',
    '© ATLAES GmbH',
  ].join('\n');
}

/**
 * Branded HTML email for a stopped refund application. Same table-based,
 * inline-styled layout as the magic link email for client compatibility.
 */
export function generateClaimStoppedEmailHtml(): string {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
  const logoUrl = `${frontendUrl}/companypension-cashouts-refunds.svg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CompanyPension refund application has been stopped</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Header -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#163300;padding:24px 32px;border-radius:12px 12px 0 0;">
              <img src="${logoUrl}" width="244" height="52" alt="CompanyPension Cash-outs &amp; Refunds" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:244px;width:100%;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#163300;">Your refund application has been stopped</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#3f3f46;">
                Based on your answer, your CompanyPension refund application has been stopped and will not be submitted.
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#3f3f46;">
                Your &euro;199 deposit will be refunded to the same payment method you used. No further action is needed from you.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#71717a;">
                If you have any questions, contact us at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#163300;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                CompanyPension is operated by ATLAES GmbH.
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                &copy; ATLAES GmbH
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateMagicLinkEmailText(magicLinkUrl: string): string {
  return [
    'Sign in to your secure claim',
    '',
    'Click the button below to continue your CompanyPension claim. No password is needed.',
    '',
    'Open secure claim:',
    magicLinkUrl,
    '',
    'This secure link expires in 15 minutes.',
    '',
    'If the button does not work, copy and paste this link into your browser:',
    magicLinkUrl,
    '',
    'If you did not request this email, you can safely ignore it.',
    '',
    'CompanyPension is operated by ATLAES GmbH.',
    '© ATLAES GmbH',
  ].join('\n');
}

/**
 * Generate the branded HTML email for a magic link.
 * Uses table-based layout with inline styles for email client compatibility.
 */
export function generateMagicLinkEmailHtml(magicLinkUrl: string): string {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
  const logoUrl = `${frontendUrl}/companypension-cashouts-refunds.svg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your secure CompanyPension sign-in link</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Header -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#163300;padding:24px 32px;border-radius:12px 12px 0 0;">
              <img src="${logoUrl}" width="244" height="52" alt="CompanyPension Cash-outs &amp; Refunds" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:244px;width:100%;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#163300;">Sign in to your secure claim</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#3f3f46;">
                Click the button below to continue your CompanyPension claim. No password is needed.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#9FE870;border-radius:8px;">
                    <a href="${magicLinkUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#163300;text-decoration:none;">
                      Open secure claim
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:13px;color:#71717a;">
                This secure link expires in 15 minutes.
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:13px;color:#9FE870;word-break:break-all;">
                ${magicLinkUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                If you did not request this email, you can safely ignore it.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">
                CompanyPension is operated by ATLAES GmbH.
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                &copy; ATLAES GmbH
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================
// Law-firm portal notifications
// ============================================================

interface BrandedEmail {
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Same table layout as the magic link email, parameterised so the portal
 * notifications look like the rest of the platform's mail.
 */
function renderBrandedEmailHtml(email: BrandedEmail): string {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
  const logoUrl = `${frontendUrl}/companypension-cashouts-refunds.svg`;
  const paragraphs = email.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#3f3f46;">${escapeHtml(p)}</p>`
    )
    .join('\n');
  const cta = email.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                <tr>
                  <td style="background-color:#9FE870;border-radius:8px;">
                    <a href="${email.cta.url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#163300;text-decoration:none;">${escapeHtml(email.cta.label)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">If the button does not work, copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:13px;color:#9FE870;word-break:break-all;">${email.cta.url}</p>`
    : '';
  const footnote = email.footnote
    ? `<p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">${escapeHtml(email.footnote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#163300;padding:24px 32px;border-radius:12px 12px 0 0;">
              <img src="${logoUrl}" width="244" height="52" alt="CompanyPension Cash-outs &amp; Refunds" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:244px;width:100%;">
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#163300;">${escapeHtml(email.heading)}</h1>
              ${paragraphs}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
              ${footnote}
              <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;">CompanyPension is operated by ATLAES GmbH.</p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">&copy; ATLAES GmbH</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderBrandedEmailText(email: BrandedEmail): string {
  const lines = [email.heading, '', ...email.paragraphs.flatMap((p) => [p, ''])];
  if (email.cta) lines.push(`${email.cta.label}: ${email.cta.url}`, '');
  if (email.footnote) lines.push(email.footnote, '');
  lines.push('CompanyPension is operated by ATLAES GmbH.', '© ATLAES GmbH');
  return lines.join('\n');
}

async function sendBrandedEmail(
  to: string,
  email: BrandedEmail,
  logLabel: string
): Promise<boolean> {
  if (isSuppressedE2eRecipient(to, logLabel)) return true;
  if (!isSesAvailable) {
    logger.info(`[Email] Would send ${logLabel} email to: ${to}`, {
      subject: email.subject,
      cta: email.cta?.url,
    });
    return true;
  }
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `CompanyPension <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: email.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: renderBrandedEmailHtml(email), Charset: 'UTF-8' },
            Text: { Data: renderBrandedEmailText(email), Charset: 'UTF-8' },
          },
        },
      })
    );
    logger.info(`${logLabel} email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send ${logLabel} email:`, toErrorMeta(error));
    return false;
  }
}

export interface VblReminderEmailDetails {
  /** YYYY-MM-DD, the first day the refund can be started. */
  eligibleOn: string;
  /** e.g. 'VddB'; the mail then says "your VddB refund". */
  pensionProvider?: string | null;
}

/** '1 March 2027' from 'YYYY-MM-DD'. */
function formatReminderDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function reminderRefundLabel(details: VblReminderEmailDetails): string {
  const provider = details.pensionProvider?.trim();
  return provider ? `${provider} refund` : 'refund';
}

const VBL_REMINDER_FOOTNOTE =
  'You receive this e-mail because you asked CompanyPension to remind you when your refund can be started. If that was not you, you can ignore it.';

/**
 * Confirms a "remind me when I can start" request from the calculator or
 * the get-started flow (POST /api/vbl/reminders).
 */
export async function sendVblReminderSetEmail(
  to: string,
  details: VblReminderEmailDetails
): Promise<boolean> {
  const date = formatReminderDate(details.eligibleOn);
  return sendBrandedEmail(
    to,
    {
      subject: 'Your refund reminder is set',
      heading: 'Reminder set',
      paragraphs: [
        `Thanks — we have saved your reminder. Your ${reminderRefundLabel(details)} can be started from ${date}, once the waiting period after your last contribution has passed.`,
        'We will e-mail you on that day so you can start your refund with CompanyPension. There is nothing else to do until then.',
      ],
      footnote: VBL_REMINDER_FOOTNOTE,
    },
    'vbl-reminder-set'
  );
}

/**
 * Sent by the daily leads cron on the day the refund can be started
 * (services/leads/index.ts, processDueReminders).
 */
export async function sendVblReminderDueEmail(
  to: string,
  details: VblReminderEmailDetails
): Promise<boolean> {
  const date = formatReminderDate(details.eligibleOn);
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
  return sendBrandedEmail(
    to,
    {
      subject: 'You can start your refund now',
      heading: 'Your waiting period is over',
      paragraphs: [
        `The waiting period for your ${reminderRefundLabel(details)} has passed: from ${date} your refund can be started.`,
        'Start it with CompanyPension whenever you are ready — it takes about ten minutes and we guide you through every step.',
      ],
      cta: { label: 'Start my refund', url: `${frontendUrl}/get-started` },
      footnote: VBL_REMINDER_FOOTNOTE,
    },
    'vbl-reminder-due'
  );
}

/** Ops invited a person at the partner law firm; carries their first sign-in link. */
export async function sendLawFirmInviteEmail(
  to: string,
  details: { firmName: string; magicLinkUrl: string }
): Promise<boolean> {
  return sendBrandedEmail(
    to,
    {
      subject: `Your CompanyPension partner portal access (${details.firmName})`,
      heading: 'Welcome to the CompanyPension partner portal',
      paragraphs: [
        `You have been invited to the CompanyPension partner portal for ${details.firmName}. The portal lists the cases routed to your firm, lets you download the letter package and record what you sent, and takes uploads of the provider's replies.`,
        'Sign in with the button below. Future sign-ins work the same way: enter your email address on the portal and we send you a fresh link.',
      ],
      cta: { label: 'Open the partner portal', url: details.magicLinkUrl },
      footnote:
        'This sign-in link expires in 15 minutes; request a new one from the portal login page if needed.',
    },
    'law-firm invite'
  );
}

/** A claim was routed to the firm; sent to the firm's notification address. */
export async function sendLawFirmNewCaseEmail(
  to: string,
  details: {
    firmName: string;
    claimantName: string;
    claimId: string;
    caseUrl: string;
    lawFirmRef: string | null;
  }
): Promise<boolean> {
  const refLine = details.lawFirmRef
    ? `Your file number on record: ${details.lawFirmRef}.`
    : 'No file number is on record yet; please enter yours in the portal so the letter shows it.';
  return sendBrandedEmail(
    to,
    {
      subject: `New case for ${details.firmName}: ${details.claimantName}`,
      heading: 'A new case has been routed to your firm',
      paragraphs: [
        `CompanyPension has assigned the bAV cash-out case of ${details.claimantName} (case ${details.claimId.slice(0, 8)}) to ${details.firmName}. The letter package is ready for download in the partner portal.`,
        refLine,
      ],
      cta: { label: 'Open the case', url: details.caseUrl },
    },
    'law-firm new case'
  );
}

/**
 * Ops notice for law-firm activity (case events, uploads). Goes to
 * OPS_NOTIFICATION_EMAIL; when that is unset the notice is only logged.
 */
export async function sendOpsLawFirmActivityEmail(details: {
  subject: string;
  summary: string;
  detailLines: string[];
  claimUrl: string;
}): Promise<boolean> {
  const to = env.OPS_NOTIFICATION_EMAIL;
  if (!to) {
    logger.info('[Email] OPS_NOTIFICATION_EMAIL unset; law-firm activity not mailed', {
      subject: details.subject,
    });
    return false;
  }
  return sendBrandedEmail(
    to,
    {
      subject: details.subject,
      heading: details.summary,
      paragraphs: details.detailLines,
      cta: { label: 'Open the claim in the admin', url: details.claimUrl },
    },
    'ops law-firm activity'
  );
}

/**
 * Ops notice for a submitted claim that needs a person (submission hold:
 * provider data missing, manual submission, package build failure). Goes
 * to OPS_NOTIFICATION_EMAIL; when that is unset the notice is only logged.
 */
export async function sendOpsClaimAttentionEmail(details: {
  subject: string;
  summary: string;
  detailLines: string[];
  claimUrl: string;
}): Promise<boolean> {
  const to = env.OPS_NOTIFICATION_EMAIL;
  if (!to) {
    logger.warn('[Email] OPS_NOTIFICATION_EMAIL unset; claim notice not mailed', {
      subject: details.subject,
    });
    return false;
  }
  return sendBrandedEmail(
    to,
    {
      subject: details.subject,
      heading: details.summary,
      paragraphs: details.detailLines,
      cta: { label: 'Open the claim in the admin', url: details.claimUrl },
    },
    'ops claim attention'
  );
}

/**
 * Ops notice when a payout account is changed in the admin. Payout
 * destinations are high impact, so every change is mailed to
 * OPS_NOTIFICATION_EMAIL (logged when unset) in addition to the audit row.
 */
export async function sendOpsPayoutAccountChangedEmail(details: {
  accountLabel: string;
  changedBy: string;
  detailLines: string[];
  settingsUrl: string;
}): Promise<boolean> {
  const to = env.OPS_NOTIFICATION_EMAIL;
  if (!to) {
    logger.warn(
      '[Email] OPS_NOTIFICATION_EMAIL unset; payout account change not mailed',
      { account: details.accountLabel, changedBy: details.changedBy }
    );
    return false;
  }
  return sendBrandedEmail(
    to,
    {
      subject: `Payout account changed: ${details.accountLabel}`,
      heading: `${details.changedBy} changed the ${details.accountLabel}`,
      paragraphs: [
        ...details.detailLines,
        'If you did not expect this change, check it in the admin now.',
      ],
      cta: { label: 'Open payout accounts', url: details.settingsUrl },
    },
    'ops payout account changed'
  );
}
