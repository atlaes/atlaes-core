import Link from 'next/link';
import CompanyPensionLogo from '@/components/vbl/icons/CompanyPensionLogo';

type FooterLink = { label: string; href: string };
type FooterColumn = { heading: string; links: FooterLink[] };

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'COMPANY',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Reviews', href: '/reviews' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'LEGAL',
    links: [
      { label: 'Imprint', href: '/imprint' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Cookie Policy / Cookie Settings', href: '/cookie-policy' },
      { label: 'Terms and Conditions', href: '/terms' },
      { label: 'Payment Terms', href: '/payment-terms' },
      { label: 'Revocation', href: '/revocation' },
    ],
  },
  {
    heading: 'PRIVACY REQUESTS',
    links: [
      { label: 'Data Access Request', href: '/data-access-request' },
      { label: 'Data Deletion Request', href: '/data-deletion-request' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-brand text-white">
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-md">
            <CompanyPensionLogo className="h-auto w-[260px]" />
            <p className="mt-6 text-base leading-relaxed text-white/80">
              Cash out or refund your German company pension online through a
              guided digital process, with human support when clarification or
              follow-up is needed.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-white/70">
              Operated by ATLAES GmbH, Kaskelstraße 46, 10317 Berlin, Germany.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                  {column.heading}
                </h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-base text-white/80 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl space-y-3 text-center text-sm leading-relaxed text-white/60">
          <p>
            CompanyPension is a digital application platform and brand operated
            by ATLAES GmbH.
          </p>
          <p>
            The platform uses the information provided by users to complete
            their applications. Users review and sign their applications
            themselves and remain the applicant and claimant throughout the
            process. After signing, ATLAES GmbH technically transmits the
            application to the relevant pension provider, scheme or institution.
            Where authorised, ATLAES GmbH may receive and forward correspondence
            and information about the final decision. Neither CompanyPension nor
            ATLAES GmbH provides legal, pension, tax, insurance or financial
            advice or acts as the claimant. Approval and payment decisions are
            made by the relevant provider, pension scheme or institution.
            Approved funds are paid directly to the bank account provided by the
            user. ATLAES GmbH does not receive, hold or forward approved pension
            money. If separate legal services are needed for a specific case,
            they are provided by the responsible legal partner under a separate
            arrangement.
          </p>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-sm font-semibold text-accent">
            Copyright © 2026 Company Pension. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
