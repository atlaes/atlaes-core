import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Terms and Conditions | CompanyPension',
};

// ---------------------------------------------------------------------------
// The service description mirrors the platform-scope wording approved for the
// footer and About page (platform prepares applications, user remains the
// applicant, providers decide, funds are paid directly to the user). Fee
// figures live on /payment-terms and /pricing only. Pending legal review —
// flagged in the task report.
// ---------------------------------------------------------------------------

export default function TermsPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Terms and Conditions"
        body="The terms that apply when you use the CompanyPension platform operated by ATLAES GmbH."
      />

      <LegalArticle updated="12 July 2026">
        <h2>1. Provider and scope</h2>
        <p>
          These terms and conditions govern the use of the CompanyPension
          platform, operated by <strong>ATLAES GmbH</strong>, Kaskelstraße 46,
          10317 Berlin, Germany (&quot;ATLAES&quot;, &quot;we&quot;). They apply
          to all services offered through this website.
        </p>

        <h2>2. The service</h2>
        <p>
          CompanyPension is a digital application platform. It guides you
          through preparing a cash-out or refund application for a German
          company pension (for example bAV cash-outs and VBL, ZVK, VddB or VddKO
          refunds) using the information and documents you provide.
        </p>
        <p>
          You review and sign your application yourself and remain the applicant
          and claimant throughout the process. After signing, ATLAES technically
          transmits the application to the relevant pension provider, scheme or
          institution. Where authorised, ATLAES may receive and forward
          correspondence and information about the final decision.
        </p>

        <h2>3. No advice</h2>
        <p>
          Neither CompanyPension nor ATLAES provides legal, pension, tax,
          insurance or financial advice, and neither acts as the claimant.
          Estimates shown on the platform (for example from the refund
          calculator) are non-binding illustrations. If separate legal services
          are needed for a specific case, they are provided by the responsible
          legal partner under a separate arrangement.
        </p>

        <h2>4. Decisions and payout</h2>
        <p>
          Approval and payment decisions are made exclusively by the relevant
          provider, pension scheme or institution. Approved funds are paid
          directly to the bank account you provide. ATLAES does not receive,
          hold or forward approved pension money. ATLAES does not guarantee that
          an application will be approved or that a particular amount will be
          paid.
        </p>

        <h2>5. Your obligations</h2>
        <ul>
          <li>
            Provide complete, accurate and up-to-date information and documents;
            you confirm their correctness when you review and sign your
            application.
          </li>
          <li>
            Use the platform only for your own case and keep your sign-in access
            confidential.
          </li>
          <li>
            Inform us promptly of relevant changes (for example a new address or
            bank account) while your case is in progress.
          </li>
        </ul>

        <h2>6. Fees and payment</h2>
        <p>
          The service is charged as a deposit plus a success-based service fee.
          The applicable amounts, crediting rules and deposit rules are shown on
          the <Link href="/pricing">Pricing</Link> page and in the{' '}
          <Link href="/payment-terms">Payment Terms</Link>, which form part of
          these terms.
        </p>

        <h2>7. Right of withdrawal</h2>
        <p>
          If you are a consumer, you have a statutory right to withdraw from the
          contract within 14 days. Details, the model withdrawal form and the
          online withdrawal option are described in the{' '}
          <Link href="/revocation">Revocation</Link> notice.
        </p>

        <h2>8. Liability</h2>
        <p>
          ATLAES is liable without limitation for intent and gross negligence
          and for injury to life, body or health. For slight negligence, ATLAES
          is liable only for breaches of essential contractual obligations
          (obligations whose fulfilment makes the proper performance of the
          contract possible in the first place), limited to the damage typical
          and foreseeable for this type of contract. Liability under the German
          Product Liability Act remains unaffected.
        </p>

        <h2>9. Data protection</h2>
        <p>
          Information on how we process personal data is provided in the{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>

        <h2>10. Final provisions</h2>
        <p>
          The law of the Federal Republic of Germany applies, excluding the UN
          Convention on Contracts for the International Sale of Goods. If you
          are a consumer, this choice of law does not deprive you of the
          protection of mandatory provisions of the state of your habitual
          residence. Should individual provisions of these terms be or become
          invalid, the validity of the remaining provisions remains unaffected.
        </p>
        <p>
          Questions about these terms:{' '}
          <a href="mailto:info@companypension.de">info@companypension.de</a>.
        </p>
      </LegalArticle>
    </>
  );
}
