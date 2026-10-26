import { describe, expect, it } from 'vitest';
import {
  byteCapacity,
  encodeQr,
  formatBits,
  qrSvg,
  rsRemainder,
  versionBits,
} from './qr';

/**
 * Test-side QR reader written independently from the encoder's layout
 * code: it rebuilds the function-pattern map from the spec, reads and
 * checks the format information, unmasks, walks the zig-zag, checks
 * every block's Reed–Solomon codewords and decodes the byte segment.
 */
const M_BLOCKS: Record<number, [number, number]> = {
  // version: [blocks, ecc codewords per block] at level M
  1: [1, 10], 2: [1, 16], 3: [1, 26], 4: [2, 18], 5: [2, 24],
  6: [4, 16], 7: [4, 18], 8: [4, 22], 9: [5, 22], 10: [5, 26],
};
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};
const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function decode(m: boolean[][]): string {
  const size = m.length;
  const ver = (size - 17) / 4;
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const mark = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true;
  };
  mark(0, 0, 9, 9); // finder + separator + format
  mark(size - 8, 0, 8, 9);
  mark(0, size - 8, 9, 8);
  mark(6, 0, 1, size); // timing
  mark(0, 6, size, 1);
  const a = ALIGN[ver];
  for (const ax of a)
    for (const ay of a) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === a[a.length - 1]) || (ay === 6 && ax === a[a.length - 1])) continue;
      mark(ax - 2, ay - 2, 5, 5);
    }
  if (ver >= 7) {
    mark(size - 11, 0, 3, 6);
    mark(0, size - 11, 6, 3);
  }
  expect(m[size - 8][8]).toBe(true); // dark module

  // Format info, copy 1 (bit 14 = MSB first along the spec's order)
  const f1: boolean[] = [];
  for (let i = 0; i <= 5; i++) f1.push(m[i][8]);
  f1.push(m[7][8], m[8][8], m[8][7]);
  for (let i = 9; i < 15; i++) f1.push(m[8][14 - i]);
  const read = (bits: boolean[]) => bits.reduce((acc, b, i) => acc | (Number(b) << i), 0);
  const fmt = read(f1);
  const mask = [0, 1, 2, 3, 4, 5, 6, 7].find((k) => formatBits(k) === fmt);
  expect(mask).toBeDefined();
  const f2: boolean[] = [];
  for (let i = 0; i < 8; i++) f2.push(m[8][size - 1 - i]);
  for (let i = 8; i < 15; i++) f2.push(m[size - 15 + i][8]);
  expect(read(f2)).toBe(fmt);

  // Zig-zag read, unmasking on the fly
  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let v = 0; v < size; v++) {
      const y = upward ? size - 1 - v : v;
      for (const x of [right, right - 1]) {
        if (fn[y][x]) continue;
        bits.push(Number(m[y][x] !== MASKS[mask!](x, y)));
      }
    }
  }
  const total = Math.floor(bits.length / 8);
  const codewords: number[] = [];
  for (let i = 0; i < total; i++)
    codewords.push(bits.slice(i * 8, i * 8 + 8).reduce((acc, b) => (acc << 1) | b, 0));

  // De-interleave
  const [numBlocks, ecc] = M_BLOCKS[ver];
  const shortLen = Math.floor(total / numBlocks);
  const numShort = numBlocks - (total % numBlocks);
  const dataLens = Array.from({ length: numBlocks }, (_, i) => shortLen - ecc + (i < numShort ? 0 : 1));
  const blocksData: number[][] = dataLens.map(() => []);
  let k = 0;
  for (let i = 0; i < Math.max(...dataLens); i++)
    for (let b = 0; b < numBlocks; b++) if (i < dataLens[b]) blocksData[b].push(codewords[k++]);
  const blocksEcc: number[][] = dataLens.map(() => []);
  for (let i = 0; i < ecc; i++) for (let b = 0; b < numBlocks; b++) blocksEcc[b].push(codewords[k++]);
  blocksData.forEach((d, b) => expect(rsRemainder(d, ecc)).toEqual(blocksEcc[b]));

  // Byte segment
  const data = blocksData.flat();
  const stream = data.flatMap((byte) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (byte >> i) & 1));
  let p = 0;
  const take = (n: number) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | stream[p++];
    return v;
  };
  expect(take(4)).toBe(0b0100);
  const len = take(ver <= 9 ? 8 : 16);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = take(8);
  return new TextDecoder().decode(out);
}

describe('QR encoder', () => {
  it('Reed–Solomon matches the "HELLO WORLD" 1-M worked example', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(rsRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('format and version information match the spec tables', () => {
    expect(formatBits(0).toString(2).padStart(15, '0')).toBe('101010000010010');
    expect(formatBits(5).toString(2).padStart(15, '0')).toBe('100000011001110');
    expect(formatBits(7).toString(2).padStart(15, '0')).toBe('100101010100000');
    expect(versionBits(7).toString(2).padStart(18, '0')).toBe('000111110010010100');
    expect(versionBits(10).toString(2).padStart(18, '0')).toBe('001010010011010011');
  });

  it('byte capacities at level M match the spec', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(byteCapacity)).toEqual([
      14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    ]);
  });

  const samples = [
    'A',
    'https://admin.atlaes.de',
    'otpauth://totp/Vividius%20Law-firm%20portal:user%40vividius.de?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Vividius%20Law-firm%20portal&algorithm=SHA1&digits=6&period=30',
    'otpauth://totp/Vividius%20Law-firm%20portal:a.very.long.partner.name%40kanzlei-mit-langem-namen.de?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Vividius%20Law-firm%20portal&algorithm=SHA1&digits=6&period=30',
    'x'.repeat(200),
  ];
  it.each(samples)('round-trips %#', (text) => {
    const m = encodeQr(text);
    expect(decode(m)).toBe(text);
  });

  it('refuses data beyond version 10', () => {
    expect(() => encodeQr('x'.repeat(214))).toThrow();
  });

  it('renders an SVG with a quiet zone', () => {
    const svg = qrSvg('A');
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 29 29"/);
    expect(svg).toContain('<path d="M4,4h1v1h-1z');
  });
});
