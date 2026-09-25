/**
 * JSON-LD builders. Every builder returns a `@graph` object; `serializeJsonLd`
 * produces the single minified string for `<script type="application/ld+json">`.
 *
 * Rules (Truth Table DP-03): figures come from the token store, FAQ answers
 * mirror the visible copy, FAQ items with `inSchema: false` are omitted, and
 * every country-page graph stays under 7,000 characters in raw, ASCII-escaped
 * and byte counts (`lib/jsonld.test.ts`).
 */
import { resolveTokens } from '@/content/tokens';
import type { CountryPageData, FaqItem } from '@/content/types';
import { ORG, REVIEWER } from '@/content/site';
import { SITE_URL } from '@/content/registries/links';

export const ORGANIZATION_ID = SITE_URL + '/#organization';
export const WEBSITE_ID = SITE_URL + '/#website';
export const PERSON_ID = REVIEWER.id;

export type JsonLdNode = Record<string, unknown>;

export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': JsonLdNode[];
}

export function graph(nodes: JsonLdNode[]): JsonLdGraph {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Minified, with `<` escaped so the string is safe inside a script tag. */
export function serializeJsonLd(g: JsonLdGraph): string {
  return JSON.stringify(g).replace(/</g, '\\u003c');
}

/** Length in ASCII-escaped characters (what the Wix field counted). */
export function asciiEscapedLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    n += c > 0x7e ? 6 : 1;
  }
  return n;
}

export function byteLength(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return SITE_URL + (path.charAt(0) === '/' ? path : '/' + path);
}

// --- shared nodes ---------------------------------------------------------

/** The compact provider reference used on every non-home page. */
export function organizationStub(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORG.name,
    url: ORG.url,
  };
}

/** Full Organization node (homepage only). */
export function organizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORG.name,
    legalName: ORG.legalName,
    vatID: ORG.vatId,
    url: ORG.url,
    logo: { '@type': 'ImageObject', url: ORG.logoUrl },
    foundingDate: ORG.foundingDate,
    description: ORG.description,
    email: ORG.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ORG.address.street,
      postalCode: ORG.address.postalCode,
      addressLocality: ORG.address.city,
      addressCountry: ORG.address.countryCode,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: ORG.phoneE164,
      contactType: 'customer service',
      availableLanguage: ['English', 'German'],
    },
    sameAs: ORG.sameAs,
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: ORG.url,
    name: ORG.name,
    inLanguage: 'en',
    datePublished: ORG.serviceSince,
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function personNode(): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: REVIEWER.name,
    jobTitle: REVIEWER.jobTitle,
    url: REVIEWER.url,
    worksFor: { '@id': ORGANIZATION_ID },
  };
}

/** FAQPage from visible FAQ items; `inSchema: false` items are skipped. */
export function faqPageNode(id: string, faq: FaqItem[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: faq
      .filter((f) => f.inSchema !== false)
      .map((f) => ({
        '@type': 'Question',
        name: resolveTokens(f.q),
        acceptedAnswer: { '@type': 'Answer', text: resolveTokens(f.a) },
      })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbNode(id: string, crumbs: Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

// --- page-type builders ---------------------------------------------------

/** Country page: Service + FAQPage (no BreadcrumbList, per the README). */
export function countryPageGraph(page: CountryPageData): JsonLdGraph {
  const url = absoluteUrl('/' + page.slug);
  return graph([
    {
      '@type': 'Service',
      '@id': url + '#service',
      name: page.schema.serviceName,
      serviceType: 'German pension contribution refund service',
      url,
      description: resolveTokens(page.schema.description),
      areaServed: 'Worldwide',
      audience: { '@type': 'Audience', audienceType: page.schema.audienceType },
      provider: organizationStub(),
    },
    faqPageNode(url + '#faq', page.faq),
  ]);
}

export interface ArticleInput {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  inLanguage?: 'en' | 'de';
  breadcrumbs: Crumb[];
  faq?: FaqItem[];
  /** ImageObject url for the article image, if any. */
  imageUrl?: string;
}

/** Guides and articles: Person + Article + BreadcrumbList (+ FAQPage). */
export function articleGraph(a: ArticleInput): JsonLdGraph {
  const url = absoluteUrl(a.path);
  const nodes: JsonLdNode[] = [
    personNode(),
    {
      '@type': 'Article',
      '@id': url + '#article',
      headline: a.headline,
      description: resolveTokens(a.description),
      url,
      mainEntityOfPage: url,
      inLanguage: a.inLanguage || 'en',
      datePublished: a.datePublished,
      dateModified: a.dateModified || a.datePublished,
      author: { '@id': PERSON_ID },
      publisher: { '@id': ORGANIZATION_ID },
      ...(a.imageUrl
        ? { image: { '@type': 'ImageObject', url: a.imageUrl } }
        : {}),
    },
    breadcrumbNode(url + '#breadcrumbs', a.breadcrumbs),
  ];
  if (a.faq && a.faq.length) nodes.push(faqPageNode(url + '#faq', a.faq));
  return graph(nodes);
}

export interface CollectionInput {
  path: string;
  name: string;
  description: string;
  inLanguage?: 'en' | 'de';
  items: Array<{ name: string; url?: string }>;
  breadcrumbs?: Crumb[];
}

/** Downloads page: CollectionPage + ItemList (+ BreadcrumbList). */
export function collectionPageGraph(c: CollectionInput): JsonLdGraph {
  const url = absoluteUrl(c.path);
  const nodes: JsonLdNode[] = [
    {
      '@type': 'CollectionPage',
      '@id': url + '#webpage',
      url,
      name: c.name,
      description: resolveTokens(c.description),
      inLanguage: c.inLanguage || 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      mainEntity: { '@id': url + '#forms' },
    },
    {
      '@type': 'ItemList',
      '@id': url + '#forms',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: c.items.length,
      itemListElement: c.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        ...(it.url ? { url: it.url } : {}),
      })),
    },
  ];
  if (c.breadcrumbs)
    nodes.push(breadcrumbNode(url + '#breadcrumbs', c.breadcrumbs));
  return graph(nodes);
}

export interface HomeInput {
  serviceName: string;
  serviceDescription: string;
  faq: FaqItem[];
}

/** Homepage: Organization + WebSite + Service + FAQPage. No AggregateRating. */
export function homeGraph(h: HomeInput): JsonLdGraph {
  return graph([
    organizationNode(),
    websiteNode(),
    {
      '@type': 'Service',
      '@id': SITE_URL + '/#service',
      name: h.serviceName,
      serviceType: 'German pension contribution refund service',
      url: ORG.url,
      description: resolveTokens(h.serviceDescription),
      areaServed: 'Worldwide',
      provider: { '@id': ORGANIZATION_ID },
    },
    faqPageNode(SITE_URL + '/#faq', h.faq),
  ]);
}
