/**
 * E-mail layout for the payout notifications A1–A3 (Figma "Law-firm portal
 * & payout", section C: A1 1044:5253, A2 1044:5270, A3 1044:5287).
 *
 * Table-based, inline-styled HTML for Gmail, Outlook and Apple Mail: no
 * external CSS or web fonts (Inter first in a web-safe stack), 576px card
 * inside a 640px frame, hidden preheader, VML-backed bulletproof button
 * for Outlook. The same blocks also render the plain-text alternative, so
 * both parts always carry the same words.
 */

export const GPR_BRAND = 'Germany Pension Refund';

export type PayoutEmailBlock =
  | { kind: 'p'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'button'; label: string; url: string };

export interface PayoutEmailContent {
  subject: string;
  /** Inbox preview line; hidden in the body. */
  preheader: string;
  blocks: PayoutEmailBlock[];
  /** Closing line before the signature ("Best regards,"). */
  closing: string;
  /** May span several lines (name, role). */
  signature: string;
}

const FONT =
  "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const NAVY = '#002691';
const INK = '#181818';
const MUTED = '#8c8c8c';
const CANVAS = '#f1f1f1';
/** Vertical rhythm between blocks (Figma auto-layout gap). */
const GAP = 18;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const multiline = (s: string) => escapeHtml(s).replace(/\r?\n/g, '<br>');

const TEXT_STYLE = `margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${INK};`;

function row(inner: string, padBottom = GAP): string {
  return `<tr><td style="padding:0 0 ${padBottom}px 0;">${inner}</td></tr>`;
}

function paragraph(text: string, color = INK): string {
  return `<p style="${TEXT_STYLE}color:${color};">${multiline(text)}</p>`;
}

function bullets(items: string[]): string {
  const lis = items
    .map(
      (item, i) => `<tr>
  <td valign="top" width="19" style="width:19px;padding:0 0 ${i === items.length - 1 ? 0 : 10}px 0;font-family:${FONT};font-size:15px;line-height:23px;color:${INK};">&bull;</td>
  <td valign="top" style="padding:0 0 ${i === items.length - 1 ? 0 : 10}px 0;font-family:${FONT};font-size:15px;line-height:23px;color:${INK};">${multiline(item)}</td>
</tr>`
    )
    .join('\n');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lis}</table>`;
}

/** Pill button, 52px high; VML roundrect for Outlook on Windows. */
function button(label: string, url: string): string {
  const href = escapeHtml(url);
  const text = escapeHtml(label);
  // Outlook ignores padding on <a>; size the VML shape from the label.
  const vmlWidth = Math.round(label.length * 8.6 + 56);
  return `<div style="padding:6px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:${vmlWidth}px;" arcsize="50%" stroke="f" fillcolor="${NAVY}">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="${NAVY}" style="background-color:${NAVY};border-radius:100px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:100px;mso-hide:all;">${text}</a>
    </td>
  </tr>
</table>
<!--<![endif]-->
</div>`;
}

export function renderPayoutEmailHtml(email: PayoutEmailContent): string {
  const body = email.blocks
    .map((b) => {
      if (b.kind === 'p') return row(paragraph(b.text));
      if (b.kind === 'bullets') return row(bullets(b.items));
      return row(button(b.label, b.url));
    })
    .join('\n');

  // Figma shows the subject under the logo as the heading of the mail.
  const heading = `<tr><td style="padding:0 0 ${GAP}px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:6px 0;border-bottom:1px solid ${CANVAS};">
      <h1 style="margin:0;font-family:${FONT};font-size:18px;line-height:24px;font-weight:700;color:${INK};">${escapeHtml(email.subject)}</h1>
    </td></tr>
  </table>
</td></tr>`;

  const logo = `<tr><td style="padding:0 0 ${GAP}px 0;font-family:${FONT};font-size:15px;line-height:15px;font-weight:800;color:${NAVY};">Germany&nbsp;&rsaquo;&rsaquo;<br>Pension&nbsp;Refund</td></tr>`;

  const signoff = `${row(paragraph(email.closing))}
<tr><td style="padding:0;">${paragraph(`Best regards, ${email.signature}`, MUTED)}</td></tr>`;

  // Pad the preheader so clients don't pull body text into the preview.
  const preheaderPad = '&#847;&zwnj;&nbsp;'.repeat(60);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(email.subject)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${CANVAS};">${escapeHtml(email.preheader)}${preheaderPad}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CANVAS}" style="background-color:${CANVAS};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!--[if mso]><table role="presentation" width="576" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:576px;width:100%;">
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:16px;padding:36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${logo}
${heading}
${body}
${signoff}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">${GPR_BRAND} is operated by ATLAES GmbH. &copy; ATLAES GmbH</td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative built from the same blocks. */
export function renderPayoutEmailText(email: PayoutEmailContent): string {
  const parts = email.blocks.map((b) => {
    if (b.kind === 'p') return b.text;
    if (b.kind === 'bullets') return b.items.map((i) => `- ${i}`).join('\n\n');
    return `${b.label}: ${b.url}`;
  });
  parts.push(email.closing, `Best regards,\n${email.signature}`);
  return [
    ...parts,
    `${GPR_BRAND} is operated by ATLAES GmbH. © ATLAES GmbH`,
  ].join('\n\n');
}
