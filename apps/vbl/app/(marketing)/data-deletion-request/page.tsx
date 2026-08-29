import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Data Deletion Request | CompanyPension',
};

// ---------------------------------------------------------------------------
// Modeled on the ATLAES data-request page on germanypensionrefund.com,
// including the statutory-retention caveat (Section 147 AO, Section 257 HGB)
// and the identity-verification step. Pending legal review — flagged in the
// task report.
// ---------------------------------------------------------------------------

export default function DataDeletionRequestPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Privacy requests"
        title="Data Deletion Request"
        body="Request the deletion of your personal data held by ATLAES GmbH (Art. 17 GDPR)."
      />

      <LegalArticle updated="12 July 2026">
        <h2>Your right to erasure</h2>
        <p>
          Under Art. 17 GDPR (the &quot;right to be forgotten&quot;) you can
          request the deletion of your personal data when it is no longer needed
          for the purposes it was collected for, when you withdraw consent the
          processing was based on, or when you successfully object to the
          processing. You can exercise this right regardless of how your data
          was collected.
        </p>

        <h2>Statutory retention periods</h2>
        <p>
          Certain records (for example accounting documents, invoices and
          business correspondence) must be retained for statutory periods under
          German law (Section 147 AO, Section 257 HGB). Such records are
          restricted from other processing and deleted once the retention period
          expires.
        </p>
        <p>
          Please also note: if you request deletion while an application is
          still in progress, we may no longer be able to continue processing
          your case, because the application data is required to perform the
          contract.
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
            a short description of your request (for example &quot;Data deletion
            request&quot;).
          </li>
        </ol>
        <p>
          For security reasons we may ask for additional identity verification
          before processing your request, so that data is never deleted or
          disclosed on behalf of the wrong person.
        </p>

        <h2>What happens next</h2>
        <p>
          We respond to all verified requests without undue delay and at the
          latest within one month of receipt, as required by Art. 12 GDPR. We
          will confirm which data has been deleted and which data remains
          subject to statutory retention. If you only want a copy of your data,
          use the <Link href="/data-access-request">Data Access Request</Link>{' '}
          page instead; more detail on all your rights is in our{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>
      </LegalArticle>
    </>
  );
}
