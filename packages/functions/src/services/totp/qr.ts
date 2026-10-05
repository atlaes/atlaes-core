/**
 * Minimal QR Code encoder (ISO/IEC 18004) for the 2FA enrolment screen,
 * rendered as SVG. No dependency: byte mode only, error-correction level
 * M, versions 1–10 (up to 213 bytes, plenty for an otpauth:// URI).
 * Follows the structure of Project Nayuki's reference implementation.
 */

const MAX_VERSION = 10;
// Level M, index = version (0 unused).
const ECC_CODEWORDS_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_ERROR_CORRECTION_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const ECL_M_FORMAT_BITS = 0;

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

export function numDataCodewords(ver: number): number {
  return (
    Math.floor(numRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ver] * NUM_ERROR_CORRECTION_BLOCKS[ver]
  );
}

/** Largest byte-mode payload a version holds at level M. */
export function byteCapacity(ver: number): number {
  const countBits = ver <= 9 ? 8 : 16;
  return Math.floor((numDataCodewords(ver) * 8 - 4 - countBits) / 8);
}

// ---------------- Reed–Solomon over GF(2^8), poly 0x11D ----------------

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

export function rsRemainder(data: number[], degree: number): number[] {
  const divisor = rsDivisor(degree);
  const result = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

/** 15-bit format string (level M) for a mask, already XOR-masked. */
export function formatBits(mask: number): number {
  const data = (ECL_M_FORMAT_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18-bit version information (versions 7+). */
export function versionBits(ver: number): number {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

function alignmentPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const size = ver * 4 + 17;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

// ---------------- encoding ----------------

function encodeData(bytes: Uint8Array, ver: number): number[] {
  const bits: number[] = [];
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  append(0b0100, 4); // byte mode
  append(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => append(b, 8));
  const capacityBits = numDataCodewords(ver) * 8;
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
    append(pad, 8);
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  }
  return codewords;
}

function addEccAndInterleave(data: number[], ver: number): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ver];
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const len = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    const ecc = rsRemainder(dat, blockEccLen);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(block[i]);
      }
    });
  }
  return result;
}

function maskApplies(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Standard penalty score (N1–N4) used to pick the mask. */
function penalty(m: boolean[][]): number {
  const size = m.length;
  let score = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(m[i]);
    lines.push(m.map((row) => row[i]));
  }
  const finderLike = [
    [true, false, true, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, true, true, true, false, true],
  ];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    for (let i = 0; i + 11 <= size; i++) {
      for (const pattern of finderLike) {
        if (pattern.every((v, k) => line[i + k] === v)) score += 40;
      }
    }
  }
  for (let y = 0; y + 1 < size; y++) {
    for (let x = 0; x + 1 < size; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) {
        score += 3;
      }
    }
  }
  const dark = m.reduce((n, row) => n + row.filter(Boolean).length, 0);
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/** Module matrix (true = dark), row-major: matrix[y][x]. */
export function encodeQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  let ver = 1;
  while (ver <= MAX_VERSION && byteCapacity(ver) < bytes.length) ver++;
  if (ver > MAX_VERSION) throw new Error('Data too long for the QR encoder');

  const size = ver * 4 + 17;
  const modules = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );
  const isFunction = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );
  const setFn = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  // Finder patterns + separators
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          setFn(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
  }
  // Alignment patterns
  const align = alignmentPositions(ver);
  const last = align.length - 1;
  align.forEach((ax, i) => {
    align.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) {
        return;
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  const drawFormat = (mask: number) => {
    const bits = formatBits(mask);
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bits, i));
    setFn(8, 7, getBit(bits, 6));
    setFn(8, 8, getBit(bits, 7));
    setFn(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bits, i));
    setFn(8, size - 8, true); // dark module
  };
  drawFormat(0); // reserve the area

  if (ver >= 7) {
    const bits = versionBits(ver);
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, getBit(bits, i));
      setFn(b, a, getBit(bits, i));
    }
  }

  // Codewords in the zig-zag order
  const codewords = addEccAndInterleave(encodeData(bytes, ver), ver);
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bit < codewords.length * 8) {
          modules[y][x] = getBit(codewords[bit >>> 3], 7 - (bit & 7));
          bit++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunction[y][x] && maskApplies(mask, x, y)) {
          modules[y][x] = !modules[y][x];
        }
      }
    }
  };

  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty(modules);
    if (score < bestScore) {
      best = mask;
      bestScore = score;
    }
    applyMask(mask); // XOR again to undo
  }
  applyMask(best);
  drawFormat(best);
  return modules;
}

/** SVG markup with a 4-module quiet zone; scales to its container. */
export function qrSvg(
  text: string,
  { size = 200, dark = '#181818', light = '#ffffff' } = {}
): string {
  const matrix = encodeQr(text);
  const border = 4;
  const dim = matrix.length + border * 2;
  let path = '';
  matrix.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) path += `M${x + border},${y + border}h1v1h-1z`;
    });
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" ` +
    `width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="100%" height="100%" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/></svg>`
  );
}
