/**
 * Recommended first office + mailing address for a managed DRV refund.
 *
 * Six-rule order (office finder v2.2 = submission-logic brief §1):
 *   1. ever insured with Knappschaft-Bahn-See           → KBS
 *   2. DRV Bund was the last carrier                    → Bund
 *   3. liaison office for the citizenship connection   → Verbindungsstelle
 *   4. liaison office for the residence connection      → Verbindungsstelle
 *   5. account-holding regional carrier (prefix)        → regional
 *   6. nothing matched                                  → null (ops)
 *
 * The output is a *recommendation* (SC-04): multi-connection cases carry
 * `multiConnection = true` and must be confirmed by ops before filing.
 * A per-case `correspondenceAddress` (set from inbound letters) wins over
 * the register default once it exists — that override is applied by the
 * caller, not here.
 */

import {
  CARRIER_DEFAULT_ENTRY,
  CARRIER_NAMES,
  COUNTRY_NAME_DE,
  LIAISON_OFFICE_BY_COUNTRY,
  isPlausiblePrefix,
  mailingEntryForPrefix,
  prefixCarrier,
  vsnrPrefix,
  type CarrierId,
  type MailingEntry,
} from './register';

export type LastOffice = CarrierId | 'UNKNOWN';

export interface ResolveCarrierInput {
  /** Last office in charge as known from the record; 'UNKNOWN' if not. */
  lastOffice: LastOffice;
  /** Whether the client was EVER insured with KBS (any contribution). */
  everInsuredWithKbs?: boolean;
  /** German insurance number in any spacing; null when unknown. */
  vsnr: string | null;
  /** ISO 3166-1 alpha-2. */
  citizenship: string;
  /** ISO 3166-1 alpha-2. */
  residence: string;
}

export type CarrierRule =
  | 'kbs_history'
  | 'bund_last_carrier'
  | 'kbs_prefix'
  | 'bund_prefix'
  | 'citizenship_liaison'
  | 'residence_liaison'
  | 'account_carrier'
  | 'account_carrier_prefix'
  | 'unresolved';

export interface CarrierResolution {
  carrier: CarrierId | null;
  carrierName: string | null;
  entry: MailingEntry | null;
  rule: CarrierRule;
  /** True when the office acts as Verbindungsstelle for a country link. */
  viaLiaison: boolean;
  /** ISO code of the liaison connection (citizenship or residence). */
  liaisonCountry: string | null;
  /** German name of the liaison country for the cover-letter headings. */
  liaisonCountryDe: string | null;
  /** Citizenship and residence point to two different liaison offices. */
  multiConnection: boolean;
  /** Prefix looked implausible for a valid VSNR (ops should re-check). */
  implausiblePrefix: boolean;
  notes: string[];
}

function liaison(iso: string): CarrierId | null {
  return LIAISON_OFFICE_BY_COUNTRY[iso.toUpperCase()] ?? null;
}

function withEntry(
  carrier: CarrierId,
  entry: MailingEntry,
  rule: CarrierRule,
  extra: Partial<CarrierResolution> = {}
): CarrierResolution {
  return {
    carrier,
    carrierName: CARRIER_NAMES[carrier],
    entry,
    rule,
    viaLiaison: false,
    liaisonCountry: null,
    liaisonCountryDe: null,
    multiConnection: false,
    implausiblePrefix: false,
    notes: [],
    ...extra,
  };
}

