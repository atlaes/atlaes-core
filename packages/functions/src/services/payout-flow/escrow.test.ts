import { describe, expect, it } from 'vitest';
import { crc32, deflateSync } from 'zlib';
import { PDFDocument } from 'pdf-lib';
import { mergeToPdf } from './escrow';

function png(w = 40, h = 60): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.alloc((w * 4 + 1) * h))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('mergeToPdf', () => {
  it('joins PDF pages and photos in upload order', async () => {
    const two = await PDFDocument.create();
    two.addPage();
    two.addPage();
    const files = [
      new File([png()], 'p1.png', { type: 'image/png' }),
      new File([await two.save()], 'p2-3.pdf', { type: 'application/pdf' }),
      new File([png(80, 40)], 'p4.png', { type: 'image/png' }),
    ];
    const merged = await mergeToPdf(files, 'decision.pdf');
    expect(merged.type).toBe('application/pdf');
    expect(merged.name).toBe('decision.pdf');
    const doc = await PDFDocument.load(
      new Uint8Array(await merged.arrayBuffer())
    );
    expect(doc.getPageCount()).toBe(4);
  });
});
