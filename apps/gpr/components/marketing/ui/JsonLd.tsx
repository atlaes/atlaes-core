import { serializeJsonLd, type JsonLdGraph } from '@/lib/jsonld';

/** One minified `<script type="application/ld+json">` per page. */
export function JsonLd({ graph }: { graph: JsonLdGraph }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
    />
  );
}
