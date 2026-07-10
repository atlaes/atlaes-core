import type { ReactNode } from 'react';

export interface ComparisonTableRow {
  /** Row header shown in the first (label) column. */
  label: string;
  /** One cell per non-label column; length should be columns.length - 1. */
  values: ReactNode[];
}

export interface ComparisonTableProps {
  /** Column headers. The first entry heads the row-label column. */
  columns: string[];
  rows: ComparisonTableRow[];
}

/**
 * Side-by-side comparison table used on the product pages (e.g. VBL vs DRV,
 * Figma 1248:6025). Header row on the brand background, zebra body rows, the
 * row label emphasised. Below md the table keeps its natural width and scrolls
 * inside its own container so the page never scrolls horizontally.
 */
export function ComparisonTable({ columns, rows }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-400">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="bg-brand text-white">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-6 py-4 text-sm font-semibold sm:text-base"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.label}
              className={rowIndex % 2 === 1 ? 'bg-neutral-50' : 'bg-white'}
            >
              <th
                scope="row"
                className="px-6 py-4 align-top text-base font-semibold text-brand"
              >
                {row.label}
              </th>
              {row.values.map((value, valueIndex) => (
                <td
                  key={`${row.label}-${valueIndex}`}
                  className="px-6 py-4 align-top text-base leading-relaxed text-gray-600"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
