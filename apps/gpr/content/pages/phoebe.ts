/**
 * /phoebe copy — verbatim from GPR_Phoebe_Partner_Landing_Content_Handoff
 * _2026-09-17.md (PAGE COPY block; [build]/[component] brackets stripped).
 * noindex,follow creator landing, no structured data. Quarterly figures are
 * token references (Appendix A of the handoff).
 */
import type { Block, FaqItem, Span } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import type { RichFaqItem } from '@/components/marketing/home/RichFaq';

export const PATH = '/phoebe';

const GUIDE = '/post/how-to-get-a-german-pension-refund';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const PRICING = '/pricing';
const SSN = '/post/german-social-security-number';
const V0901 = '/v0901-pension-refund-form-english';
const OFFICE = '/post/which-german-pension-office-handles-your-claim';
const BAV = '/post/cash-out-german-company-pension-bav';
const PROVEN_EXPERT = 'https://www.provenexpert.com/germany-pension-refund/';

/** CTA target: funnel entry with the creator UTMs (handoff, Attribution). */
export const PHOEBE_CTA_HREF =
  FUNNEL_ENTRY +
  '?utm_source=youtube&utm_medium=influencer&utm_campaign=phoebe';

const p = (x: string, sp?: Span[]): Block =>
  sp ? { t: 'p', x, sp } : { t: 'p', x };

export const PHOEBE_META = {
  title: "German Pension Refund for Phoebe's Viewers",
  description:
    "From Phoebe's video? Check if you qualify for a German pension refund and estimate your amount in under a minute — rules explained for African citizens.",
};

export const PHOEBE_HERO = {
  h1: "Watched Phoebe's video? Check your German pension refund here",
  intro: [
    p(
      "You paid into the German state pension while you worked in Germany — as a nurse or care trainee, an engineer, a student with a job on the side, or in any other insured job. If you have left Germany, or you are about to, what was withheld from your pay for that pension can come back to you as one payment. This page puts the rules from Phoebe's video in writing, says what each of them means for citizens of African countries, and lets you check your own case in under a minute."
    ),
    p(
      'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
      [
        {
          k: 'b',
          x: 'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
        },
      ]
    ),
    p(
      'Who we are, in two sentences: Germany Pension Refund is a private Berlin service that has handled German pension contribution refunds since 2015; it is operated by ATLAES GmbH, Berlin. Our current retained records document more than {{M-14.amount}} recovered for clients since {{M-14.since}}.'
    ),
    p(
      'Phoebe is an approved affiliate partner: she links to us, and we pay her for that. She does not see or handle your claim, and our fee is the same whether you arrive through her video or any other way.'
    ),
  ] as Block[],
};

export const PHOEBE_STEP1 = {
  label: 'Step 1',
  h2: 'Step 1 — check whether you qualify, and what you could get back',
  after:
    'The check applies the rules below to your answers and gives a preliminary indication, not an individual decision — edge cases get individual review. Still in Germany, or only recently left? Run it anyway: it tells you the earliest date a claim can be filed, and you can sign up before then so that your claim is prepared now and filed on the first possible date. The estimate is only as good as the income figures you enter — the final amount always comes from your official insurance record.',
};

export interface PhoebeSection {
  id: string;
  label: string;
  h2: string;
  blocks: Block[];
}

