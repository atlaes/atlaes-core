import { homeGraph } from '@/lib/jsonld';
import { AttributionCapture } from '@/lib/attribution';
import { DISCLAIMER_ID02 } from '@/content/site';
import type { Block, Span } from '@/content/types';
import { Blocks } from '../ui/Blocks';
import { Inline } from '../ui/Inline';
import { JsonLd } from '../ui/JsonLd';
import { Pill } from '../ui/Pill';
import { Rail } from '../ui/Section';
import { SmartLink } from '../ui/SmartLink';
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

type P = Extract<Block, { t: 'p' }>;
type Ul = Extract<Block, { t: 'ul' }>;

/** Narrow a block to a paragraph (layout slots expect paragraphs). */
function para(b: Block | undefined): P | null {
  return b && b.t === 'p' ? b : null;
}

/** One paragraph's rich text, without the `<p>` wrapper. */
function Text({ b }: { b: Block | undefined }) {
  const p = para(b);
  return p ? <Inline x={p.x} sp={p.sp} /> : null;
}

/**
 * Split "Title? Rest" / "Title. Rest" at the first `marker` for the two
 * Bureaucracy cards — the sentence becomes the card heading, the rest the
 * body. Pure presentation; the words are unchanged.
 */
function splitAt(x: string, marker: string): [string, string] {
  const at = x.indexOf(marker);
  if (at === -1) return ['', x];
  return [x.slice(0, at + marker.length - 1), x.slice(at + marker.length)];
}

