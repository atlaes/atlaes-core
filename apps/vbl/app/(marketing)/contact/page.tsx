import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { CtaBand } from '@/components/marketing/CtaBand';
import { SectionHeading } from '@/components/marketing/SectionHeading';

export const metadata: Metadata = {
  title: 'Contact | CompanyPension',
};

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Contact details follow the client-approved About page company card
// (info@companypension.de, +49 30 49957826, Kaskelstraße 46, 10317 Berlin).
const CONTACT_CARDS = [
  {
    icon: Mail,
    title: 'Email us',
    body: 'For questions about your case, the process or the platform. We reply within two business days.',
    line: (
      <a
        href="mailto:info@companypension.de"
        className="font-semibold text-brand underline"
      >
        info@companypension.de
      </a>
    ),
  },
  {
    icon: Phone,
    title: 'Call us',
    body: 'Reach the team by phone during regular business hours (CET).',
    line: (
      <a href="tel:+493049957826" className="font-semibold text-brand">
        +49 30 49957826
      </a>
    ),
  },
  {
    icon: MapPin,
    title: 'Visit us',
    body: 'CompanyPension is operated by ATLAES GmbH from Berlin, Germany.',
    line: (
      <span className="font-semibold text-brand">
        ATLAES GmbH, Kaskelstraße 46, 10317 Berlin
      </span>
    ),
  },
];

export default function ContactPage() {
  return (
    <>
      <Hero
        eyebrow="Contact"
        title="Get in touch with"
        highlight="CompanyPension"
        body="Questions about a bAV cash-out or a VBL, ZVK, VddB or VddKO refund? Send us a message—our team answers case and platform questions with human support."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Browse the FAQ', href: '/faq' }}
        footnote={
          <p>
            Neither CompanyPension nor ATLAES GmbH provides legal, pension, tax,
            insurance or financial advice.
          </p>
        }
      />

      {/* ---- CONTACT CHANNELS ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="How to reach us"
              body="Pick the channel that suits you. For anything about an ongoing application, include the email address you used to register."
            />
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACT_CARDS.map((card) => (
              <div
                key={card.title}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-brand">
                  <card.icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-bold text-brand">
                  {card.title}
                </h3>
                <p className="mt-3 flex-1 text-base leading-relaxed text-gray-600">
                  {card.body}
                </p>
                <p className="mt-5 text-base">{card.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- PRIVACY REQUESTS ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-2xl bg-brand p-8 text-center text-white sm:p-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-brand">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Privacy requests
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-white/80">
              To exercise your GDPR rights, email our data protection team at{' '}
              <a
                href="mailto:privacy@atlaes.de"
                className="font-semibold text-accent underline"
              >
                privacy@atlaes.de
              </a>{' '}
              or use the dedicated request pages.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/data-access-request"
                className="rounded-brand bg-accent px-8 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
              >
                Data access request
              </Link>
              <Link
                href="/data-deletion-request"
                className="rounded-brand border border-white/30 px-8 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Data deletion request
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to check your{' '}
            <span className="text-accent">company pension?</span>
          </>
        }
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <span className="block">
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </span>
        }
      />
    </>
  );
}
