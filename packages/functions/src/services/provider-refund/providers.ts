/**
 * Provider refund direct route (owner spec "Provider refund direct route",
 * 29 Oct 2026): VBL, KVBW ZVK, VddB and VddKO refund claims are filed by
 * the client, with a provider cover letter and a Postempfangsvollmacht
 * for the postal agent; the provider pays the client's own account.
 *
 * The recipient details live here, in one place, as the spec asks. They
 * are the providers' official postal addresses, not client data.
 */

export const PROVIDER_REFUND_CODES = [
  'VBL',
  'KVBW_ZVK',
  'VddB',
  'VddKO',
] as const;
export type ProviderRefundCode = (typeof PROVIDER_REFUND_CODES)[number];

export interface ProviderRefundProvider {
  code: ProviderRefundCode;
  /** Admin label. */
  label: string;
  /** Name used in the procedure description ("… (Name)"). */
  name: string;
  /** Recipient block, one entry per line ("Deutschland" added by the letter). */
  recipient: string[];
  /** Cover letter subject. */
  subject: string;
  /** Title of the provider's application form (attachment list). */
  applicationForm: string;
  /** Opening sentence of the cover letter (template wording). */
  coverIntro: string;
  /** The form is filled by the system (VddB/VddKO); otherwise uploaded. */
  formFilledBySystem: boolean;
}

export const PROVIDER_REFUND_PROVIDERS: Record<
  ProviderRefundCode,
  ProviderRefundProvider
> = {
  VBL: {
    code: 'VBL',
    label: 'VBL',
    name: 'VBL',
    recipient: [
      'VBL Versorgungsanstalt des Bundes und der Länder',
      'Kundenservice',
      '76240 Karlsruhe',
    ],
    subject: 'Antrag auf Beitragserstattung',
    applicationForm: 'Antrag auf Beitragserstattung (L203)',
    coverIntro:
      'anbei übersende ich meinen ausgefüllten und unterschriebenen Antrag auf Beitragserstattung aus der VBLklassik mit den zugehörigen Unterlagen.',
    formFilledBySystem: true,
  },
  KVBW_ZVK: {
    code: 'KVBW_ZVK',
    label: 'KVBW ZVK',
    name: 'Kommunaler Versorgungsverband Baden-Württemberg',
    recipient: [
      'Kommunaler Versorgungsverband Baden-Württemberg',
      'Zusatzversorgungsabteilung',
      'Postfach 10 01 61',
      '76231 Karlsruhe',
    ],
    subject: 'Antrag auf Beitragserstattung',
    applicationForm:
      'Antrag auf Erstattung der Beiträge bzw. der Arbeitnehmerbeteiligung',
    coverIntro:
      'anbei übersende ich meinen ausgefüllten und unterschriebenen Antrag auf Erstattung der Beiträge bzw. der Arbeitnehmerbeteiligung zur ZVKRente mit den zugehörigen Unterlagen.',
    formFilledBySystem: false,
  },
  VddB: {
    code: 'VddB',
    label: 'VddB',
    name: 'Versorgungsanstalt der deutschen Bühnen',
    recipient: [
      'Versorgungsanstalt der deutschen Bühnen',
      'Postfach 81 08 51',
      '81901 München',
    ],
    subject: 'Antrag auf Beitragserstattung / Rückgewähr',
    applicationForm: 'Antrag auf Beitragserstattung / Rückgewähr',
    coverIntro:
      'anbei übersende ich meinen ausgefüllten und unterschriebenen Antrag auf Beitragserstattung / Rückgewähr mit den zugehörigen Unterlagen. Die beantragte Leistung ist im Antragsformular angegeben.',
    formFilledBySystem: true,
  },
  VddKO: {
    code: 'VddKO',
    label: 'VddKO',
    name: 'Versorgungsanstalt der deutschen Kulturorchester',
    recipient: [
      'Versorgungsanstalt der deutschen Kulturorchester',
      'Postfach 81 08 52',
      '81901 München',
    ],
    subject: 'Antrag auf Beitragserstattung / Rückgewähr',
    applicationForm: 'Antrag auf Beitragserstattung / Rückgewähr',
    coverIntro:
      'anbei übersende ich meinen ausgefüllten und unterschriebenen Antrag auf Beitragserstattung / Rückgewähr mit den zugehörigen Unterlagen. Die beantragte Leistung ist im Antragsformular angegeben.',
    formFilledBySystem: true,
  },
};

/**
 * Provider code of a public-sector claim's free-text pension_provider.
 * Blank and VBL* are the VBL (as isVblPensionProvider). A plain "ZVK"
 * names no specific Kasse, so it stays manual (null).
 */