export function resolveCarrier(input: ResolveCarrierInput): CarrierResolution {
  const cit = input.citizenship.toUpperCase();
  const res = input.residence.toUpperCase();
  const prefix = vsnrPrefix(input.vsnr);
  const prefixEntry = mailingEntryForPrefix(prefix);
  const implausiblePrefix = prefix !== null && !isPlausiblePrefix(prefix);
  const notes: string[] = [];
  if (implausiblePrefix) {
    notes.push(
      `Prefix ${String(prefix).padStart(2, '0')} does not match a valid German pension insurance number — check the VSNR.`
    );
  }

  // 1. KBS ever → KBS (history, or a KBS-issued number).
  if (input.everInsuredWithKbs || input.lastOffice === 'KBS') {
    return withEntry('KBS', CARRIER_DEFAULT_ENTRY.KBS, 'kbs_history', {
      implausiblePrefix,
      notes,
    });
  }
  if (!implausiblePrefix && prefixCarrier(prefix) === 'KBS') {
    return withEntry('KBS', CARRIER_DEFAULT_ENTRY.KBS, 'kbs_prefix', {
      implausiblePrefix,
      notes: [
        ...notes,
        'KBS numbers are only issued by KBS: the client was insured there.',
      ],
    });
  }

  // 2. Bund last carrier.
  if (input.lastOffice === 'BUND') {
    return withEntry('BUND', CARRIER_DEFAULT_ENTRY.BUND, 'bund_last_carrier', {
      implausiblePrefix,
      notes,
    });
  }
  if (
    input.lastOffice === 'UNKNOWN' &&
    !implausiblePrefix &&
    prefixCarrier(prefix) === 'BUND'
  ) {
    return withEntry('BUND', CARRIER_DEFAULT_ENTRY.BUND, 'bund_prefix', {
      implausiblePrefix,
      notes: [
        ...notes,
        'The first two digits show DRV Bund issued the number; the account is most likely held there.',
      ],
    });
  }

  const citLiaison = liaison(cit);
  const resLiaison = liaison(res);
  const multiConnection =
    citLiaison !== null && resLiaison !== null && citLiaison !== resLiaison;
  if (multiConnection) {
    notes.push(
      'Citizenship and residence connect to two different liaison offices — confirm before filing (GRA § 128).'
    );
  }

  // 3. Citizenship liaison office.
  if (citLiaison) {
    const entry =
      prefixEntry && prefixEntry.carrier === citLiaison
        ? prefixEntry
        : CARRIER_DEFAULT_ENTRY[citLiaison];
    return withEntry(citLiaison, entry, 'citizenship_liaison', {
      viaLiaison: true,
      liaisonCountry: cit,
      liaisonCountryDe: COUNTRY_NAME_DE[cit] ?? cit,
      multiConnection,
      implausiblePrefix,
      notes,
    });
  }

  // 4. Residence liaison office.
  if (resLiaison) {
    const entry =
      prefixEntry && prefixEntry.carrier === resLiaison
        ? prefixEntry
        : CARRIER_DEFAULT_ENTRY[resLiaison];
    return withEntry(resLiaison, entry, 'residence_liaison', {
      viaLiaison: true,
      liaisonCountry: res,
      liaisonCountryDe: COUNTRY_NAME_DE[res] ?? res,
      multiConnection,
      implausiblePrefix,
      notes,
    });
  }

  // 5. Account-holding regional carrier: known last office, else prefix.
  if (input.lastOffice !== 'UNKNOWN') {
    const carrier = input.lastOffice;
    const entry =
      prefixEntry && prefixEntry.carrier === carrier
        ? prefixEntry
        : CARRIER_DEFAULT_ENTRY[carrier];
    return withEntry(carrier, entry, 'account_carrier', {
      implausiblePrefix,
      notes,
    });
  }
  if (prefixEntry && !implausiblePrefix) {
    return withEntry(
      prefixEntry.carrier,
      prefixEntry,
      'account_carrier_prefix',
      {
        implausiblePrefix,
        notes: [
          ...notes,
          'Routed by the issuing district of the insurance number; the receiving office forwards the file if another carrier is responsible.',
        ],
      }
    );
  }

  // 6. Unresolved — identification by personal data; ops decides.
  return {
    carrier: null,
    carrierName: null,
    entry: null,
    rule: 'unresolved',
    viaLiaison: false,
    liaisonCountry: null,
    liaisonCountryDe: null,
    multiConnection,
    implausiblePrefix,
    notes: [
      ...notes,
      'Neither citizenship nor residence has a liaison office and the account carrier is unknown — ops to determine the office.',
    ],
  };
}
