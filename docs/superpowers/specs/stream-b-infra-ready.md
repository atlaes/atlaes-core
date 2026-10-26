# Stream B — GPR web content infrastructure is ready (B1–B4)

Everything below lives in `apps/gpr/` and compiles
(`node_modules/.bin/tsc --noEmit -p apps/gpr/tsconfig.json`). Streams C, D
and G build on these; do not duplicate them.

## Route group and layout (B1)

- `app/(marketing)/layout.tsx` — server layout with `<SiteHeader />`,
  `<main id="main">` and `<SiteFooter />`, wrapped in `<div className="mk">`
  which scopes the design tokens. Put marketing pages under
  `app/(marketing)/<slug>/page.tsx`. The root layout (`app/layout.tsx`) is
  untouched: it still provides Inter (next/font) and the funnel providers.
- **`/` collision:** `app/page.tsx` (funnel redirect page) already owns `/`.
  Stream D must delete `app/page.tsx` when it adds
  `app/(marketing)/page.tsx`, otherwise the build fails with two pages for
  the same route. Stream B did not touch it.
- `app/(marketing)/marketing.css` — CSS variables `--mk-navy #002691`,
  `--mk-blue #5e8cd9`, `--mk-pale #afc6ec`, `--mk-tint #d7e4f6`,
  `--mk-surface #f1f1f1`, `--mk-ink #181818`, `--mk-body #4b4f58`,
  `--mk-muted #8c8c8c`, `--mk-stroke #c6c6c6`, `--mk-r-card 20px`,
  `--mk-body-w 936px`, plus the primitives (`.mk-h1/.mk-h2/.mk-h3/.mk-p/
  .mk-note/.mk-ul/.mk-ol`, `.mk-container`, tables, callouts, pills, jump
  menu, FAQ, header, footer, hero). Tailwind also exposes the same colours
  as `brand.navy … brand.stroke`, `rounded-card`, `max-w-body`
  (`tailwind.config.js`). Phone layout: single column, 16px gutters, no
  horizontal scroll (tables scroll inside their wrapper).
- Header/footer content comes from `content/site.ts` (`HEADER_NAV`,
  `FOOTER_SERVICE`, `FOOTER_FORMS`, `FOOTER_LEGAL`, `FOOTER_SOCIAL`, `ORG`,
  `REVIEWER`, `DISCLAIMER_ID02`, `TOOLS_NOTE`, `COPYRIGHT`) and from the
  country registry (footer index, "Rules by Country" dropdown). No client
  JS: dropdown and phone menu are `<details>` elements.

## Shared components — `components/marketing/ui/` (barrel `index.ts`)

| Export | Use |
|---|---|
| `Section({ id, index, label, title?, tone?, as?, children })` | Section pattern: left rail "›› 01 — LABEL" + 936px body; H2 carries `id` (anchor target). `tone` = `plain` / `surface` / `tint`. |
| `Rail({ index, label })` | The rail on its own (for custom section layouts). |
| `Callout({ title?, tone?, id?, as?, children })` | r-20 card; `tone` = `tint` (default) / `surface` / `outline`. Used for "What you need to start", ID-02 disclaimers, notices. |
| `Pill({ href, variant?, size?, children })` | Pill CTA (`primary` navy / `secondary` outline / `ghost`), `size` `md`/`lg`. Ships dark like SmartLink. |
| `FaqList({ items, as? })` | Visible FAQ (h3 question + p answer), no accordion. `items: FaqItem[]`. |
| `SmartLink({ href, children, className?, darkClassName? })` | The **ship-dark link**: renders `<Link>` only when `isLiveHref(href)`; otherwise a `<span data-dark-link>` with the text. External hrefs open in a new tab with `rel="noopener"`. Absolute `https://www.germanypensionrefund.com/...` hrefs are rewritten to paths. |
| `Inline({ x, sp })` | Text with link/bold spans (`Span[]`), tokens resolved first. |
| `Blocks({ blocks })` | Renders `Block[]` (`p`, `h3`, `note`, `ul`, `ol`, `table`). |
| `DataTable({ rows, caption? })` | Real `<table>`; first row = header. |
| `JumpMenu({ items: {href,label}[] })` | Compact in-page anchor menu. |
| `JsonLd({ graph })` | One minified `<script type="application/ld+json">`. |

Content model types: `content/types.ts` (`Block`, `RichText`, `Span`,
`FaqItem { q, a, inSchema? }`, `CountryPageData`, `CountrySection`,
`JumpAnchor`, `CountryArchetype`, `CountrySectionKind`).

## Token store (B2) — `content/tokens.ts` + `content/tokens.json`

- Data in `tokens.json`: `M-04`, `M-17`, `TM-01`, `M-12`, `M-13`, `M-19`,
  `M-20`, `M-15`, `M-16`, `M-14`, `S-14`, `STAT-2026`; each with `label`,
  `dataset`, `asOf`, `values{}`, `qualifier`, `sentences{default,…}`;
  `nextRefresh: 2026-11-24`.
- Accessors: `t('M-04.mean')` → `'€11,571.66'`; `t('M-04.sentence')` →
  the approved default sentence with slots filled; `t('M-04.sentence.hero')`
  → a named variant; `tokenMeta('M-12')` → `{ dataset, asOf, nextRefresh }`;
  `resolveTokens(text)` replaces `{{M-04.sentence}}` / `{{M-04.sentence.hero}}`
  / `{{M-12.pct}}` references and **throws** on an unknown reference or a
  literal Q marker. Never write a bare number from the register into copy;
  write the sentence reference.
