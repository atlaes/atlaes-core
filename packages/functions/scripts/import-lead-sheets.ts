/**
 * Imports the two guide-capture tabs of the old Google Sheet ("V0900" and
 * "Wegzug", written by gpr-lead-endpoint-v7.3.gs) into gpr.leads.
 *
 *   DATABASE_URL=postgresql://… pnpm exec tsx scripts/import-lead-sheets.ts \
 *     --tab V0900 ~/Downloads/V0900.csv [--tab Wegzug ~/Downloads/Wegzug.csv] [--dry-run]
 *
 * Export each tab as CSV (File > Download > CSV). Expected header (GUIDE_HEADER
 * in the script): Received, Email, Reminder opt-in, Ausscheiden Monat,
 * Ausscheiden Jahr, Widget, Page referrer, Landing page, utm_source,
 * utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid,
 * Submitted at (client), Reminder sent. Columns are matched by name, so
 * extra or reordered columns are fine.
 *
 * Rows are skipped when a lead with the same type, e-mail and "Received"
 * timestamp already exists, so the script can be re-run. Delivery e-mails
 * were sent by the script at the time, so delivery_email_sent_at is set to
 * "Received"; "Reminder sent" is carried over so the cron never re-sends.
 */
import fs from 'fs';
import { and, eq } from 'drizzle-orm';
import { db, closeDatabaseConnection } from '../src/utils/db';
import { leads, type NewLead } from '../src/drizzle/schema/leads';
import {
  reminderDueOnFor,
  toContributionMonth,
} from '../src/services/leads/reminder';

type Tab = 'V0900' | 'Wegzug';

const TAB_TYPE: Record<Tab, 'v0900-guide' | 'wegzug-guide'> = {
  V0900: 'v0900-guide',
  Wegzug: 'wegzug-guide',
};

/** Minimal RFC 4180 parser (quoted fields, doubled quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Sheets exports timestamps in the spreadsheet locale: "2026-09-05 14:22:31",
 * "05.09.2026 14:22:31" (de) or "9/5/2026 14:22:31" (en-US). ISO strings
 * (the "Submitted at (client)" column) parse natively.
 */
export function parseSheetDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  let m =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(v);
  if (m) {
    return new Date(
      Date.UTC(
        +m[1],
        +m[2] - 1,
        +m[3],
        +(m[4] ?? 0),
        +(m[5] ?? 0),
        +(m[6] ?? 0)
      )
    );
  }
  m =
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(
      v
    );
  if (m) {
    return new Date(
      Date.UTC(
        +m[3],
        +m[2] - 1,
        +m[1],
        +(m[4] ?? 0),
        +(m[5] ?? 0),
        +(m[6] ?? 0)
      )
    );
  }
  m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(
      v
    );
  if (m) {
    return new Date(
      Date.UTC(
        +m[3],
        +m[1] - 1,
        +m[2],
        +(m[4] ?? 0),
        +(m[5] ?? 0),
        +(m[6] ?? 0)
      )
    );
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "V0900-CAPTURE @ v0900" → placement "v0900"; no " @ " → null. */
export function placementFromWidget(widget: string): string | null {
  const i = widget.indexOf(' @ ');
  return i === -1 ? null : widget.slice(i + 3).trim() || null;
}

function col(header: string[], name: string): number {
  const i = header.findIndex(
    (h) => h.trim().toLowerCase() === name.toLowerCase()
  );
  if (i === -1) throw new Error(`Column "${name}" not found in header`);
  return i;
}

export function rowToLead(
  tab: Tab,
  header: string[],
  row: string[]
): NewLead | null {
  const get = (name: string) => (row[col(header, name)] ?? '').trim();
  const email = get('Email').toLowerCase();
  const received = parseSheetDate(get('Received'));
  if (!email || !received) return null;

  const reminderOptIn = get('Reminder opt-in').toUpperCase() === 'JA';
  const month = get('Ausscheiden Monat');
  const year = get('Ausscheiden Jahr');
  const lastContributionMonth =
    reminderOptIn && month && year ? toContributionMonth(month, year) : null;
  const widget = get('Widget') || `${tab.toUpperCase()}-CAPTURE`;
  const reminderSent = parseSheetDate(get('Reminder sent'));
  const or = (v: string) => v || null;

  return {
    type: TAB_TYPE[tab],
    placement: placementFromWidget(widget),
    email,
    reminderOptIn,
    lastContributionMonth,
    reminderDueOn: reminderDueOnFor(lastContributionMonth),
    reminderSentAt: reminderSent,
    widget,
    referrer: or(get('Page referrer')),
    landingPage: or(get('Landing page')),
    utmSource: or(get('utm_source')),
    utmMedium: or(get('utm_medium')),
    utmCampaign: or(get('utm_campaign')),
    utmTerm: or(get('utm_term')),
    utmContent: or(get('utm_content')),
    gclid: or(get('gclid')),
    fbclid: or(get('fbclid')),
    consentPrivacy: true,
    consentMarketing: reminderOptIn,
    deliveryEmailSentAt: received,
    source: 'sheet-import',
    submittedAt: parseSheetDate(get('Submitted at (client)')),
    createdAt: received,
    updatedAt: received,
  };
}

function parseArgs(argv: string[]): { tabs: [Tab, string][]; dryRun: boolean } {
  const tabs: [Tab, string][] = [];
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') {
      dryRun = true;
    } else if (argv[i] === '--tab') {
      const tab = argv[i + 1] as Tab;
      const file = argv[i + 2];
      if (!TAB_TYPE[tab] || !file) {
        throw new Error('Usage: --tab <V0900|Wegzug> <file.csv>');
      }
      tabs.push([tab, file]);
      i += 2;
    }
  }
  if (!tabs.length)
    throw new Error('Nothing to import: pass --tab <V0900|Wegzug> <file.csv>');
  return { tabs, dryRun };
}

async function importTab(tab: Tab, file: string, dryRun: boolean) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) {
    console.log(`${tab}: no data rows in ${file}`);
    return;
  }
  const [header, ...data] = rows;
  let inserted = 0;
  let skipped = 0;
  let invalid = 0;
  for (const row of data) {
    const lead = rowToLead(tab, header, row);
    if (!lead) {
      invalid += 1;
      continue;
    }
    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.type, lead.type),
          eq(leads.email, lead.email),
          eq(leads.createdAt, lead.createdAt as Date)
        )
      )
      .limit(1);
    if (existing.length) {
      skipped += 1;
      continue;
    }
    if (!dryRun) await db.insert(leads).values(lead);
    inserted += 1;
  }
  console.log(
    `${tab}: ${inserted} ${dryRun ? 'would be inserted' : 'inserted'}, ${skipped} already present, ${invalid} rows without e-mail/date`
  );
}

async function main() {
  const { tabs, dryRun } = parseArgs(process.argv.slice(2));
  for (const [tab, file] of tabs) await importTab(tab, file, dryRun);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => closeDatabaseConnection());
}
