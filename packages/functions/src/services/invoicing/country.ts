/**
 * Country name (as stored on the case, English or German, or already a
 * code) → ISO 3166-1 alpha-2 for the invoice address. Uses Intl region
 * display names, so no lookup table to maintain. Null when unknown.
 */

let index: Map<string, string> | null = null;

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function buildIndex(): Map<string, string> {
  const map = new Map<string, string>();
  const names = ['en', 'de'].map(
    (l) => new Intl.DisplayNames([l], { type: 'region' })
  );
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      for (const dn of names) {
        let name: string | undefined;
        try {
          name = dn.of(code);
        } catch {
          name = undefined;
        }
        // First code wins: GB before the reserved UK alias, etc.
        if (name && name !== code && !map.has(norm(name)))
          map.set(norm(name), code);
      }
    }
  }
  // Common variants not covered by the display names.
  for (const [k, v] of Object.entries({
    usa: 'US',
    unitedstatesofamerica: 'US',
    uk: 'GB',
    england: 'GB',
    greatbritain: 'GB',
    deutschland: 'DE',
    southkorea: 'KR',
    russia: 'RU',
  })) {
    map.set(k, v);
  }
  return map;
}

export function toCountryCode(
  country: string | null | undefined
): string | null {
  if (!country) return null;
  const t = country.trim();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  index ??= buildIndex();
  return index.get(norm(t)) ?? null;
}
