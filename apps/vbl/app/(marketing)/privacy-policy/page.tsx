import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Privacy Policy | CompanyPension',
};

// ---------------------------------------------------------------------------
// Structure follows the ATLAES data protection declaration on
// germanypensionrefund.com, adapted to this platform's actual processing
// (AWS Frankfurt hosting, email/magic-link and Google sign-in, application
// document uploads, transmission to pension providers). Wix/analytics/ads
// sections of the GPR policy do not apply here and were not carried over.
// Content pending legal review — flagged in the task report.
// ---------------------------------------------------------------------------

export default function PrivacyPolicyPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        body="How ATLAES GmbH handles your personal data when you use the CompanyPension platform."
      />

      <LegalArticle updated="12 July 2026">
        <h2>1. Controller and contact details</h2>
        <p>
          The controller responsible for data processing on this website within
          the meaning of the General Data Protection Regulation (GDPR) is:
        </p>
        <p>
          <strong>ATLAES GmbH</strong>
          <br />
          Kaskelstraße 46
          <br />
          10317 Berlin, Germany
          <br />
          Email: <a href="mailto:privacy@atlaes.de">privacy@atlaes.de</a>
        </p>
        <p>
          Personal data is any data with which you can be personally identified.
          This policy explains what data we collect on the CompanyPension
          platform, why we collect it, and which rights you have.
        </p>

        <h2>2. Data collected when you visit our website</h2>
        <p>
          When you use our website for information only, we collect the data
          your browser transmits to our servers (server log files): the pages
          you visit, date and time of access, amount of data transferred, the
          source from which you reached the page, your browser and operating
          system, and your IP address. This processing is based on Art. 6 (1)
          point f GDPR, on the basis of our legitimate interest in the stability
          and security of the platform.
        </p>
        <p>
          This website uses SSL/TLS encryption to protect the transmission of
          personal data. You can recognise an encrypted connection by the
          https:// prefix and the lock symbol in your browser bar.
        </p>

        <h2>3. Hosting</h2>
        <p>
          The platform is hosted on infrastructure provided by Amazon Web
          Services (AWS), with data stored in the AWS region eu-central-1
          (Frankfurt, Germany). We have concluded a data processing agreement
          with the provider that ensures the protection of our users&apos; data
          and prohibits unauthorised disclosure to third parties.
        </p>

        <h2>4. Account registration and sign-in</h2>
        <p>
          To use the application process you create an account. We process your
          email address and sign-in data on the basis of Art. 6 (1) point b GDPR
          (performance of a contract). You can sign in with a one-time email
          link (magic link) or through Google Sign-In. If you use Google
          Sign-In, Google Ireland Limited, Gordon House, Barrow Street, Dublin
          4, Ireland, processes your data in accordance with its own privacy
          policy; we receive only the profile data needed to create and secure
          your account (name and email address).
        </p>

        <h2>5. Data processed for your application</h2>
        <p>
          The purpose of the platform is to prepare and submit your cash-out or
          refund application. For this we process the data you provide in the
          guided flow on the basis of Art. 6 (1) point b GDPR:
        </p>
        <ul>
          <li>identity data and identity documents you upload,</li>
          <li>pension membership and employment information,</li>
          <li>your current address and contact details,</li>
          <li>bank details for the payout by the pension provider,</li>
          <li>your signature for the application documents.</li>
        </ul>
        <p>
          Uploaded documents are processed with automated text recognition to
          pre-fill your application; you review and confirm all extracted data
          yourself before signing. Service providers used for this operate under
          data processing agreements.
        </p>

        <h2>6. Transmission to pension providers</h2>
        <p>
          After you have reviewed and signed your application, ATLAES GmbH
          technically transmits it to the relevant pension provider, scheme or
          institution (for example VBL, a ZVK, VddB or VddKO, or a bAV insurer).
          Where authorised, ATLAES GmbH may receive and forward correspondence
          and information about the final decision. Approval and payment
          decisions are made by the relevant provider; approved funds are paid
          directly to the bank account you provide.
        </p>

        <h2>7. Payment processing</h2>
        <p>
          When you pay the deposit or the service fee, your payment data is
          processed by our payment service provider on the basis of Art. 6 (1)
          point b GDPR. We do not store complete payment card data on our own
          systems.
        </p>

        <h2>8. Contacting us</h2>
        <p>
          When you contact us (for example by email), the data you provide is
          stored and used exclusively to respond to your request (Art. 6 (1)
          point f GDPR; Art. 6 (1) point b GDPR if your request relates to a
          contract). It is deleted once your request has been dealt with, unless
          statutory retention obligations apply.
        </p>

        <h2>9. Cookies and local storage</h2>
        <p>
          The platform uses only technically necessary cookies and browser
          storage (for example to keep you signed in during the application
          process). Details are described in our{' '}
          <Link href="/cookie-policy">Cookie Policy</Link>.
        </p>

        <h2>10. Retention periods</h2>
        <p>
          We store personal data only as long as needed for the purposes
          described above. Certain records (for example accounting documents and
          business correspondence) must be retained for statutory periods under
          German law (Section 147 AO, Section 257 HGB) and are deleted after
          those periods expire.
        </p>

        <h2>11. Your rights</h2>
        <p>Under the GDPR you have the right to:</p>
        <ul>
          <li>
            <strong>Access (Art. 15 GDPR)</strong> — request a copy of the
            personal data we hold about you (see{' '}
            <Link href="/data-access-request">Data Access Request</Link>),
          </li>
          <li>
            <strong>Rectification (Art. 16 GDPR)</strong> — have inaccurate data
            corrected,
          </li>
          <li>
            <strong>Erasure (Art. 17 GDPR)</strong> — request deletion of your
            data where legally permissible (see{' '}
            <Link href="/data-deletion-request">Data Deletion Request</Link>),
          </li>
          <li>
            <strong>Restriction and objection (Arts. 18–21 GDPR)</strong> —
            limit or object to certain processing,
          </li>
          <li>
            <strong>Portability (Art. 20 GDPR)</strong> — receive your data in a
            structured, machine-readable format.
          </li>
        </ul>
        <p>
          To exercise these rights, email{' '}
          <a href="mailto:privacy@atlaes.de">privacy@atlaes.de</a>. You also
          have the right to lodge a complaint with a supervisory authority; the
          authority responsible for us is the Berlin Commissioner for Data
          Protection and Freedom of Information (Berliner Beauftragte für
          Datenschutz und Informationsfreiheit).
        </p>

        <h2>12. Changes to this policy</h2>
        <p>
          We may update this privacy policy when the platform or the legal
          situation changes. The current version is always published on this
          page.
        </p>
      </LegalArticle>
    </>
  );
}
