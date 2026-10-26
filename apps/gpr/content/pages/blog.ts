/**
 * /blog index copy — H1/H2 from the GPR Figma frame "Blog / News — /blog"
 * (926:8525, live www page 14 Sep 2026). The list itself is built from the
 * articles that exist in the repo (`content/articles`); the excerpts below
 * are the frame's card texts for those posts (the evergreen processing-time
 * page falls back to its meta description).
 */
export const PATH = '/blog';

export const BLOG_META = {
  title: 'How to Get a German Pension Refund – NEWS 2026',
  description: 'Latest Articles on German Pension Refunds',
};

export const BLOG_HERO = {
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'News', href: PATH },
  ],
  eyebrow: 'News · Blog',
  h1: 'How to Get a German Pension Refund – NEWS 2026',
};

export const BLOG_LIST = {
  label: 'All posts',
  h2: 'Latest Articles on German Pension Refunds',
};

/** Slug pinned to the top of the list (the cornerstone guide). */
export const BLOG_PINNED = 'how-to-get-a-german-pension-refund';

/** Card excerpts from the frame, by article slug. */
export const BLOG_EXCERPTS: Record<string, string> = {
  'how-to-get-a-german-pension-refund':
    'Worked in Germany and left? You may be able to claim your pension contributions back. This 2026 guide covers every rule that decides your case: eligibility by citizenship, the 60-month limit, the 24-month waiting period, how much you get back, forms, where to send your application, deadlines, objections and survivor claims — each with official sources. Check your eligibility and estimate your refund in 60 seconds, then claim it yourself or let us handle everything.',
  'german-pension-refund-waiting-period':
    'When the 24-month waiting period for a German pension refund starts, what restarts it and the first day you can apply — with a free date calculator.',
  'which-german-pension-office-handles-your-claim':
    'Deutsche Rentenversicherung is 16 carriers, not one office. Find the one responsible for your refund claim — and where to send your application.',
  brexit:
    'Why UK citizens and anyone living in the UK generally cannot get a German pension refund before retirement age after Brexit — and the three exceptions.',
  'german-social-security-number':
    'Learn how to get a social security number in Germany, including requirements for employees, freelancers, and students, and answers to frequently asked questions.',
};
