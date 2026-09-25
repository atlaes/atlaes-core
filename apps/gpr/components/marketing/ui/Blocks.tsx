import { resolveTokens } from '@/content/tokens';
import type { Block } from '@/content/types';
import { Inline } from './Inline';
import { DataTable } from './DataTable';

/** Render a list of content blocks as server-side HTML. */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className="mk-p">
                <Inline x={b.x} sp={b.sp} />
              </p>
            );
          case 'h3':
            return (
              <h3 key={i} className="mk-h3">
                {resolveTokens(b.x)}
              </h3>
            );
          case 'note':
            return (
              <p key={i} className="mk-note">
                {resolveTokens(b.x)}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="mk-ul">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline x={it.x} sp={it.sp} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="mk-ol">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline x={it.x} sp={it.sp} />
                  </li>
                ))}
              </ol>
            );
          case 'table':
            return <DataTable key={i} rows={b.rows} />;
          default:
            return null;
        }
      })}
    </>
  );
}
