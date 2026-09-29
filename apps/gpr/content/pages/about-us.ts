/**
 * /about-us copy — verbatim from the About Page Content Handoff
 * (27 Aug 2026, FINAL): H1 + intro, What We Do, Why This Topic Is Complex,
 * Our Track Record (M-14, M-15/M-16 from the token store), Company
 * Information, How We Work, Educational Approach, closing CTA. Editorial
 * notes in the handoff ("Added 27 Aug …", "Owner addition …") are not copy
 * and are omitted. Schema: AboutPage + Person ×2 + BreadcrumbList.
 */
import type { Block } from '@/content/types';
import { EXTERNAL } from '@/content/registries/links';

export const PATH = '/about-us';

const CALCULATOR = '/refund-calculator';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const GUIDE = '/post/how-to-get-a-german-pension-refund';

export const ABOUT_META = {
  title: 'About Us | Germany Pension Refund',
  /** Token references resolved at render (M-15 / M-16). */
  description:
    'Who runs Germany Pension Refund? A private Berlin service handling German pension refunds since 2015 — over {{M-15.rating}} on ProvenExpert from {{M-16.countPlus}} reviews.',
};

export const ABOUT_INTRO = {
  h1: 'About Germany Pension Refund',
  blocks: [
    {
      t: 'p',
      x: 'Germany Pension Refund is a service operated by ATLAES GmbH, a Berlin-based company focused on helping former international workers understand and navigate administrative processes related to the German public pension system after leaving Germany.',
    },
    {
      t: 'p',
      x: 'Our work centers on explaining eligibility frameworks, cross-border coordination, and the procedural steps involved in pension contribution refunds. Because these rules depend on residence, nationality, and international agreements, the topic is often complex and frequently misunderstood.',
    },
    {
      t: 'p',
      x: 'We aim to make this administrative process easier to understand through structured explanations, practical guidance, and coordination with qualified professionals where required.',
    },
  ] as Block[],
  /** Recommended caption for the (not yet supplied) office photo. */
  imageCaption:
    'Deutsche Rentenversicherung offices in Berlin — the public pension authority that decides refund applications. We are a private service, not part of it.',
};

export const ABOUT_WHAT_WE_DO = {
  h2: 'What We Do',
  blocks: [
    {
      t: 'p',
      x: 'We support international workers who previously contributed to the German public pension system and want to understand possible next steps after leaving Germany. Our work includes:',
    },
    {
      t: 'ul',
      items: [
        {
          x: 'Explaining the rules that actually decide a refund: the 60-month limit for agreement-country citizens, the 24-month waiting period and what restarts it, and the residence rules that can block a claim',
        },
        {
          x: 'Identifying the Deutsche Rentenversicherung office recommended for your claim and preparing the application and payment documents it expects',
        },
        {
          x: "Receiving and answering the pension office's German-language letters within the managed scope, with a status update to you at least every four weeks during an active claim",
        },
        {
          x: "Handling the payout through our partner law firm's escrow account to the bank account you nominate",
        },
        {
          x: 'Publishing free guides — from the complete refund guide to our processing-time data and methodology — so you can understand the process before deciding anything',
          sp: [
            { k: 'a', x: 'complete refund guide', href: GUIDE },
            {
              k: 'a',
              x: 'processing-time data and methodology',
              href: PROCESSING_TIME,
            },
          ],
        },
      ],
    },
  ] as Block[],
};

export const ABOUT_COMPLEX = {
  h2: 'Why This Topic Is Complex',
  blocks: [
    {
      t: 'p',
      x: 'Pension contribution refunds involve administrative procedures shaped by national rules, international coordination, and individual circumstances. Outcomes are not determined by a single rule — they depend on multiple factors such as residence status, contribution history, and whether participation in the pension system may continue.',
    },
    {
      t: 'p',
      x: 'Because public information is often simplified, international workers frequently encounter incomplete or conflicting explanations online. Our approach focuses on explaining the underlying administrative logic so individuals can better understand their situation.',
    },
  ] as Block[],
};

export const ABOUT_TRACK_RECORD = {
  h2: 'Our Track Record',
  recovered: {
    t: 'p',
    x: "Our current retained records document more than {{M-14.amount}} recovered for clients since {{M-14.since}}. That figure is what today's retained records show — a conservative documented minimum, not an all-time business total, since data-protection deletion removes some older completed records.",
  } as Block,
  /**
   * "Clients rate the service **over 4.9/5 on [ProvenExpert] from more than
   * 1,250 reviews** (checked …) — you can read what they say on our
   * [testimonials page]." Rendered in JSX (link inside the bold run).
   */
  rating: {
    lead: 'Clients rate the service ',
    boldBefore: 'over {{M-15.rating}} on ',
    linkText: 'ProvenExpert',
    linkHref: EXTERNAL.provenExpert,
    boldAfter: ' from more than {{M-16.countFloor}} reviews',
    tail: ' (checked {{M-15.checkedOn}}) — you can read what they say on our ',
    tailLinkText: 'testimonials page',
    tailLinkHref: '/testimonials',
    end: '.',
  },
};

