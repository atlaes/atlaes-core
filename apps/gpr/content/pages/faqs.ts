/**
 * /faqs copy — verbatim from the GPR Figma frame "FAQ - /faqs" (945:5582,
 * built from the live www page on 14 Sep 2026) plus the collapsed answers
 * and the FAQPage schema texts of that live page. Quarterly figures are
 * token references. Title/meta are the live page's.
 */
import type { Block, FaqItem, Span } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import type { RichFaqItem } from '@/components/marketing/home/RichFaq';

export const PATH = '/faqs';

const GUIDE = '/post/how-to-get-a-german-pension-refund';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const CALCULATOR = '/refund-calculator';
const SSN = '/post/german-social-security-number';
const BREXIT = '/post/brexit';
const PRICING = '/pricing';

export const FAQS_META = {
  title: 'German Pension Refund FAQ: Eligibility, Process & Costs (2026)',
  description:
    'Clear answers on German pension refund eligibility, the 24-month wait, real processing times, costs and payouts — updated for 2026. Start in under a minute.',
};

export const FAQS_HERO = {
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'FAQ', href: PATH },
  ],
  eyebrow: 'FAQ · German pension contribution refunds',
  h1: 'German Pension Contribution Refunds: Frequently Asked Questions',
  lead: 'Here you’ll find clear, up-to-date answers to questions on eligibility, process, documents, and refunds.',
  guide: {
    x: 'Looking for the complete picture? Every rule, every country, every deadline: the complete 2026 guide to claiming your German pension refund',
    sp: [
      {
        k: 'a' as const,
        x: 'the complete 2026 guide to claiming your German pension refund',
        href: GUIDE,
      },
    ],
  },
  cta: { label: 'Check your eligibility →', href: FUNNEL_ENTRY },
  jumpLabel: 'Jump to a topic',
};

export interface FaqTopic {
  id: string;
  label: string;
  h2: string;
  items: RichFaqItem[];
}

const p = (x: string, sp?: Span[]): Block =>
  sp ? { t: 'p', x, sp } : { t: 'p', x };

