import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

const REGION = env.SES_REGION;
const FROM_EMAIL = env.SES_FROM_EMAIL;

const sesClient = new SESClient({ region: REGION });

// Detect SES availability the same way s3.ts detects bucket availability
const isSesAvailable = !!process.env.SST_RESOURCE_AtlaesEmail;

if (!isSesAvailable) {
  logger.info(
    'SES not available (local dev) — emails will be logged instead of sent'
  );
}

/**
 * Send a magic link email. In local dev (no SES resource), logs instead of sending.
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string
): Promise<boolean> {
  const html = generateMagicLinkEmailHtml(magicLinkUrl);
  const plainText = generateMagicLinkEmailText(magicLinkUrl);

  if (!isSesAvailable) {
    logger.info(`[Email] Would send magic link email to: ${to}`);
    return true;
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `CompanyPension <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: 'Your secure CompanyPension sign-in link', Charset: 'UTF-8' },
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
              <img src="${logoUrl}" width="244" height="50" alt="CompanyPension Cash-outs &amp; Refunds" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:244px;width:100%;">
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
