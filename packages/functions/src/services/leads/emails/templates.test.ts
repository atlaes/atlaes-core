import { describe, expect, it } from 'vitest';
import { renderGuideDeliveryEmail } from './delivery';
import { renderReminderEmail } from './reminder';
import {
  renderClaimLeadTeamNotice,
  renderGuideTeamNotice,
} from './team-notice';
import { renderWelcomeEmail, WELCOME_SUBJECT } from './welcome';
import { ID02_DE_GUIDE, ID02_DE_OPTION } from './guides';

const SENDER = 'Johannes Kühn | Germany Pension Refund';
const SITE = 'https://www.germanypensionrefund.com';
const V0900_PAGE = `${SITE}/v0900-formular`;
const HUB_PAGE = `${SITE}/rentenbeitragserstattung`;

describe('renderGuideDeliveryEmail', () => {
  it('V0900 with a guide link: subject verbatim, link sentence, ID-02 guide disclaimer', () => {
    const mail = renderGuideDeliveryEmail({
      guide: 'v0900',
      reminderOptIn: false,
      guideUrl: 'https://cdn.example/v0900.pdf',
      pageUrl: V0900_PAGE,
      senderName: SENDER,
    });
    expect(mail.subject).toBe('Ihre V0900-Anleitung als PDF');
    expect(mail.text).toContain(
      'vielen Dank für Ihre Anfrage — die komplette V0900-Anleitung inklusive Checkliste finden Sie hier: https://cdn.example/v0900.pdf'
    );
    expect(mail.html).toContain(
      '<a href="https://cdn.example/v0900.pdf">https://cdn.example/v0900.pdf</a>.'
    );
    expect(mail.text).toContain(ID02_DE_GUIDE);
    expect(mail.html).toContain(ID02_DE_GUIDE);
    expect(mail.text).not.toContain('im Anhang');
    expect(mail.text).not.toContain('Wartefrist-Erinnerung ist vorgemerkt');
    expect(mail.html).toContain(
      'Sie erhalten diese E-Mail, weil Sie die Anleitung auf unserer Website angefordert haben.</p>'
    );
    expect(mail.text.endsWith(`Freundliche Grüße\n${SENDER}`)).toBe(true);
  });

  it('falls back to the page link and the " — Link" subject when no guide is configured', () => {
    const mail = renderGuideDeliveryEmail({
      guide: 'wegzug',
      reminderOptIn: false,
      guideUrl: null,
      pageUrl: HUB_PAGE,
      senderName: SENDER,
    });
    expect(mail.subject).toBe('Ihre Checkliste für den Wegzug als PDF — Link');
    expect(mail.text).toContain(
      'die Checkliste vor dem Wegzug mit den Wartefrist-Regeln finden Sie hier: ' +
        HUB_PAGE
    );
    expect(mail.text).toContain(ID02_DE_OPTION);
  });

  it('adds the reminder confirmation and the consent footnote with opt-in', () => {
    const mail = renderGuideDeliveryEmail({
      guide: 'wegzug',
      reminderOptIn: true,
      guideUrl: 'https://cdn.example/wegzug.pdf',
      pageUrl: HUB_PAGE,
      senderName: SENDER,
    });
    expect(mail.text).toContain(
      'Ihre Wartefrist-Erinnerung ist vorgemerkt: Wir melden uns rechtzeitig, bevor Ihre 24-monatige Wartefrist endet.'
    );
    expect(mail.html).toContain(
      'Die Wartefrist-Erinnerung senden wir nur aufgrund Ihrer ausdrücklichen Einwilligung; eine formlose Antwort auf diese E-Mail genügt, um sie abzubestellen.'
    );
    expect(mail.html).toContain('weil Sie die Checkliste auf unserer Website');
  });
});

describe('renderReminderEmail', () => {
  it('V0900 reminder body verbatim with the apply label and page link', () => {
    const mail = renderReminderEmail({
      guide: 'v0900',
      applyLabel: '1. April 2027',
      pageUrl: V0900_PAGE,
      siteUrl: SITE,
      senderName: SENDER,
    });
    expect(mail.subject).toBe('Erinnerung: Ihre Wartefrist endet bald');
    expect(mail.text).toBe(
      'Guten Tag,\n\nSie hatten um diese Erinnerung gebeten: Nach Ihren Angaben ist Ihre 24-monatige Wartefrist voraussichtlich ab dem 1. April 2027 erfüllt — ab diesem Tag kann der V0900-Antrag gestellt werden, sofern die übrigen Voraussetzungen weiterhin erfüllt sind.\n\n' +
        `Die Anleitung: ${V0900_PAGE}\n\nFreundliche Grüße\n${SENDER}`
    );
  });

  it('Wegzug reminder points to the hub, pricing, funnel and carries ID-02 option', () => {
    const mail = renderReminderEmail({
      guide: 'wegzug',
      applyLabel: '1. Januar 2027',
      pageUrl: HUB_PAGE,
      siteUrl: SITE,
      senderName: SENDER,
    });
    expect(mail.text).toContain('ab dem 1. Januar 2027 erfüllt');
    expect(mail.text).toContain(
      '(Staatsangehörigkeit, Wohnsitz außerhalb der EU und des Vereinigten Königreichs, keine neue Pflichtversicherung seit Ihrem letzten Beitrag).'
    );
    expect(mail.text).toContain(`Alle Regeln und die Checkliste: ${HUB_PAGE}`);
    expect(mail.text).toContain(
      '9,75 % des Erstattungsbetrags, gedeckelt bei 2.500 € inklusive MwSt., ohne Vorauszahlung und ohne Mindestgebühr (' +
        SITE +
        '/pricing).'
    );
    expect(mail.text).toContain(`Start: ${SITE}/get-your-refund`);
    expect(mail.text).toContain(ID02_DE_OPTION);
    expect(mail.text).not.toContain('V0900');
  });
});