export const PHOEBE_SECTIONS: PhoebeSection[] = [
  {
    id: 'the-three-rules',
    label: 'The three rules',
    h2: 'The three rules — and what they mean for African citizens',
    blocks: [
      p(
        'Before German retirement age, three conditions must all hold on the day the application is filed. None of them asks how long you worked in Germany.'
      ),
      {
        t: 'h3',
        x: '1. Citizenship — no German, EU, EEA, Swiss or British passport',
      },
      p(
        'The rule: you are not a citizen of Germany, an EU or EEA country, Switzerland or the UK. Every citizenship you hold counts — one blocking passport blocks, even if you have never used it.',
        [{ k: 'b', x: 'The rule:' }]
      ),
      p(
        'What it means for you: a Nigerian, Ghanaian, Kenyan, South African, Cameroonian, Ethiopian, Egyptian, Moroccan or any other African passport passes this check on its own. What can fail it is a second citizenship. A British passport, or a French, Portuguese, Italian or other EU one — by naturalisation, by birth abroad or through a parent — blocks the refund before retirement age on its own, and so does a German naturalisation, even now that Germany no longer requires you to give up your previous citizenship (since June 2024). One narrow exception exists for people who left mandatory German insurance as civil servants or in a similar status — the complete guide explains it. A second passport from one of the eleven 60-month countries — American or Canadian, say — does not block, but it brings that limit with it (more below). If a naturalisation is in progress anywhere, tell us before anything is filed: only the citizenships you actually hold on the filing date count, and a pending application is not yet a citizenship.',
        [
          { k: 'b', x: 'What it means for you:' },
          { k: 'a', x: 'complete guide', href: GUIDE },
        ]
      ),
      {
        t: 'h3',
        x: '2. Residence — outside the EU and the UK on the filing date',
      },
      p(
        'The rule: you live outside the EU and the UK when the claim is filed. Norway, Iceland, Liechtenstein and Switzerland are fine as countries of residence. One address outside Europe fails too: India, where an agreement gives anyone with a single German contribution month a right to voluntary German insurance — that closes the refund for everyone living there except Indian citizens.',
        [{ k: 'b', x: 'The rule:' }]
      ),
      p(
        'What it means for you: Lagos, Accra, Nairobi, Johannesburg, Addis Ababa, Cairo, Casablanca — and Dubai, Doha, Toronto or Houston — all pass. If your next stop after Germany was London, Manchester or Dublin, the refund is on hold for as long as you live there; it opens again once your home is outside the EU and the UK — and, if you worked there, 24 full months after your last UK or EU insurance month (rule 3). A visit to Germany or the EU is not a problem — living there is.',
        [{ k: 'b', x: 'What it means for you:' }]
      ),
      {
        t: 'h3',
        x: '3. The 24-month wait — counted from your last contribution month',
      },
      p(
        'The rule: 24 full calendar months must have passed since your last month of mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia. The claim can be filed from the 1st of the 25th month. Filed earlier, it is rejected rather than parked.',
        [{ k: 'b', x: 'The rule:' }]
      ),
      p(
        'What it means for you: the clock starts with your last German contribution month — not with your Abmeldung, not with your flight home, not with the end of your residence permit. A job in Nigeria, Ghana, Kenya, South Africa, Egypt or the Gulf leaves the clock alone. A job with mandatory pension insurance in the UK or an EU country restarts it from the month that job ends. Last German contribution month March 2025 → earliest filing date 1 April 2027. There is no deadline for applying for your own contributions; what you lose by waiting is interest, because none accrues for the years before you apply.',
        [{ k: 'b', x: 'What it means for you:' }]
      ),
    ],
  },
  {
    id: 'the-60-month-limit',
    label: '60-month limit',
    h2: 'The 60-month limit that does not apply to you',
    blocks: [
      p(
        'Much of what circulates online about "fewer than five years" is written for other nationalities. The 60-month limit binds citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay — and Japanese citizens, recognized refugees and stateless persons living in Japan — who can claim a refund before retirement age only with 59 or fewer German contribution months. No African country is on that list. Those limits are a by-product of social security agreements that give those citizens a right to voluntary German insurance. The only African countries with a German social security agreement at all are Morocco and Tunisia — and those agreements grant no such right and put no limit on refunds. So for African citizens the number of months makes no difference to whether you qualify: 15 months or 150, the whole refundable balance comes back once the three checks above are passed. Two footnotes for readers who fit them: hold a passport of one of the eleven countries as well — American or Canadian, say — and its limit binds you; live in one of the eleven as a recognized refugee or stateless person and you are treated like its citizen.'
      ),
      p(
        'A long record changes what you should weigh, not whether you qualify. From 60 contribution months you have also earned a German old-age pension, payable at German retirement age wherever you live — and the refund is the alternative to that pension, not an addition: one payment of the whole refundable balance, after which the insurance relationship is dissolved and the refunded months never come back as pension months (later German work builds new entitlements from new contributions). With many German years behind you, weigh the two before choosing. We explain the facts and figures; we do not provide individual pension or legal advice.'
      ),
    ],
  },
  {
    id: 'your-pension-scheme-at-home',
    label: 'Home scheme',
    h2: 'Your pension scheme at home changes nothing',
    blocks: [
      p(
        "Contributions to a pension scheme in your own country — Nigeria's Contributory Pension Scheme and your Retirement Savings Account, Ghana's SSNIT, Kenya's NSSF, a South African retirement fund, Egyptian social insurance, the CNSS in Morocco or Tunisia — neither block a German refund nor restart the 24 months. The only foreign insurance Germany treats like its own for this purpose is mandatory pension insurance in the EU, the UK, Türkiye or an ex-Yugoslav state. Your refund is paid to a bank account, not into a scheme."
      ),
    ],
  },
  {
    id: 'what-we-do',
    label: 'What we do',
    h2: 'If you qualify — what we do, and what it costs',
    blocks: [
      p(
        'Everything is doable on your own; the official forms are free. If you would rather not run a German administrative procedure from Lagos or Nairobi, our managed service takes it over:'
      ),
      {
        t: 'ul',
        items: [
          {
            x: 'Before anything is filed. We check your eligibility, prepare your refund application and payment documents from the information and evidence you provide, obtain and review the relevant pension-account information where required, and identify the recommended first pension office from your record. Our German partner law firm reviews and submits the claim.',
            sp: [{ k: 'b', x: 'Before anything is filed.' }],
          },
          {
            x: 'While the pension office works. Its letters are received at a German address, scanned to you and explained in plain English. After submission you receive an update at least every four weeks, and sooner when something happens — sometimes the update is simply that the office has not answered yet. We keep track of known response and objection deadlines within the agreed scope; if a letter reaches you directly, forward it to us straight away with the date you received it.',
            sp: [{ k: 'b', x: 'While the pension office works.' }],
          },
          {
            x: 'After the decision. We check it for obvious errors and assist with available evidence or a straightforward objection; if legal assessment or formal representation is needed, the matter is referred to the external law firm and handled only after you agree the scope and any separate cost. If an approved refund does not arrive, we follow it up within the managed scope with the pension office and Renten Service until the payment is resolved.',
            sp: [{ k: 'b', x: 'After the decision.' }],
          },
          {
            x: 'Payout. Your refund is paid through the escrow account operated by our German partner law firm; after the agreed fee is deducted, the balance is transferred to the bank account you nominate. No German bank account is required (account and payment-route checks: see the payout question below).',
            sp: [{ k: 'b', x: 'Payout.' }],
          },
          {
            x: 'Digital for most clients. You submit your details and sign online. Every client has their identity and signature confirmed using their passport or an accepted equivalent — digitally or by an accepted notary or public authority, depending on the route; any local notary or certification cost is borne by you. When DRV Oldenburg-Bremen is responsible for your refund (the usual case for someone living in Australia, unless DRV Bund or Knappschaft-Bahn-See holds the account), we prepare your power of attorney and payment declaration and ask you to send us the signed originals — a limited exception rather than the rule.',
            sp: [{ k: 'b', x: 'Digital for most clients.' }],
          },
        ],
      },
      p(
        "The fee: Our fee for the managed statutory refund is 9.75% of the refunded amount, capped at €2,500 including VAT, with no upfront service fee and no minimum service fee. No refund, no service fee. It covers the agreed managed administrative scope, including our partner law firm's support within that scope. We do not provide legal services, advice or representation, and separate representation in an objection, appeal or court proceeding is not included automatically. Details",
        [
          { k: 'b', x: 'The fee:' },
          { k: 'a', x: 'Details', href: PRICING },
        ]
      ),
    ],
  },
  {
    id: 'what-to-expect',
    label: 'What to expect',
    h2: 'What to expect',
    blocks: [
      p(
        'Amount. Across our retained completed paid cases — all nationalities — refunds averaged {{M-04.meanRounded}} (calculated {{M-04.calculatedOn}}), with completed refunds on record from {{M-17.range}}. Your own estimate from the check above applies the actual statutory employee contribution rate and monthly ceiling (Beitragsbemessungsgrenze) of every year back to 1975 — including Deutsche-Mark periods and East/West differences — rather than a flat percentage. The exact refund follows your official insurance record.',
        [{ k: 'b', x: 'Amount.' }]
      ),
      p(
        'Timing. {{TM-01.sentence}} {{M-12.sentence}} Individual processing times vary — see the full data and methodology. Processing and payment dates depend on the responsible pension office and the payment route, so a specific date cannot be guaranteed.',
        [
          { k: 'b', x: 'Timing.' },
          {
            k: 'a',
            x: 'see the full data and methodology',
            href: PROCESSING_TIME,
          },
        ]
      ),
      p('Reviews. {{M-15.sentence}}.', [
        { k: 'b', x: 'Reviews.' },
        { k: 'a', x: 'ProvenExpert', href: PROVEN_EXPERT },
      ]),
    ],
  },
];

