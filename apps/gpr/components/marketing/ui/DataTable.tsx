import { resolveTokens } from '@/content/tokens';

export interface DataTableProps {
  /** First row is the header row. */
  rows: string[][];
  caption?: string;
}

/** Real `<table>` markup; scrolls horizontally on phones inside its wrapper. */
export function DataTable({ rows, caption }: DataTableProps) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  return (
    <div className="mk-table-wrap">
      <table className="mk-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} scope="col">
                {resolveTokens(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {resolveTokens(c)}
                  </th>
                ) : (
                  <td key={j}>{resolveTokens(c)}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
