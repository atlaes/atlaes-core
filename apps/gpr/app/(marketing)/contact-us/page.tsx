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
import '@/components/marketing/home/home.css';
import {
  CONTACT_ADDRESS,
  CONTACT_CALL,
  CONTACT_HERO,
  CONTACT_META,
  CONTACT_SCHEMA,
  PATH,
} from '@/content/pages/contact-us';
import { CoreCta, CoreHero, CoreRail } from '../_core/CoreHero';
import '../_core/core.css';
import './contact-us.css';
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
    <article className="mk-contact mk-core">
      <JsonLd graph={contactGraph()} />
      <AttributionCapture />

      {/* Hero (967:5903): white, breadcrumb, eyebrow, H1, lead */}
      <CoreHero
        crumbs={CONTACT_HERO.crumbs}
        eyebrow={CONTACT_HERO.eyebrow}
        title={CONTACT_HERO.h1}
        className="mk-contact-hero"
      >
        <p className="mk-core-lead">{CONTACT_HERO.lead}</p>
      </CoreHero>

      {/* Mail address + form: blue panel / white form, full bleed */}
      <section id="mail-address" className="mk-contact-split">
        <div className="mk-contact-panel">
          <div className="mk-contact-panel-inner">
            <CoreRail index={1} label="Mail address" />
            <p className="mk-contact-question">{CONTACT_ADDRESS.question}</p>
            <p className="mk-p">{CONTACT_ADDRESS.reply}</p>
            <div className="mk-contact-address">
              <h2 className="mk-contact-label">{CONTACT_ADDRESS.label}</h2>
              <address>
                {CONTACT_ADDRESS.lines.map((l, i) => (
                  <span key={l} className={i === 0 ? 'mk-contact-org' : ''}>
                    {l}
                  </span>
                ))}
                <a
                  href={'tel:' + CONTACT_ADDRESS.phone.replace(/\s+/g, '')}
                >
                  {CONTACT_ADDRESS.phone}
                </a>
                <a href={'mailto:' + CONTACT_ADDRESS.email}>
                  {CONTACT_ADDRESS.email}
                </a>
              </address>
            </div>
          </div>
        </div>
        <div className="mk-contact-formcol">
          <ContactForm />
        </div>
      </section>

      {/* Schedule a call: dark centred CTA */}
      <CoreCta
        id="schedule-a-call"
        title={CONTACT_CALL.h2}
        cta={
          <Pill href={CONTACT_CALL.cta.href} size="lg">
            {CONTACT_CALL.cta.label}
          </Pill>
        }
      >
        <p className="mk-p">{CONTACT_CALL.text}</p>
      </CoreCta>
    </article>
  );
}
