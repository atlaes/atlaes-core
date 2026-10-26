import Link from 'next/link';
import {
  headerCountryDropdown,
  countryHref,
} from '@/content/registries/countries';
import { EXTERNAL } from '@/content/registries/links';
import { HEADER_NAV, type NavItem } from '@/content/site';
import { t } from '@/content/tokens';
import { SmartLink } from '../ui/SmartLink';

const CTA_LABEL = 'Claim Refund';

/**
 * Dark trust bar (#181818): M-15/M-16 sentence with ProvenExpert linked,
 * and a "×" that hides it without client JS (checkbox + label).
 */
function TopBar() {
  const sentence = t('M-15.sentence');
  const idx = sentence.indexOf('ProvenExpert');
  const before = idx === -1 ? sentence : sentence.slice(0, idx);
  const after = idx === -1 ? '' : sentence.slice(idx + 'ProvenExpert'.length);
  return (
    <>
      <input
        type="checkbox"
        id="mk-topbar-close"
        className="mk-topbar-toggle"
        aria-label="Hide the rating bar"
      />
      <div className="mk-topbar">
        <div className="mk-container mk-topbar-inner">
          <p className="mk-topbar-text">
            <span aria-hidden="true">⭐ </span>
            {before}
            {idx !== -1 ? (
              <a href={EXTERNAL.provenExpert} target="_blank" rel="noopener">
                ProvenExpert
              </a>
            ) : null}
            {after}
          </p>
          <label
            htmlFor="mk-topbar-close"
            className="mk-topbar-close"
            aria-hidden="true"
          >
            ×
          </label>
        </div>
      </div>
    </>
  );
}

/** Two-line wordmark: "Germany ››" / "Pension Refund" (Extra Bold, navy). */
export function Wordmark() {
  return (
    <>
      <span className="mk-wordmark-row">
        <span>Germany</span>
        <span className="mk-wordmark-arrows" aria-hidden="true">
          ››
        </span>
      </span>
      <span>Pension Refund</span>
    </>
  );
}

function CountryDropdown({ label }: { label: string }) {
  const items = headerCountryDropdown();
  return (
    <details className="mk-nav-dd">
      <summary>
        {label}{' '}
        <span className="mk-nav-caret" aria-hidden="true">
          ▼
        </span>
      </summary>
      <ul className="mk-nav-dd-list">
        {items.map((c) => (
          <li key={c.slug}>
            <SmartLink
              href={countryHref(c)}
              className="mk-nav-dd-link"
              darkClassName="mk-nav-dd-link mk-dark"
            >
              {c.slug === 'other-countries' ? (
                <strong>{c.name}</strong>
              ) : (
                c.name
              )}
            </SmartLink>
          </li>
        ))}
      </ul>
    </details>
  );
}

function NavList({
  className,
  items,
}: {
  className: string;
  items: NavItem[];
}) {
  return (
    <ul className={className}>
      {items.map((item) =>
        item.dropdown === 'countries' ? (
          <li key={item.label}>
            <CountryDropdown label={item.label} />
          </li>
        ) : (
          <li key={item.label}>
            <SmartLink
              href={item.href}
              className="mk-nav-link"
              darkClassName="mk-nav-link mk-dark"
            >
              {item.label}
            </SmartLink>
          </li>
        )
      )}
    </ul>
  );
}

/**
 * Server-rendered header (Global Main Navigation 104:83): dark trust bar,
 * two-line wordmark, uppercase navigation on one line (≥1360px) with the
 * "Rules by Country" dropdown, the navy "CLAIM REFUND" pill and a 1px
 * #f1f1f1 hairline. No client JavaScript — the dropdown and the phone
 * menu are `<details>` elements. The trust bar sits before `<header>` so
 * that, with motion on, only the header row is sticky (the layout's
 * MotionObserver adds `data-scrolled` for the soft shadow).
 */
export function SiteHeader() {
  const cta = HEADER_NAV.filter((i) => i.label === CTA_LABEL)[0];
  const links = HEADER_NAV.filter((i) => i.label !== CTA_LABEL);
  return (
    <>
      <TopBar />
      <header className="mk-header">
        <div className="mk-container mk-header-row">
          <Link
            href="/"
            className="mk-wordmark"
            aria-label="Germany Pension Refund — home"
          >
            <Wordmark />
          </Link>
          <nav className="mk-nav-desktop" aria-label="Main">
            <NavList className="mk-nav-list" items={links} />
          </nav>
          <div className="mk-header-actions">
            {cta ? (
              <SmartLink
                href={cta.href}
                className="mk-nav-cta"
                darkClassName="mk-nav-cta mk-dark"
              >
                {cta.label}
              </SmartLink>
            ) : null}
            <details className="mk-nav-mobile">
              <summary aria-label="Open menu">
                <span className="mk-burger" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </summary>
              <nav className="mk-nav-mobile-panel" aria-label="Main (mobile)">
                <NavList className="mk-nav-list-mobile" items={links} />
              </nav>
            </details>
          </div>
        </div>
        <div className="mk-header-rule" />
      </header>
    </>
  );
}
