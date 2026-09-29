# Build spec — GPR platform + client answers (25 Sep 2026)

Shared conventions for every work stream. Read fully before editing.

## Ground rules (all streams)

- Monorepo, pnpm. Backend `packages/functions` (Hono on Lambda, Drizzle,
  Postgres schemas `shared`, `gpr`, `claims`). Frontends `apps/gpr`
  (Next.js 14 App Router, Tailwind, Zustand, React Query, axios client in
  `apps/gpr/lib/api.ts` with base `${NEXT_PUBLIC_API_URL}/api`).
- Style: Prettier (single quotes, trailing commas es5, semicolons, 80 cols).
  Run `node_modules/.bin/prettier --write <files>` from the repo root.
- Shell quirk on this machine: `cd` into repo folders can fail with
  `fnm: command not found` (exit 127). Always use absolute paths and
  `git -C /home/deck/Code/atlaes-core …`. Do NOT commit; the coordinator
  commits per stream.
- Backend tests without Postgres: create a temporary
  `packages/functions/vitest.pure.tmp.config.mts` (globals, node env,
  include `src/**/*.test.ts`, no globalSetup/setupFiles), run
  `packages/functions/node_modules/.bin/vitest run --root packages/functions
  --config <that file> <paths>`, delete the file afterwards. Tests that
  need the DB will fail with ECONNREFUSED — that is expected here; write
  new unit tests so they do not need the DB where possible.
- Backend type-check: the full `tsc` OOMs. Use a temporary
  `tsconfig.narrow.tmp.json` in `packages/functions` (`extends
  ./tsconfig.json`, `include: []`, `files: [...your files]`) with
  `NODE_OPTIONS=--max-old-space-size=6144 node_modules/.bin/tsc --noEmit -p`.
  Pre-existing noise to ignore: `Module './vbl' has already exported…` in
  `schema/index.ts`, `Argument of type 'unknown'…` on logger calls,
  `excessively deep` zValidator errors. Delete the temp file afterwards.
- Frontend type-check: `node_modules/.bin/tsc --noEmit -p apps/gpr/tsconfig.json`.
- Migrations: SQL files in `packages/functions/src/drizzle/migrations/`,
  idempotent (`ADD COLUMN IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN
  duplicate_object`). Numbers are pre-assigned per stream below. Do NOT
  edit `meta/_journal.json` yourself — leave the SQL file and say so in your
  report; the coordinator appends the journal entries in order.
- Route mounting: `packages/functions/src/index.ts` mounts routers with
  `app.route('/api/<name>', router)`. Re-read the file right before adding
  your line; add one line only.
- Do not touch files owned by another stream (listed per stream). If you
  must, stop and report instead.
- Copy is law: never reword client copy (Truth Table rule). `[Q]`
  markers never reach output — values come from the token store.

## Source material

- Content package: `/home/deck/Downloads/GPR other pages` (README_FOR_KARL.md,
  00_README_Karl_CountryPages_2026-09-17.md) plus older handoffs in
  `/home/deck/Downloads/GPR` and widget HTML in `/home/deck/Downloads/New GPR`.
- Parsed page data already exists in the scratchpad
  `/tmp/claude-1000/-home-deck-Code-atlaes-core/a8f37d57-76af-438d-8886-a8f75da32144/scratchpad/gpr-other-pages/`:
  `pages/<slug>.json` (15 country pages: slug, title, meta, h1, hero paras,
  trust, bullets[], sections[{h2, blocks[{t:p|h3|ul|ol|table|note,…}]}],
  faq[{q,a}], close[]), `parse_country.py`, `emit_guide.py` (parses the
  forms/downloads/brexit handoffs into blocks), `GPR_OTHER_PAGES_ANALYSIS.md`.
- Client answers (Slack, 15 Sep 2026) for bAV and DRV are summarised in
  the memory note `bav-abfindung-private-route-spec.md` and
  `gpr-drv-submission-pack-law-firm-portal.md` under
  `/home/deck/.claude/projects/-home-deck-Code-atlaes-core/memory/`.
- Client-update engine rules: "Rules for Karl" section of
  `GPR_Client_Update_Texts_FINAL_2026-09-16.md`.

## Stream A — backend claims (case type, bAV client answers)

Owner of: `packages/functions/src/drizzle/schema/claims.ts`,
`services/claims-application.ts`, `services/admin-overview.ts`,
`services/law-firm*.ts`, `services/bav-letters/**`, `assets/bav/**`,
`routes/admin.ts`, `routes/claims.ts`, migrations **0014** and **0015**.

