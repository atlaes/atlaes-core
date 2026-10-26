/**
 * /data-request copy — verbatim from the GPR Figma frame "Data Access &
 * Deletion Request — /data-request" (926:8184, live www page 14 Sep 2026).
 * Title/meta are the live page's.
 */
import type { RichText } from '@/content/types';

export const PATH = '/data-request';

export const DATA_REQUEST_META = {
  title: 'Data Request & Deletion (GDPR) | Germany Pension Refund',
  description:
    'Request access, correction, or deletion of your personal data under the EU GDPR. Germany Pension Refund – secure and compliant.',
};

export const DATA_REQUEST_HERO = {
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'Data Access & Deletion Request', href: PATH },
  ],
  eyebrow: 'GDPR rights',
  updated: 'Last updated: August 2026',
  h1: 'Data Request & Deletion (GDPR Rights)',
  lead: 'Under the EU General Data Protection Regulation (GDPR), you have the right to access, correct, delete, restrict, or transfer your personal data held by us — regardless of how that data was collected (for example, through our website forms, by email, or during the refund process).',
};

export const DATA_REQUEST_RIGHTS = {
  h2: 'Your Rights',
  intro: 'Your rights include:',
  items: [
    {
      x: 'Access (Art. 15 GDPR) – Request a copy of all personal data we hold about you.',
      sp: [{ k: 'b', x: 'Access (Art. 15 GDPR)' }],
    },
    {
      x: 'Rectification (Art. 16 GDPR) – Ask us to correct or update inaccurate information.',
      sp: [{ k: 'b', x: 'Rectification (Art. 16 GDPR)' }],
    },
    {
      x: 'Erasure (“Right to be forgotten”, Art. 17 GDPR) – Request deletion of your data when legally permissible.',
      sp: [{ k: 'b', x: 'Erasure (“Right to be forgotten”, Art. 17 GDPR)' }],
    },
    {
      x: 'Restriction / Objection (Arts. 18–21 GDPR) – Ask us to limit processing or stop using your data.',
      sp: [{ k: 'b', x: 'Restriction / Objection (Arts. 18–21 GDPR)' }],
    },
    {
      x: 'Portability (Art. 20 GDPR) – Receive your data in a structured, machine-readable format.',
      sp: [{ k: 'b', x: 'Portability (Art. 20 GDPR)' }],
    },
  ] as RichText[],
  noteTitle: '🔒 Legal note:',
  note: 'Certain records (e.g. accounting or legal files) must be retained for statutory periods under German law (§ 147 AO, § 257 HGB). Such files will be deleted after the retention period expires.',
};

export const PRIVACY_EMAIL = 'privacy@atlaes.de';
export const CLIENT_EMAIL = 'refund@germanypensionrefund.com';

export const DATA_REQUEST_HOW = {
  h2: 'How to Make a Request',
  emailIntro: 'Please email your request to our data protection team at:',
  clientIntro:
    'If you are an existing client, you may also contact your usual representative at:',
  forwarded: 'Your request will be forwarded internally to our privacy team.',
  includeLabel: 'Please include:',
  include: [
    'Your full name',
    'The email address used during your refund process',
    'A short description of your request (e.g. "Data deletion request")',
  ],
  closing:
    'For security reasons, we may ask for additional identity verification before processing. We will respond to all verified requests within 30 days.',
};