describe('team notices', () => {
  it('guide notice: subject suffix and reminder line only with opt-in', () => {
    const withOptIn = renderGuideTeamNotice({
      guide: 'v0900',
      email: 'a@b.de',
      reminderOptIn: true,
      lastContributionMonth: '2025-03',
      widget: 'V0900-CAPTURE @ v0900',
      referrer: 'https://www.germanypensionrefund.com/v0900-formular',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: null,
    });
    expect(withOptIn.subject).toBe(
      'V0900-Leitfaden angefordert (+ Wartefrist-Erinnerung)'
    );
    expect(withOptIn.text).toBe(
      'E-Mail:    a@b.de\n' +
        'Erinnerung: JA — letzter Pflichtbeitrag 3/2025\n' +
        'Widget:    V0900-CAPTURE @ v0900\n' +
        'Seite:     https://www.germanypensionrefund.com/v0900-formular\n' +
        'Quelle:    google / cpc / \n'
    );

    const without = renderGuideTeamNotice({
      guide: 'wegzug',
      email: 'a@b.de',
      reminderOptIn: false,
      lastContributionMonth: null,
      widget: 'WEGZUG-CAPTURE',
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    });
    expect(without.subject).toBe('Wegzugs-Checkliste angefordert');
    expect(without.text).toBe('E-Mail:    a@b.de\nWidget:    WEGZUG-CAPTURE\n');
  });

  it('widget lead notice: waiting suffix and estimate line', () => {
    const mail = renderClaimLeadTeamNotice({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
      verdict: 'warn',
      verdictTitle: 'Eligible from 1 April 2027',
      citizenship: 'BR — Brazil',
      residence: 'BR — Brazil',
      canApplyFrom: '1 April 2027',
      estimateEur: 8200,
      incomeEntered: 'EUR 45000',
      widget: 'COMBINED @ refundsib',
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      submittedAt: '2026-09-25T10:00:00.000Z',
    });
    expect(mail.subject).toBe(
      'New widget lead (waiting — file 1 April 2027) — Ana Silva'
    );
    expect(mail.text).toContain('Can apply from: 1 April 2027\n');
    expect(mail.text).toContain(
      'Estimate:      EUR 8200 (income entered: EUR 45000)\n'
    );
    expect(mail.text).toContain('Submitted:     2026-09-25T10:00:00.000Z\n');
  });
});

describe('renderWelcomeEmail', () => {
  const base = {
    firstName: 'Ana <b>',
    isWaiting: false,
    canApplyFrom: null,
    signaturePhotoUrl: null,
    calendlyUrl: 'https://calendly.com/x',
    reviewsUrl: 'https://maps.example/reviews',
    siteUrl: SITE,
  };

  it('escapes the name, uses the follow-up agreement variant, no photo cell', () => {
    const mail = renderWelcomeEmail(base);
    expect(mail.subject).toBe(WELCOME_SUBJECT);
    expect(mail.html).toContain('Hi Ana &lt;b&gt;,');
    expect(mail.html).toContain(
      '<li>A signed copy of our <b>customer agreement</b> (we’ll send it in our personal follow-up)</li>'
    );
    expect(mail.html).not.toContain('cid:');
    expect(mail.html).not.toContain('<img');
    expect(mail.text).toContain(
      'Step 1 — Please send: a signed copy of our customer agreement and a scan of your passport'
    );
    expect(mail.text).toContain('229 of 300 (76.3%) within 90 days');
  });

  it('adds the waiting paragraph and the photo when configured', () => {
    const mail = renderWelcomeEmail({
      ...base,
      isWaiting: true,
      canApplyFrom: '1 April 2027',
      signaturePhotoUrl: 'https://cdn.example/jk.jpg',
    });
    expect(mail.html).toContain(
      'your claim can be filed from <b>1 April 2027</b>.'
    );
    expect(mail.html).toContain('<img src="https://cdn.example/jk.jpg"');
    expect(mail.text).toContain('Your claim can be filed from 1 April 2027');
  });
});
