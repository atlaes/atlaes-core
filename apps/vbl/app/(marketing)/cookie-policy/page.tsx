import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Cookie Policy | CompanyPension',
};

// ---------------------------------------------------------------------------
// Reflects the platform's actual state: only strictly necessary cookies and
// browser storage (auth session tokens), no analytics or advertising tags, so
// no consent manager is required yet. If non-essential services are added, a
// cookie settings tool must be added here. Pending legal review — flagged in
// the task report.
// ---------------------------------------------------------------------------

export default function CookiePolicyPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Cookie Policy"
        body="Which cookies and browser storage the CompanyPension platform uses, and how you can control them."
      />

      <LegalArticle updated="12 July 2026">
        <h2>1. What cookies and browser storage are</h2>
        <p>
          Cookies are small text files that a website stores on your device.
          Related browser technologies such as local storage allow a website to
          keep small amounts of data in your browser, for example to keep you
          signed in. In this policy, &quot;cookies&quot; covers both.
        </p>

        <h2>2. What we use</h2>
        <p>
          The CompanyPension platform currently uses only{' '}
          <strong>strictly necessary</strong> cookies and browser storage:
        </p>
        <ul>
          <li>
            <strong>Session and sign-in storage</strong> — after you sign in,
            your session tokens are kept in your browser&apos;s local storage so
            you stay signed in while you complete your application. They are
            removed when you sign out.
          </li>
          <li>
            <strong>Security and platform function</strong> — technical cookies
            that protect the platform (for example against misuse of forms and
            endpoints) and remember essential preferences during the guided
            flow.
          </li>
        </ul>
        <p>
          Strictly necessary cookies do not require consent under Section 25 (2)
          TDDDG; the related processing of personal data is based on Art. 6 (1)
          point b and f GDPR.
        </p>

        <h2>3. What we do not use</h2>
        <p>
          We currently do not use advertising, tracking or third-party analytics
          cookies on this website. Because no consent-requiring cookies are in
          use, no cookie consent banner or settings tool is shown. If we
          introduce such services in the future, we will update this policy and
          provide a cookie settings tool where you can give and revoke consent.
        </p>

        <h2>4. Managing cookies in your browser</h2>
        <p>
          You can configure your browser to inform you when cookies are set, to
          accept them only case by case, or to block them entirely, and you can
          delete stored cookies and site data at any time. Please note that
          blocking strictly necessary cookies and storage may prevent you from
          signing in and completing your application.
        </p>

        <h2>5. More information</h2>
        <p>
          Details on how we process personal data are in our{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>. For questions,
          contact <a href="mailto:privacy@atlaes.de">privacy@atlaes.de</a>.
        </p>
      </LegalArticle>
    </>
  );
}