export const PHOEBE_FAQ_H2 =
  'The questions from the video, answered in writing';

export const PHOEBE_FAQ: RichFaqItem[] = [
  {
    q: 'How does the German pension system work, in short?',
    blocks: [
      p(
        'Employees in Germany are, with few exceptions, compulsorily insured in the state pension scheme. Your employer withheld your share — {{STAT-2026.employeeRate}} of your gross pay since 2018, charged only up to a monthly ceiling ({{STAT-2026.ceiling2026}} in 2026) — and paid its own share on top. Those contributions build a German pension for later. If you leave Germany and meet the three conditions above, you can have your own share refunded instead.'
      ),
    ],
  },
  {
    q: "Does the employer's share come back too?",
    blocks: [
      p(
        "No. The refund is your own share only — the employer's share stays in the system, whatever the number of months. That is the law, not a service limitation."
      ),
    ],
  },
  {
    q: 'How much comes back — and is it taxed?',
    blocks: [
      p(
        'Your employee share for every refundable month: {{STAT-2026.employeeRate}} of gross pay since 2018, up to the ceiling. The main exceptions: voluntary contributions and the compulsory contributions of self-employed people come back at 50%; if Deutsche Rentenversicherung ever funded a benefit for you — a rehabilitation programme, say — only the contributions paid after it are refundable, and the completed refund still closes the whole record; months with fully state-paid contributions count but hold no cash. These are checked before anything is filed. German income tax is not deducted — German law exempts pension contribution refunds. How your country of residence treats the money is a separate question for a local adviser; we do not provide individual tax, pension or legal advice.'
      ),
    ],
  },
  {
    q: 'How long does it take?',
    blocks: [
      p(
        'Two clocks. First the waiting period: 24 full calendar months after your last month of mandatory pension insurance in Germany — or, if later, in the EU, the UK, Türkiye or an ex-Yugoslav state — before the claim can be filed. Then the pension office: {{TM-01.share}} of our {{TM-01.population}} reached the client escrow account {{TM-01.window}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission, in our analysis calculated on {{M-12.calculatedOn}} (full data and methodology). Individual processing times vary, and a specific date cannot be guaranteed. From the seventh calendar month after a complete application reaches a German pension carrier, German law can provide 4% annual interest.',
        [{ k: 'a', x: 'full data and methodology', href: PROCESSING_TIME }]
      ),
    ],
  },
  {
    q: 'Do I need a German bank account — and can the money go to my account in Nigeria, Ghana, Kenya, South Africa or Egypt?',
    blocks: [
      p(
        'No German account is needed. For claims we manage, the refund is paid through the escrow account operated by our German partner law firm; after the agreed fee is deducted, the remaining balance is transferred to the bank account you nominate. A third-party account can be used where the required account-holder declaration and compliance checks are satisfied. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent, so the route is checked shortly before the money moves. Eligibility and payment route are separate: a valid refund may require an account in a permitted country if transfers to the residence country are restricted. If you live in Morocco or Tunisia, the agreements affect how the payment is routed — read our Morocco or Tunisia page before you apply.',
        [
          { k: 'a', x: 'Morocco', href: '/morocco' },
          { k: 'a', x: 'Tunisia', href: '/tunisia' },
        ]
      ),
    ],
  },
  {
    q: 'Do I lose my German pension if I take the refund?',
    blocks: [
      p(
        'Refund and pension are alternatives. With fewer than five qualifying years there is normally no German old-age pension at retirement age — the refund is how those contributions come back, and at retirement age it is available without the 24-month wait. With 60 months or more you have earned a German pension at retirement age, and a completed refund gives it up for good: one payment of the whole refundable balance, and the refunded months never return as pension months. Later German work builds new entitlements from new contributions.'
      ),
    ],
  },
  {
    q: 'I was self-employed, or I paid into a Versorgungswerk — what then?',
    blocks: [
      p(
        'Freelance or self-employed work in Germany usually falls outside mandatory pension insurance, so those years may hold nothing in the record; where voluntary or compulsory self-employed contributions were paid to Deutsche Rentenversicherung, the refund is half of them. A Versorgungswerk — the professional pension chamber for doctors, dentists, pharmacists, architects, lawyers and similar professions — is a separate institution with its own statute; contributions to it are not part of the Deutsche Rentenversicherung refund described here. Whether and how a Versorgungswerk refunds contributions to a member who has left Germany is set out in its statute — ask the institution directly.'
      ),
    ],
  },
  {
    q: 'What documents do I need?',
    blocks: [
      p(
        "Your valid passport, your German pension insurance number (Versicherungsnummer — where to find it), your approximate German employment history (dates and employers), the address and bank details for the payout, and — if you have it — your deregistration certificate (Abmeldung). Deregistration itself matters more than the paper: the pension office can usually see in the registration data that you deregistered and asks for the certificate only if it cannot. Never deregistered? German deregistration assistance is available as an optional €50 add-on, including VAT, payable with the service fee after your refund reaches escrow. Missing pension number? We can help identify or recover it; if none can be found, the claim can still be filed using other identifiers, such as your full name, date of birth and last registered address in Germany. You don't need to obtain your insurance record yourself first: we obtain and review the relevant account information during the managed process where required.",
        [{ k: 'a', x: 'where to find it', href: SSN }]
      ),
    ],
  },
  {
    q: 'Which of my German months actually count?',
    blocks: [
      p(
        'Every month with statutory pension insurance. A nursing, care or technical Ausbildung counts from the first month: training pay carries the normal employee contribution, and those months come back like any other (only where training pay was €325 a month or less did the employer bear the whole contribution — those months count, but hold no employee share). A student job above the minijob limit is inside the pension insurance; a scholarship without an employment contract is not. A minijob counts if you kept the small employee top-up (the default since 2013) and not if you opted out.'
      ),
    ],
  },
  {
    q: 'What about my company pension (bAV) or a private pension?',
    blocks: [
      p(
        'A company pension is a separate topic with its own rules. After a successful statutory refund, we can review whether a separate company-pension cash-out may be possible: once your statutory contributions have been refunded, German law lets a former employee demand a cash settlement of vested company-pension entitlements, and the provider must comply — the refund decision is the key document. Not every company pension is vested, the settlement is calculated from the vested entitlement rather than the premiums paid, and unlike the statutory refund it can be taxable. The company-pension service is separate, under its own agreement, and currently uses the same 9.75% success fee and €2,500 cap as the core refund service — read the company-pension guide. A private pension contract — with an insurer, a bank or a fund — is a contract with that provider: its terms decide what happens when you leave Germany, and it is not part of the statutory refund.',
        [{ k: 'a', x: 'read the company-pension guide', href: BAV }]
      ),
    ],
  },
  {
    q: "I'm still in Germany — when can I apply, and should I wait?",
    blocks: [
      p(
        "A refund can be filed 24 full calendar months after your last month of mandatory pension insurance in Germany (or, if later, in the EU, the UK, Türkiye or an ex-Yugoslav state), from the 1st of the 25th month, and only from outside the EU and the UK. You don't have to wait to start: sign up now, we prepare everything so your claim is filed on the first possible date — and about two months before, we confirm with you that nothing has changed. One thing to know before you decide anything about citizenship: a German naturalisation completed before you leave means you will already be German when a refund could first be filed, and a German citizen has no refund before retirement age (the narrow civil-servant exception aside). The two do not combine; which matters more to you is your decision, and we do not provide individual legal advice."
      ),
    ],
  },
  {
    q: 'Does Phoebe handle my claim? Does Germany Pension Refund have agents in my country?',
    blocks: [
      p(
        'No, and no. Phoebe is an approved affiliate partner — she links to us, and we pay her for that; she does not see or handle your claim. Germany Pension Refund does not use personal agents or local representatives to collect claim documents or manage claims. Approved affiliates may link to our website or, in limited cases, send us basic contact details; they do not handle the claim. If anyone claims to represent us, verify the contact with us directly. Our service fee and the optional deregistration add-on are deducted only after your refund has reached the escrow account — there is no upfront service fee — so a request to pay our fee in advance does not come from us. Any local certification or postage cost that arises is paid by you directly to the notary, authority or courier.'
      ),
    ],
  },
  {
    q: 'Can I apply myself?',
    blocks: [
      p(
        'Yes. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee. From outside Germany that route is paper: form V0901 travels by post, because ordinary email is not accepted for identity reasons and fax is no longer available. In a self-filed claim, the official application form provides for your personal data to be certified on the form itself — so the application travels to the certifying body. In a managed claim, the analog step is a single page we prepare for you. Our V0901 guide walks through the form section by section, and the pension-office guide tells you where to send it.',
        [
          { k: 'a', x: 'V0901 guide', href: V0901 },
          { k: 'a', x: 'pension-office guide', href: OFFICE },
        ]
      ),
    ],
  },
];

export const PHOEBE_CLOSE = {
  h2: 'Ready?',
  text: 'Run the check above, or start your claim directly — starting takes less than one minute, and you pay our service fee only if your refund succeeds.',
  cta: { label: 'Start my claim', href: PHOEBE_CTA_HREF },
  disclaimer:
    'Germany Pension Refund is a private service operated by ATLAES GmbH, Berlin. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may also apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
};

export type { FaqItem };