export function providerRefundCodeOf(
  provider: string | null | undefined
): ProviderRefundCode | null {
  const v = (provider ?? '').trim();
  if (v === '' || /^VBL/i.test(v)) return 'VBL';
  if (/^VddB$/i.test(v)) return 'VddB';
  if (/^VddKO$/i.test(v)) return 'VddKO';
  if (/KVBW|Baden-W(ü|ue)rttemberg/i.test(v)) return 'KVBW_ZVK';
  return null;
}

/** Providers on the admin-driven direct route (the VBL uses the lettershop). */
export const DIRECT_PROVIDER_CODES: readonly ProviderRefundCode[] = [
  'KVBW_ZVK',
  'VddB',
  'VddKO',
];

export function directProviderCodeOf(
  provider: string | null | undefined
): ProviderRefundCode | null {
  const code = providerRefundCodeOf(provider);
  return code && DIRECT_PROVIDER_CODES.includes(code) ? code : null;
}

// ---------------------------------------------------------------------------
// VddB / VddKO: the benefit applied for (form field 1 "Antrag"). The form
// offers four; the selection drives the procedure description.
// ---------------------------------------------------------------------------

export const STAGE_BENEFITS = [
  'partial_refund',
  'full_refund',
  'return',
  'immediate_return',
] as const;
export type StageBenefit = (typeof STAGE_BENEFITS)[number];

export const STAGE_BENEFIT_INFO: Record<
  StageBenefit,
  {
    /** German name for the procedure description. */
    de: string;
    /** Admin label. */
    label: string;
    /** Export value of the form's "Antragsgrund" checkbox widget. */
    formValue: string;
  }
> = {
  partial_refund: {
    de: 'anteilige Beitragserstattung / Abfindung',
    label: 'Partial refund / Abfindung (e.g. leaving the profession)',
    formValue: 'Antrag auf anteilige Beitragserstattung / Abfindung',
  },
  full_refund: {
    de: 'volle Beitragserstattung / Abfindung',
    label: 'Full refund / Abfindung (permanent Berufsunfähigkeit; VddB only)',
    formValue: 'Antrag auf volle Beitragserstattung / Abfindung',
  },
  return: {
    de: 'Rückgewähr',
    label: 'Rückgewähr (statute valid until 31.12.1997)',
    formValue: 'Antrag auf Rückgewähr',
  },
  immediate_return: {
    de: 'sofortige Rückgewähr',
    label: 'Immediate Rückgewähr of 25 % (statute valid until 31.12.1997)',
    formValue: 'Antrag auf sofortige Rückgewähr',
  },
};

export function isStageBenefit(v: unknown): v is StageBenefit {
  return (STAGE_BENEFITS as readonly unknown[]).includes(v);
}

/** The VddKO form (Stand 03/2026) has no full refund option. */
export function stageBenefitsFor(code: 'VddB' | 'VddKO'): StageBenefit[] {
  return code === 'VddKO'
    ? STAGE_BENEFITS.filter((b) => b !== 'full_refund')
    : [...STAGE_BENEFITS];
}

/**
 * The benefit on the case: admin's choice when the provider's form offers
 * it, else full refund (VddB) when the client said they cannot work for
 * health reasons, else partial refund.
 */
export function resolveStageBenefit(claim: {
  pensionProvider: string | null;
  providerRefundBenefit: string | null;
  stageDetails: unknown;
}): StageBenefit {
  const code = /^VddKO$/i.test((claim.pensionProvider ?? '').trim())
    ? 'VddKO'
    : 'VddB';
  const offered = stageBenefitsFor(code);
  if (
    isStageBenefit(claim.providerRefundBenefit) &&
    offered.includes(claim.providerRefundBenefit)
  )
    return claim.providerRefundBenefit;
  const s = (claim.stageDetails ?? {}) as { unableToWorkHealth?: string };
  return s.unableToWorkHealth === 'yes' && offered.includes('full_refund')
    ? 'full_refund'
    : 'partial_refund';
}

/**
 * procedure_description (spec): VBL/KVBW "mein Verfahren zur
 * Beitragserstattung (Name)"; VddB/VddKO "mein Verfahren betreffend
 * [benefit] (Name)". The template supplies "Für".
 */
export function providerProcedureDescription(
  code: ProviderRefundCode,
  benefit?: StageBenefit | null
): string {
  const p = PROVIDER_REFUND_PROVIDERS[code];
  if (code === 'VddB' || code === 'VddKO') {
    const b = STAGE_BENEFIT_INFO[benefit ?? 'partial_refund'].de;
    return `mein Verfahren betreffend ${b} (${p.name})`;
  }
  return `mein Verfahren zur Beitragserstattung (${p.name})`;
}
