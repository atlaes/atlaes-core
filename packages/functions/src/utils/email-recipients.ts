/**
 * Turns a recipient setting into the address list SES expects.
 *
 * Team mailboxes such as OPS_NOTIFICATION_EMAIL and LEADS_NOTIFY_EMAIL may
 * hold several addresses separated by commas or semicolons
 * ("a@x.de, b@y.de"). SES treats each ToAddresses entry as one address, so
 * a list passed as a single entry is rejected. A plain single address comes
 * back unchanged as a one-element list.
 */
export function splitRecipients(to: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of to.split(/[,;]/)) {
    const address = part.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(address);
  }
  return out;
}
