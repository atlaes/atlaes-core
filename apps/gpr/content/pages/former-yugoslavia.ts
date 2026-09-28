/**
 * /former-yugoslavia copy — verbatim from the GPR Figma frame "Former
 * Yugoslavia (combined) — /former-yugoslavia" (917:5629, live www page
 * 14 Sep 2026); the six collapsed FAQ answers come from that live page.
 * Section ids `bosnia-herzegovina`, `kosovo`, `montenegro`, `serbia` are the
 * 301 targets of the four old slugs. Quarterly figures are token references.
 */
import type { Block, FaqItem, Span } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import type { RulesPageData } from './types';

const GUIDE = '/post/how-to-get-a-german-pension-refund';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const CALCULATOR = '/refund-calculator';
const SSN = '/post/german-social-security-number';
const OFFICE = '/post/which-german-pension-office-handles-your-claim';
const V0901 = '/v0901-pension-refund-form-english';
const WIDOW = '/post/german-widow-pension';
const NORTH_MACEDONIA = '/north-macedonia';

const p = (x: string, sp?: Span[]): Block =>
  sp ? { t: 'p', x, sp } : { t: 'p', x };
const h3 = (x: string): Block => ({ t: 'h3', x });

export const FORMER_YUGOSLAVIA: RulesPageData = {
  path: '/former-yugoslavia',
  title: 'German Pension Refund: Bosnia, Kosovo, Montenegro, Serbia',
  meta: 'No month limit for Bosnian, Kosovar, Montenegrin and Serbian citizens — residence rule, waiting period, Trust/KPST and second citizenships explained.',
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'Rules by country', href: '/other-countries' },
    { label: 'Former Yugoslavia', href: '/former-yugoslavia' },
  ],
  eyebrow: 'Country guide · Four states, one rule set',
  h1: '🇧🇦 🇽🇰 🇲🇪 🇷🇸 German Pension Refund for Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia',
  hero: [
    p(
      'Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia share the same German refund rules, so they share this page — four states of the former Yugoslavia, one rule set. There is no limit on contribution months: one German year or twenty, the whole refundable balance of your employee share is claimable. What the rules ask instead is an address and a date — you live outside the EU, the UK, India and all four of these states, not only your own, and 24 full calendar months have passed since your last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye or one of the ex-Yugoslav states listed below. A second citizenship you hold can add restrictions. Living in one of the four right now loses you nothing: the entitlement waits for the move.'
    ),
    p(
      'Jump to your country:  Bosnia and Herzegovina  ·  Kosovo  ·  Montenegro  ·  Serbia  —  or read the shared rules first.',
      [
        { k: 'a', x: 'Bosnia and Herzegovina', href: '#bosnia-herzegovina' },
        { k: 'a', x: 'Kosovo', href: '#kosovo' },
        { k: 'a', x: 'Montenegro', href: '#montenegro' },
        { k: 'a', x: 'Serbia', href: '#serbia' },
        { k: 'a', x: 'read the shared rules first', href: '#do-i-qualify' },
      ]
    ),
  ],
  cta: { label: 'Claim Your Refund Today', href: FUNNEL_ENTRY },
  glanceLabel: 'At a glance',
  trust: '{{M-15.sentence}}',
  bullets: [
    'No contribution-month limit for citizens of the four states — the route opens once you live outside the EU, the UK, India and the four states and the waiting period has run',
    'Refunds averaged {{M-04.meanRounded}} across our retained completed paid cases; on record from {{M-17.range}}',
    'More than three quarters of our {{TM-01.population}} reached escrow {{TM-01.window}}',
    'No German bank account required',
    'No refund, no service fee',
  ],
  jump: [
    { href: '#do-i-qualify', label: 'Who qualifies' },
    { href: '#what-we-do', label: 'What we do' },
    { href: '#bosnia-herzegovina', label: 'Bosnia and Herzegovina' },
    { href: '#kosovo', label: 'Kosovo' },
    { href: '#montenegro', label: 'Montenegro' },
    { href: '#serbia', label: 'Serbia' },
    { href: '#getting-paid', label: 'Getting paid' },
    { href: '#faq', label: 'FAQ' },
  ],
  sections: [
    {
      id: 'do-i-qualify',
      label: 'Who qualifies',
      h2: 'Who qualifies — the shared rules, in brief',
      blocks: [
        p(
          'Three checks decide a German pension refund on the day the application is filed: the citizenships you hold, your address, and a 24-month wait counted from your last contribution month.'
        ),
        h3(
          'Citizenship — no contribution-month limit, but every passport counts'
        ),
        p(
          'The 60-month limit that applies to citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay — for whom only German contribution months count toward the 60 — does not exist for citizens of Bosnia and Herzegovina, Kosovo, Montenegro or Serbia; from 60 months a citizen of the four states also has the alternative of a German pension at retirement age (one or the other).'
        ),
        p(
          'Every citizenship you hold counts, used or not, and every restriction attached to any of them applies. A German, EU, EEA, Swiss or British citizenship beside your own means no refund before German retirement age — apart from one narrow exception: people who became exempt from mandatory German insurance as civil servants or in a similar status can reclaim their earlier contributions if the five-year qualifying period is not met, as the complete guide explains. Croatia and Slovenia are EU members, so those citizenships block in exactly that way. A second citizenship from the 60-month group brings its limit with it — a Kosovar citizen who also holds Albanian citizenship carries Albania’s 60-month limit, only German contribution months counting. What matters is whether you legally hold the citizenship (some arise automatically by descent): clarify your legal status and tell us about any second citizenship before anything is filed.',
          [{ k: 'a', x: 'the complete guide', href: GUIDE }]
        ),
        h3('Residence — the address rule'),
        p(
          'German law refuses a refund to anyone who holds the right to pay voluntary German pension contributions, used or not. Living in the EU or the UK preserves that right for everyone; for citizens of the four states, the social security agreement that applies to them preserves it while they live in any of the four — whichever one they are a citizen of. So the refund opens only once you live outside the EU (Croatia and Slovenia included), the UK, India and all four states: a Serbian citizen in Montenegro is blocked exactly like one at home, a Bosnian citizen in Austria by the EU rule. Everywhere else the address check is passed — Switzerland, Norway, Iceland and Liechtenstein included, and the USA, Canada, Australia and every other country except India, whose own rule blocks residents of every nationality except Indian citizens. North Macedonia and Türkiye are fine to live in; there only mandatory state pension insurance stands in the way, while it lasts. Living in one of the four today loses you nothing — the entitlement waits for the move.'
        ),
        h3(
          'The 24-month waiting period — counted from the last contribution month'
        ),
        p(
          'Twenty-four full calendar months must have passed since your last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia. The anchor is that last contribution month — the last month of employment or of credited benefits such as unemployment benefit — not the day you deregistered or left Germany; one insured day makes the whole month count; the first day of the 25th month is the earliest filing date (last contribution month March 2024, application from 1 April 2026), and an earlier application is rejected, not held.'
        ),
        p(
          'New mandatory insurance in any listed country restarts the count from the month it ends — so a job under your home state’s pension insurance between Germany and the move abroad does not cost you the German months, it moves the anchor. Illustrative dates, not a client case: German contributions until 2019, Serbian state pension insurance until August 2024, a move to Switzerland that autumn — the 24 months run from the end of August 2024, and the earliest application date is 1 September 2026. Three things never restart the count: mandatory insurance in Switzerland, Norway, Iceland or Liechtenstein; contributions to Kosovo’s mandatory individual pension fund (Trust/KPST), which the German refund rules treat as savings rather than state pension insurance; and insurance anywhere else outside the list, which never blocks either. Eligibility is assessed on the filing date — a move back to Germany, the EU or one of the four states after a validly filed application does not undo it. A first application can wait years without a deadline, but the years before you apply earn no interest. Our waiting-period calculator gives you the exact date.',
          [{ k: 'a', x: 'waiting-period calculator', href: CALCULATOR }]
        ),
      ],
    },
    {
      id: 'what-we-do',
      label: 'Service & fee',
      tone: 'surface',
      h2: 'What we do for you — and what it costs',
      blocks: [
        p(
          'Before anything is filed. You provide your details, documents and signatures; we do the rest of the preparation. We check your eligibility, obtain and review the relevant DRV account information during the managed process where required, prepare your refund application and payment documents, identify the recommended first pension office from your record and coordinate the claim with our German partner law firm, which reviews and submits it. What you need at the start: your passport, your German pension insurance number if you have it (where to find it), your employment dates and employers, your address and your payout account. A missing pension insurance number is something we can help identify or recover, and German deregistration is available as an optional €50 add-on including VAT.',
          [
            { k: 'b', x: 'Before anything is filed.' },
            { k: 'a', x: 'where to find it', href: SSN },
          ]
        ),
        p(
          'While the pension office works. Pension-office letters for your claim are received at a German address, scanned to you and explained in plain English. After submission you receive a status update at least every four weeks, and sooner when something happens — sometimes the update is simply that the office has not answered yet. We keep track of known response and objection deadlines within the agreed scope; if a letter reaches you directly, forward it to us straight away with the date you received it — only deadlines known to us or our partner law firm can be protected.',
          [{ k: 'b', x: 'While the pension office works.' }]
        ),
        p(
          'After the decision. We check the decision for obvious errors and assist with available evidence or a straightforward objection; if legal assessment or formal representation is needed, the matter is referred to the external law firm and handled only after you agree the scope and any separate cost. If an approved refund does not arrive, we follow it up within the managed scope with the pension office and Renten Service until the payment is resolved.',
          [{ k: 'b', x: 'After the decision.' }]
        ),
        p(
          'Our fee is 9.75% of the refunded amount, capped at €2,500 including VAT, with no upfront service fee and no minimum fee. No refund, no service fee. The fee covers the agreed managed administrative scope, including our partner law firm’s support within that scope. We do not provide legal services, advice or representation; separate representation in an objection, appeal or court proceeding is not included automatically. The deregistration add-on is payable with the service fee after your refund reaches escrow.'
        ),
        p(
          '{{TM-01.sentence}} {{M-12.sentence}} Individual processing times vary — see the full data and methodology. Processing and payment dates depend on the responsible pension office and the payment route, so a specific date cannot be guaranteed; the process is designed to avoid preventable delays.',
          [
            {
              k: 'a',
              x: 'see the full data and methodology',
              href: PROCESSING_TIME,
            },
          ]
        ),
      ],
    },
    {
      id: 'sixty-months-or-more',
      label: '60 months or more',
      h2: '60 months or more — refund or pension, never both',
      blocks: [
        p(
          'Because no month limit applies to citizens of the four states, long German records stay fully refundable; from 60 months the same record also earns a German old-age pension at retirement age, payable wherever you then live — the four states included. It is strictly one or the other: a completed refund pays out the entire refundable balance and dissolves the old insurance relationship, so refunded months never become pension months (work in Germany again later and new contributions build a new record) — for a long record, a decision worth weighing before anything is filed; our free eligibility check indicates which route stands open.',
          [{ k: 'a', x: 'free eligibility check', href: FUNNEL_ENTRY }]
        ),
        p(
          'If you never leave the region, the account is still not lost: at German retirement age it either pays a pension, where the five-year qualifying period is met — a test that adds EU, UK and agreement-country insurance periods to the German months — or, where it is not met, the contributions can be refunded then, because voluntary-insurance rights and current mandatory insurance no longer block and there is no waiting period.'
        ),
      ],
    },
    {
      id: 'bosnia-herzegovina',
      label: '🇧🇦 Bosnia and Herzegovina',
      tone: 'surface',
      h2: 'Bosnia and Herzegovina',
      blocks: [
        p(
          'In one sentence: as a citizen of Bosnia and Herzegovina you have no contribution-month limit; the refund opens once you live outside the EU, the UK, India and the four states and the 24-month waiting period has run — and a second citizenship you hold can add restrictions (the shared rules). Living in Bosnia and Herzegovina, Austria, Germany or Croatia? Not available from there — but not lost either: the entitlement waits for the move, and from 60 months a Bosnian citizen’s record also stands ready as a German pension at retirement age, payable in Bosnia and Herzegovina.',
          [
            { k: 'b', x: 'In one sentence:' },
            { k: 'a', x: 'the shared rules', href: '#do-i-qualify' },
          ]
        ),
        p(
          'The Swiss case. Switzerland is not on the blocking list, and Swiss AHV contributions never affect the German claim — they neither block it nor restart the waiting period; the same goes for US Social Security, Canadian CPP or Australian super. What does restart the clock is mandatory state pension insurance in Bosnia and Herzegovina itself: a job there between Germany and Switzerland means the 24 months run from its last contribution month. A Swiss citizenship acquired by naturalisation is a different matter — like a German, EU, EEA or British one, it means no refund before German retirement age.',
          [{ k: 'b', x: 'The Swiss case.' }]
        ),
        p(
          'The Croatian passport. Croatia and Slovenia are EU members: a Croatian or Slovenian citizenship beside the Bosnian one — used or not — means no refund before German retirement age, and the Bosnian citizenship does not restore the route. Tell us before anything is filed.',
          [{ k: 'b', x: 'The Croatian passport.' }]
        ),
      ],
    },
    {
      id: 'kosovo',
      label: '🇽🇰 Kosovo',
      h2: 'Kosovo',
      blocks: [
        p(
          'The Trust/KPST question first. Your contributions to Kosovo’s mandatory individual pension fund (Trust/KPST) are irrelevant to the German claim: for the German refund rules the fund counts as a savings account rather than state pension insurance, so paying into it neither blocks your refund nor restarts the 24-month waiting period. Only mandatory state pension insurance in the listed countries does that — and Trust/KPST is not state pension insurance.',
          [{ k: 'b', x: 'The Trust/KPST question first.' }]
        ),
        p(
          'In one sentence: as a Kosovar citizen you have no contribution-month limit; the refund opens once you live outside the EU, the UK, India and the four states and the waiting period has run — Trust/KPST months never count against you — and a second citizenship you hold can add restrictions. Living in Kosovo today loses you nothing: the entitlement waits for the move, and from 60 months a Kosovar citizen’s record also stands ready as a German pension at retirement age, payable in Kosovo.',
          [{ k: 'b', x: 'In one sentence:' }]
        ),
        p(
          'A second citizenship. A Kosovar citizen who also holds Albanian citizenship carries Albania’s 60-month limit on top of the address rule — a refund before retirement age then needs 59 or fewer German contribution months, only German months counting. A German, EU (Croatia and Slovenia included), EEA, Swiss or British citizenship beside the Kosovar one means no refund before German retirement age. Tell us before anything is filed.',
          [{ k: 'b', x: 'A second citizenship.' }]
        ),
      ],
    },
    {
      id: 'montenegro',
      label: '🇲🇪 Montenegro',
      tone: 'surface',
      h2: 'Montenegro',
      blocks: [
        p(
          'In one sentence: as a Montenegrin citizen you have no contribution-month limit — the 60-month limit of the USA, Canada, Australia and the other countries of the 60-month group, counting only German contribution months, does not apply to you; the refund opens once you live outside the EU, the UK, India and the four states and the 24-month waiting period has run — and a second citizenship you hold can add restrictions. Switzerland, the USA, Canada, Australia and North Macedonia are not on the blocking list; a job under Montenegrin state pension insurance before the move restarts the 24 months from its last month, while Swiss AHV never does.',
          [{ k: 'b', x: 'In one sentence:' }]
        ),
        p(
          'Living in Montenegro today loses you nothing: the entitlement waits, and from 60 months a Montenegrin citizen’s record also stands ready as a German old-age pension at retirement age, payable at home. Which restrictions a second citizenship adds — the no-refund rule of a German, EU, EEA, Swiss or British passport, the 60-month limit of the capped group — is set out in the citizenship rules; tell us before anything is filed.',
          [{ k: 'a', x: 'the citizenship rules', href: '#do-i-qualify' }]
        ),
      ],
    },
    {
      id: 'serbia',
      label: '🇷🇸 Serbia',
      h2: 'Serbia',
      blocks: [
        p(
          'No 60-month cap — the difference from an American or Canadian claim. The 60-month limit that stops the claim of a US, Canadian or Australian citizen — or of any citizen of the 60-month group — at five years, counting only German contribution months, does not exist for Serbian citizens: with many years of German contributions, the full refund of your employee share stays claimable once you live outside the EU, the UK, India and the four states and the 24-month waiting period has run — and a second citizenship you hold can add restrictions. Which ones — the no-refund rule of a German, EU (Croatia and Slovenia included), EEA, Swiss or British passport, the 60-month limit of the capped group — is set out in the citizenship rules; tell us before anything is filed. With 60 or more months a Serbian citizen also has the alternative of a German pension at retirement age, strictly an alternative.',
          [
            {
              k: 'b',
              x: 'No 60-month cap — the difference from an American or Canadian claim.',
            },
            { k: 'a', x: 'the citizenship rules', href: '#do-i-qualify' },
          ]
        ),
        p(
          'Why your place of residence matters. While living in the EU, the UK or any of the four states, a Serbian citizen keeps the right to pay voluntary German contributions — in the EU and the UK like everyone, in the four states under the social security agreement that applies to Serbian citizens — and German law refuses a refund to anyone who holds that right. Move outside those places and India — to Switzerland, the USA, Canada or Australia, say — and the right lapses; 24 months after your last month of mandatory insurance in Germany, the EU, the UK, Türkiye or the ex-Yugoslav states, the refund door opens.',
          [{ k: 'b', x: 'Why your place of residence matters.' }]
        ),
        p(
          'The clock and Serbian insurance. Years under Serbian state pension insurance before your move are not lost time — they move the anchor: German contributions until 2019, Serbian mandatory insurance until August 2024 and a move to Switzerland that autumn mean an earliest application date of 1 September 2026 (illustrative dates, not a client case).',
          [{ k: 'b', x: 'The clock and Serbian insurance.' }]
        ),
      ],
    },
    {
      id: 'living-in-the-four-states',
      label: 'Living in the four states',
      tone: 'surface',
      h2: 'Living in one of the four states with a citizenship from outside the four?',
      blocks: [
        p(
          'The residence rule binds citizens of the four states in all four, not only their own. With a citizenship from outside the four — and none from within them — living in Bosnia and Herzegovina, Kosovo, Montenegro or Serbia is fine; what can block you there is mandatory state pension insurance — while it lasts — and it restarts the 24-month waiting period from the month it ends (Kosovo’s Trust/KPST fund does neither). Once it stops, your own citizenship’s rules apply: no contribution-month limit for most nationalities; the 60-month limit — counting only German contribution months — for citizens of the USA, India, Canada, Australia and the other countries of the 60-month group; no refund before German retirement age for German, EU, EEA, Swiss and British citizens.'
        ),
      ],
    },
    {
      id: 'north-macedonia',
      label: 'North Macedonia',
      h2: 'North Macedonia is on a different page — here is why',
      blocks: [
        p(
          'North Macedonian citizens follow a different rule set and have their own page: a 60-month limit applies to them — only German contribution months count toward it — living in North Macedonia does not block them, mandatory pension insurance there pauses the claim while it lasts and restarts the 24 months, and a voluntary German contribution paid from abroad for a period between September 1969 and December 2004 can close the lump-sum route for them regardless of months. For citizens of the four states, North Macedonia matters in two ways only: living there does not block you; mandatory state pension insurance there does, while it lasts, and restarts the 24 months.',
          [{ k: 'a', x: 'their own page', href: NORTH_MACEDONIA }]
        ),
      ],
    },
    {
      id: 'how-much',
      label: 'How much & tax',
      tone: 'surface',
      h2: 'How much comes back — and what about tax?',
      blocks: [
        p(
          'The refund is your own share of the contributions — {{STAT-2026.employeeRate}} of gross pay since 2018, charged up to the monthly ceiling (Beitragsbemessungsgrenze: {{STAT-2026.ceiling2026}} in 2026, {{STAT-2026.ceiling2025}} in 2025) — and normally the whole of it: 100% of the mandatory contributions deducted from your German salary, and 50% of voluntary contributions and of the compulsory contributions of self-employed people. The employer’s share stays in the system, and pay above the ceiling was never insured. Two rules change that sum: for months in employment covered by the Übergangsbereich rules for the relevant year (in 2026, regular pay between {{STAT-2026.uebergangsbereichLow}} and {{STAT-2026.uebergangsbereichHigh}} a month) the law fixes the refund at half of the total pension contributions paid for them — neither {{STAT-2026.employeeRate}} of gross pay nor the amount deducted from you is the right sum for those months; and where Deutsche Rentenversicherung once funded a benefit for you — a rehabilitation programme, say — only the contributions paid after it are refundable, while the completed refund still closes the whole record. Both are checked before anything is filed. The legal basis is § 210 SGB VI.'
        ),
        p(
          '{{M-04.sentence}} Our refund calculator applies the actual statutory employee contribution rate and monthly ceiling (Beitragsbemessungsgrenze) of every year back to 1975 — including Deutsche-Mark periods and East/West differences — rather than a flat percentage.',
          [{ k: 'a', x: 'refund calculator', href: CALCULATOR }]
        ),
        p(
          'On the German side the refund is paid out without income tax; German law exempts pension contribution refunds. Treatment in your country of residence can differ — a question for a local adviser. We do not provide individual tax, pension or legal advice.'
        ),
      ],
    },
    {
      id: 'which-office',
      label: 'Which office',
      h2: 'Which German pension office handles the claim?',
      blocks: [
        p(
          'For citizens of the four states the liaison office in the German system is DRV Bayern Süd — but it is third in line: DRV Knappschaft-Bahn-See handles the claim if you were ever insured there, otherwise DRV Bund if it was the last office holding your account, and only then the liaison office for your citizenship. The account carrier and the deciding office can differ; a claim that lands at the wrong office keeps its filing date but loses weeks in the forwarding. The rules and our office finder are in our guide to the responsible pension office; in a managed claim, our German partner law firm files the claim with the recommended office we identify from your record.',
          [
            {
              k: 'a',
              x: 'our guide to the responsible pension office',
              href: OFFICE,
            },
          ]
        ),
      ],
    },
    {
      id: 'getting-paid',
      label: 'Getting paid',
      tone: 'surface',
      h2: 'Getting paid — in Switzerland, the USA or wherever you live',
      blocks: [
        p(
          'No German bank account is required. In a claim we manage, your refund is paid through the escrow account operated by our German partner law firm; after the agreed service fee is deducted, the remaining balance is transferred to the bank account you nominate — a third-party account can be used where the required account-holder declaration and compliance checks are satisfied. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent, so the route is checked shortly before the money moves.'
        ),
      ],
    },
    {
      id: 'certified-signatures',
      label: 'Digital or paper',
      h2: 'Digital for most clients — and the paper route if you apply yourself',
      blocks: [
        p(
          'Most clients can complete their entire part of the process digitally: you submit your details and sign online. Every client has their identity and signature confirmed using their passport or an accepted equivalent; depending on the route, that confirmation can be completed digitally or by an accepted notary or public authority, and any local notary or certification cost is borne by the client. When DRV Oldenburg-Bremen is responsible for your refund, we prepare your power of attorney and payment declaration and ask you to send us the signed originals — a limited exception rather than the rule.'
        ),
        p(
          'You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee. From outside Germany that route is paper: form V0901 travels by post, because ordinary email is not accepted for identity reasons and fax is no longer available. In a self-filed claim, the official application form provides for your personal data to be certified on the form itself — so the application travels to the certifying body. In a managed claim, the analog step is a single page we prepare for you. Our V0901 guide walks through the form section by section, and the pension-office guide tells you where to send it.',
          [
            { k: 'a', x: 'V0901 guide', href: V0901 },
            { k: 'a', x: 'pension-office guide', href: OFFICE },
          ]
        ),
      ],
    },
    {
      id: 'survivors',
      label: 'Survivors',
      tone: 'surface',
      h2: 'A family member’s German contributions',
      blocks: [
        p(
          'Where a spouse, registered partner or parent has died with German contributions on record, the closest family — the surviving spouse or registered partner and, in the cases the law provides for, the children — can be entitled to a refund of those contributions where no German survivor’s pension is payable because the deceased had not met the five-year qualifying period (allgemeine Wartezeit), a test that adds EU, UK and agreement-country insurance periods to the German months and treats the period as met in special cases the law provides for. Survivors need not wait 24 months, but their claim can become time-barred four years after the end of the year of death; where the qualifying period was met, a German survivor’s pension may be payable instead — worldwide. Our German widow’s pension guide and the survivors chapter of the complete guide explain who can claim, in which order and with what evidence.',
          [
            { k: 'a', x: 'German widow’s pension guide', href: WIDOW },
            { k: 'a', x: 'the complete guide', href: GUIDE },
          ]
        ),
      ],
    },
  ],
  faqH2: 'Frequently Asked Questions',
  faq: [
    {
      q: 'Can I get the refund while living in Bosnia and Herzegovina, Kosovo, Montenegro or Serbia?',
      a: 'Not from there — but the entitlement waits. Citizens of the four states can claim once they live outside the EU, the UK, India and all four states and 24 full calendar months have passed since their last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia; Switzerland, the USA, Canada, Australia and North Macedonia are not on the blocking list. If you stay, nothing is lost: with 60 months or more a citizen of the four states has a German pension at retirement age, payable at home; below that the contributions wait, and at German retirement age they can still be refunded if the five-year qualifying period — counting EU, UK and agreement-country periods too — is not met.',
    },
    {
      q: 'Is there a 60-month limit for citizens of Bosnia and Herzegovina, Kosovo, Montenegro or Serbia?',
      a: "No — the 60-month limit applies to citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay, and only German contribution months count toward it. Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia have no contribution-month limit once the residence and waiting-period conditions are met — unless a second citizenship they hold adds a restriction, such as Albania's 60-month limit or the no-refund rule for German, EU, EEA, Swiss and British citizens. From 60 months these citizens also have the alternative of a German pension at retirement age; a completed refund dissolves the old insurance relationship, so it is strictly one or the other.",
    },
    {
      q: 'Do Trust/KPST contributions in Kosovo block or delay the German refund?',
      a: "No. Kosovo's mandatory individual pension fund (Trust/KPST) counts as a savings account rather than state pension insurance — paying into it neither blocks the German refund nor restarts the 24-month waiting period. Living in Kosovo is a separate matter: a Kosovar citizen's refund waits until they live outside the EU, the UK, India and the four states; a citizen of a country outside the four living in Kosovo is not blocked by the Trust/KPST fund at all.",
    },
    {
      q: 'I live in Switzerland — am I eligible?',
      a: "Yes, as far as the address is concerned: Switzerland is not on the blocking list for citizens of the four states, and Swiss AHV contributions never block the German claim or restart the 24-month waiting period — the same is true of Norway, Iceland and Liechtenstein. The waiting period still has to have run since your last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye or the ex-Yugoslav states, including a job under your home state's pension insurance before the move. A Swiss citizenship you have acquired is a different matter: like a German, EU, EEA or British one, it means no refund before German retirement age — tell us before anything is filed.",
    },
    {
      q: 'I also hold a Croatian, Slovenian or other EU passport — does that change anything?',
      a: "Yes — it decides the case. Every citizenship you hold counts, used or not: a German, EU, EEA, Swiss or British citizenship means no refund before German retirement age — apart from one narrow exception: people who became exempt from mandatory German insurance as civil servants or in a similar status can reclaim their earlier contributions if the five-year qualifying period is not met — and Croatia and Slovenia are EU members. A second citizenship from the 60-month group, Albanian for example, brings that limit with it on top of your other citizenship's rules: 59 or fewer German contribution months, only German months counting. What matters is whether you legally hold the citizenship (some arise automatically by descent): clarify your legal status and tell us before anything is filed.",
    },
    {
      q: 'Does living in North Macedonia block me?',
      a: 'No. For citizens of the four states, living in North Macedonia is not a block — the residence rule covers the EU, the UK, India and the four states only. Mandatory state pension insurance in North Macedonia is different: it blocks the claim while it lasts and restarts the 24-month waiting period from the month it ends. North Macedonian citizens follow a different rule set, explained on our North Macedonia page.',
    },
    {
      q: 'Can I return to Germany or the EU after applying?',
      a: 'Yes. Eligibility is assessed on the day the application is filed: a validly filed application is not undone by a move back to Germany, the EU or one of the four states the next day, or by a new job there. Work in Germany again later and new contributions build a new record; the refunded months themselves no longer count for anything.',
    },
  ] as FaqItem[],
  closeH2: 'Ready to claim?',
  close: [
    p(
      'For the eligibility tables, month counting, survivors, retirement age, forms and objections in full, read the complete 2026 guide. Our eligibility check walks through citizenship, residence and the 60-month and 24-month rules — a preliminary indication in under a minute.',
      [
        { k: 'a', x: 'the complete 2026 guide', href: GUIDE },
        { k: 'a', x: 'eligibility check', href: FUNNEL_ENTRY },
      ]
    ),
  ],
  closeCta: { label: 'Check my eligibility', href: FUNNEL_ENTRY },
  disclaimer:
    'Germany Pension Refund is a private service operated by ATLAES GmbH, Berlin. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may also apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
  schema: {
    serviceName:
      'German Pension Refund for Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia',
    audienceType:
      'Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia who contributed to the German pension system',
    description:
      'Managed handling of German state pension contribution refunds for citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia, who face no contribution-month limit (a second citizenship can add restrictions) — the refund opens once they live outside the EU, the UK, India and the four states, 24 months after their last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia. No upfront service fee and no minimum fee — the service fee is 9.75% of the refund, capped at €2,500 including VAT, within the agreed managed administrative scope. {{M-04.sentence.schema}}',
  },
};
