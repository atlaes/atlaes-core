import type { FaqAccordionItem } from './FaqAccordion';

// ---------------------------------------------------------------------------
// Shared FAQ content — single source of truth for every marketing page.
//
// All questions and answers are transcribed verbatim from the client's FAQ
// master copy in Google Drive ("FAQ CompanyPension 22062026.pdf", the
// "DEV - CompanyPension - FE content" folder), grouped by its six categories:
// General, bAV cash-outs, VBL & ZVK, VddB & VddKO, Digital process, Pricing.
//
// Pages compose the items they need from `FAQ` (keyed by slug). Where a page's
// Figma-designed question wording differs from the master, spread the shared
// answer and override just the question, e.g.
//   { ...FAQ.whoReceives, question: 'Will CompanyPension receive my money?' }
//
// Governance: the bank-account answer drops "free" from the EUR-account wording
// per client feedback (docs/client-feedback-status.md item 19); the master PDF
// still contains it.
// ---------------------------------------------------------------------------

/** Reusable bullet list styled for the accordion answer body. */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export const FAQ: Record<string, FaqAccordionItem> = {
  // ---- General questions --------------------------------------------------
  whatIsRefund: {
    question: 'What is a company pension refund?',
    answer: (
      <>
        <p>
          A company pension refund means applying to get eligible employee
          contributions back from a contribution-based company pension scheme.
        </p>
        <p className="mt-2">
          This commonly applies to VBL, ZVK, VddB and VddKO cases.
        </p>
        <p className="mt-2">
          Usually, only eligible contributions paid by you as the employee are
          refundable. Employer-paid amounts are generally not refunded to you.
        </p>
        <p className="mt-2">
          A company pension refund is separate from a German state pension
          refund through Deutsche Rentenversicherung.
        </p>
      </>
    ),
  },
  refundVsCashout: {
    question: 'What is the difference between a refund and a bAV cash-out?',
    answer: (
      <>
        <p>
          A refund means applying to get eligible employee contributions back
          from a contribution-based pension scheme.
        </p>
        <p className="mt-2">
          A bAV cash-out means requesting a one-time payout or lump-sum
          settlement of a company pension entitlement that would otherwise
          remain in place.
        </p>
        <p className="mt-2">In general:</p>
        <Bullets
          items={[
            'VBL, ZVK, VddB and VddKO are handled as refund cases',
            'Direktversicherung and other provider-based bAV cases are checked for a possible cash-out or lump-sum settlement',
          ]}
        />
        <p className="mt-2">
          The German term Abfindung means a lump-sum settlement. It is not the
          same as a contribution refund.
        </p>
      </>
    ),
  },
  companyVsStatePension: {
    question:
      'What is the difference between a company pension and the German state pension?',
    answer: (
      <>
        <p>
          A company pension and the German state pension are separate systems.
        </p>
        <p className="mt-2">
          The German state pension is managed by Deutsche Rentenversicherung. A
          DRV refund concerns eligible statutory pension contributions.
        </p>
        <p className="mt-2">A company pension may involve:</p>
        <Bullets
          items={[
            'A bAV or Direktversicherung',
            'VBL',
            'ZVK',
            'VddB',
            'VddKO',
            'Another employer or provider-based pension arrangement',
          ]}
        />
        <p className="mt-2">
          A DRV refund does not automatically include or pay out any of these
          company pensions.
        </p>
      </>
    ),
  },
  bothRefunds: {
    question:
      'Can I receive both a German state pension refund and money from my company pension?',
    answer: (
      <>
        <p>Possibly.</p>
        <p className="mt-2">
          If you paid into both systems, you may need two separate processes:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            A German state pension refund through Deutsche Rentenversicherung
          </li>
          <li>A separate company pension refund or bAV cash-out</li>
        </ol>
        <p className="mt-2">
          For some vested bAV entitlements, an approved DRV refund can create
          the legal basis for requesting a separate lump-sum settlement.
        </p>
        <p className="mt-2">
          The company pension is not paid out automatically when the DRV refund
          is approved. A separate request must still be made.
        </p>
      </>
    ),
  },
  liveOutside: {
    question: 'Do I need to live outside Germany or the EU?',
    answer: (
      <>
        <p>Not for every company pension case.</p>
        <p className="mt-2">
          VBL, ZVK, VddB, VddKO and bAV rules are not based solely on whether
          you live in Germany, elsewhere in the EU or outside Europe.
        </p>
        <p className="mt-2">
          Eligibility depends mainly on the pension scheme, contribution
          history, vesting status, contract and applicable cash-out or refund
          rules.
        </p>
        <p className="mt-2">
          This differs from a German state pension refund, where nationality,
          residence and the ability to make voluntary contributions can be
          important.
        </p>
      </>
    ),
  },
  wait24: {
    question: 'Do I need to wait 24 months?',
    answer: (
      <>
        <p>
          There is no single 24-month waiting period for every company pension
          cash-out or refund.
        </p>
        <Bullets
          items={[
            'VBL: no general 24-month waiting period',
            'ZVK: no general 24-month waiting period',
            'VddB: a 24-month period after the last relevant contribution generally applies',
            'VddKO: a 24-month period after the last relevant contribution generally applies',
            'bAV cash-outs: timing depends on the cash-out route, contract and required confirmations',
          ]}
        />
        <p className="mt-2">
          The 24-month waiting period commonly associated with a German state
          pension refund does not automatically apply to all company pension
          cases.
        </p>
      </>
    ),
  },
  howMuch: {
    question: 'How much money can I get?',
    answer: (
      <>
        <p>The amount depends on the pension type.</p>
        <p className="mt-2">
          For VBL, ZVK, VddB and VddKO refunds, the amount is generally based on
          eligible employee contributions recorded by the pension institution.
        </p>
        <p className="mt-2">For a bAV cash-out, the amount may depend on:</p>
        <Bullets
          items={[
            'The current pension or contract value',
            'The type of pension arrangement',
            'The provider’s calculation',
            'Employer involvement',
            'The applicable lump-sum settlement route',
          ]}
        />
        <p className="mt-2">
          A bAV cash-out amount is not necessarily equal to the total
          contributions originally paid.
        </p>
      </>
    ),
  },
  howLong: {
    question: 'How long does the process usually take?',
    answer: (
      <>
        <p>
          The provider or pension institution controls the final processing
          time.
        </p>
        <p className="mt-2">
          Many straightforward contribution-refund cases may be completed within
          approximately 4 to 12 weeks after submission.
        </p>
        <p className="mt-2">Timing can depend on:</p>
        <Bullets
          items={[
            'Document and identity review',
            'Earlier contribution periods',
            'Requests for additional information',
            'Employer confirmation',
            'Provider review',
            'Health insurance confirmation in some bAV cases',
          ]}
        />
        <p className="mt-2">
          bAV cash-outs can take longer than straightforward contribution-refund
          cases.
        </p>
      </>
    ),
  },
  bankAccount: {
    question: 'Do I need a German bank account?',
    answer: (
      <>
        <p>No German bank account is required in most cases.</p>
        <p className="mt-2">
          Some refund routes require a SEPA-capable EUR account. If you do not
          have one, CompanyPension can help you open a suitable EUR account.
        </p>
        <p className="mt-2">
          A bAV provider may also be able to pay an approved amount to an
          international bank account, depending on its payment requirements.
        </p>
      </>
    ),
  },
  whoReceives: {
    question: 'Who receives the approved money?',
    answer: (
      <>
        <p>
          The relevant pension provider, scheme or institution pays the approved
          money directly to the bank account you provide.
        </p>
        <p className="mt-2">
          CompanyPension does not receive, hold or forward approved pension
          money.
        </p>
      </>
    ),
  },

  // ---- bAV cash-outs ------------------------------------------------------
  cashOutAfterLeaving: {
    question: 'Can I cash out a bAV after leaving Germany?',
    answer: (
      <>
        <p>
          It may be possible, but leaving Germany alone does not automatically
          create a right to cash out a bAV.
        </p>
        <p className="mt-2">The result can depend on:</p>
        <Bullets
          items={[
            'Whether the pension entitlement is vested',
            'The pension or contract value',
            'The employer and provider',
            'The type of bAV arrangement',
            'Whether the small-benefit rule applies',
            'Whether your DRV contributions have already been refunded',
            'Any provider or health insurance confirmation required',
          ]}
        />
        <p className="mt-2">
          Start the bAV claim flow to check which route may apply to your case.
        </p>
      </>
    ),
  },
  smallBav2026: {
    question: 'What counts as a small bAV in 2026?',
    answer: (
      <>
        <p>
          In 2026, a company pension may fall under the small-benefit threshold
          if it is worth no more than:
        </p>
        <Bullets
          items={['€59.33 per month, or', '€7,119 as a capital value']}
        />
        <p className="mt-2">
          Falling below this threshold does not mean the pension is paid out
          automatically. Whether a lump-sum settlement is possible still depends
          on the pension arrangement and the employer or provider&rsquo;s
          review.
        </p>
      </>
    ),
  },
  vestedBavPayout: {
    question: 'My bAV is already vested. Can it still be paid out?',
    answer: (
      <>
        <p>Possibly.</p>
        <p className="mt-2">
          A vested pension is normally protected and remains in place until the
          relevant payout date. Leaving Germany does not, by itself, remove that
          protection.
        </p>
        <p className="mt-2">
          A lump-sum settlement may nevertheless be possible if:
        </p>
        <Bullets
          items={[
            'The entitlement falls below the applicable small-benefit threshold, or',
            'Your German statutory pension contributions have been refunded',
            'Another permitted settlement route applies',
          ]}
        />
        <p className="mt-2">
          The exact handling depends on the pension arrangement, employer and
          provider.
        </p>
      </>
    ),
  },
  drvHelpsBav: {
    question: 'I already received my DRV refund. Does that help with my bAV?',
    answer: (
      <>
        <p>Yes, it can be important.</p>
        <p className="mt-2">
          When statutory German pension contributions have been refunded,
          Section 3(3) BetrAVG can create a right to request settlement of a
          vested occupational pension entitlement.
        </p>
        <p className="mt-2">
          The DRV refund does not automatically cash out the bAV. You must still
          make a separate request to the responsible employer or pension
          provider and provide evidence of the DRV refund.
        </p>
        <p className="mt-2">
          CompanyPension checks whether this route may be relevant during the
          guided bAV flow.
        </p>
      </>
    ),
  },
  direktversicherungCashout: {
    question: 'Can a Direktversicherung be cashed out?',
    answer: (
      <>
        <p>It may be possible.</p>
        <p className="mt-2">
          A Direktversicherung is a common form of bAV arranged through an
          employer and an insurance company.
        </p>
        <p className="mt-2">
          Whether it can be paid out before retirement depends on:
        </p>
        <Bullets
          items={[
            'Vesting status',
            'Contract value',
            'Employer involvement',
            'Provider requirements',
            'Whether a permitted lump-sum settlement route applies',
            'Whether a DRV refund has already been approved, where relevant',
          ]}
        />
        <p className="mt-2">The provider makes the final decision.</p>
      </>
    ),
  },
  whichProviders: {
    question: 'Which bAV providers are supported?',
    answer: (
      <>
        <p>
          The platform supports documents and cash-out checks for company
          pensions from providers and pension institutions such as:
        </p>
        <Bullets
          items={[
            'Allianz',
            'AXA',
            'Swiss Life',
            'ERGO',
            'R+V',
            'Siemens',
            'Nürnberger',
            'HDI',
            'BVV',
            'Other German pension and insurance providers',
          ]}
        />
        <p className="mt-2">
          The provider name alone does not determine whether a cash-out is
          possible. The individual contract and applicable settlement route must
          be checked.
        </p>
      </>
    ),
  },
  everyProviderLumpSum: {
    question: 'Does every supported provider offer a lump-sum payout?',
    answer: (
      <>
        <p>No.</p>
        <p className="mt-2">
          &ldquo;Supported&rdquo; means that the platform can identify the
          provider, collect the relevant information and guide the applicable
          cash-out request.
        </p>
        <p className="mt-2">
          The provider, employer or pension institution still determines whether
          the individual entitlement can legally and contractually be paid out.
        </p>
      </>
    ),
  },
  employerApproval: {
    question: 'Do I need employer approval for a bAV cash-out?',
    answer: (
      <>
        <p>Employer involvement may be required.</p>
        <p className="mt-2">
          This depends on the type of bAV, the contract holder, the provider and
          whether the former employer remains responsible for the pension
          commitment.
        </p>
        <p className="mt-2">
          The guided flow asks for the relevant employer information and shows
          whether additional confirmation may be needed.
        </p>
      </>
    ),
  },
  healthInsurance: {
    question: 'Why might health insurance confirmation be required?',
    answer: (
      <>
        <p>
          Some providers ask for confirmation of your current health insurance
          situation before processing a bAV payout.
        </p>
        <p className="mt-2">
          This may affect how German health and long-term-care insurance
          contributions are handled.
        </p>
        <p className="mt-2">
          Whether confirmation is required depends on the provider and the
          individual case.
        </p>
        <p className="mt-2">
          CompanyPension collects and displays the requested information but
          does not provide health insurance or tax advice.
        </p>
      </>
    ),
  },

  // ---- VBL and ZVK refunds ------------------------------------------------
  whatIsVbl: {
    question: 'What is VBL?',
    answer: (
      <>
        <p>VBL stands for Versorgungsanstalt des Bundes und der Länder.</p>
        <p className="mt-2">
          It manages company pensions for many German public-sector employers,
          including universities, research institutes, hospitals, local
          authorities and other public institutions.
        </p>
        <p className="mt-2">
          A VBL pension is separate from the statutory German pension managed by
          Deutsche Rentenversicherung.
        </p>
      </>
    ),
  },
  vblklassikVsExtra: {
    question: 'What is the difference between VBLklassik and VBLextra?',
    answer: (
      <>
        <p>
          VBLklassik is the standard VBL plan for many public-sector employees.
        </p>
        <p className="mt-2">
          Eligible employee contributions paid into VBLklassik in VBL West may
          be refundable if the relevant refund conditions are met.
        </p>
        <p className="mt-2">
          VBLextra is a separate voluntary plan. Its pension entitlement is
          vested from the first contribution, so VBLextra contributions cannot
          be refunded.
        </p>
        <p className="mt-2">
          If your record includes both VBLextra and VBLklassik, the VBLklassik
          periods must be checked separately.
        </p>
      </>
    ),
  },
  canGetVblRefund: {
    question: 'Can I get a VBL refund?',
    answer: (
      <>
        <p>A VBL refund may be possible if:</p>
        <Bullets
          items={[
            'You paid into VBLklassik',
            'You have left German public-sector employment',
            'The relevant contributions were paid into VBL West / Abrechnungsverband West',
            'Your VBL pension rights are not vested',
            'You apply before turning 69',
          ]}
        />
        <p className="mt-2">
          Under the rules in force since 2018, pension rights may already be
          vested if you worked for the same employer for at least 36
          uninterrupted months and were at least 21 when you left.
        </p>
        <p className="mt-2">
          Recognised VBL, ZVK or other public-sector pension periods may also be
          counted toward the standard 60-month waiting period.
        </p>
        <p className="mt-2">
          The final decision is made by VBL after reviewing the insurance
          record.
        </p>
      </>
    ),
  },
  vblRefundInGermany: {
    question: 'Can I get a VBL refund while still living in Germany?',
    answer: (
      <>
        <p>Yes.</p>
        <p className="mt-2">
          Your residence in Germany does not automatically prevent a VBL refund.
        </p>
        <p className="mt-2">
          The important questions are whether you have left German public-sector
          employment and whether your VBLklassik contributions remain
          refundable.
        </p>
      </>
    ),
  },
  vblRefundPrivateSector: {
    question: 'Can I get a VBL refund if I now work in the private sector?',
    answer: (
      <>
        <p>Possibly.</p>
        <p className="mt-2">
          Moving from public-sector employment to a private-sector employer does
          not automatically block a VBL refund.
        </p>
        <p className="mt-2">
          The VBL contribution periods, vesting status, West or East
          classification and any recognised periods with another public-sector
          scheme still need to be checked.
        </p>
      </>
    ),
  },
  vblEast: {
    question: 'Can VBL East contributions be refunded?',
    answer: (
      <>
        <p>
          Relevant employee contributions paid into the capital-funded VBL East
          system are generally not refundable because the pension entitlement is
          vested from the first contribution.
        </p>
        <p className="mt-2">
          Do not rely only on the location of the employer.
        </p>
        <p className="mt-2">
          Check the VBL letter or insurance record for wording such as:
        </p>
        <Bullets
          items={[
            'VBL West',
            'Abrechnungsverband West',
            'VBL East',
            'Abrechnungsverband Ost',
            'Capital-funded contributions',
          ]}
        />
      </>
    ),
  },
  earlierPeriods: {
    question: 'Do earlier VBL or ZVK periods matter?',
    answer: (
      <>
        <p>Yes.</p>
        <p className="mt-2">
          Recognised compulsory-insurance periods from different public-sector
          company pension schemes may be counted together toward the 60-month
          waiting period.
        </p>
        <p className="mt-2">
          For example, 30 recognised VBL months and 30 recognised ZVK months can
          together fulfil a 60-month waiting period.
        </p>
        <p className="mt-2">
          This can make a refund impossible even when one individual employment
          period looks short.
        </p>
      </>
    ),
  },
  zvkRefund: {
    question: 'When can I get a ZVK refund?',
    answer: (
      <>
        <p>
          A ZVK refund may be possible if you have left the relevant
          public-sector employment and your pension rights are not vested.
        </p>
        <p className="mt-2">
          The exact rules depend on the specific Zusatzversorgungskasse.
        </p>
        <p className="mt-2">Relevant factors may include:</p>
        <Bullets
          items={[
            'The number of recognised insurance months',
            'Whether the standard waiting period has been fulfilled',
            'Whether statutory vesting applies',
            'Earlier VBL or other ZVK periods',
            'The rules of the specific pension scheme',
          ]}
        />
        <p className="mt-2">
          Use the guided flow to identify the relevant ZVK and contribution
          periods.
        </p>
      </>
    ),
  },
  wait24VblZvk: {
    question: 'Do I need to wait 24 months for a VBL or ZVK refund?',
    answer: (
      <>
        <p>
          No general 24-month waiting period applies to VBL or ZVK contribution
          refunds.
        </p>
        <p className="mt-2">
          A refund may be requested once the relevant employment and compulsory
          insurance have ended, provided the pension rights are not vested and
          the other scheme-specific conditions are met.
        </p>
      </>
    ),
  },

  // ---- VddB and VddKO refunds ---------------------------------------------
  vddbRefund: {
    question: 'Can I get a VddB refund?',
    answer: (
      <>
        <p>A VddB refund may be possible if:</p>
        <Bullets
          items={[
            'You paid into Bühnenversorgung / VddB',
            'You left relevant stage employment in Germany',
            'You completed at least 12 contribution months',
            'You completed no more than 35 contribution months',
            'The applicable waiting period after your last contribution has passed',
          ]}
        />
        <p className="mt-2">
          The pension institution checks the final contribution record and
          eligibility.
        </p>
      </>
    ),
  },
  vddkoRefund: {
    question: 'Can I get a VddKO refund?',
    answer: (
      <>
        <p>A VddKO refund may be possible if:</p>
        <Bullets
          items={[
            'You paid into VddKO',
            'You left relevant orchestra employment in Germany',
            'You completed at least 12 contribution months',
            'You completed no more than 35 contribution months',
            'The applicable waiting period after your last contribution has passed',
          ]}
        />
        <p className="mt-2">
          The pension institution makes the final decision.
        </p>
      </>
    ),
  },
  vddbVddkoInDrv: {
    question: 'Is a VddB or VddKO refund included in my DRV refund?',
    answer: (
      <>
        <p>No.</p>
        <p className="mt-2">
          VddB and VddKO are separate occupational pension arrangements.
        </p>
        <p className="mt-2">
          A German state pension refund through Deutsche Rentenversicherung does
          not automatically include either refund.
        </p>
      </>
    ),
  },
  returnToStageWork: {
    question:
      'Can I return to stage or orchestra work after receiving a refund?',
    answer: (
      <>
        <p>Yes, but the refunded periods do not remain as pension periods.</p>
        <p className="mt-2">
          If you later return to relevant employment and begin contributing
          again, new pension periods generally start separately.
        </p>
        <p className="mt-2">
          The previous refunded contributions are not automatically restored.
        </p>
      </>
    ),
  },

  // ---- Digital process and documents --------------------------------------
  howItWorks: {
    question: 'How does CompanyPension work?',
    answer: (
      <>
        <p>CompanyPension is a digital application platform.</p>
        <p className="mt-2">You can:</p>
        <Bullets
          items={[
            'Upload pension documents instead of entering every detail manually',
            'Use guided questions adapted to your pension type',
            'Review information extracted through OCR and automated document recognition',
            'Upload your ID and any missing documents',
            'Review and sign your application online',
            'Submit the signed application through the platform',
            'View provider correspondence and required next steps in your secure account',
          ]}
        />
        <p className="mt-2">
          Most standard steps run digitally and automatically. Human support is
          added when a document or provider request needs clarification,
          translation or follow-up.
        </p>
      </>
    ),
  },
  uploadInsteadManual: {
    question:
      'Can I upload a document instead of completing everything manually?',
    answer: (
      <>
        <p>Yes.</p>
        <p className="mt-2">
          Upload a pension statement, provider letter, VBL document, bAV
          contract, Direktversicherung document or another supported pension
          document.
        </p>
        <p className="mt-2">
          The platform can extract relevant details and pre-fill parts of the
          guided flow.
        </p>
        <p className="mt-2">
          You review and correct the extracted information before anything is
          submitted.
        </p>
        <p className="mt-2">
          Manual entry remains available if you do not have a suitable document.
        </p>
      </>
    ),
  },
  ocrOrAi: {
    question: 'Does CompanyPension use OCR or AI?',
    answer: (
      <>
        <p>
          The platform uses OCR and automated data extraction to identify key
          information in uploaded documents.
        </p>
        <p className="mt-2">
          This reduces manual typing and helps route the user into the correct
          pension flow.
        </p>
        <p className="mt-2">
          The platform does not make the pension provider&rsquo;s approval
          decision and does not submit an application without the user&rsquo;s
          review and signature.
        </p>
        <p className="mt-2">
          Human oversight is added where automated document reading is not
          reliable enough.
        </p>
      </>
    ),
  },
  calculatorFirst: {
    question: 'Do I need to use the calculator first?',
    answer: (
      <>
        <p>No.</p>
        <p className="mt-2">Start your claim is the main route for:</p>
        <Bullets
          items={[
            'bAV cash-outs',
            'VBL refunds',
            'ZVK refunds',
            'VddB refunds',
            'VddKO refunds',
          ]}
        />
        <p className="mt-2">
          The calculator is optional and is available only for VBL, ZVK, VddB
          and VddKO refund estimates.
        </p>
        <p className="mt-2">It does not calculate bAV cash-out amounts.</p>
      </>
    ),
  },
  whoSignsReviews: {
    question: 'Who reviews and signs the application?',
    answer: (
      <>
        <p>You do.</p>
        <p className="mt-2">
          The platform prepares the application using the information and
          documents you provide.
        </p>
        <p className="mt-2">
          You review the completed information, correct anything necessary and
          sign the application yourself online.
        </p>
        <p className="mt-2">
          You remain the applicant and claimant throughout the process.
        </p>
      </>
    ),
  },
  whoSubmits: {
    question: 'Who submits the application?',
    answer: (
      <>
        <p>
          After you sign, the application is technically transmitted to the
          relevant provider, pension scheme or institution through the
          CompanyPension platform.
        </p>
        <p className="mt-2">
          CompanyPension does not become the applicant or claimant.
        </p>
        <p className="mt-2">
          The provider or pension institution reviews the application and makes
          the final decision.
        </p>
      </>
    ),
  },
  manageCorrespondence: {
    question: 'Do I need to manage German provider correspondence myself?',
    answer: (
      <>
        <p>
          Where you provide limited authorization, relevant provider
          correspondence can be received through CompanyPension, and displayed
          in your secure account.
        </p>
        <p className="mt-2">The platform shows the next required action.</p>
        <p className="mt-2">
          Human support is added when correspondence requires individual
          clarification or translation.
        </p>
      </>
    ),
  },
  limitedAuthorization: {
    question: 'What does the limited authorization cover?',
    answer: (
      <>
        <p>The limited authorization allows ATLAES GmbH to:</p>
        <Bullets
          items={[
            'Receive and forward relevant provider correspondence',
            'Receive information about the final decision',
            'Receive information about the approved amount',
          ]}
        />
        <p className="mt-2">
          This enables the platform to display follow-up requests and calculate
          the agreed service fee.
        </p>
        <p className="mt-2">
          The authorization does not make ATLAES GmbH the applicant or claimant
          and does not authorize it to provide legal or pension advice.
        </p>
      </>
    ),
  },
  advisorOrLawFirm: {
    question: 'Is CompanyPension a pension advisor, broker or law firm?',
    answer: (
      <>
        <p>No.</p>
        <p className="mt-2">
          CompanyPension is a digital application platform and brand operated by
          ATLAES GmbH.
        </p>
        <p className="mt-2">Neither CompanyPension nor ATLAES GmbH provides:</p>
        <Bullets
          items={[
            'Pension advice',
            'Legal advice',
            'Tax advice',
            'Insurance advice or brokerage',
            'Financial advice',
          ]}
        />
        <p className="mt-2">
          The user remains the applicant and claimant. The relevant pension
          provider, scheme or institution makes the final decision.
        </p>
        <p className="mt-2">
          If separate legal services are needed in an individual case, they are
          provided by the responsible legal partner under a separate
          arrangement.
        </p>
      </>
    ),
  },
  documentsNeeded: {
    question: 'What documents are usually needed?',
    answer: (
      <>
        <p>The required documents depend on the pension type and provider.</p>
        <p className="mt-2">Common documents include:</p>
        <Bullets
          items={[
            'Passport or ID',
            'Pension statements or provider letters',
            'Employment information',
            'Proof that the relevant employment ended',
            'Current address',
            'Bank details',
          ]}
        />
        <p className="mt-2">A bAV cash-out may also require:</p>
        <Bullets
          items={[
            'Former-employer information or confirmation',
            'Health insurance confirmation',
            'Proof of an approved DRV refund, where relevant',
            'Additional provider-specific documents',
          ]}
        />
        <p className="mt-2">
          You can start without every document. The guided flow shows what is
          still needed.
        </p>
      </>
    ),
  },

  // ---- Pricing and payment ------------------------------------------------
  howMuchCost: {
    question: 'How much does CompanyPension cost?',
    answer: (
      <>
        <p>Start with a &euro;199 deposit.</p>
        <p className="mt-2">If your cash-out or refund is approved:</p>
        <Bullets
          items={[
            'The success fee is 9.75% of the approved amount',
            'The minimum total service fee is €199',
            'The €199 deposit is credited toward the final service fee',
            'Only any remaining difference becomes due',
          ]}
        />
        <p className="mt-2">The pricing rules are shown before payment.</p>
      </>
    ),
  },
  depositExtraFee: {
    question: 'Is the €199 deposit an extra fee?',
    answer: (
      <>
        <p>No. The deposit is part of the final service fee.</p>
        <p className="mt-2">
          If the approved amount results in only the &euro;199 minimum total
          fee, the deposit covers the entire service fee and nothing further is
          due.
        </p>
      </>
    ),
  },
  depositRefundable: {
    question: 'Is the €199 deposit always refundable?',
    answer: (
      <>
        <p>No. The rule depends on the type of case.</p>
        <p className="mt-2">
          For VBL, ZVK, VddB and VddKO refunds, the deposit is refunded in full
          if the pension institution rejects a completed and submitted refund
          request.
        </p>
        <p className="mt-2">
          For bAV cash-outs, if the cash-out cannot be submitted after the
          digital case and document review, &euro;79 is retained and &euro;120
          is refunded.
        </p>
        <p className="mt-2">
          The deposit is not automatically refundable when a user abandons the
          process, does not provide required information or leaves the
          application incomplete.
        </p>
      </>
    ),
  },
  cannotProceed: {
    question: 'What happens if my cash-out or refund cannot proceed?',
    answer: (
      <>
        <p>
          The applicable outcome depends on the type of case and the reason it
          cannot proceed.
        </p>
        <p className="mt-2">
          The relevant deposit rule is displayed before payment and is also set
          out in the payment terms.
        </p>
        <p className="mt-2">
          A provider rejection of a completed refund request is different from
          an abandoned or incomplete application.
        </p>
      </>
    ),
  },
  successFee975: {
    question: 'Is the success fee always 9.75%?',
    answer: (
      <>
        <p>Yes.</p>
        <p className="mt-2">
          If the cash-out or refund is approved, the success fee is 9.75% of the
          approved amount, subject to a minimum total service fee of &euro;199.
        </p>
        <p className="mt-2">The deposit is credited toward the final fee.</p>
      </>
    ),
  },
  remainingFeeDue: {
    question: 'When is the remaining service fee due?',
    answer: (
      <>
        <p>Only after the cash-out or refund has been approved.</p>
        <p className="mt-2">
          The final fee is calculated from the approved amount. The &euro;199
          deposit is deducted, and only the remaining difference becomes due.
        </p>
      </>
    ),
  },
  hiddenFees: {
    question: 'Are there hidden fees?',
    answer: (
      <>
        <p>
          CompanyPension shows the deposit, success fee, minimum total fee and
          applicable deposit rules before payment.
        </p>
        <p className="mt-2">
          Separate bank charges, foreign-exchange costs or third-party account
          fees may apply and are outside CompanyPension&rsquo;s control.
        </p>
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Category grouping — powers the FAQ-page explorer (search + six category
// tabs, Figma frame 1199:11597). Categories appear in Figma order. The
// "General questions" order already matches the FAQ-page design (frame
// 1199:11597, "General questions" tab); the other five keep master order, as
// the design does not show their expanded lists.
// ---------------------------------------------------------------------------

export interface FaqCategory {
  label: string;
  items: FaqAccordionItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    label: 'General questions',
    items: [
      FAQ.whatIsRefund,
      FAQ.refundVsCashout,
      FAQ.companyVsStatePension,
      FAQ.bothRefunds,
      FAQ.liveOutside,
      FAQ.wait24,
      FAQ.howMuch,
      FAQ.howLong,
      FAQ.bankAccount,
      FAQ.whoReceives,
    ],
  },
  {
    label: 'bAV cash-outs',
    items: [
      FAQ.cashOutAfterLeaving,
      FAQ.smallBav2026,
      FAQ.vestedBavPayout,
      FAQ.drvHelpsBav,
      FAQ.direktversicherungCashout,
      FAQ.whichProviders,
      FAQ.everyProviderLumpSum,
      FAQ.employerApproval,
      FAQ.healthInsurance,
    ],
  },
  {
    label: 'VBL and ZVK refunds',
    items: [
      FAQ.whatIsVbl,
      FAQ.vblklassikVsExtra,
      FAQ.canGetVblRefund,
      FAQ.vblRefundInGermany,
      FAQ.vblRefundPrivateSector,
      FAQ.vblEast,
      FAQ.earlierPeriods,
      FAQ.zvkRefund,
      FAQ.wait24VblZvk,
    ],
  },
  {
    label: 'VddB and VddKO refunds',
    items: [
      FAQ.vddbRefund,
      FAQ.vddkoRefund,
      FAQ.vddbVddkoInDrv,
      FAQ.returnToStageWork,
    ],
  },
  {
    label: 'Digital process and documents',
    items: [
      FAQ.howItWorks,
      FAQ.uploadInsteadManual,
      FAQ.ocrOrAi,
      FAQ.calculatorFirst,
      FAQ.whoSignsReviews,
      FAQ.whoSubmits,
      FAQ.manageCorrespondence,
      FAQ.limitedAuthorization,
      FAQ.advisorOrLawFirm,
      FAQ.documentsNeeded,
    ],
  },
  {
    label: 'Pricing and payment',
    items: [
      FAQ.howMuchCost,
      FAQ.depositExtraFee,
      FAQ.depositRefundable,
      FAQ.cannotProceed,
      FAQ.successFee975,
      FAQ.remainingFeeDue,
      FAQ.hiddenFees,
    ],
  },
];
