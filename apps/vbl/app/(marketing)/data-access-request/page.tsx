import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Data Access Request | CompanyPension',
};

// ---------------------------------------------------------------------------
// Modeled on the ATLAES data-request page on germanypensionrefund.com (rights
// summary, email-based request flow via privacy@atlaes.de, identity
// verification, statutory response window). Pending legal review — flagged in
// the task report.
// ---------------------------------------------------------------------------

export default function DataAccessRequestPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Privacy requests"
        title="Data Access Request"
        body="Request a copy of the personal data ATLAES GmbH holds about you (Art. 15 GDPR)."
      />

      <LegalArticle updated="12 July 2026">
        <h2>Your right of access</h2>
        <p>
          Under Art. 15 GDPR you can request confirmation of whether we process
          personal data about you and, if so, receive a copy of that data
          together with information about the purposes of processing, the
          categories of data, the recipients, the planned storage period and
          your further rights. You can exercise this right regardless of how
          your data was collected—through the platform, by email or during your
          application process.
        </p>
        <p>
          Related rights (rectification under Art. 16, restriction and objection
          under Arts. 18–21, portability under Art. 20 and erasure under Art. 17
          GDPR) are described in our{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>. For deletion, use
          the <Link href="/data-deletion-request">Data Deletion Request</Link>{' '}
          page.
        </p>

        <h2>How to make a request</h2>
        <p>Email your request to our data protection team at:</p>
        <p>
          <a href="mailto:privacy@atlaes.de">privacy@atlaes.de</a>
        </p>
        <p>Please include:</p>
        <ol>
          <li>your full name,</li>
          <li>
            the email address you used on the CompanyPension platform, and
          </li>
          <li>
            a short description of your request (for example &quot;Data access
            request&quot;).
          </li>
        </ol>
        <p>
          For security reasons we may ask for additional identity verification
          before processing your request, so that personal data is never
          disclosed to the wrong person.
        </p>

        <h2>What happens next</h2>
        <p>
          We respond to all verified requests without undue delay and at the
          latest within one month of receipt, as required by Art. 12 GDPR. You
          will receive your data in a structured, commonly used format, together
          with the accompanying information required by Art. 15 GDPR. The
          request is free of charge.
        </p>
      </LegalArticle>
    </>
  );
}
