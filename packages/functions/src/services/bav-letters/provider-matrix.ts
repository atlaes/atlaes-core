/**
 * bAV provider matrix (client answer item 7), pure part: the address patch
 * a matrix row yields for a claim. No database access, so it is unit-tested
 * without Postgres; `providers.ts` holds the CRUD and the lookup.
 */

export interface BavProviderInput {
  name: string;
  defaultAddresseeType?: 'employer' | 'provider' | null;
  department?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  requiresBankAddress?: boolean;
  notes?: string | null;
}

export interface BavProvider extends BavProviderInput {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** The recipient fields of a claim the matrix can fill. */
export interface ClaimRecipientFields {
  bavProviderName: string | null;
  bavAddresseeType: string | null;
  bavRecipientName: string | null;
  bavRecipientDepartment: string | null;
  bavRecipientStreet: string | null;
  bavRecipientPostalCode: string | null;
  bavRecipientCity: string | null;
}

export type RecipientPatch = Partial<
  Pick<
    ClaimRecipientFields,
    | 'bavAddresseeType'
    | 'bavRecipientName'
    | 'bavRecipientDepartment'
    | 'bavRecipientStreet'
    | 'bavRecipientPostalCode'
    | 'bavRecipientCity'
  >
>;

const blank = (v: string | null | undefined): boolean =>
  typeof v !== 'string' || v.trim() === '';

export function normalizeProviderName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** True when the provider row matches the claim's provider name. */
export function providerMatches(
  provider: { name: string },
  claimProviderName: string | null | undefined
): boolean {
  if (blank(claimProviderName)) return false;
  return (
    normalizeProviderName(provider.name) ===
    normalizeProviderName(claimProviderName as string)
  );
}

/**
 * Fields to copy from the matrix onto the claim. Only applies when the
 * claim's recipient address (street, postal code, city) is entirely empty
 * — a partially or fully entered address is ops' or the client's and is
 * never overwritten. Name, department and addressee type are filled only
 * where empty. Returns null when nothing should change.
 */
export function providerAddressPatch(
  claim: ClaimRecipientFields,
  provider: BavProviderInput
): RecipientPatch | null {
  if (!providerMatches(provider, claim.bavProviderName)) return null;
  const addressEmpty =
    blank(claim.bavRecipientStreet) &&
    blank(claim.bavRecipientPostalCode) &&
    blank(claim.bavRecipientCity);
  if (!addressEmpty) return null;
  if (
    blank(provider.street) ||
    blank(provider.postalCode) ||
    blank(provider.city)
  ) {
    return null;
  }
  // Employer-addressed letters (Direktzusage/Unterstützungskasse) never go
  // to the provider's address.
  const addresseeType =
    claim.bavAddresseeType ?? provider.defaultAddresseeType ?? 'provider';
  if (addresseeType !== 'provider') return null;

  const patch: RecipientPatch = {
    bavRecipientStreet: provider.street!.trim(),
    bavRecipientPostalCode: provider.postalCode!.trim(),
    bavRecipientCity: provider.city!.trim(),
  };
  if (blank(claim.bavAddresseeType)) patch.bavAddresseeType = 'provider';
  if (blank(claim.bavRecipientName)) {
    patch.bavRecipientName = provider.name.trim();
  }
  if (blank(claim.bavRecipientDepartment) && !blank(provider.department)) {
    patch.bavRecipientDepartment = provider.department!.trim();
  }
  return patch;
}
