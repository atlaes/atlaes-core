/**
 * Shared plan/render layer for the direct-route documents (client cover
 * letter, Postempfangsvollmacht). Same pattern as cover-letter.ts: a pure
 * op list (top-origin coordinates, page index) that tests can inspect,
 * and a renderer that draws it with pdf-lib.
 *
 * Layout rules from the template spec (29 Oct 2026): multiline
 * placeholders expand into separate lines, long lines wrap, the signature
 * block is kept together (moved to the next page as a whole), and no
 * unresolved placeholder may reach the PDF.
 */

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { A4 } from '../claim-pdf/constants';
import { wrapText } from '../claim-pdf/text-layout';

export type DirectOp =
  | {
      kind: 'text';
      page: number;
      text: string;
      x: number;
      yTop: number;
      size: number;
      bold?: boolean;
    }
  | { kind: 'line'; page: number; x1: number; x2: number; yTop: number }
  | {
      kind: 'signature';
      page: number;
      x: number;
      yTop: number;
      height: number;
    };

export const DIRECT_LAYOUT = {
  marginLeft: 70,
  marginRight: 70,
  top: 60,
  bottom: 800,
  fontSize: 10.5,
  lineHeight: 13.5,
  signatureHeight: 36,
} as const;

/** Thrown when a placeholder value is missing; the document is not drawn. */
export class UnresolvedPlaceholderError extends Error {
  constructor(readonly placeholders: string[]) {
    super(`Unresolved placeholders: ${placeholders.join(', ')}`);
    this.name = 'UnresolvedPlaceholderError';
  }
}

/**
 * Every value must be non-empty and free of template markers. Arrays are
 * multiline fields and need at least one non-empty line.
 */
export function assertResolved(
  values: Record<string, string | string[] | null | undefined>
): void {
  const bad: string[] = [];
  for (const [key, v] of Object.entries(values)) {
    const lines = Array.isArray(v) ? v : [v ?? ''];
    const filled = lines.filter((l) => (l ?? '').trim() !== '');
    if (!filled.length || lines.some((l) => /\{\{|\}\}/.test(l ?? '')))
      bad.push(key);
  }
  if (bad.length) throw new UnresolvedPlaceholderError(bad);
}

/** Flowing writer that breaks pages and keeps blocks together. */
export class FlowWriter {
  readonly ops: DirectOp[] = [];
  page = 0;
  y: number = DIRECT_LAYOUT.top;
  readonly maxWidth =
    A4.width - DIRECT_LAYOUT.marginLeft - DIRECT_LAYOUT.marginRight;

  constructor(
    readonly font: PDFFont,
    readonly bold: PDFFont
  ) {}

  private ensure(height: number): void {
    if (this.y + height > DIRECT_LAYOUT.bottom) {
      this.page += 1;
      this.y = DIRECT_LAYOUT.top;
    }
  }

  /** Starts a new page unless `height` still fits on this one. */
  keepTogether(height: number): void {
    this.ensure(height);
  }

  at(
    text: string,
    x: number,
    yTop: number,
    o: { size?: number; bold?: boolean } = {}
  ): void {
    this.ops.push({
      kind: 'text',
      page: this.page,
      text,
      x,
      yTop,
      size: o.size ?? DIRECT_LAYOUT.fontSize,
      bold: o.bold,
    });
  }

  line(
    text: string,
    o: { size?: number; bold?: boolean; x?: number } = {}
  ): void {
    const size = o.size ?? DIRECT_LAYOUT.fontSize;
    const lh = (DIRECT_LAYOUT.lineHeight * size) / DIRECT_LAYOUT.fontSize;
    this.ensure(lh);
    this.at(text, o.x ?? DIRECT_LAYOUT.marginLeft, this.y, o);
    this.y += lh;
  }

  /** Wrapped paragraph; `indent` shifts every line, `hanging` all but the first. */
  para(
    text: string,
    o: { size?: number; bold?: boolean; indent?: number; hanging?: number } = {}
  ): void {
    for (const l of this.wrap(text, o)) l();
  }