A1. Case type discriminator (item 8, "one system"): add
`case_type varchar(20)` on `claims.claims` with values
`'vbl_refund' | 'bav_cashout' | 'drv_refund'`. Backfill: `pension_type =
'private'` → bav_cashout; rows with `application_id` (GPR application link)
→ drv_refund; else vbl_refund. Set it on create: `POST /claims` from the
GPR app (which passes an applicationId or none) → drv_refund; VBL app →
vbl_refund unless pensionType private → bav_cashout. Keep `pension_type`
for backwards compatibility. `defaultHandlingRoute` becomes
`defaultHandlingRoute(caseType, pensionType)`: bav_cashout and drv_refund →
law_firm; vbl_refund → direct. Law-firm portal: label cases by case type
("DRV refund" / "Company pension") and show `caseIdentifier` = VSNR for
drv_refund, contract number for bav_cashout. Migration 0014.

A2. Letterhead (item 4): produce
`packages/functions/src/assets/bav/law-firm-letterhead.pdf` (A4, the
Vividius logo from `src/assets/gpr/vividius-logo.jpg` top-right exactly as
`drv-pack/cover-letter.ts` places it, footer with the firm's address
block: Vividius Rechtsanwälte · Gneisenaustr. 115 · 10961 Berlin) with a
small Node script committed under `packages/functions/scripts/` so it can
be regenerated; `loadLawFirmLetterhead()` then finds it. Add a unit test
that the LAW package renders with the letterhead page.

A3. Fee split for bAV (item 5): when ops record the cash-out amount
received on the Anderkonto (new admin endpoint `POST
/admin/claims/:id/bav-payout` with `amountEur`, `valueDate`), store on the
claim (`bav_payout_amount`, `bav_payout_value_date`, `bav_fee_eur`,
`bav_law_firm_fee_deducted` boolean, `bav_settlement_list` boolean) using
`drv-pack/fee.ts computeFeeSplit` (9.75 %, cap €2,500 incl. VAT, firm fee
€178.50, small-refund rule). Add `GET /admin/bav/settlement-list` for the
year-end list. Migration 0015 (with A4/A5 columns).

A4. Manual documents (item 6): admin can upload extra documents to a
claim that are merged into the bAV lettershop/law-firm PDF. Reuse the
existing document upload; add a document role `bav_extra` and include
those files (in upload order) after the standard enclosures in
`assembleBavPackage`. Regeneration via the existing admin regenerate path.

A5. Provider matrix (item 7): table `claims.bav_providers` (name,
default addressee type, department, street, postal code, city, country,
requires bank address boolean, notes). Admin CRUD endpoints under
`/admin/bav/providers`. On claim submission, if the claim's recipient
address fields are empty and a provider matrix row matches
`bav_provider_name` (case-insensitive), copy the address onto the claim
(ops can still override per claim). Migration 0015.

Tests: unit tests for defaultHandlingRoute, fee split mapping, package
enclosure order, provider address fill (DB-free where possible).

## Stream B — GPR web content infrastructure (items 11, 12, 17)

Owner of: everything new under `apps/gpr/` except `app/account/**`,
`components/account/**` (Stream G) and the existing funnel files
(`app/calculator/**`, `app/check/**`, `app/claims/**`, `app/dashboard/**`,
`app/auth/**`, `components/{auth,calculator,claims,eligibility}/**`,
`lib/api.ts`, `lib/claims-api.ts`) which must not change.

B1. Marketing route group `apps/gpr/app/(marketing)/` with its own
`layout.tsx` (server-rendered header + footer built from registries),
Inter font, brand tokens from the Figma system: navy #002691, light blue
#5e8cd9, pale #afc6ec, tint #d7e4f6, surface #f1f1f1, ink #181818, body
#4b4f58, muted #8c8c8c, stroke #c6c6c6; pill buttons r-full; cards r-20;
section pattern = left rail ("›› 01 — LABEL") + 936px body on desktop,
single column on phones (16px gutters, no horizontal scroll).

B2. Token store `apps/gpr/content/tokens.ts`: every quarterly value with
register id, value, qualifier sentence, dataset version, asOf date,
nextRefresh (2026-11-24). Ids: M-04 (mean €11,571.66, median €10,327.10,
hero rounding "around €11,600", calculated 24 Aug 2026), M-17 (range
"under €200 to over €53,000"), TM-01/M-12 ("more than three quarters of
our 300 most recent completed refunds … within three months"; 229 of 300,
76.3 %, within 90 days, calculated 25 Aug 2026), M-15/M-16 (4.9/5,
1,250+ reviews on ProvenExpert; 4.98/5, 1,252 reviews), M-19 (median 40.5
days), M-20 (93.3 % ≤ 180 days), S-14 dataset GPR-PTS-2026-Q3-v3, €22M
recovered. Helper `t('M-04.sentence')` style accessors. Add
`scripts/check-q-markers.mjs` that fails if a literal `[Q]` or an
unresolved token appears in `apps/gpr/content/**` or rendered pages, wired
as `pnpm --filter gpr check:content`.

