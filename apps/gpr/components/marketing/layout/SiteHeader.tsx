import Link from 'next/link';
import {
  headerCountryDropdown,
  countryHref,
} from '@/content/registries/countries';
import { EXTERNAL } from '@/content/registries/links';
import { HEADER_NAV } from '@/content/site';
import { t } from '@/content/tokens';
import { SmartLink } from '../ui/SmartLink';

/** Top bar: M-15/M-16 sentence with ProvenExpert linked. */
function TopBar() {
  const sentence = t('M-15.sentence');
  const idx = sentence.indexOf('ProvenExpert');
  const before = idx === -1 ? sentence : sentence.slice(0, idx);
  const after = idx === -1 ? '' : sentence.slice(idx + 'ProvenExpert'.length);
  return (
    <div className="mk-topbar">
      <div className="mk-container">
        <span aria-hidden="true">⭐ </span>
        {before}
        {idx !== -1 ? (
          <a href={EXTERNAL.provenExpert} target="_blank" rel="noopener">
            ProvenExpert
          </a>
        ) : null}
        {after}
      </div>
    </div>
  );
}

function CountryDropdown({ label }: { label: string }) {
  const items = headerCountryDropdown();
  return (
    <details className="mk-nav-dd">
      <summary>
        {label} <span aria-hidden="true">▾</span>
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

function NavList({ className }: { className: string }) {
  return (
    <ul className={className}>
      {HEADER_NAV.map((item) =>
        item.dropdown === 'countries' ? (
          <li key={item.label}>
            <CountryDropdown label={item.label} />
          </li>
        ) : (
          <li key={item.label}>
            <SmartLink
              href={item.href}
              className={
                'mk-nav-link' +
                (item.label === 'Claim Refund' ? ' mk-nav-cta' : '')
              }
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
 * Server-rendered header: top bar, wordmark, main navigation with the
 * "Rules by Country" dropdown. No client JavaScript — the dropdown and the
 * phone menu are `<details>` elements.
 */
export function SiteHeader() {
  return (
    <header className="mk-header">
      <TopBar />
      <div className="mk-container mk-header-row">
        <Link
          href="/"
          className="mk-wordmark"
          aria-label="Germany Pension Refund — home"
        >
          <span className="mk-wordmark-main">Germany Pension Refund</span>
        </Link>
        <nav className="mk-nav-desktop" aria-label="Main">
          <NavList className="mk-nav-list" />
        </nav>
        <details className="mk-nav-mobile">
          <summary aria-label="Open menu">
            <span className="mk-burger" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Menu
          </summary>
          <nav aria-label="Main (mobile)">
            <NavList className="mk-nav-list-mobile" />
          </nav>
        </details>
      </div>
    </header>
  );
}
