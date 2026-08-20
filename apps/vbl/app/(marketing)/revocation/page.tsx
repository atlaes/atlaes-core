import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Revocation | CompanyPension',
};

// ---------------------------------------------------------------------------
// Standard consumer withdrawal instruction (Widerrufsbelehrung) for a service
// contract concluded online, including the statutory model withdrawal form
// and the early-expiry rule for fully performed services (Section 356 (4)
// BGB). The /withdraw-contract flow is the platform's digital way to exercise
// this right. Pending legal review — flagged in the task report.
// ---------------------------------------------------------------------------

export default function RevocationPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Revocation"
        body="Your statutory right of withdrawal as a consumer, and how to exercise it."
      />

      <LegalArticle updated="12 July 2026">
        <h2>Right of withdrawal</h2>
        <p>
          If you are a consumer, you have the right to withdraw from this
          contract within 14 days without giving any reason. The withdrawal
          period is 14 days from the day of the conclusion of the contract.
        </p>
        <p>To exercise the right of withdrawal, you must inform us—</p>
        <p>
          <strong>ATLAES GmbH</strong>
          <br />
          Kaskelstraße 46
          <br />
          10317 Berlin, Germany
          <br />
          Email:{' '}
          <a href="mailto:info@companypension.de">info@companypension.de</a>
        </p>
        <p>
          —of your decision to withdraw from this contract by an unequivocal
          statement (for example a letter sent by post or an email). You may use
          the model withdrawal form below, but this is not obligatory. You can
          also withdraw online using our{' '}
          <Link href="/withdraw-contract">contract withdrawal page</Link>.
        </p>
        <p>
          To meet the withdrawal deadline, it is sufficient for you to send your
          communication concerning your exercise of the right of withdrawal
          before the withdrawal period has expired.
        </p>

        <h2>Effects of withdrawal</h2>
        <p>
          If you withdraw from this contract, we shall reimburse to you all
          payments received from you without undue delay and in any event not
          later than 14 days from the day on which we are informed about your
          decision to withdraw from this contract. We will carry out such
          reimbursement using the same means of payment as you used for the
          initial transaction, unless you have expressly agreed otherwise; in
          any event, you will not incur any fees as a result of such
          reimbursement.
        </p>
        <p>
          If you requested that the service begin during the withdrawal period,
          you shall pay us an amount which is in proportion to what has been
          provided until you have communicated your withdrawal from this
          contract, in comparison with the full coverage of the contract.
        </p>
        <p>
          The right of withdrawal expires early if we have fully performed the
          service and have only begun performing it after you gave your express
          consent and acknowledged that you lose your right of withdrawal upon
          full performance of the contract.
        </p>

        <h2>Model withdrawal form</h2>
        <p>
          If you want to withdraw from the contract, you may fill out this form
          and send it back to us:
        </p>
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-gray-700 sm:p-8">
          <p className="mt-0">
            To ATLAES GmbH, Kaskelstraße 46, 10317 Berlin, Germany,
            info@companypension.de:
          </p>
          <p>
            I/we (*) hereby give notice that I/we (*) withdraw from my/our (*)
            contract for the provision of the following service: ______
          </p>
          <p>Ordered on (*)/received on (*): ______</p>
          <p>Name of consumer(s): ______</p>
          <p>Address of consumer(s): ______</p>
          <p>
            Signature of consumer(s) (only if this form is notified on paper):
            ______
          </p>
          <p>Date: ______</p>
          <p className="text-sm text-gray-500">(*) Delete as appropriate.</p>
        </div>
      </LegalArticle>
    </>
  );
}