B3. Registries `apps/gpr/content/registries/`: `countries.ts` (slug,
name, demonym, flag, live boolean, inDropdown boolean, archetype),
`forms.ts` (form number, title, editions {lang, drvSlug, version, stand},
guide slug, verifiedOn; DRV URL pattern
`https://www.deutsche-rentenversicherung.de/SharedDocs/Formulare/DE/_pdf/<slug>`),
`links.ts` (internal targets with `live` flag; a helper renders a link
only when live, plain text otherwise — "ship dark").

B4. JSON-LD helper `apps/gpr/lib/jsonld.ts`: builders for Service+FAQPage
(country pages), Person+Article+BreadcrumbList(+FAQPage), CollectionPage+
ItemList, Organization+WebSite+Service+FAQPage; single minified `<script
type="application/ld+json">`; FAQ items carry `inSchema`; site-wide @ids
`https://www.germanypensionrefund.com/#organization` and `/#johannes-kuehn`;
a unit test asserts each output is < 7,000 chars for the country pages.

B5. Country page template `app/(marketing)/[country]/page.tsx` with
`generateStaticParams` from the registry and per-country data files
`apps/gpr/content/countries/<slug>.ts` generated from the scratchpad
`pages/<slug>.json` (write a converter script under `apps/gpr/scripts/`).
Sections render in data order (the three archetypes fall out of the
data); jump menu = six anchors (do-i-qualify, what-we-do, journeys,
getting-paid, certified-signatures, faq) with a per-page anchor map for
residence pages; hero = H1, two paragraphs, trust bar, five bullets,
primary CTA `/refund-calculator`, secondary `/get-your-refund`; "What you
need to start" as a callout; tables for residence pages; FAQ rendered as
server-side HTML (no hidden accordions); metadata from title/meta; JSON-LD
from B4. All 15 countries must render.

B6. Redirect and language rules (item 17) in `apps/gpr/middleware.ts` /
`next.config.js`: 301 `/get-your-refund` → funnel entry preserving `via`,
`utm_*`, `gclid`, `fbclid`; `/bosnia-herzegovina`, `/kosovo`, `/montenegro`,
`/serbia` → `/former-yugoslavia#<country>`; EN_ONLY list (`/phoebe`,
`/refundsib`) bounce from the `de.` host to `www`; `hreflang` alternates
helper for pages that have a DE view (hub, downloads, FAQ) with
`x-default` = EN.

Report: the exact file list, how pages are rendered (`pnpm --filter gpr
build` must pass), and any copy that could not be placed.

## Stream C — guides, downloads, articles (item 13) — starts after B1–B4

Owner of: `apps/gpr/app/(marketing)/{v0901-pension-refund-form-english,
v0900-formular,v0100-form,v0800-child-raising-periods,
a1310-payment-declaration,download,post/**,
german-pension-refund-processing-time}/**`, `apps/gpr/content/guides/**`,
`apps/gpr/content/articles/**`, `components/marketing/article/**`.
Article template: hero (breadcrumb, eyebrow, H1, reviewer line), left
rail with "On this page" from H2s, 760px column, dividers before H2s,
callout for the ID-02 blockquote, numbered mistakes, FAQ as h3+p, official
downloads list, sources line, CTA pills. Build data with the scratchpad
`emit_guide.py` parser logic (port it to a Node script under
`apps/gpr/scripts/`). Downloads page = CollectionPage+ItemList from the
forms registry. Processing-time page = chart component (four rows: 40.5 d
median 50 %, 56 d 61.7 %, 90 d 76.3 %, 180 d 93.3 %) + Dataset schema.

## Stream D — homepage, how-it-works, intake step 1 (item 14) — after B1–B4

