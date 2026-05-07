#!/usr/bin/env node
/**
 * Placeholder-icon generator for the PWA. Produces three PNGs:
 *   - public/icons/192.png         (192x192, transparent margin)
 *   - public/icons/512.png         (512x512, transparent margin)
 *   - public/icons/maskable-512.png (512x512, full-bleed for mask safe-area)
 *
 * Visual: a dark-bg square holding a 2x2 quadrant grid in the Q1..Q4
 * brand colors (red, cyan, amber, gray) — a recognizable nod to the
 * Eisenhower matrix without committing us to a final design. Run:
 *
 *   node packages/app/scripts/generate-icons.mjs
 *
 * Idempotent: overwrites the three target files. Pure ESM + built-ins
 * (no dev-dep cost). Re-run if the brand colors or layout change.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

// Tokens — kept in lockstep with packages/design-system/src/tokens.ts.
const BG = [0x0a, 0x0e, 0x14, 0xff];
const Q_COLORS = {
  Q1: [0xff, 0x4d, 0x6d, 0xff],
  Q2: [0x7d, 0xf9, 0xff, 0xff],
  Q3: [0xff, 0xd1, 0x66, 0xff],
  Q4: [0x8b, 0x96, 0xa5, 0xff],
};
const TRANSPARENT = [0, 0, 0, 0];

/**
 * Render a 2x2 quadrant grid. `size` is the canvas edge in px.
 * `margin` is the empty/transparent border (0 for maskable). The grid
 * occupies `size - 2*margin` and shows four colored squares with a
 * thin background gutter between them. Outside the margin is fully
 * transparent (the launcher applies rounded-corner masks for the
 * non-maskable variant).
 */
function renderQuadrantGrid(size, margin) {
  const inner = size - margin * 2;
  const gutter = Math.max(2, Math.floor(size / 64));
  const cell = (inner - gutter) / 2;
  // Pixel buffer: RGBA per pixel, scanline-major.
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Outside the margin: fully transparent (non-maskable variant
      // uses this; maskable passes margin=0 so this branch never
      // fires).
      const inX = x - margin;
      const inY = y - margin;
      if (inX < 0 || inX >= inner || inY < 0 || inY >= inner) {
        pixels[i] = TRANSPARENT[0];
        pixels[i + 1] = TRANSPARENT[1];
        pixels[i + 2] = TRANSPARENT[2];
        pixels[i + 3] = TRANSPARENT[3];
        continue;
      }
      // Inside: pick the quadrant; pixels in the central gutter fall
      // back to bg color so the four cells visually separate.
      const inGutter =
        Math.abs(inX - cell - gutter / 2) < gutter / 2 ||
        Math.abs(inY - cell - gutter / 2) < gutter / 2;
      let color;
      if (inGutter) {
        color = BG;
      } else {
        const left = inX < cell;
        const top = inY < cell;
        // Layout: Q1 top-left, Q3 top-right, Q2 bottom-left, Q4 bottom-right
        // (matches the matrix grid convention used in design-input.md
        // and view1: important↑, urgent→).
        if (top && left) color = Q_COLORS.Q1;
        else if (top && !left) color = Q_COLORS.Q3;
        else if (!top && left) color = Q_COLORS.Q2;
        else color = Q_COLORS.Q4;
      }
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }
  return pixels;
}

// Minimal PNG encoder — IHDR + IDAT + IEND, RGBA color type.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// CRC32 table (standard reverse polynomial 0xedb88320).
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(pixels, width, height) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // IDAT: prepend a filter byte (0 = none) per scanline, deflate.
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    pixels.subarray(y * stride, (y + 1) * stride).forEach((b, i) => {
      filtered[y * (stride + 1) + 1 + i] = b;
    });
  }
  const idat = deflateSync(filtered, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size, margin) {
  const pixels = renderQuadrantGrid(size, margin);
  const png = encodePng(pixels, size, size);
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}

// Standard icons get a 12% transparent margin so launchers' rounded
// masks don't clip the corners. The maskable icon goes full-bleed
// (margin=0) — the platform applies the safe-area mask itself, and
// content inside the inner ~80% circle survives.
write('192.png', 192, Math.round(192 * 0.12));
write('512.png', 512, Math.round(512 * 0.12));
write('maskable-512.png', 512, 0);
