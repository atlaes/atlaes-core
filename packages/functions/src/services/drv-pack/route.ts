/**
 * Submission route of a DRV refund case (owner spec "GPR direct route",
 * 29 Oct 2026). The admin field "Submission route" stores
 * claims.handling_route: 'law_firm' = Via Vividius (the firm files under
 * its PoA, refund to the escrow account), 'direct' = Direct client
 * submission (the client signs and applies personally, Anna Kliem only
 * receives post, the DRV pays the client).
 */

import {
  defaultHandlingRoute,
  resolveCaseType,
  type ClaimHandlingRoute,
} from '../../drizzle/schema/claims';

export type SubmissionRoute = ClaimHandlingRoute;

export const SUBMISSION_ROUTE_LABELS: Record<SubmissionRoute, string> = {
  law_firm: 'Via Vividius',
  direct: 'Direct client submission',
};

export interface RouteRow {
  handlingRoute?: string | null;
  caseType?: string | null;
  pensionType?: string | null;
  applicationId?: string | null;
}

/** Stored route, else the case-type default (DRV → law_firm). */
export function submissionRouteOf(row: RouteRow): SubmissionRoute {
  const stored = row.handlingRoute;
  if (stored === 'direct' || stored === 'law_firm') return stored;
  return defaultHandlingRoute(row.caseType, row.pensionType);
}

/**
 * DRV refund filed by the client personally: no escrow, no Vividius
 * access, no ZE — the refund goes from the DRV to the client.
 */
export function isDirectDrvRefund(row: RouteRow): boolean {
  return (
    resolveCaseType(row) === 'drv_refund' && submissionRouteOf(row) === 'direct'
  );
}

/** Message for every escrow/payout step refused on a direct DRV case. */
export const DIRECT_ROUTE_NO_ESCROW =
  'Direct client submission: the DRV pays the refund straight to the client, so there is no escrow release, payout queue or ZE for this case. Record the decision and the client’s confirmation of payment on the direct-submission card instead.';

/**
 * A case counts as submitted to the DRV once the firm saved its posting
 * date or admin recorded the direct dispatch. After that the ordinary
 * route switch is locked (correction workflow).
 */
export function submittedToDrv(row: {
  lawFirmSubmittedAt?: Date | string | null;
  submissionDispatchedAt?: Date | string | null;
}): boolean {
  return !!(row.lawFirmSubmittedAt || row.submissionDispatchedAt);
}