Owner of: `apps/gpr/app/(marketing)/page.tsx`, `how-it-works/**`,
`components/marketing/home/**`, `components/marketing/intake/**`,
`lib/attribution.ts`. Copy from `GPR_Homepage_Build_Sheet_2026-09-08.md`
and `GPR_HowItWorks_Page_Content_Handoff_2026-09-08.md`. Hero flow card =
citizenship + country-of-residence searchable selects → "Check my
eligibility →" → routes into the existing `/check` funnel with the answers
prefilled (query params) — do not rebuild the funnel. Attribution: capture
`utm_*`, `gclid`, `fbclid`, referrer, landing page, `via` on first visit
(cookie + localStorage) and send them with lead/claim creation. Reviews
section renders from `content/reviews.ts` (10 cards). Organization +
WebSite + Service + FAQPage JSON-LD.

## Stream E — lead capture + reminders (item 15)

Owner of: `packages/functions/src/services/leads/**`, `routes/leads.ts`,
`drizzle/schema/leads.ts` (schema `gpr`), migration **0016**,
`resources/services/index.ts` (add a cron only; keep existing resources),
email templates under `services/leads/emails/**`.

Replace `gpr-lead-endpoint-v7.3.gs` (in `/home/deck/Downloads/New GPR`):
`POST /api/leads` with `type` ∈ `v0900-guide | wegzug-guide | claim-lead`,
`placement` (e.g. `rentenbeitragserstattung`, `phoebe`, `refundsib`),
`email`, optional `reminderOptIn` + `lastContributionMonth` (YYYY-MM),
attribution fields (`utm_*`, `gclid`, `fbclid`, `referrer`, `landingPage`,
`via`), consent flags. Store in `gpr.leads`; send the delivery e-mail via
SES (`services/email.ts` pattern) with the guide PDF link (S3 key from
env); daily reminder job: send the waiting-period reminder in month 23
(`lastContributionMonth + 23 months`, first of the month) once, mark sent.
SST cron in `resources/services/index.ts` (`sst.aws.Cron`, daily) calling
a handler exported from `packages/functions/src/leads-cron.handler.ts`.
CSV import script for the two existing Sheet tabs (columns per the .gs
file). Unit tests for reminder date math and template rendering.

## Stream F — client-update engine (item 16, backend)

Owner of: `packages/functions/src/services/client-updates/**`,
`routes/account.ts`, `drizzle/schema/client-updates.ts` (schema `claims`),
migration **0017**, `client-updates-cron.handler.ts`, e-mail templates
under `services/client-updates/emails/**` (copy verbatim from
`GPR_Client_Update_Texts_FINAL_2026-09-16.md`: T1, M0, M1, M2, M3A, M3B,
M3+, M4 (five result paragraphs), M5, M6A, M6B, M6+, E1, E2A, E2B, E3,
Oldenburg-Bremen originals mail from
`GPR_Email_Originals_OldenburgBremen_2026-09-16.md`).

Implement the "Rules for Karl": case fields on the claim
(`pension_office`, `submission_date`, `communication_owner`,
`next_client_update_due`, `last_client_update_sent`, `open_customer_task`
jsonb, `next_office_action` jsonb), contact-log table
(`contact_date`, `logged_by`, `channel`, `type` ∈ status_enquiry |
office_reply | unsuccessful_attempt | written_reminder | complaint |
info_request | documents_forwarded | transfer, `outcome`, `summary_en`,
`uncertain`, `customer_action`, `update_warranted`), schedule from
`submission_date` (M0 day 0; ≤28 d; status enquiry +3 months; written
reminder review +5; senior review +6; ≤14 d after +6; month-end
clamping), trigger→template map, draft generation ≥1 working day before
due as a task for the communication owner, admin warnings (update
overdue, office action overdue, posting date unconfirmed after 7 days,
funds before decision), stop when a decision or funds event arrives.
Client account read API: `GET /api/account/case` returns the panel data
(stage, next update by, next step, latest contact, customer task or
"Nothing at the moment", activity list from verified events, documents),
`POST /api/account/letters` (upload a letter received directly),
`POST /api/account/tasks/:id/documents`. Cron daily. Unit tests for the
schedule math and template selection (DB-free).

## Stream G — client account frontend (item 16, frontend) — after B1

Owner of: `apps/gpr/app/account/**`, `components/account/**`. Screens per
the Figma section "D · Client account" (law-firm page): account home
(Submitted stage panel, stepper Preparing/Submitted/Decision/Payout, cards
for next update / anything to do / what we are doing next / latest),
open-task variant, upload a letter, all updates, documents. Uses Stream F
endpoints via `lib/api.ts`.

## Migration numbers

0014 Stream A (case_type), 0015 Stream A (bAV payout, extra docs,
providers), 0016 Stream E (leads), 0017 Stream F (client updates). The
coordinator appends the journal entries.
