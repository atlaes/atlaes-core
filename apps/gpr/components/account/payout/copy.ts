/**
 * Payout-flow copy. Brief texts (platform brief 2026-09-16, Part 2 §2 and
 * Part 3 B, C, F) are verbatim; labels/chrome without a brief text follow
 * the Figma frames (section B, 08–13).
 */

/** Part 3 B — verbatim. */
export const ENTGELT_EXPLAINER = {
  title: 'What does Entgelt mean?',
  text: 'Entgelt is the earnings figure used to calculate your pension contributions for the period shown. It is subject to a statutory limit called the Beitragsbemessungsgrenze (contribution ceiling). If your salary exceeded that limit, the Entgelt column shows the capped amount. This is why the figure can be lower than your actual gross salary; the difference alone does not mean contributions are missing. Your refund is calculated from the refundable contributions, not from the Entgelt figure itself: only your own (employee) share of the contributions is refundable; the employer’s share is not.',
};

/** Part 2 §2 — verbatim. */
export const REVIEW_COPY = {
  optionA: 'Confirm periods and amounts',
  optionB: 'Report missing periods or amounts',
  payslipNotice:
    'Without payslips showing that contributions were paid for the missing period, an objection will fail and will not be filed.',
  reportReceived:
    'Your report is being reviewed manually; we will contact you.',
  notifiedWhenFunds: 'You will be notified as soon as the funds have arrived.',
};

/** Figma 08 / 09 chrome. */
export const REVIEW_FIGMA = {
  title: 'Review your refund decision',
  lead: 'Your refund decision (Bescheid) has arrived at our partner law firm. Please check that all your employment periods in Germany are listed.',
  bannerTitle: (date: string) => `Review by ${date}`,
  bannerText:
    'The deadline for a formal objection is based on when our partner law firm received the decision.',
  pdfTitle: (office: string | null) =>
    `Bescheid — ${office || 'Deutsche Rentenversicherung'}`,
  pdfMeta: (pages: number | null) =>
    pages
      ? `PDF preview · ${pages} page${pages === 1 ? '' : 's'}`
      : 'PDF preview',
  pdfOpen: 'Open full size ↗',
  tableTitle: 'Periods and amounts on your decision',
  colPeriod: 'Period',
  colEntgelt: 'Entgelt (€)',
  colContributions: 'Contributions (€)',
  total: 'Total refund amount',
  tableNote:
    'Extracted from the decision letter for your convenience; the PDF above is the official document.',
  question: 'Does the decision list all your employment periods in Germany?',
  optionAText:
    'All my employment periods in Germany are listed and the amounts look right.',
  optionBText:
    'Something is missing or wrong. I will describe it and upload the payslips for those periods.',
  missingTitle: 'Report missing periods or amounts',
  missingLead:
    'Describe what is missing or wrong on the decision, and upload the payslips for those periods.',
  missingLabel: 'What is missing or wrong?',
  missingPlaceholder:
    'e.g. My employment at [employer] in [city] from March 2019 to August 2019 is not listed.',
  missingHint: 'Employer, city and the months concerned help us check faster.',
  payslipsLabel: 'Payslips for the missing periods',
  dropTitle: 'Drop payslips here or browse',
  dropHint: 'PDF, JPG or PNG · several files at once · up to 10 MB each',
  addMore: '+ Add more files',
  submit: 'Submit report',
};

/** Figma 10 / 13 chrome (panel rows come from the backend, text C). */
export const RELEASE_FIGMA = {
  title: 'Release your refund',
  lead: 'Your refund has arrived in our partner law firm’s escrow account. Confirm your bank details, then sign the payment instruction on screen. Our fee is deducted directly from your refund — there is nothing to pay separately.',
  descriptionCol: 'Description',
  amountCol: 'Amount',
  bankTitle: 'Bank details',
  bankHint: 'Pre-filled from your application',
  sepaCheck:
    'Checked: valid IBAN · account currency EUR → paid by SEPA, no route choice needed.',
  reviewNotice:
    'If you change your bank details, name an account holder other than yourself, or use an account in a country other than your residence or nationality, we send a notice to your registered email and ATLAES reviews the payout details before the transfer.',
};

/** Part 3 F — verbatim, with the placeholders filled. Provisional copy. */
export const ROUTE_COPY = {
  title: 'How would you like to receive your refund?',
  lead: (x: string) =>
    `Choose how your ${x} available for payout reaches your account.`,
  option1Title: 'Keep it in euros',
  option1:
    'Best if you already have a EUR account. We transfer your refund to a EUR account that accepts SEPA payments — no transfer fee from us. Your refund stays in euros; if you convert it later, your account provider’s exchange rate and fees apply.',
  option2Title: 'Leave the conversion to us',
  option2: (v: {
    currency: string;
    p: string;
    y: string;
    x: string;
    z: string;
    institution: string;
  }) =>
    `Best if you want to receive ${v.currency} without arranging the conversion yourself. We coordinate the conversion and payout through our payment partner SummitFX. Your conversion cost: ${v.p} — approximately ${v.y} on your ${v.x} payout, included in the exchange rate and not charged separately. You receive approximately ${v.currency} ${v.z}.* Your payment is executed by ${v.institution}, and you receive a receipt showing the exchange rate applied.`,
  option2Disclosure:
    'Our connection to SummitFX: Anna Kliem and Johannes Kühn, the founders of ATLAES GmbH, are also minority shareholders in SummitFX and therefore have a personal financial interest in this service.',
  option3Title: 'Let my bank handle the conversion',
  option3:
    'We send your refund in euros to your foreign-currency account by international bank transfer (SWIFT). The banks involved set the exchange rate and any transfer or receiving fees, so the amount arriving depends on their rates and charges. In our experience this route usually costs more and takes longer than option 2.',
  handTitle: 'Need a hand choosing?',
  hand1: 'Already have a EUR account and want your refund paid into it?',
  hand2: (currency: string) =>
    `Need your refund in ${currency} and want us to arrange the conversion and payout?`,
  hand3:
    'Want euros sent to your foreign-currency account for your bank to convert?',
  footnote: (when: string) =>
    `* Estimated using the mid-market rate at ${when}, adjusted for the conversion cost shown above. The final amount depends on the exchange rate when the conversion takes place.`,
  /** Figma 11 wording of the brief's tier rule. */
  tierRule:
    'Tier rule for the conversion cost: 1.5% below EUR 15,000 · 1.0% from EUR 15,000 to 25,000 · 0.7% above EUR 25,000, applied to the amount available for payout.',
  /** Figma 11 info box (chrome). */
  info: (currency: string) =>
    `Your account is in ${currency}, so your refund has to be converted at some point. None of the options is preselected.`,
};

/** Figma 12 chrome. */
export const SIGN_FIGMA = {
  title: 'Sign the payment instruction',
  lead: 'Read the Zahlungserklärung below, then draw your signature. The German version is authoritative; the English translation follows below it in the same document.',
  firm: 'Vividius Rechtsanwälte',
  docLabel: 'Zahlungserklärung',
  drawLabel: 'Draw your signature',
  clear: 'Clear',
  padHint: 'Sign here with your finger or mouse',
  confirm:
    'I have read the payment instruction above and confirm the amounts and the recipient account. The signed PDF is stored on my case and shown to me after signing.',
  submit: 'Sign and submit',
};

export const EUR = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const eur = (n: number) => `€${EUR.format(n)}`;
