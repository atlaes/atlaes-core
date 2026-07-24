import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Payment Terms | CompanyPension',
};

// ---------------------------------------------------------------------------
// All figures and deposit rules are transcribed from the client-approved
// Pricing page (€199 deposit, 9.75% success fee, €199 minimum total fee,
// route-specific deposit rules). If pricing changes, update both pages
// together. Pending legal review — flagged in the task report.
// ---------------------------------------------------------------------------

export default function PaymentTermsPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Payment Terms"
        body="How the deposit and the success-based service fee work when you use the CompanyPension platform."
      />

      <LegalArticle updated="12 July 2026">
        <h2>1. Fee model at a glance</h2>
        <ul>
          <li>
            A <strong>€199 deposit</strong> activates the secure application
            process.
          </li>
          <li>
            The service fee is a <strong>9.75% success fee</strong> of the
            approved cash-out or refund amount.
          </li>
          <li>
            The <strong>minimum total service fee is €199</strong>.
          </li>
          <li>
            The deposit is <strong>always credited</strong> toward the final
            service fee.
          </li>
        </ul>
        <p>
          Worked examples are shown on the <Link href="/pricing">Pricing</Link>{' '}
          page. The exact amounts and rules applicable to your case are always
          shown before you pay.
        </p>

        <h2>2. The deposit</h2>
        <p>
          The €199 deposit is due when you activate the full application
          process. It covers the digital case setup, the document review and the
          preparation of your application, and is credited in full toward the
          final service fee if your case is approved.
        </p>

        <h2>3. The success fee</h2>
        <p>
          If the pension provider, scheme or institution approves your cash-out
          or refund, the service fee of 9.75% of the approved amount becomes
          due, subject to the €199 minimum total fee. The deposit you already
          paid is deducted, and only the remaining fee is invoiced. The approved
          money itself is paid by the provider directly to the bank account you
          provide—CompanyPension does not receive, hold or forward approved
          pension money.
        </p>

        <h2>4. Deposit rules if a case cannot proceed</h2>
        <h3>bAV cash-outs</h3>
        <p>
          If a cash-out cannot be submitted after the digital case and document
          review, €79 is retained and €120 is refunded.
        </p>
        <h3>VBL, ZVK, VddB and VddKO refunds</h3>
        <p>
          If the pension institution rejects your completed and submitted refund
          request, the €199 deposit is refunded in full.
        </p>

        <h2>5. Payment methods and invoicing</h2>
        <p>
          Available payment methods are shown at checkout before you pay. The
          remaining service fee is invoiced after the provider&apos;s approval
          and is due upon receipt of the invoice, unless the invoice states
          otherwise. All amounts include statutory VAT where applicable.
        </p>

        <h2>6. Right of withdrawal</h2>
        <p>
          If you are a consumer, your statutory right of withdrawal is described
          in the <Link href="/revocation">Revocation</Link> notice, including
          what happens to payments already made if you withdraw.
        </p>

        <h2>7. Questions</h2>
        <p>
          For questions about a payment or an invoice, contact{' '}
          <a href="mailto:info@companypension.de">info@companypension.de</a>.
        </p>
      </LegalArticle>
    </>
  );
}