  /** Wrapped lines as deferred writers, so callers can measure first. */
  wrap(
    text: string,
    o: { size?: number; bold?: boolean; indent?: number; hanging?: number } = {}
  ): (() => void)[] {
    const size = o.size ?? DIRECT_LAYOUT.fontSize;
    const indent = o.indent ?? 0;
    const hanging = o.hanging ?? 0;
    const f = o.bold ? this.bold : this.font;
    const out: (() => void)[] = [];
    const lines = wrapText(text, f, size, this.maxWidth - indent - hanging);
    lines.forEach((l, i) =>
      out.push(() =>
        this.line(l, {
          size,
          bold: o.bold,
          x: DIRECT_LAYOUT.marginLeft + indent + (i === 0 ? 0 : hanging),
        })
      )
    );
    return out;
  }

  blank(n = 1): void {
    this.y += DIRECT_LAYOUT.lineHeight * n;
  }

  /**
   * Place/date line, signature image (or space for a wet signature), the
   * rule, the caption and the printed name — one unbreakable block.
   */
  signatureBlock(input: {
    placeDate?: string | null;
    caption: string;
    name: string;
  }): void {
    const lh = DIRECT_LAYOUT.lineHeight;
    const height =
      (input.placeDate ? 2 * lh : 0) +
      DIRECT_LAYOUT.signatureHeight +
      4 +
      3 * lh;
    this.keepTogether(height);
    if (input.placeDate) {
      this.line(input.placeDate);
      this.blank();
    }
    this.ops.push({
      kind: 'signature',
      page: this.page,
      x: DIRECT_LAYOUT.marginLeft,
      yTop: this.y,
      height: DIRECT_LAYOUT.signatureHeight,
    });
    this.y += DIRECT_LAYOUT.signatureHeight + 4;
    this.ops.push({
      kind: 'line',
      page: this.page,
      x1: DIRECT_LAYOUT.marginLeft,
      x2: DIRECT_LAYOUT.marginLeft + 230,
      yTop: this.y,
    });
    this.y += 4;
    this.line(input.caption, { size: 9 });
    this.line(input.name);
  }

  pageCount(): number {
    return this.page + 1;
  }
}

export async function directFonts(
  doc: PDFDocument
): Promise<{ font: PDFFont; bold: PDFFont }> {
  return {
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

/**
 * Draws a plan onto new A4 pages of `doc`. The client's signature PNG is
 * stamped on every signature op; without one the space stays empty for a
 * handwritten signature. Returns the number of pages added.
 */
export async function renderDirectPlan(
  doc: PDFDocument,
  ops: DirectOp[],
  fonts: { font: PDFFont; bold: PDFFont },
  signaturePng?: Uint8Array | null
): Promise<number> {
  const pageCount = ops.reduce((m, o) => Math.max(m, o.page), 0) + 1;
  const pages = Array.from({ length: pageCount }, () =>
    doc.addPage([A4.width, A4.height])
  );
  const sig = signaturePng ? await doc.embedPng(signaturePng) : null;
  for (const op of ops) {
    const page = pages[op.page];
    if (op.kind === 'text') {
      const f = op.bold ? fonts.bold : fonts.font;
      page.drawText(op.text, {
        x: op.x,
        y: A4.height - op.yTop - f.heightAtSize(op.size, { descender: false }),
        size: op.size,
        font: f,
      });
    } else if (op.kind === 'line') {
      page.drawLine({
        start: { x: op.x1, y: A4.height - op.yTop },
        end: { x: op.x2, y: A4.height - op.yTop },
        thickness: 0.6,
      });
    } else if (sig) {
      const scale = Math.min(op.height / sig.height, 230 / sig.width);
      const h = sig.height * scale;
      page.drawImage(sig, {
        x: op.x,
        y: A4.height - op.yTop - op.height, // bottom-aligned on the rule
        width: sig.width * scale,
        height: h,
      });
    }
  }
  return pageCount;
}
