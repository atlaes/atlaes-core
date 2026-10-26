/**
 * /contact-us copy — verbatim from the GPR Figma frame "Contact Us —
 * /contact-us" (967:5903, live www page 14 Sep 2026). Title/meta are the
 * live page's; the address, phone and email come from `ORG`.
 */
import { ORG } from '@/content/site';

export const PATH = '/contact-us';

/** Calendly page used by the "Schedule a Call" button (leads config). */
export const SCHEDULE_CALL_URL =
  'https://calendly.com/germanypensionrefund/pension-refund-options';

export const CONTACT_META = {
  title: 'Contact Us | Germany Pension Refund',
  description:
    'Questions about your German pension refund? Reach our team by email, WhatsApp or a free scheduled call — answers within one working day.',
};

export const CONTACT_HERO = {
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'Contact Us', href: PATH },
  ],
  eyebrow: 'Contact us · Germany Pension Refund',
  h1: 'Contact Our German Pension Refund Experts',
  lead: 'Have questions about eligibility, documents, the 24-month rule, or your refund amount? Our team will reply shortly.',
};

export const CONTACT_ADDRESS = {
  question:
    'Do you have questions regarding your eligibility, the refund process, or any other topics?',
  reply: 'We are happy to hear from you and will reply shortly.',
  label: 'Mail address:',
  lines: [
    ORG.name,
    'Kaskelstraße 46',
    ORG.address.postalCode + ' ' + ORG.address.city,
    ORG.address.country,
  ],
  phone: ORG.phone,
  email: ORG.email,
};

/** Form labels and placeholders (frame). */
export const CONTACT_FORM = {
  title: 'Contact us',
  firstName: 'First name *',
  firstNamePlaceholder: 'John',
  lastName: 'Last name *',
  lastNamePlaceholder: 'Doe',
  email: 'Email *',
  emailPlaceholder: 'Enter your email address',
  message: 'Write a message *',
  messagePlaceholder: 'Type your message here...',
  submit: 'Submit',
  /** UI-state copy — not in the frame (see the stream report). */
  sending: 'Sending…',
  success: 'Thank you — your message has been sent. We will reply shortly.',
  error:
    'Your message could not be sent. Please email us at ' + ORG.email + '.',
  invalid: 'Please fill in every field with a valid email address.',
};

export const CONTACT_CALL = {
  h2: 'Contact us',
  text: 'You can also schedule a call (we will call you for free)',
  cta: { label: 'Schedule a Call', href: SCHEDULE_CALL_URL },
};

export const CONTACT_SCHEMA = {
  name: CONTACT_HERO.h1,
  description:
    'Need help with your German pension refund? Get expert guidance on eligibility, documents, and the application process. Contact our team today.',
};
