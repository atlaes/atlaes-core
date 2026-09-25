/**
 * JSON-LD for the guide / article / downloads pages, built on the shared
 * helpers in `lib/jsonld.ts` (Person + Article + BreadcrumbList (+ FAQPage);
 * CollectionPage + ItemList; the processing-time page adds the Dataset node
 * from `gpr-processing-time-jsonld.html`).
 */
import type { ArticleData } from '@/content/articles/types';
import { ORG } from '@/content/site';
import { formEditionList, formEditionUrl } from '@/content/registries/forms';
import { resolveTokens, t } from '@/content/tokens';
import {
  absoluteUrl,
  articleGraph,
  breadcrumbNode,
  collectionPageGraph,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  PERSON_ID,
  personNode,
  type JsonLdGraph,
} from '@/lib/jsonld';

const DOWNLOADS_DESCRIPTION =
  'Annotated directory of the official Deutsche Rentenversicherung forms for pension contribution refunds — refund claims (V0901, V0900), payment declarations (A1310 family) and supporting forms — each linked to its official DRV source.';

/** ItemList names: "<number> — <English gloss> (<edition>)". */
export function formItemName(
  item: ReturnType<typeof formEditionList>[number]
): string {
  const { form, edition } = item;
  const multi = form.editions.length > 1;
  const first = form.editions[0] === edition;
  if (!multi) return `${form.number} — ${form.titleEn}`;
  if (first) return `${form.number} — ${form.titleEn} (${edition.langLabel})`;
  const head = form.titleEn.split(',')[0];
  const note = edition.note ? ` (${edition.note})` : '';
  return `${form.number} — ${head}, ${edition.langLabel} edition${note}`;
}

function crumbs(a: ArticleData) {
  const home = a.lang === 'de' ? 'Startseite' : 'Home';
  return [
    { name: home, path: '/' },
    { name: a.headline, path: a.path },
  ];
}

export function articleJsonLd(a: ArticleData): JsonLdGraph {
  if (a.kind === 'collection') {
    return collectionPageGraph({
      path: a.path,
      name: a.title,
      description: DOWNLOADS_DESCRIPTION,
      inLanguage: a.lang,
      items: formEditionList().map((it) => ({
        name: formItemName(it),
        url: formEditionUrl(it.edition),
      })),
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Forms & Downloads', path: a.path },
      ],
    });
  }
  if (a.kind === 'evergreen') return processingTimeGraph(a);
  return articleGraph({
    path: a.path,
    headline: a.headline,
    description: a.meta,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    inLanguage: a.lang,
    breadcrumbs: crumbs(a),
    faq: a.faqInSchema ? a.faq : undefined,
    imageUrl: a.imageUrl,
  });
}

/** Organization + Person + Article (mainEntity → Dataset) + Dataset. */
function processingTimeGraph(a: ArticleData): JsonLdGraph {
  const url = absoluteUrl(a.path);
  const datasetId = url + '#dataset';
  const total = t('M-12.total');
  return graph([
    {
      ...organizationStub(),
      legalName: ORG.legalName,
      logo: { '@type': 'ImageObject', url: ORG.logoUrl },
    },
    personNode(),
    {
      '@type': 'Article',
      '@id': url + '#article',
      headline: a.headline,
      description: resolveTokens(
        `How long the ${total} most recent completed refunds managed by Germany Pension Refund took: median {{M-19.medianDays}} days; {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) reached the client escrow account within {{M-12.days}} days of complete submission — with the full measurement methodology.`
      ),
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      inLanguage: a.lang,
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      author: { '@id': PERSON_ID },
      publisher: { '@id': ORGANIZATION_ID },
      ...(a.imageUrl ? { image: a.imageUrl } : {}),
      mainEntity: { '@id': datasetId },
    },
    breadcrumbNode(url + '#breadcrumbs', crumbs(a)),
    {
      '@type': 'Dataset',
      '@id': datasetId,
      name: `Germany Pension Refund processing-time analysis (${total} most recent completed refunds)`,
      identifier: t('S-14.dataset'),
      version: t('S-14.dataset').replace(/^GPR-PTS-/, ''),
      description: resolveTokens(
        `First-party analysis of Germany Pension Refund's ${total} most recent completed paid refunds, ordered by escrow value date: calendar days from documented complete submission to the client escrow value date. Median {{M-19.medianDays}} days; {{M-13.pct}} within {{M-13.days}} days; {{M-12.count}}/{{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days; {{M-20.pct}} within {{M-20.days}} days. Calculated {{M-12.calculatedOn}}. Open/unpaid, withdrawn, unsuccessful, test, duplicate and unreliably matched records were excluded. Describes elapsed time among completed refunds, not the completion probability for a new submission. Aggregate results only; case-level data remains confidential.`
      ),
      url,
      creator: { '@id': ORGANIZATION_ID },
      conditionsOfAccess:
        'Aggregate results only; the underlying case-level records are confidential and not available for access.',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      measurementTechnique:
        'Calendar days from documented complete submission (as recorded by Germany Pension Refund) to client escrow value date, from internal case and payment records',
      variableMeasured: [
        'median days from complete submission to client escrow value date',
        `share of completed refunds reaching escrow within ${t('M-13.days')} days`,
        `share of completed refunds reaching escrow within ${t('M-12.days')} days`,
        `share of completed refunds reaching escrow within ${t('M-20.days')} days`,
      ],
    },
  ]);
}