export const FAQS_TOPICS: FaqTopic[] = [
  {
    id: 'eligibility',
    label: 'Eligibility',
    h2: 'Eligibility',
    items: [
      {
        q: 'Who is eligible for a German pension refund?',
        blocks: [
          p(
            'You are eligible if you are not a citizen of Germany, the EU/EEA, Switzerland or the UK, have not paid mandatory pension contributions in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia for at least 24 months (unless you have reached retirement age), and currently live outside the EU and the UK. For citizens of the USA, Australia, Canada, India, Brazil, the Philippines, South Korea, Albania, Moldova, North Macedonia and Uruguay — and for Japanese citizens while living in Japan — there is an additional limit: fewer than 60 monthly contributions.'
          ),
          p(
            'A few residence rules go beyond the EU and the UK: living in India blocks the refund for every nationality except Indian citizens; citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia cannot claim before retirement age while living in any of those four countries; and Israeli citizens cannot claim before retirement age while living in Israel.'
          ),
          p(
            'Read more: the complete 2026 guide to claiming your German pension refund',
            [
              {
                k: 'a',
                x: 'the complete 2026 guide to claiming your German pension refund',
                href: GUIDE,
              },
            ]
          ),
        ],
      },
      {
        q: 'How do I know if I worked less than 60 months?',
        blocks: [
          p(
            'Any calendar month with at least one day of paid pension contributions counts as a full month. Add up all your months — including parental leave and credited unemployment periods — to see whether the total stays under 60. Estimate your amount with our free refund calculator.',
            [{ k: 'a', x: 'free refund calculator', href: CALCULATOR }]
          ),
        ],
      },
      {
        q: 'What if I worked more than 60 months? Can I still claim a refund?',
        blocks: [
          p(
            'With 60 or more months you have earned a German old-age pension at retirement age — payable worldwide. Citizens of most countries can still choose a refund instead, unless they are citizens of one of the agreement countries listed in the first answer above, where a refund is no longer possible after 60 months before retirement age. Full details: the complete 2026 guide',
            [{ k: 'a', x: 'the complete 2026 guide', href: GUIDE }]
          ),
        ],
      },
      {
        q: 'Can dual citizens or EEA residents claim a refund?',
        blocks: [
          p(
            'Dual citizenship with Germany, the EU, the EEA, Switzerland or the UK disqualifies you — even if you never use that passport. Residing in the EEA or Switzerland without holding one of those citizenships is fine, as long as the other conditions are met.'
          ),
        ],
      },
      {
        q: 'Can UK citizens or residents get a German refund after Brexit?',
        blocks: [
          p(
            'No. UK nationals worldwide, and anyone residing in the UK, must wait until German retirement age — a refund before then is not possible. Read more about Brexit and your German pension',
            [
              {
                k: 'a',
                x: 'Read more about Brexit and your German pension',
                href: BREXIT,
              },
            ]
          ),
        ],
      },
    ],
  },
  {
    id: 'process-timing',
    label: 'Process & timing',
    h2: 'Process & Timing',
    items: [
      {
        q: 'How long does the refund process take?',
        blocks: [
          p(
            '{{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission, with a median of about {{M-19.medianDays}} days — see the full data and methodology. Individual processing times vary: the responsible pension office sets the final tempo. We prepare every claim so it can be processed without avoidable follow-up questions — the process is designed to avoid preventable delays.',
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
        q: 'What documents do I need to apply?',
        blocks: [
          p(
            "Your valid passport, your German pension number (Versicherungsnummer, see where to find it), and — if available — your deregistration certificate (Abmeldung). Missing something? We can help identify or recover a missing pension number — and if none can be found, the claim can still be submitted using other identifiers, such as your full name, date of birth and last registered address in Germany. German deregistration is available as an optional €50 add-on (including VAT). You don't need to obtain your insurance record yourself first: we obtain and review the relevant account information during the managed process where required.",
            [{ k: 'a', x: 'see where to find it', href: SSN }]
          ),
        ],
      },
      {
        q: 'Can I apply before my 24-month waiting period is over?',
        blocks: [
          p(
            "No — an application filed before the waiting period ends is rejected, and an early rejection doesn't speed anything up. What you can do is prepare early: we complete your file now, and it is submitted on the first possible day after your waiting period ends. The clock runs on the calendar, your claim runs on time."
          ),
        ],
      },
      {
        q: 'My claim is taking longer than most — is something wrong?',
        blocks: [
          p(
            'Almost certainly not. The median of about {{M-19.medianDays}} days is a midpoint, not a promise: half of the measured completed refunds took longer. In our latest {{M-12.total}} completed refunds, {{M-20.pct}} reached the escrow account within six months — and the remaining cases took longer still, often because of departmental workloads, internal checks or file transfers between offices. Two reassurances: your entitlement doesn\'t shrink while you wait, and German law can provide 4% annual interest from the seventh calendar month after your complete application reached the pension carrier. During an active claim, we monitor known response deadlines within the managed scope and send you a status update at least every four weeks — even when the update is simply "still their turn." Full context: the processing-time data page.',
            [
              {
                k: 'a',
                x: 'the processing-time data page',
                href: PROCESSING_TIME,
              },
            ]
          ),
        ],
      },
      {
        q: 'I filed on my own and never heard back. What can I do?',
        blocks: [
          p(
            "It happens a lot — and nothing you've done so far is wasted. The usual causes: a small error in the forms, a letter lost in untracked international post, or a file simply waiting in a queue. We can take over a claim that's already filed: once the power of attorney is on file, we find out where your file actually stands, and we push it toward a decision."
          ),
        ],
      },
      {
        q: "The pension office hasn't decided for over 6 months. Is my claim dead?",
        blocks: [
          p(
            "No — a validly filed claim doesn't expire. The six-month mark actually works in your favor twice. German law can provide 4% annual interest from the seventh calendar month after a complete application reached the pension carrier. And an inactivity action (Untätigkeitsklage) may become legally available after six months without sufficient reason — a case-dependent last resort that is not filed automatically; in our operating history, none has yet been required, because precise status questions and measured follow-up resolve most stalled files first. The delay chapter of the complete guide explains the sensible order.",
            [{ k: 'a', x: 'the complete guide', href: GUIDE }]
          ),
        ],
      },
      {
        q: 'I already started my claim with a different agent. Can I switch?',
        blocks: [
          p(
            "Yes — and switching to us is deliberately simple: your new power of attorney includes a clause revoking any previously submitted one the moment you sign. You don't have to contact your previous agent to withdraw their authorization — the revocation travels with the new power of attorney, and from that point the pension office follows the new authorization. One clean handover, no awkward conversations."
          ),
          p(
            "What doesn't work is stacking: keeping two or three agents running at once, hoping the fastest one wins. Only one power of attorney can be in force with the pension office at a time — faced with competing ones, the office can't be sure who is authorized, so it puts your claim aside: in our experience such cases sit for months, status requests go unanswered, and eventually the office writes to you directly, at the last address in its system (typically your old German one), asking you to choose one representative and revoke the others. Switching done properly avoids all of that."
          ),
          p(
            'Two honest notes. A power of attorney may exist without you remembering it — some providers have you sign one as part of a "free eligibility check," and a power of attorney is valid for every interaction with the pension office, not just the check; the revocation clause covers that case too. And revoking a power of attorney doesn\'t cancel a service contract you signed elsewhere — check its cancellation terms so you\'re not paying twice.'
          ),
        ],
      },
      {
        q: 'Where do I find my German pension number (Versicherungsnummer)?',
        blocks: [
          p(
            "On your old payslips, your annual pension information letters, or your social security ID card (Sozialversicherungsausweis). Can't find it anywhere? We can help recover it as part of your claim. Everything about the number: our German social security number guide.",
            [
              {
                k: 'a',
                x: 'our German social security number guide',
                href: SSN,
              },
            ]
          ),
        ],
      },
      {
        q: 'Is the German pension refund process fully digital or paperless?',
        blocks: [
          p(
            'For most clients, yes — you submit your details and sign everything online, and we handle the communication with the German pension authorities. One document usually needs an analog moment: a short Certificate of Life and Nationality we prepare for you, which must be confirmed by a notary or another authority accepted by the responsible pension office — online notarization is often accepted, and any local certification cost is borne by the client.'
          ),
          p(
            'One exception applies when DRV Oldenburg-Bremen is the office responsible for your refund: we prepare the power of attorney and payment declaration and ask you to send us the signed originals — a limited exception rather than the rule. It covers Australian cases handled by Oldenburg-Bremen and clients of any nationality whose responsible account carrier is Oldenburg-Bremen. If your German pension carrier has never changed, an insurance number beginning with 28 points to Oldenburg-Bremen — an indicator, not a guarantee, since the carrier can change. Accounts held at DRV Bund or Knappschaft-Bahn-See remain with those carriers and currently remain digital for the client. If this applies to you, we prepare the documents and tell you exactly where to send them; clients bear the cost of sending documents to us unless we expressly agree otherwise. All other steps remain digital.'
          ),
        ],
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    h2: 'Money',
    items: [
      {
        q: 'How much will my refund be?',
        blocks: [
          p(
            'Across all our retained completed paid cases, the average refund was {{M-04.mean}} and the median {{M-04.median}} (calculated {{M-04.calculatedOn}}) — with results ranging from {{M-17.range}}. Your own number depends on your income and contribution months: as an employee you can reclaim 100% of the pension contributions withheld from your salary. Estimate it in a minute with the free refund calculator.',
            [{ k: 'a', x: 'free refund calculator', href: CALCULATOR }]
          ),
        ],
      },
      {
        q: 'Do I need a German bank account? Where will my refund be paid?',
        blocks: [
          p(
            'No German account required. Your refund is routed through a secure escrow account at our partner German law firm; after the agreed fee is deducted, the remaining balance is transferred to the bank account you nominate — local or international. A third-party account can be used where the required account-holder declaration and compliance checks are satisfied. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent.'
          ),
        ],
      },
      {
        q: 'What costs are involved?',
        blocks: [
          p(
            "Our service is success-based: no upfront payment and no minimum fee. The fee is 9.75% of the refunded amount, capped at €2,500 even for the largest refunds — including VAT, the escrow processing and our partner law firm's support within the agreed administrative scope. Separate representation in an objection, appeal or court proceeding is not included automatically, and German deregistration is an optional €50 add-on (including VAT). You pay only after your refund has arrived in the law firm's escrow account — if the managed claim produces no refund, no core service fee is charged. If the payout then goes to an account outside Germany, transfer or currency-conversion costs can be deducted from the amount transferred; payouts run through regulated payment providers. Details: pricing.",
            [{ k: 'a', x: 'pricing', href: PRICING }]
          ),
        ],
      },
      {
        q: 'Is the refund taxable?',
        blocks: [
          p(
            "The refund is paid out without German tax deduction — German law exempts pension contribution refunds. Your country of residence may treat it differently, and we don't provide tax advice — check with a local adviser if in doubt."
          ),
        ],
      },
      {
        q: "What happens to the employer's contributions?",
        blocks: [
          p(
            "They stay in the German pension system — only your own employee share is refundable. That's the law, not a service limitation, and it's why our calculator shows the employee share from the start: the number you see is the number you can actually claim."
          ),
        ],
      },
    ],
  },
  {
    id: 'special-situations',
    label: 'Special situations',
    h2: 'Special Situations',
    items: [
      {
        q: 'Can I return to Germany after claiming a refund?',
        blocks: [
          p(
            'Yes. The refund closes your old insurance record, and if you work in Germany again, a new record simply starts from zero — a completed refund does not affect future employment or visa applications.'
          ),
        ],
      },
      {
        q: 'Can I claim a German disability pension instead?',
        blocks: [
          p(
            "A German disability pension (Erwerbsminderungsrente) generally requires the five-year qualifying period plus three years of compulsory contributions within the last five years before the disability — work-accident cases are exempt from these minimums. If you don't meet the requirements, the refund route remains open."
          ),
        ],
      },
      {
        q: "My spouse died — can I claim their refund or a widow's pension?",
        blocks: [
          p(
            "If your spouse's German record stayed under the five-year qualifying period, the closest family — spouse or registered partner first, then children — can claim a refund of the contributions. There is no waiting period, but the claim expires four years after the end of the year of death, so don't wait. If the record reached five years or more, a refund is not possible — but you may be entitled to a German widow's or widower's pension instead. Both routes: the survivors section of our complete guide.",
            [{ k: 'a', x: 'our complete guide', href: GUIDE }]
          ),
        ],
      },
    ],
  },
];

export const FAQS_CLOSE = {
  h2: 'Ready to claim now?',
  cta: { label: 'Start Application', href: FUNNEL_ENTRY },
};

/** FAQPage schema texts — the live page's graph (13 items), figures tokenised. */
export const FAQS_SCHEMA: FaqItem[] = [
  {
    q: 'Who is eligible for a German pension refund?',
    a: 'You qualify if you are not a citizen of Germany, the EU/EEA, Switzerland or the UK, at least 24 months have passed since your last mandatory pension contribution in Germany, the EU, the UK, Türkiye or an ex-Yugoslav country (unless you have reached retirement age), and you live outside the EU and the UK. Citizens of the USA, Australia, Canada, India, Brazil, the Philippines, South Korea, Albania, Moldova, North Macedonia and Uruguay — and Japanese citizens living in Japan — must also have fewer than 60 contribution months. Special residence rules: living in India blocks every nationality except Indian citizens; citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia cannot claim while living in those countries; Israeli citizens cannot claim while living in Israel.',
  },
  {
    q: 'What if I worked more than 60 months — can I still claim a refund?',
    a: 'With 60 or more months you have earned a German old-age pension payable worldwide at retirement age. Citizens of most countries can still choose a refund instead — except citizens of the 60-month agreement countries, for whom a refund before retirement age is no longer possible.',
  },
  {
    q: 'Can UK citizens or residents get a German pension refund after Brexit?',
    a: 'No. UK nationals worldwide, and anyone residing in the UK, must wait until German retirement age — a refund before then is not possible.',
  },
  {
    q: 'How long does a German pension refund take?',
    a: '{{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission, with a median of about {{M-19.medianDays}} days. Individual processing times vary; the responsible pension office controls processing.',
  },
  {
    q: 'My claim is taking longer than most — is something wrong?',
    a: "Almost certainly not. The median of about {{M-19.medianDays}} days is a midpoint: half of the measured completed refunds took longer. In the same {{M-12.total}} completed refunds, {{M-20.pct}} reached escrow within six months; the remaining cases took longer. Your entitlement doesn't shrink while you wait, and German law can provide 4% annual interest from the seventh calendar month after a complete application reached the pension carrier.",
  },
  {
    q: 'What documents do I need to apply?',
    a: 'A valid passport, your German pension number (Versicherungsnummer) and, if available, your deregistration certificate (Abmeldung). We can help identify or recover a missing pension number; German deregistration is available as an optional €50 add-on including VAT.',
  },
  {
    q: 'Can I apply before my 24-month waiting period is over?',
    a: 'No — an application filed before the waiting period ends is rejected. You can prepare early: we complete your file, and it is submitted on the first possible day after the waiting period ends.',
  },
  {
    q: 'Is the German pension refund process fully digital?',
    a: 'For most clients, yes — details and signatures are handled online, and a short Certificate of Life and Nationality is confirmed by a notary or another accepted authority (certification cost borne by the client). When DRV Oldenburg-Bremen is responsible for the refund, the signed original power of attorney and payment declaration must be sent in — a limited exception; accounts at DRV Bund or Knappschaft-Bahn-See currently remain digital for the client.',
  },
  {
    q: 'Do I need a German bank account — and where will my refund be paid?',
    a: 'No German account is required. The refund is paid through the escrow account operated by our German partner law firm, and the remaining balance is transferred to the bank account you nominate. A third-party account can be used where the required account-holder declaration and compliance checks are satisfied. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent.',
  },
  {
    q: 'What does the service cost?',
    a: "The fee is 9.75% of the refunded amount, capped at €2,500 including VAT, with no upfront payment and no minimum fee. It covers the agreed managed administrative scope, including our partner law firm's support within that scope; separate objection, appeal or court representation is not included automatically. German deregistration is an optional €50 add-on. If the managed claim produces no refund, no core service fee is charged.",
  },
  {
    q: 'How much will my German pension refund be?',
    a: 'Across all our retained completed paid cases, the average refund was {{M-04.mean}} and the median {{M-04.median}} (calculated {{M-04.calculatedOn}}), with results from {{M-17.range}}. Employees can reclaim 100% of the pension contributions withheld from their salary.',
  },
  {
    q: 'Is the refund taxable?',
    a: 'The refund is paid out without German tax deduction — German law exempts pension contribution refunds. Treatment in your country of residence may differ; we do not provide tax advice.',
  },
  {
    q: "My spouse died — can I claim their refund or a widow's pension?",
    a: "If the deceased's German record stayed under five years, the closest family — spouse or registered partner first, then children — can claim a refund of the contributions; the claim expires four years after the end of the year of death. From five years, a refund is not possible, but a German widow's or widower's pension may be payable instead.",
  },
];