- Useful variants: `M-04.sentence` (amount paragraph, incl. M-17 range),
  `M-04.sentence.hero` (hero bullet), `M-04.sentence.schema` (JSON-LD
  description sentence), `M-04.sentence.meta` ("Average client refund:
  €11,572."), `TM-01.sentence` + `M-12.sentence` (timing evidence pair),
  `M-15.sentence` (trust bar / top bar: "Over 4.9/5 on ProvenExpert from more
  than 1,250 reviews"), `M-15.sentence.exact` (4.98/5 · 1,252), `M-19`,
  `M-20`, `M-13` (processing-time chart rows), `S-14.dataset`.
- CI: `pnpm --filter gpr check:content` runs `scripts/check-q-markers.mjs`
  — fails on a literal Q marker or an unresolved `{{…}}` in
  `content/**`, `components/marketing/**`, `app/(marketing)/**`, and in
  `.next/server/app/**` when a build exists. Do not write the two-character
  marker in comments either; the guard is literal.

## Registries (B3) — `content/registries/` (barrel `index.ts`)

- `countries.ts`: `COUNTRIES: CountryEntry[]` (`slug, name, demonym, flag,
  live, inDropdown, archetype?, combinedInto?, footnote?`),
  `GENERATED_COUNTRY_SLUGS`, `findCountry(slug)`, `countryHref(entry)`
  (ex-YU entries → `/former-yugoslavia#<slug>`), `countryIsLive(entry)`,
  `footerCountryIndex()` (alphabetical, Former Yugoslavia and "All other
  countries" last), `headerCountryDropdown()` (India, USA, Canada,
  Australia, The Philippines, New Zealand, Pakistan, Indonesia, All other
  countries). **When you add a country route, flip `live: true`** — the
  footer, dropdown and every SmartLink to it light up.
- `forms.ts`: `FORMS: FormEntry[]` (V0901 ×4 editions, V0900, V0910,
  E5816, E5817, A1310 ×5, A1311, R0985, V0100, V0800 = the 17-item
  ItemList), `formEditionList()` (flat, positions 1–17),
  `formEditionUrl(edition)` (`DRV_PDF_BASE + drvSlug`, or the DRV form
  search when the slug is not yet verified), `findForm('A1310')`,
  `DRV_PDF_BASE`, `DRV_FORM_SEARCH`, `DRV_EANTRAG`. Version/Stand are the
  values verified 27 Aug 2026.
- `links.ts`: `LINKS` (internal targets with `live` + `note`),
  `isLiveHref(href)`, `toSitePath(href)`, `isExternalHref(href)`,
  `linkLabel(path)`, `SITE_URL`, `DE_SITE_URL`, `FUNNEL_ENTRY`
  (`/check/3-step`), `EXTERNAL` (ProvenExpert, socials, Trustpilot, …).
  **When you add a page, set its entry `live: true`** (add one if missing);
  that is the whole go-live cascade for links.

## JSON-LD (B4) — `lib/jsonld.ts`

- Builders return a `@graph`: `countryPageGraph(page)` (Service + FAQPage),
  `articleGraph({ path, headline, description, datePublished, dateModified?,
  inLanguage?, breadcrumbs, faq?, imageUrl? })` (Person + Article +
  BreadcrumbList + FAQPage), `collectionPageGraph({ path, name, description,
  items, breadcrumbs?, inLanguage? })` (CollectionPage + ItemList +
  BreadcrumbList), `homeGraph({ serviceName, serviceDescription, faq })`
  (Organization + WebSite + Service + FAQPage, no AggregateRating).
- Nodes: `organizationNode()`, `organizationStub()`, `websiteNode()`,
  `personNode()`, `faqPageNode(id, faq)` (skips `inSchema: false`),
  `breadcrumbNode(id, crumbs)`; ids `ORGANIZATION_ID`, `WEBSITE_ID`,
  `PERSON_ID` (`/#organization`, `/#website`, `/#johannes-kuehn`).
- `serializeJsonLd(graph)` → minified string (`<` escaped);
  `asciiEscapedLength`, `byteLength` for the 7,000 guard; render with
  `<JsonLd graph={…} />`. Descriptions and FAQ text pass through
  `resolveTokens`, so token references are allowed inside them.
- `lib/hreflang.ts`: `pageAlternates({ path, hasDe?, dePath? })` →
  `metadata.alternates` (canonical only, or `en`/`de`/`x-default`);
  `EN_ONLY_PATHS`.

## Conventions

- Prettier from the repo root: `node_modules/.bin/prettier --write <files>`.
- Type-check: `node_modules/.bin/tsc --noEmit -p apps/gpr/tsconfig.json`
  (tsconfig lib is ES6 — no `Object.entries`, `Array.includes`, `padStart`).
- Build: `pnpm --filter gpr build` needs network access to
  `fonts.googleapis.com` / `fonts.gstatic.com` (root layout uses
  `next/font/google`).
- Tests: `pnpm --filter gpr test` runs vitest from the
  `packages/functions` workspace binary (vitest is not a gpr dependency —
  the offline store cannot install it); config `apps/gpr/vitest.config.mts`,
  files `**/*.test.ts` with relative imports or the `@/` alias.
- Country template (B5, landing next): `components/marketing/country/
  CountryPage.tsx` renders `CountryPageData`; route
  `app/(marketing)/[country]/page.tsx` with `generateStaticParams` from
  `GENERATED_COUNTRY_SLUGS`. Static single-segment routes you add (e.g.
  `/how-it-works`, `/download`) take precedence over `[country]`.
