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
 * Server-rendered footer from the Homepage Build Sheet: address block,
 * four link groups (Service / Refund rules by country / Forms & guides /
 * Legal & data), ID-02 disclaimer, tools note, social links, copyright.
 * Every link is a real `<a>` when live and plain text when it ships dark.
 */
export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-top">
          <div className="mk-footer-brand">
            <p className="mk-footer-name">GERMANY PENSION REFUND</p>
            <p>
              {ORG.address.street} · {ORG.address.postalCode} {ORG.address.city}{' '}
              · {ORG.address.country}
            </p>
            <p>
              <a
                href={'tel:' + ORG.phoneE164.replace(/-/g, '')}
                className="mk-footer-link"
              >
                {ORG.phone}
              </a>{' '}
              ·{' '}
              <a href={'mailto:' + ORG.email} className="mk-footer-link">
                {ORG.email}
              </a>
            </p>
            <ul className="mk-footer-social" aria-label="Social">
              {FOOTER_SOCIAL.map((s) => (
                <li key={s.label}>
                  <SmartLink href={s.href} className="mk-footer-link">
                    {s.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
            <p className="mk-footer-fine">
              <a
                href={EXTERNAL.provenExpertEn}
                target="_blank"
                rel="noopener"
                className="mk-footer-link"
              >
                ProvenExpert profile
              </a>
            </p>
          </div>
          <div className="mk-footer-groups">
            <LinkGroup title="Service" links={FOOTER_SERVICE} />
            <CountryIndex />
            <LinkGroup title="Forms & guides" links={FOOTER_FORMS} />
            <LinkGroup title="Legal & data" links={FOOTER_LEGAL} />
          </div>
        </div>
        <div className="mk-footer-bottom">
          <p className="mk-footer-disclaimer">
            <strong>Disclaimer:</strong> {DISCLAIMER_ID02}
          </p>
          <p className="mk-footer-fine">{TOOLS_NOTE}</p>
          <p className="mk-footer-copy">{COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}