/** "#1: text" → ["#1", "text"]; the colon stays in the DOM, visually hidden. */
function splitNumber(x: string): [string, string] {
  const m = /^(#\d+):\s*/.exec(x);
  return m ? [m[1], x.slice(m[0].length)] : ['', x];
}

function Criteria({ list }: { list: Ul | null }) {
  if (!list) return null;
  return (
    <ul className="mk-criteria">
      {list.items.map((it) => {
        const parts = splitNumber(it.x);
        const sp = (it.sp || []).filter(
          (s: Span) => !(s.k === 'b' && /^#\d+:$/.test(s.x))
        );
        return (
          <li key={it.x} className="mk-criteria-card">
            <span className="mk-criteria-num">
              {parts[0]}
              <span className="mk-sr">:</span>
            </span>
            <span className="mk-criteria-text">
              <Inline x={parts[1]} sp={sp} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Homepage, laid out as Figma Home (626:11297) in Build-Sheet order:
 * hero (navy photo) → intro (white) → eligibility (dark) → how we work
 * (white) → company pension (navy) → law-firm support (white) → video
 * (dark) → Do I Qualify (white) → how much (navy) → about (white) →
 * reviews (#f1f1f1) → FAQ (white) → latest articles (#f1f1f1). One
 * server-side JSON-LD graph (Organization · WebSite · Service · FAQPage).
 */
export function HomePage() {
  const eligibilityList = ELIGIBILITY.blocks.filter(
    (b): b is Ul => b.t === 'ul'
  )[0];
  const addOn = splitAt(para(MANAGED.after[0])?.x || '', '? ');
  const payout = splitAt(para(MANAGED.after[1])?.x || '', '. ');
  const strip = QUALIFY.ctaStrip;

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

      {/* 01 — Introduction (626:11358) */}
      <section
        id="german-pension-refund"
        className="mk-hs mk-tone-plain mk-rule-top"
      >
        <div className="mk-container mk-hs-stack">
          <Rail index={1} label="Introduction" />
          <div className="mk-hs-head">
            <h1 className="mk-h2">{INTRO.h1}</h1>
            <p className="mk-tagline">{INTRO.tagline}</p>
          </div>
          <div className="mk-two">
            <div>
              <Blocks blocks={INTRO.blocks.slice(0, 2)} />
            </div>
            <div>
              <Blocks blocks={INTRO.blocks.slice(2)} />
            </div>
          </div>
        </div>
      </section>

      {/* 02 — Eligibility (626:11370), dark */}
      <section id="eligibility" className="mk-hs mk-tone-dark">
        <div className="mk-container">
          <div className="mk-split mk-split-480">
            <div className="mk-hs-stack">
              <Rail index={2} label="Eligibility" />
              <div>
                <h2 className="mk-h2 mk-h2-tight">{ELIGIBILITY.h2}</h2>
                <Blocks blocks={ELIGIBILITY.blocks.slice(0, 1)} />
              </div>
            </div>
            <Criteria list={eligibilityList || null} />
          </div>
          <div className="mk-hs-foot mk-two">
            <div>
              <Blocks blocks={ELIGIBILITY.blocks.slice(2, 3)} />
            </div>
            <div>
              <Blocks blocks={ELIGIBILITY.blocks.slice(3)} />
            </div>
          </div>
        </div>
      </section>

      {/* 03 — How we work (626:11393) */}
      <section id="managed-process" className="mk-hs mk-tone-plain mk-rule-top">
        <div className="mk-container mk-hs-stack">
          <Rail index={3} label="How we work" />
          <h2 className="mk-h2 mk-h2-flush">{MANAGED.h2}</h2>
          <div className="mk-two">
            <div>
              <Blocks blocks={MANAGED.blocks.slice(0, 3)} />
            </div>
            <div>
              <p className="mk-p mk-strong-lead">
                <Text b={MANAGED.blocks[3]} />
              </p>
              <ul className="mk-checks">
                {MANAGED.documents.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mk-two mk-two-cards">
            <div className="mk-card">
              <p className="mk-label" aria-hidden="true">
                Optional add-on
              </p>
              <h3 className="mk-card-h">{addOn[0]}</h3>
              <p className="mk-p">{addOn[1]}</p>
            </div>
            <div className="mk-card mk-card-dark">
              <p className="mk-label" aria-hidden="true">
                Payout security
              </p>
              <h3 className="mk-card-h">{payout[0]}</h3>
              <p className="mk-p">{payout[1]}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — Company pension (626:11441), navy */}
      <section id="company-pension" className="mk-hs mk-tone-navy mk-deco">
        <span className="mk-deco-glyph" aria-hidden="true">
          ››
        </span>
        <div className="mk-container mk-split mk-split-half">
          <div className="mk-hs-stack">
            <Rail index={4} label="Company pension" />
            <h2 className="mk-h2 mk-h2-flush">{COMPANY_PENSION.h2}</h2>
          </div>
          <div>
            <p className="mk-lead">
              <Text b={COMPANY_PENSION.blocks[0]} />
            </p>
            <Blocks blocks={COMPANY_PENSION.blocks.slice(1, 3)} />
            <p className="mk-p mk-strong-line">
              <Text b={COMPANY_PENSION.blocks[3]} />
            </p>
          </div>
        </div>
      </section>

      {/* 05 — Law-firm support (626:11453) */}
      <section id="law-firm-support" className="mk-hs mk-tone-plain">
        <div className="mk-container mk-split mk-split-480">
          <div className="mk-hs-stack">
            <Rail index={5} label="Law-firm support" />
            <h2 className="mk-h2 mk-h2-flush">{LAW_FIRM.h2}</h2>
          </div>
          <div>
            <Blocks blocks={LAW_FIRM.blocks} />
            <div className="mk-cta-panel">
              <p className="mk-cta-panel-text">{LAW_FIRM.cta.text}</p>
              <Pill href={LAW_FIRM.cta.href} size="lg" arrow>
                {LAW_FIRM.cta.label}
              </Pill>
            </div>
            <p className="mk-note mk-disclaimer">{DISCLAIMER_ID02}</p>
          </div>
        </div>
      </section>

      {/* 06 — How it works / video (626:11468), dark */}
      <section id="how-it-works-video" className="mk-hs mk-tone-dark">
        <div className="mk-container mk-split mk-split-half">
          <div className="mk-hs-stack">
            <Rail index={6} label="How it works" />
            <h2 className="mk-h2 mk-h2-flush">{VIDEO.h2}</h2>
            <div>
              <Blocks blocks={VIDEO.blocks} />
            </div>
            <div className="mk-cta-row mk-cta-row-flush">
              <Pill href={VIDEO.primary.href} variant="light" arrow>
                {VIDEO.primary.label}
              </Pill>
              <SmartLink
                href={VIDEO.secondary.href}
                className="mk-inline-cta"
                darkClassName="mk-inline-cta mk-dark"
              >
                {VIDEO.secondary.label}
              </SmartLink>
            </div>
          </div>
          <div
            className="mk-video"
            role="img"
            aria-label="Video: how our German pension refund service works"
          >
            <span className="mk-video-play" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* 07 — Do I qualify (626:11485) */}
      <section
        id="do-i-qualify"
        className="mk-hs mk-hs-80 mk-tone-plain mk-rule-top"
      >
        <div className="mk-container mk-hs-stack mk-hs-stack-40">
          <Rail index={7} label="Do I qualify" />
          <h2 className="mk-h2 mk-h2-flush">{QUALIFY.h2}</h2>
          <div className="mk-two mk-two-48">
            <div className="mk-qualify-left">
              <Blocks blocks={QUALIFY.intro.slice(0, 2)} />
              <div className="mk-callout mk-callout-surface">
                <Blocks blocks={QUALIFY.intro.slice(2, 3)} />
              </div>
              <div className="mk-muted">
                <Blocks blocks={QUALIFY.intro.slice(3)} />
              </div>
            </div>
            <div className="mk-qualify-right">
              <Blocks blocks={QUALIFY.sixtyMonth.slice(0, 2)} />
              <div className="mk-muted">
                <Blocks blocks={QUALIFY.sixtyMonth.slice(2, 3)} />
              </div>
              <Blocks blocks={QUALIFY.sixtyMonth.slice(3)} />
              <Blocks blocks={QUALIFY.rest.slice(0, -1)} />
              <p className="mk-p mk-small-link">
                <Text b={QUALIFY.rest[QUALIFY.rest.length - 1]} />
              </p>
              <div className="mk-cta-strip">
                <div className="mk-cta-strip-links">
                  {strip.slice(1).map((c, i) => (
                    <span key={c.label} className="mk-cta-strip-item">
                      {i > 0 ? (
                        <span className="mk-cta-strip-dot" aria-hidden="true">
                          ·
                        </span>
                      ) : null}
                      <SmartLink
                        href={c.href}
                        className="mk-cta-strip-link"
                        darkClassName="mk-cta-strip-link mk-dark"
                      >
                        <span aria-hidden="true">›› </span>
                        {c.label}
                      </SmartLink>
                    </span>
                  ))}
                </div>
                {strip[0] ? (
                  <Pill href={strip[0].href} arrow>
                    {strip[0].label}
                  </Pill>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 08 — Refund amount (626:11534), navy */}
      <section id="how-much" className="mk-hs mk-tone-navy mk-deco">
        <span className="mk-deco-glyph mk-deco-low" aria-hidden="true">
          ››
        </span>
        <div className="mk-container mk-split mk-split-half">
          <div className="mk-hs-stack">
            <Rail index={8} label="Refund amount" />
            <h2 className="mk-h2 mk-h2-flush">{HOW_MUCH.h2}</h2>
          </div>
          <div className="mk-how-much">
            <Blocks blocks={HOW_MUCH.blocks} />
          </div>
        </div>
      </section>

      {/* 09 — About us (626:11547) */}
      <section id="about" className="mk-hs mk-tone-plain mk-rule-top">
        <div className="mk-container mk-hs-stack">
          <Rail index={9} label="About us" />
          <h2 className="mk-h2 mk-h2-flush mk-w-760">{ABOUT.h2}</h2>
          <div className="mk-two">
            <div>
              <Blocks blocks={ABOUT.blocks.slice(0, 1)} />
              <p className="mk-p">
                <Text b={ABOUT.blocks[1]} /> <Text b={ABOUT.blocks[2]} />
              </p>
            </div>
            <div>
              <p className="mk-p">
                <Text b={ABOUT.blocks[3]} /> <Text b={ABOUT.blocks[4]} />
              </p>
              <Blocks blocks={ABOUT.blocks.slice(5, 6)} />
              <p className="mk-p">
                <Text b={ABOUT.blocks[6]} />
                <br />
                <Text b={ABOUT.blocks[7]} />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 — Reviews (626:11561), #f1f1f1 */}
      <section id="reviews" className="mk-hs mk-tone-surface">
        <div className="mk-container mk-hs-stack mk-hs-stack-reviews">
          <Rail index={10} label="Reviews" />
          <div className="mk-reviews">
            <Reviews />
          </div>
        </div>
      </section>

      {/* 11 — FAQ (626:11614) */}
      <section id="faq" className="mk-hs mk-tone-plain">
        <div className="mk-container mk-split mk-split-480">
          <div className="mk-hs-stack mk-hs-stack-28">
            <Rail index={11} label="FAQ" />
            <h2 className="mk-h2 mk-h2-flush">{FAQ_H2}</h2>
            <p className="mk-p mk-section-footer mk-section-footer-flush">
              <Inline x={FAQ_FOOTER.x} sp={FAQ_FOOTER.sp} />
            </p>
          </div>
          <RichFaq items={FAQ} />
        </div>
      </section>

      {/* 12 — News (626:11634), #f1f1f1 */}
      <section id="articles" className="mk-hs mk-tone-surface mk-rule-top">
        <div className="mk-container">
          <div className="mk-articles-head">
            <Rail index={12} label="News" />
            <h2 className="mk-h2 mk-h2-flush">{ARTICLES_H2}</h2>
          </div>
          <Articles />
        </div>
      </section>
    </article>
  );
}
