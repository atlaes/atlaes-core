/**
 * English welcome auto-reply for refund-widget leads (sendWelcome in the
 * Apps Script, wording of v7.1/v7). Verbatim. The script attached the
 * customer agreement from Drive; without an attachment the script's own
 * "we'll send it in our personal follow-up" variant applies.
 */
import type { RenderedEmail } from './delivery';

export interface WelcomeEmailInput {
  firstName: string;
  isWaiting: boolean;
  canApplyFrom: string | null;
  signaturePhotoUrl: string | null;
  calendlyUrl: string;
  reviewsUrl: string;
  siteUrl: string;
}

export const WELCOME_SUBJECT =
  'Welcome — let’s secure your German pension refund 🇩🇪';

export function escHtml(s: string | null | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderWelcomeEmail(input: WelcomeEmailInput): RenderedEmail {
  const P = '<p style="margin:0 0 14px">';
  const photoTd = input.signaturePhotoUrl
    ? '<td style="padding-right:16px;vertical-align:top">' +
      '<img src="' +
      input.signaturePhotoUrl +
      '" width="110" style="display:block;width:110px;height:auto;border-radius:4px" alt="Johannes Kühn"></td>'
    : '';

  const agreementHtml =
    '<li>A signed copy of our <b>customer agreement</b> (we’ll send it in our personal follow-up)</li>';

  const waitingHtml = input.isWaiting
    ? P +
      'One thing upfront about your timing: your claim can be filed from <b>' +
      (input.canApplyFrom || 'the first possible date') +
      '</b>. We prepare everything with you now, your file waits ' +
      'ready to go, and about two months before your date we confirm with you that nothing has changed — ' +
      'then your claim is filed on the first possible day. One thing off your list.</p>'
    : '';

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#202124;max-width:640px">' +
    P +
    'Hi ' +
    escHtml(input.firstName) +
    ',</p>' +
    P +
    'Thank you for reaching out — I’m really glad you contacted us. We’ll take care of your ' +
    'refund from here and make the process as simple as possible for you.</p>' +
    '<p style="margin:0 0 14px;color:#5f6368;font-style:italic">(This welcome is sent automatically the moment ' +
    'your request arrives, so you don’t have to wait for our office hours to get started — I’ll ' +
    'review your case personally together with our team during German working hours, and once you reply, one of us will always get back to you in person.)</p>' +
    waitingHtml +
    P +
    'To get things started, I just need a few details. You can reply directly to this email — no special format needed.</p>' +
    P +
    '<b>Step 1 — Please send:</b></p>' +
    '<ul style="margin:0 0 14px 0;padding-left:22px">' +
    agreementHtml +
    '<li>A scan of your <b>passport</b> (photo page + signature page)</li>' +
    '</ul>' +
    P +
    '<b>Step 2 — Please confirm</b> (a short reply is enough):</p>' +
    '<ul style="margin:0 0 14px 0;padding-left:22px">' +
    '<li><b>German Social Insurance Number</b> (RV-Nr.)</li>' +
    '<li><b>Current address</b></li>' +
    '<li><b>Date you left Germany</b></li>' +
    '<li><b>Last address in Germany</b></li>' +
    '<li><b>Employer(s)</b></li>' +
    '<li><b>Approx. employment periods</b></li>' +
    '<li><b>Job title(s)</b></li>' +
    '<li><b>Bank details</b> (bank name, account holder name, account number, SWIFT code and currency)</li>' +
    '</ul>' +
    P +
    'If you deregistered your residence before leaving Germany, please also send the <b>Abmeldung</b>.</p>' +
    P +
    'Once we have your information, we prepare everything for you and handle the communication with the ' +
    'pension office. More than three quarters of our 300 most recent completed refunds reached the client ' +
    'escrow account within <b>three months</b> of complete submission — 229 of 300 (76.3%) within 90 days, ' +
    'with a median of about 41 days. Individual processing times vary.</p>' +
    P +
    'If you’d like to see how others experienced working with us, here’s a quick look:<br>' +
    '👉 <a href="' +
    input.reviewsUrl +
    '" style="color:#1a73e8">Google Reviews</a></p>' +
    P +
    'If anything is unclear or if you’d prefer that I guide you through it step-by-step, I’m here to help.</p>' +
    P +
    'Warm regards from Berlin,<br>Johannes</p>' +
    '<table cellpadding="0" cellspacing="0" style="margin-top:20px"><tr>' +
    photoTd +
    '<td style="vertical-align:middle">' +
    '<div style="font-size:17px;font-weight:bold">Johannes Kühn</div>' +
    '<div style="color:#5f6368;margin:2px 0 8px">Senior Case Manager</div>' +
    '<div>📞 <a href="' +
    input.calendlyUrl +
    '" style="color:#1a73e8">Schedule a Call</a></div>' +
    '</td></tr></table>' +
    '<div style="margin-top:14px"><a href="' +
    input.siteUrl +
    '" style="color:#1a73e8">www.GermanyPensionRefund.com</a></div>' +
    '<div style="color:#5f6368">Kaskelstraße 46, 10317 Berlin, Germany</div>' +
    '</div>';

  const text =
    'Hi ' +
    input.firstName +
    ',\n\n' +
    'Thank you for reaching out — we’ll take care of your refund from here.\n\n' +
    (input.isWaiting
      ? 'Your claim can be filed from ' +
        (input.canApplyFrom || 'the first possible date') +
        ' — we prepare everything now so it is filed on the first possible day.\n\n'
      : '') +
    'Step 1 — Please send: a signed copy of our customer agreement and a scan of your passport (photo + signature page).\n\n' +
    'Step 2 — Please confirm: RV-Nr., current address, date you left Germany, last address in Germany, ' +
    'employer(s), approx. employment periods, job title(s), bank details (bank name, account holder, ' +
    'account number, SWIFT, currency). If you have your Abmeldung, please send it too.\n\n' +
    'More than three quarters of our 300 most recent completed refunds reached the client escrow account ' +
    'within three months of complete submission — 229 of 300 (76.3%) within 90 days, with a median of ' +
    'about 41 days. Individual processing times vary.\n\n' +
    'Reviews: ' +
    input.reviewsUrl +
    '\n' +
    'Book a call: ' +
    input.calendlyUrl +
    '\n\n' +
    'Warm regards from Berlin,\nJohannes Kühn — Germany Pension Refund (ATLAES GmbH)\n' +
    'Kaskelstraße 46, 10317 Berlin · ' +
    input.siteUrl;

  return { subject: WELCOME_SUBJECT, html, text };
}
