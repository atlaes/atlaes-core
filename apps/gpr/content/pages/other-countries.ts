/**
 * /other-countries copy — verbatim from the GPR Figma frame "Other
 * countries — /other-countries" (926:12479, live www page 14 Sep 2026,
 * no handoff); the four collapsed FAQ answers and the link targets come
 * from that live page. Quarterly figures are token references.
 */
import type { Block, FaqItem, Span } from '@/content/types';
import { EXTERNAL, FUNNEL_ENTRY } from '@/content/registries/links';
import type { RulesPageData } from './types';

const GUIDE = '/post/how-to-get-a-german-pension-refund';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const CALCULATOR = '/refund-calculator';
const OFFICE = '/post/which-german-pension-office-handles-your-claim';
const V0901 = '/v0901-pension-refund-form-english';
const WIDOW = '/post/german-widow-pension';
const INDIA = '/india';

/** Official basis links (live page). */
const SGB_210 = 'https://www.gesetze-im-internet.de/sgb_6/__210.html';
const DRV_FAQ =
  'https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Wissenswertes-zur-Rente/FAQs/International/Erstattung.html';
const DRV_BROCHURE =
  'https://www.deutsche-rentenversicherung.de/SharedDocs/Downloads/DE/Broschueren/international/ausland/arbeiten_in_deutschland_und_vertragslosen_ausland.html';
const DRV_LIAISON =
  'https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Ausland/Ansprechpartner-und-Verbindungsstellen/ansprechpartner-und-verbindungsstellen_node.html';
const DRV_V0901 =
  'https://www.deutsche-rentenversicherung.de/SharedDocs/Formulare/DE/_pdf/V0901_englisch.html';

const p = (x: string, sp?: Span[]): Block =>
  sp ? { t: 'p', x, sp } : { t: 'p', x };
const h3 = (x: string): Block => ({ t: 'h3', x });

