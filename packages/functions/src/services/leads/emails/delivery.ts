/**
 * German guide delivery e-mail (handleGuideCapture in the Apps Script).
 *
 * The script attached the PDF; here the guide is delivered as a link, so
 * the "im Anhang" sentence never applies and the "finden Sie hier:" variant
 * is used with the guide link. When no guide location is configured the
 * link falls back to the guide's web page and the subject carries the
 * " — Link" suffix, exactly like the script's no-attachment branch.
 */
import type { GuideKey } from '../config';
import { GUIDE_COPY } from './guides';

export interface GuideDeliveryInput {
  guide: GuideKey;
  reminderOptIn: boolean;
  /** Presigned S3 URL or public URL of the PDF; null = not configured. */
  guideUrl: string | null;
  pageUrl: string;
  senderName: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const P = '<p style="margin:0 0 14px">';

export function renderGuideDeliveryEmail(
  input: GuideDeliveryInput
): RenderedEmail {
  const g = GUIDE_COPY[input.guide];
  const link = input.guideUrl ?? input.pageUrl;
  const subject = g.subject + (input.guideUrl ? '' : ' — Link');

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#202124;max-width:640px">' +
    P +
    'Guten Tag,</p>' +
    P +
    'vielen Dank für Ihre Anfrage — ' +
    g.withoutPdf +
    '<a href="' +
    link +
    '">' +
    link +
    '</a>.</p>' +
    (input.reminderOptIn
      ? P +
        'Ihre Wartefrist-Erinnerung ist vorgemerkt: Wir melden uns rechtzeitig, bevor Ihre 24-monatige Wartefrist endet.</p>'
      : '') +
    P +
    g.disclaimer +
    '</p>' +
    P +
    'Freundliche Grüße<br>' +
    input.senderName +
    '</p>' +
    '<p style="margin:0;font-size:12px;color:#5f6368">Sie erhalten diese E-Mail, weil Sie ' +
    g.requestedWhat +
    ' auf unserer Website angefordert haben.' +
    (input.reminderOptIn
      ? ' Die Wartefrist-Erinnerung senden wir nur aufgrund Ihrer ausdrücklichen Einwilligung; eine formlose Antwort auf diese E-Mail genügt, um sie abzubestellen.'
      : '') +
    '</p></div>';

  const text =
    'Guten Tag,\n\n' +
    'vielen Dank für Ihre Anfrage — ' +
    g.withoutPdf +
    link +
    '\n\n' +
    (input.reminderOptIn
      ? 'Ihre Wartefrist-Erinnerung ist vorgemerkt: Wir melden uns rechtzeitig, bevor Ihre 24-monatige Wartefrist endet.\n\n'
      : '') +
    g.disclaimer +
    '\n\n' +
    'Freundliche Grüße\n' +
    input.senderName;

  return { subject, html, text };
}
