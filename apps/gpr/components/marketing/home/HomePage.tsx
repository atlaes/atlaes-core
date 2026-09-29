import { homeGraph } from '@/lib/jsonld';
import { AttributionCapture } from '@/lib/attribution';
import { DISCLAIMER_ID02 } from '@/content/site';
import { Blocks } from '../ui/Blocks';
import { Inline } from '../ui/Inline';
import { JsonLd } from '../ui/JsonLd';
import { Pill } from '../ui/Pill';
import { Section } from '../ui/Section';
import { HomeHero } from './HomeHero';
import { Reviews } from './Reviews';
import { Articles } from './Articles';
import { RichFaq } from './RichFaq';
import {
  ABOUT,
  ARTICLES_H2,
  COMPANY_PENSION,
  ELIGIBILITY,
  FAQ,
  FAQ_FOOTER,
  FAQ_H2,
  FAQ_SCHEMA,
  HOME_SCHEMA,
  HOW_MUCH,
  INTRO,
  LAW_FIRM,
  MANAGED,
  QUALIFY,
  VIDEO,
} from './home-content';
import './home.css';

/**
 * Homepage in Build-Sheet order: hero → intro (H1) → eligibility → managed
 * process → company pension → law-firm support + CTA + disclaimer → video →
 * Do I Qualify (carried over intact) → how much → about → reviews → FAQ →
 * latest articles. One server-side JSON-LD graph (Organization · WebSite ·
 * Service · FAQPage) from `homeGraph`.
 */
export function HomePage() {
  return (
    <article className="mk-home">
      <JsonLd
        graph={homeGraph({
          serviceName: HOME_SCHEMA.serviceName,
          serviceDescription: HOME_SCHEMA.serviceDescription,
          faq: FAQ_SCHEMA,
        })}
      />
      <AttributionCapture />

      <HomeHero />

      <Section id="german-pension-refund" index={1} label="Introduction">
        <h1 className="mk-h1">{INTRO.h1}</h1>
        <p className="mk-tagline">{INTRO.tagline}</p>
        <Blocks blocks={INTRO.blocks} />
      </Section>

      <Section
        id="eligibility"
        index={2}
        label="Eligibility"
        title={ELIGIBILITY.h2}
        tone="surface"
      >
        <Blocks blocks={ELIGIBILITY.blocks} />
      </Section>

      <Section
        id="managed-process"
        index={3}
        label="Managed process"
        title={MANAGED.h2}
      >
        <Blocks blocks={MANAGED.blocks} />
        <ul className="mk-bullets">
          {MANAGED.documents.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <Blocks blocks={MANAGED.after} />
      </Section>

      <Section
        id="company-pension"
        index={4}
        label="Company pension"
        title={COMPANY_PENSION.h2}
        tone="surface"
      >
        <Blocks blocks={COMPANY_PENSION.blocks} />
      </Section>

      <Section
        id="law-firm-support"
        index={5}
        label="Law-firm support"
        title={LAW_FIRM.h2}
        tone="tint"
      >
        <Blocks blocks={LAW_FIRM.blocks} />
        <div className="mk-cta-block">
          <p className="mk-cta-block-text">{LAW_FIRM.cta.text}</p>
          <Pill href={LAW_FIRM.cta.href} size="lg">
            {LAW_FIRM.cta.label}
          </Pill>
        </div>
        <p className="mk-note">{DISCLAIMER_ID02}</p>
      </Section>

      <Section id="how-it-works-video" index={6} label="Video" title={VIDEO.h2}>
        <div
          className="mk-video"
          role="img"
          aria-label="Video: how our German pension refund service works"
        >
          <span className="mk-video-play" aria-hidden="true" />
        </div>
        <Blocks blocks={VIDEO.blocks} />
        <div className="mk-cta-row">
          <Pill href={VIDEO.primary.href} size="lg">
            {VIDEO.primary.label}
          </Pill>
          <Pill href={VIDEO.secondary.href} variant="secondary" size="lg">
            {VIDEO.secondary.label}
          </Pill>
        </div>
      </Section>

      <Section
        id="do-i-qualify"
        index={7}
        label="Do I qualify"
        title={QUALIFY.h2}
        tone="surface"
      >
        <Blocks blocks={QUALIFY.intro} />
        <Blocks blocks={QUALIFY.sixtyMonth} />
        <div className="mk-cta-row">
          {QUALIFY.ctaStrip.map((c, i) => (
            <Pill
              key={c.label}
              href={c.href}
              variant={i === 0 ? 'primary' : 'secondary'}
            >
              {c.label}
            </Pill>
          ))}
        </div>
        <Blocks blocks={QUALIFY.rest} />
      </Section>

      <Section id="how-much" index={8} label="How much" title={HOW_MUCH.h2}>
        <Blocks blocks={HOW_MUCH.blocks} />
      </Section>

      <Section
        id="about"
        index={9}
        label="About"
        title={ABOUT.h2}
        tone="surface"
      >
        <Blocks blocks={ABOUT.blocks} />
      </Section>

      <Section id="reviews" index={10} label="Reviews">
        <Reviews />
      </Section>

      <Section id="faq" index={11} label="FAQ" title={FAQ_H2} tone="surface">
        <RichFaq items={FAQ} />
        <p className="mk-section-footer">
          <Inline x={FAQ_FOOTER.x} sp={FAQ_FOOTER.sp} />
        </p>
      </Section>

      <Section id="articles" index={12} label="Articles" title={ARTICLES_H2}>
        <Articles />
      </Section>
    </article>
  );
}