export const OTHER_COUNTRIES: RulesPageData = {
  path: '/other-countries',
  title: 'German Pension Refund Rules for Other Countries (2026)',
  meta: 'Country not listed? Citizens of other countries face no contribution-month limit on a German pension refund. Conditions, dual citizenship, office, payout.',
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'Rules by country', href: '/other-countries' },
    { label: 'Other countries', href: '/other-countries' },
  ],
  eyebrow: 'Country guide',
  h1: '🌍 German Pension Refund Rules for Citizens of Other Countries',
  hero: [
    p(
      'If none of our country-specific nationality rules applies to you, there is no contribution-month limit on your German pension refund: 60, 100 or 200 German months remain refundable once the general conditions hold. This includes citizens of China, Mexico, Vietnam, Pakistan, Indonesia, Thailand, Egypt, Argentina, South Africa, New Zealand, Singapore, the United Arab Emirates, Russia, Ukraine — and of every other country outside the EU, the EEA, Switzerland and the United Kingdom whose citizens have no right to voluntary German pension insurance. The nationality rule is often simpler for this group. The claim itself still depends on getting the citizenship and residence analysis, filing date, insurance record, responsible office, certified documents and international payment route right — and that is the work we take on.',
      [
        { k: 'a', x: 'China', href: '/china' },
        { k: 'a', x: 'Mexico', href: '/mexico' },
        { k: 'a', x: 'Vietnam', href: '/vietnam' },
        { k: 'a', x: 'Pakistan', href: '/pakistan' },
        { k: 'a', x: 'Indonesia', href: '/indonesia' },
        { k: 'a', x: 'Thailand', href: '/thailand' },
        { k: 'a', x: 'Egypt', href: '/egypt' },
        { k: 'a', x: 'Argentina', href: '/argentina' },
        { k: 'a', x: 'South Africa', href: '/south-africa' },
        { k: 'a', x: 'New Zealand', href: '/new-zealand' },
        { k: 'a', x: 'Singapore', href: '/singapore' },
        { k: 'a', x: 'the United Arab Emirates', href: '/uae' },
        { k: 'a', x: 'Russia', href: '/russia' },
        { k: 'a', x: 'Ukraine', href: '/ukraine' },
      ]
    ),
  ],
  cta: { label: 'Claim Your Refund Today', href: FUNNEL_ENTRY },
  glanceLabel: 'At a glance',
  trust: '{{M-15.sentence}}',
  bullets: [
    'No contribution-month limit for citizens of other countries — 60 months or more stay refundable once the general conditions hold',
    'Across our retained completed paid cases — all nationalities — refunds averaged {{M-04.meanRounded}}',
    'More than three quarters of our {{TM-01.population}} reached the client escrow account {{TM-01.window}}',
    'No German bank account required',
    'No refund, no service fee',
  ],
  jump: [
    { href: '#do-i-qualify', label: 'The three conditions' },
    { href: '#what-we-do', label: 'What we handle' },
    { href: '#getting-paid', label: 'Price & payment' },
    { href: '#faq', label: 'FAQ' },
    { href: '#reviews', label: 'Reviews' },
  ],
  sections: [
    {
      id: 'who-this-is-for',
      label: 'Who this is for',
      h2: 'Who this page is for',
      blocks: [
        p(
          "Our country pages describe the citizenships that carry their own rule: the eleven agreement countries with a 60-month limit (named below), Japan and Israel with residence-linked rules, Bosnia and Herzegovina, Kosovo, Montenegro and Serbia with theirs, and Türkiye, Chile, Morocco and Tunisia, whose agreements set no limit. German, EU, EEA, Swiss and British citizens are a separate case: they keep voluntary-insurance rights under German and EU law and, as a rule, cannot claim before retirement age. Everyone else falls under plain German law, whether or not a page for their country exists on this site: no contribution-month limit, no additional citizenship rule, just the three general conditions below. No social security agreement is required — agreements are what create the special rules, because they extend voluntary German insurance rights to a country's citizens, and whoever holds that right, even unused, cannot take the money out.",
          [
            { k: 'a', x: 'Japan', href: '/japan' },
            { k: 'a', x: 'Israel', href: '/israel' },
            {
              k: 'a',
              x: 'Bosnia and Herzegovina, Kosovo, Montenegro and Serbia',
              href: '/former-yugoslavia',
            },
            { k: 'a', x: 'Türkiye', href: '/turkey' },
            { k: 'a', x: 'Chile', href: '/chile' },
            { k: 'a', x: 'Morocco', href: '/morocco' },
            { k: 'a', x: 'Tunisia', href: '/tunisia' },
          ]
        ),
      ],
    },
    {
      id: 'do-i-qualify',
      label: 'Three conditions',
      tone: 'surface',
      h2: 'The three conditions',
      blocks: [
        h3('Citizenship — every citizenship you hold counts'),
        p(
          'None of your citizenships may be German, EU, EEA, Swiss or British. What matters is whether you legally hold the citizenship, not whether a passport has been issued or used: a citizenship you hold blocks the refund before German retirement age on its own, whatever your other passport says. Some citizenships arise automatically by descent; others require registration or grant. If another citizenship may already exist in your family line — an Italian, Spanish, Portuguese or British one through a parent or grandparent is the typical case — clarify your legal status before relying on the refund route; the pension office judges your situation on the day the application is filed. (The complete guide covers the narrow exception for former German civil servants and similar cases.)',
          [{ k: 'a', x: 'The complete guide', href: GUIDE }]
        ),
        h3('Residence — outside the EU and the UK'),
        p(
          'You must live outside the European Union and the United Kingdom on the day you apply; Norway, Iceland, Liechtenstein and Switzerland are fine. Visiting the EU or the UK is fine; living there is not. India is the one other country that blocks residents of every nationality except its own citizens: if you live in India without Indian citizenship, the refund must wait until you move elsewhere (the India page explains why). Anywhere else, your address changes nothing. Two residence rules touch other groups only — Israel for Israeli citizens (and recognized refugees there), Japan for Japanese citizens (and refugees and stateless persons there). Recognized refugees and stateless persons take the rules of the country they live in: in the eleven 60-month countries and in Japan the 59-month limit, elsewhere no limit.',
          [{ k: 'a', x: 'the India page', href: INDIA }]
        ),
        h3(
          'When does the 24-month waiting period start — and what happens after you file?'
        ),
        p(
          'Between your last mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia and your application, 24 full calendar months must pass. The clock starts after your last contribution month in any of those places — not with your deregistration and not with the day you left Germany. Last German contribution month March 2024 → earliest application 1 April 2026, the first day of the 25th month. New mandatory insurance in one of the listed places before you apply restarts the count from the month it ends; mandatory insurance anywhere else in the world does not, and for citizens of countries without an agreement the same holds for Switzerland and the EEA states. A month too early and the application is rejected outright; there is no deadline in the other direction, but no interest accrues for the years before you apply.'
        ),
        p(
          'Later events do not undo a valid application: eligibility is judged on the filing date, so moving to Germany or another EU country afterwards leaves the refund intact — the refund closes the old record entirely, and later German work builds new entitlements from new contribution periods. Our waiting-period calculator finds the exact date a claim can first be filed.',
          [{ k: 'a', x: 'waiting-period calculator', href: CALCULATOR }]
        ),
      ],
    },
    {
      id: 'sixty-month-limit',
      label: '60-month limit',
      h2: 'Why the 60-month limit does not apply to you',
      blocks: [
        p(
          "Citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay — Japanese citizens living in Japan — and recognized refugees and stateless persons living in any of those twelve countries can claim a refund before retirement age only with 59 or fewer German contribution months; only German contribution months count toward those 60, and from 60 months these groups have a German pension at retirement age instead. For citizens of every other country there is none: 60, 100 or 200 German months remain refundable once the three conditions hold, and your home country's pension or social-insurance scheme never blocks the refund, never restarts the 24 months, and its periods never count toward any German month total.",
          [
            { k: 'a', x: 'USA', href: '/usa' },
            { k: 'a', x: 'India', href: INDIA },
            { k: 'a', x: 'Canada', href: '/canada' },
            { k: 'a', x: 'Australia', href: '/australia' },
            { k: 'a', x: 'Brazil', href: '/brazil' },
            { k: 'a', x: 'South Korea', href: '/southkorea' },
            { k: 'a', x: 'the Philippines', href: '/thephilippines' },
            { k: 'a', x: 'Albania', href: '/albania' },
            { k: 'a', x: 'Moldova', href: '/moldova' },
            { k: 'a', x: 'North Macedonia', href: '/north-macedonia' },
            { k: 'a', x: 'Uruguay', href: '/uruguay' },
          ]
        ),
        p(
          'A long record changes the decision, not the eligibility. From 60 German contribution months you have also earned a German old-age pension, payable worldwide at retirement age — and a refund is strictly the alternative: once completed, it pays out the whole refundable balance in one sum, ends the old insurance relationship, and the refunded months never become pension months again. Long records can produce large refunds — our retained records include completed refunds of {{M-17.high}}, and the largest in the 2026 calculation was {{M-17.max2026}} — but a lifelong pension can be worth more. Compare before you choose.'
        ),
      ],
    },
    {
      id: 'how-much',
      label: 'How much & tax',
      tone: 'surface',
      h2: 'How much comes back — and refund or pension?',
      blocks: [
        p(
          "The refund returns your employee share: as a rule 100% of the pension contributions withheld from your salary, at {{STAT-2026.employeeRate}} of gross pay since 2018 up to the monthly ceiling (Beitragsbemessungsgrenze) of {{STAT-2026.ceiling2026}} in 2026 (2025: {{STAT-2026.ceiling2025}}). Voluntary and compulsory self-employed contributions are refunded at 50%; the employer's half never leaves the system. Across our retained completed paid cases — all nationalities — the average refund was {{M-04.mean}} and the median {{M-04.median}} (calculated {{M-04.calculatedOn}}). Our refund calculator applies the actual statutory employee contribution rate and monthly ceiling (Beitragsbemessungsgrenze) of every year back to 1975 — including Deutsche-Mark periods and East/West differences — rather than a flat percentage.",
          [{ k: 'a', x: 'refund calculator', href: CALCULATOR }]
        ),
        p(
          'Germany deducts no income tax from the refund; German law exempts pension contribution refunds. Treatment in your country of residence can differ — we do not give tax advice, so check locally. At German retirement age the question changes: with fewer than five years of qualifying periods (allgemeine Wartezeit) — counted together with foreign periods where an agreement or EU law requires it — a refund is possible without any waiting period; with five years or more you have a pension, and although the refund option formally remains open for citizens without a contribution limit, it trades a lifelong pension for a one-time payment. Claims at retirement age need an individual assessment — ask us.'
        ),
        p(
          "If a family member with German contributions has died, close relatives can in some cases claim a refund of those contributions — only where the deceased's record stayed under the five-year qualifying period, and the claim can become time-barred four years after the end of the year of death. Who can claim, in which order, and the survivor's-pension alternative: our German widow's pension guide and the survivors chapter of the complete guide.",
          [
            { k: 'a', x: "German widow's pension guide", href: WIDOW },
            { k: 'a', x: 'complete guide', href: GUIDE },
          ]
        ),
      ],
    },
    {
      id: 'what-we-do',
      label: 'Our service',
      h2: 'What we handle for citizens of other countries',
      blocks: [
        p(
          'A simpler nationality rule does not make the claim simple. Before anything is submitted, we check your eligibility — every citizenship you hold, your residence, your insurance history in Germany and in the countries that matter — and prepare the refund application and payment documents from your details; you provide the information, documents and signatures your claim needs. We obtain and review the relevant DRV account information during the managed process where required, and if your German pension insurance number is missing, we can help identify or recover it.'
        ),
        p(
          "The responsible office is chosen from your record, not guessed. Responsibility follows a hierarchy: DRV Knappschaft-Bahn-See if you were ever insured there; otherwise DRV Bund if it was the last carrier; then any applicable liaison office for your citizenship, then for your residence; otherwise the regional carrier holding the account. The account carrier and deciding office can differ, and DRV may forward the file. We identify the recommended first pension office and coordinate the claim's routing with our German partner law firm, which reviews and submits your application — our guide to the responsible pension office explains the rules and includes the office finder.",
          [
            {
              k: 'a',
              x: 'guide to the responsible pension office',
              href: OFFICE,
            },
          ]
        ),
        p(
          'From then on, we stay with the claim through the decision and payment: pension-office letters for your managed claim are received at a German address, scanned to you and explained in English — if a pension-office letter reaches you directly, forward it promptly so we can take it into account. Known response and objection deadlines are monitored within the agreed scope; after your claim is submitted, you receive an update at least every four weeks, and sooner when there is a material request or development — even when the update is that no new pension-office response has arrived. If a granted refund does not arrive, we follow it up with the pension office and the Renten Service within the managed scope until the payment is resolved.'
        ),
        p(
          'Most clients can complete their part of the process digitally. Every client must have their identity and signature confirmed using their passport or accepted equivalent; depending on the route, confirmation may be completed digitally or by an accepted notary or public authority, and any local notary or certification cost is borne by the client. When DRV Oldenburg-Bremen is responsible for your refund, we prepare your power of attorney and payment declaration and ask you to send the signed originals to us.'
        ),
      ],
    },
    {
      id: 'getting-paid',
      label: 'Price & payment',
      tone: 'surface',
      h2: 'Price, timing and payment',
      blocks: [
        p(
          "Price. Our service fee is 9.75% of the amount recovered, capped at €2,500 including VAT — no upfront service fee, no minimum fee. No refund, no service fee. The fee covers the agreed managed administrative scope, including our partner law firm's support within that scope; we do not provide legal services, advice or representation, and separate representation in an objection, appeal or court proceeding is not included automatically. German deregistration assistance is available as an optional €50 add-on, including VAT.",
          [
            { k: 'b', x: 'Price.' },
            { k: 'a', x: '9.75% of the amount recovered', href: '/pricing' },
          ]
        ),
        p(
          'Timing. {{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission — see the full data and methodology. Individual processing times vary; the responsible pension office sets the pace. German law can provide 4% annual interest from the seventh calendar month after a complete application reaches a German pension carrier.',
          [
            { k: 'b', x: 'Timing.' },
            {
              k: 'a',
              x: 'see the full data and methodology',
              href: PROCESSING_TIME,
            },
          ]
        ),
        p(
          'Payment. A German bank account is not required. For claims we manage, the refund is paid through the escrow account operated by our German partner law firm; after the agreed fee is deducted, the remaining balance is transferred to the bank account you nominate. A third-party account can be used where the required account-holder declaration and compliance checks are satisfied. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent. If transfers to your country are prohibited or unavailable, your eligibility is unaffected, but the refund must go to a usable account elsewhere that passes the account-holder checks; which routes are open is checked against current banking conditions shortly before the transfer, and we cannot promise a particular local bank or currency.',
          [{ k: 'b', x: 'Payment.' }]
        ),
      ],
    },
    {
      id: 'applying-yourself',
      label: 'Applying yourself',
      h2: 'Applying yourself, official basis, and who we are',
      blocks: [
        p(
          'You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee. From outside Germany the official route is paper: form V0901 goes by post, because ordinary email is not accepted for identity reasons and fax is no longer available. In a self-filed claim, the official application form provides for your personal data to be certified on the form itself — so the application travels to the certifying body. In a managed claim, the analog step is a single page we prepare for you. Our V0901 guide walks through the form section by section; the pension-office guide tells you where to send it.',
          [
            { k: 'a', x: 'V0901 guide', href: V0901 },
            { k: 'a', x: 'pension-office guide', href: OFFICE },
          ]
        ),
        p(
          'Official basis (Deutsche Rentenversicherung pages in German unless marked): Section 210 SGB VI · DRV FAQ: refund of German pension contributions · DRV brochure: work and pensions in Germany and in countries without an agreement · DRV liaison offices by country · Form V0901, German/English edition',
          [
            { k: 'a', x: 'Section 210 SGB VI', href: SGB_210 },
            {
              k: 'a',
              x: 'DRV FAQ: refund of German pension contributions',
              href: DRV_FAQ,
            },
            {
              k: 'a',
              x: 'DRV brochure: work and pensions in Germany and in countries without an agreement',
              href: DRV_BROCHURE,
            },
            { k: 'a', x: 'DRV liaison offices by country', href: DRV_LIAISON },
            {
              k: 'a',
              x: 'Form V0901, German/English edition',
              href: DRV_V0901,
            },
          ]
        ),
        p(
          'Every other rule — month counting, survivors, retirement age, the objection procedure — is in the complete 2026 guide. Our eligibility check walks through citizenship, residence and the 60-month and 24-month rules — a preliminary indication in under a minute.',
          [
            { k: 'a', x: 'the complete 2026 guide', href: GUIDE },
            { k: 'a', x: 'eligibility check', href: CALCULATOR },
          ]
        ),
      ],
    },
  ],
  faqAfter: 'getting-paid',
  reviews: {
    after: 'faq',
    label: 'Reviews',
    h2: "Recent Reviews from Other Countries' Clients",
    intro: p(
      'Here are the latest 10 reviews from clients who successfully reclaimed their German pension contributions through us. Read more verified reviews on Trustpilot.',
      [{ k: 'a', x: 'Trustpilot', href: EXTERNAL.trustpilot }]
    ),
    items: [
      {
        name: 'Jing Hou',
        date: 'AUG/28/2026',
        title: 'Pleasant experience with the',
        text: 'Pleasant experience with the trustworthy service and easy communications with the professional. Highly recommend it.',
      },
      {
        name: 'Ghazaal Sheikhi',
        date: 'AUG/07/2026',
        title: 'Highly recommended',
        text: 'From start to finish, the process was straightforward thanks to their support and efforts. Julia is skilled, knowledgeable, and responsive, and I always felt well looked after. Highly recommended.',
      },
      {
        name: 'Naima Elbajjaj',
        date: 'JUN/07/2026',
        title: 'very satisfied',
        text: 'I had a very good experience with the German Pension Refund . The team was professional, responsive, and Johannes was always helpful whenever I had questions about my German pension refund application. The process took around 6 months, but I know and understand that this is due to the government processing time and not the company itself. Throughout the process, Johannes kept me informed and guided me whenever needed. I would definitely recommend their service and to anyone applying for a German pension refund.',
      },
      {
        name: 'Laksita Gayuhaningtyas',
        date: 'AUG/20/2026',
        title: 'Very professional',
        text: 'Christian is very professional and actively following up on any issues/unresponsiveness from the related counter party.',
      },
      {
        name: 'Deepak Jena',
        date: 'JUL/28/2026',
        title: 'Excellent service, transparent communication, no hassels',
        text: 'They have been transparent and responsive. I received my refund in the timelines shared initially. Excellent service.',
      },
      {
        name: 'Elouise',
        date: 'MAY/29/2026',
        title:
          'Supper,fantastic, wow and to the team especially Anna, thanks a mill again, greetings from south Africa',
        text: 'Contact and update regularly Communication excellence. Can only recommend, thanks Team 🇩🇪 especially Anna',
      },
      {
        name: 'Ashraf Kasem',
        date: 'AUG/16/2026',
        title: 'Its seamless',
        text: 'its seamless, not hassles, everything was clear since day 1. Actions are taken immediately, and i was aware of the process end-to-end with timeline. I got the refund in less than one month period. Highly recommended.',
      },
      {
        name: 'Walid Hamza',
        date: 'JUN/21/2026',
        title: 'Amazing service',
        text: 'Amazing Service!',
      },
      {
        name: 'Costa',
        title: 'Outstanding Service',
        text: 'Johannes and his team have been very polite and professional since our first chat. He has set the correct expectations and after a couple of months my wife and me got the refund with the right amount. 100% recommended.',
      },
      {
        name: 'Manuel Marquez',
        date: 'JUN/16/2026',
        title: 'It was a totally hands-off experience',
        text: 'It was a totally hands-off experience, they were able to deal with al the beuaurocracy for me.',
      },
    ],
  },
  faqH2: 'Frequently asked questions',
  faq: [
    {
      q: 'My country is not on your list — can I still claim a German pension refund?',
      a: 'Yes. If none of the country-specific nationality rules applies to you — and you are not a German, EU, EEA, Swiss or UK citizen — plain German law applies: no contribution-month limit and no additional citizenship rule. You qualify when you live outside the EU, the UK and India and 24 full calendar months have passed since your last mandatory pension insurance in Germany, the EU, the UK, Türkiye or an ex-Yugoslav state.',
    },
    {
      q: 'I have 60 German months or more — is the refund gone?',
      a: 'No. The 60-month limit applies only to citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay, to Japanese citizens living in Japan, and to recognized refugees and stateless persons living in any of those twelve countries. For citizens of every other country there is no limit — but with 60 months or more you have also earned a German pension at retirement age, so the refund becomes a choice: a completed refund pays out the whole refundable balance and dissolves that entitlement.',
    },
    {
      q: 'Do the pension contributions I pay in my home country block or delay the refund?',
      a: "No. Your home country's pension or social-insurance scheme never blocks the refund, never restarts the 24 months, and its periods never count toward any German month total. The only foreign insurance that affects the German claim is mandatory pension insurance in the EU, the UK, Türkiye or an ex-Yugoslav state.",
    },
    {
      q: 'Which German pension office is responsible if my country has no liaison office?',
      a: 'Responsibility follows a hierarchy: DRV Knappschaft-Bahn-See if you were ever insured there; otherwise DRV Bund if it was the last carrier; then any applicable liaison office for your citizenship, then for your residence; otherwise the regional carrier holding the account. The account carrier and deciding office can differ, and DRV may forward the file. In a managed claim we identify the recommended first office from your record, and our German partner law firm files the claim there.',
    },
    {
      q: 'Can the refund be paid if my country is under sanctions or banking restrictions?',
      a: 'Your eligibility is unaffected, but the money must go to a usable account elsewhere that passes the account-holder checks. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent; the open route is checked shortly before the transfer.',
    },
  ] as FaqItem[],
  closeH2: 'Ready to claim?',
  close: [
    p('Starting your claim takes less than one minute — start here →', [
      { k: 'a', x: 'start here →', href: FUNNEL_ENTRY },
    ]),
  ],
  closeCta: { label: 'Check my eligibility', href: FUNNEL_ENTRY },
  disclaimer:
    'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. The service is operated by ATLAES GmbH, Berlin.',
  schema: {
    serviceName: 'German Pension Refund Rules for Citizens of Other Countries',
    audienceType:
      'Citizens of countries without a country-specific German refund rule who contributed to the German pension system',
    description:
      'Managed handling of German state pension contribution refunds for citizens of countries not covered by a country-specific nationality rule — no contribution-month limit applies to them once the general conditions hold. No upfront service fee and no minimum fee — the service fee is 9.75% of the amount recovered, capped at €2,500 including VAT, within the agreed managed administrative scope. {{M-04.sentence.schema}}',
  },
};