export const ABOUT_COMPANY = {
  h2: 'Company Information',
  lead: 'Germany Pension Refund is operated by:',
  /** Impressum block, one line each. */
  address: ['ATLAES GmbH', 'Kaskelstraße 46', '10317 Berlin', 'Germany'],
  register:
    'Register court: Berlin Charlottenburg · Register number: HRB 242004',
  directors: 'Managing directors: Johannes Kühn and Anna Kliem',
  contact: {
    phoneLabel: 'Phone: ',
    phone: '+49 30 49957826',
    emailLabel: 'Email: ',
    email: 'refund@germanypensionrefund.com',
  },
  blocks: [
    {
      t: 'p',
      x: 'Germany Pension Refund was started in 2015 by Johannes Kühn with the launch of GermanyPensionRefund.com, and he has worked on German pension contribution refunds ever since — practical information and administrative support for international workers. Today he runs ATLAES GmbH — incorporated in Berlin in 2022 — together with co-managing director Anna Kliem. ATLAES develops secure digital platforms that make bureaucratic processes easier (atlaes.de) — the same approach behind the free tools and the managed process on this site.',
      sp: [{ k: 'a', x: 'atlaes.de', href: EXTERNAL.atlaes }],
    },
    {
      t: 'p',
      x: 'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
    },
  ] as Block[],
};

export const ABOUT_HOW_WE_WORK = {
  h2: 'How We Work',
  blocks: [
    {
      t: 'p',
      x: 'Our approach combines structured explanations with practical administrative coordination. In a managed claim, that looks like this:',
    },
    {
      t: 'ul',
      items: [
        {
          x: 'We start with your details and check them against the eligibility rules before any claim is filed',
        },
        {
          x: 'We identify the documents your case actually needs — and if your German pension insurance number is missing, we can help identify or recover it',
        },
        {
          x: 'We prepare the submission, file it with the responsible pension office, and monitor known response and objection deadlines',
        },
        {
          x: 'We obtain and review the relevant DRV account information during the managed process where required',
        },
      ],
    },
    {
      t: 'p',
      x: 'We do not provide legal services, advice or representation. Where a managed refund claim requires legal support within the agreed scope, that support is provided by an external German law firm.',
    },
  ] as Block[],
};

export const ABOUT_EDUCATION = {
  h2: 'Educational Approach',
  blocks: [
    {
      t: 'p',
      x: 'A central part of our work is education. We publish explanatory material designed to help international workers understand how pension contribution refunds function in practice, including timing considerations, procedural steps, and common misunderstandings.',
    },
    {
      t: 'p',
      x: 'That education is not just text — we build free tools that put the rules into practice. Our refund calculator applies the actual statutory employee contribution rate and monthly ceiling (Beitragsbemessungsgrenze) of every year back to 1975 — including Deutsche-Mark periods and East/West differences — rather than a flat percentage. The built-in eligibility check walks through citizenship, residence and the 60-month and 24-month rules and gives a preliminary indication in under a minute. Our waiting-period calculator finds the exact date a claim can first be filed, and our office finder shows which Deutsche Rentenversicherung office is likely responsible for you — an indication based on the official routing rules, not a decision. All free, and the calculations run without sign-up.',
      sp: [
        { k: 'a', x: 'refund calculator', href: CALCULATOR },
        { k: 'a', x: 'eligibility check', href: CALCULATOR },
      ],
    },
    {
      t: 'p',
      x: 'This information is intended for general educational purposes and does not replace formal legal or tax advice.',
    },
  ] as Block[],
};

export const ABOUT_CLOSE = {
  h2: 'Explore Your German Pension Refund Today',
  blocks: [
    {
      t: 'p',
      x: 'If you would like to understand how German pension contribution refunds work and whether they may be relevant in your situation, start with our complete guide — or use the free eligibility check for a preliminary indication of whether the standard rules appear to fit your case. Starting your claim takes less than one minute.',
      sp: [
        { k: 'a', x: 'complete guide', href: GUIDE },
        { k: 'a', x: 'free eligibility check', href: CALCULATOR },
      ],
    },
  ] as Block[],
  cta: { label: 'Start Eligibility Check', href: CALCULATOR },
};

/** Appendix B. */
export const ABOUT_SCHEMA = {
  description:
    'Germany Pension Refund is a private service operated by ATLAES GmbH, Berlin, providing administrative support with German pension contribution refunds for international workers. Brand active since 2015; ATLAES GmbH incorporated in 2022.',
  johannes: {
    jobTitle: ['Founder', 'Managing Director'],
    sameAs: ['https://www.linkedin.com/in/johannes-k%C3%BChn-00393539b/'],
  },
  anna: {
    idSuffix: '/#anna-kliem',
    name: 'Anna Kliem',
    jobTitle: 'Managing Director',
    sameAs: ['https://www.linkedin.com/in/anna-kliem-8b8821221/'],
  },
};
