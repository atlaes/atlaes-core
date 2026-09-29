import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import '@/components/marketing/home/home.css';
import {
  CONTACT_ADDRESS,
  CONTACT_CALL,
  CONTACT_HERO,
  CONTACT_META,
  CONTACT_SCHEMA,
  PATH,
} from '@/content/pages/contact-us';
import { Crumbs } from '../other-countries/RulesPage';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: CONTACT_META.title,
  description: CONTACT_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: CONTACT_META.title,
    description: CONTACT_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: CONTACT_META.title,
    description: CONTACT_META.description,
  },
};

/** ContactPage (welded to the Organization stub) + BreadcrumbList. */
function contactGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    organizationStub(),
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'Contact Us', path: PATH },
    ]),
    {
      '@type': 'ContactPage',
      '@id': url + '#webpage',
      url,
      name: CONTACT_SCHEMA.name,
      headline: CONTACT_SCHEMA.name,
      description: CONTACT_SCHEMA.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
    },
  ]);
}

export default function ContactRoute() {
  return (
    <article className="mk-contact">
      <JsonLd graph={contactGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={CONTACT_HERO.crumbs} />
            <p className="mk-kicker">›› {CONTACT_HERO.eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{CONTACT_HERO.h1}</h1>
            <p className="mk-p">{CONTACT_HERO.lead}</p>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section id="mail-address" index={1} label="Mail address">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mk-p">{CONTACT_ADDRESS.question}</p>
            <p className="mk-p">{CONTACT_ADDRESS.reply}</p>
            <h2 className="mk-h3">{CONTACT_ADDRESS.label}</h2>
            <address className="mk-p not-italic">
              {CONTACT_ADDRESS.lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
              <a
                href={'tel:' + CONTACT_ADDRESS.phone.replace(/\s+/g, '')}
                className="mk-link block"
              >
                {CONTACT_ADDRESS.phone}
              </a>
              <a
                href={'mailto:' + CONTACT_ADDRESS.email}
                className="mk-link block"
              >
                {CONTACT_ADDRESS.email}
              </a>
            </address>
          </div>
          <ContactForm />
        </div>
      </Section>

      <Section
        id="schedule-a-call"
        index={2}
        label="Schedule a call"
        title={CONTACT_CALL.h2}
        tone="tint"
      >
        <p className="mk-p">{CONTACT_CALL.text}</p>
        <div className="mk-cta-row">
          <Pill href={CONTACT_CALL.cta.href} size="lg">
            {CONTACT_CALL.cta.label}
          </Pill>
        </div>
      </Section>
    </article>
  );
}
