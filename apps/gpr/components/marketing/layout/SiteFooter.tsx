import Link from 'next/link';
import {
  countryHref,
  footerCountryIndex,
} from '@/content/registries/countries';
import { EXTERNAL } from '@/content/registries/links';
import {
  COPYRIGHT,
  DISCLAIMER_ID02,
  FOOTER_COUNTRY_FOOTNOTE,
  FOOTER_FORMS,
  FOOTER_LEGAL,
  FOOTER_SERVICE,
  FOOTER_SOCIAL,
  ORG,
  TOOLS_NOTE,
  type FooterLink,
} from '@/content/site';
import { SmartLink } from '../ui/SmartLink';
import { Wordmark } from './SiteHeader';

/** Round white-outline icons exported from the Figma footer (595:7841). */
const SOCIAL_ICON: { [label: string]: string } = {
  LinkedIn: '/marketing/social-linkedin.svg',
  Facebook: '/marketing/social-facebook.svg',
  X: '/marketing/social-x.svg',
  YouTube: '/marketing/social-youtube.svg',
  Instagram: '/marketing/social-instagram.svg',
  Email: '/marketing/social-email.svg',
};

/**
 * Current-year ProvenExpert awards, shown above the 2024/2025 strip
 * (badges from Johannes, 3 Nov 2026).
 */
const FOOTER_AWARD_BADGES = [
  {
    src: '/marketing/provenexpert-top-recommendation-2026.png',
    alt: 'ProvenExpert Top Recommendation 2026',
  },
  {
    src: '/marketing/provenexpert-top-service-provider-2026.png',
    alt: 'ProvenExpert Top Service Provider 2026',
  },
];

function LinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="mk-footer-group">
      <h2 className="mk-footer-h">{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.label + l.href}>
            <SmartLink
              href={l.href}
              className="mk-footer-link"
              darkClassName="mk-footer-link mk-dark"
            >
              {l.label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountryIndex() {
  const entries = footerCountryIndex();
  return (
    <div className="mk-footer-group mk-footer-countries">
      <h2 className="mk-footer-h">Refund rules by country</h2>
      <ul>
        {entries.map((c) => (
          <li key={c.slug}>
            <SmartLink
              href={countryHref(c)}
              className="mk-footer-link"
              darkClassName="mk-footer-link mk-dark"
            >
              {c.slug === 'other-countries' ? (
                <strong>{c.name}</strong>
              ) : (
                c.name
              )}
            </SmartLink>
            {c.footnote ? <sup>†</sup> : null}
          </li>
        ))}
      </ul>
      <p className="mk-footer-fine">{FOOTER_COUNTRY_FOOTNOTE}</p>
    </div>
  );
}

/**
 * Server-rendered footer (Site footer blue 602:1867): navy bands with
 * white 20 % rules — brand row (wordmark, address, social icons,
 * ProvenExpert badges), four link groups (Service / Refund rules by
 * country / Forms & guides / Legal & data), ID-02 disclaimer + tools note,
 * copyright bar. Every link is a real `<a>` when live and plain text when
 * it ships dark.
 */
export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-band mk-footer-brandrow">
        <div className="mk-footer-brand">
          <Link
            href="/"
            className="mk-wordmark"
            aria-label="Germany Pension Refund — home"
          >
            <Wordmark />
          </Link>
          <p className="mk-footer-address">
            {ORG.address.street} · {ORG.address.postalCode} {ORG.address.city} ·{' '}
            {ORG.address.country}
            <br />
            <a href={'tel:' + ORG.phoneE164.replace(/-/g, '')}>{ORG.phone}</a>
            {' · '}
            <a href={'mailto:' + ORG.email}>{ORG.email}</a>
          </p>
        </div>
        <div className="mk-footer-badges-block">
          <ul className="mk-footer-social" aria-label="Social">
            {FOOTER_SOCIAL.map((s) => (
              <li key={s.label}>
                <SmartLink href={s.href} aria-label={s.label} title={s.label}>
                  {SOCIAL_ICON[s.label] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={SOCIAL_ICON[s.label]}
                      alt=""
                      width={34}
                      height={34}
                    />
                  ) : (
                    s.label
                  )}
                </SmartLink>
              </li>
            ))}
          </ul>
          <a
            href={EXTERNAL.provenExpertEn}
            target="_blank"
            rel="noopener"
            className="mk-footer-badges-link"
          >
            <span className="mk-footer-badges-current">
              {FOOTER_AWARD_BADGES.map((b) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={b.src}
                  src={b.src}
                  alt={b.alt}
                  width={89}
                  height={89}
                />
              ))}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mk-footer-badges"
              src="/marketing/provenexpert-badges.png"
              alt="ProvenExpert Top Recommendation and Top Service Provider 2024 and 2025"
              width={390}
              height={89}
            />
          </a>
        </div>
      </div>
      <div className="mk-container">
        <div className="mk-footer-rule" />
      </div>
      <div className="mk-container mk-footer-band">
        <div className="mk-footer-groups">
          <LinkGroup title="Service" links={FOOTER_SERVICE} />
          <CountryIndex />
          <LinkGroup title="Forms & guides" links={FOOTER_FORMS} />
          <LinkGroup title="Legal & data" links={FOOTER_LEGAL} />
        </div>
      </div>
      <div className="mk-container">
        <div className="mk-footer-rule" />
      </div>
      <div className="mk-container mk-footer-disclaimer">
        <p>
          <strong>Disclaimer:</strong> {DISCLAIMER_ID02}
        </p>
        <p>{TOOLS_NOTE}</p>
      </div>
      <div className="mk-container">
        <div className="mk-footer-rule" />
      </div>
      <p className="mk-container mk-footer-copy">{COPYRIGHT}</p>
    </footer>
  );
}
