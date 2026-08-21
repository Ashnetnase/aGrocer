/**
 * Generates the PWA icon set from the Agrocer design tokens.
 *
 * Writes minimal, hand-rolled PNGs (no image dependency) so the icons stay
 * reproducible and in sync with the palette. Re-run with `node scripts/generate-icons.mjs`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const MOSS_600 = [0x2e, 0x6b, 0x4a];
const CANVAS = [0xf7, 0xf3, 0xec];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** @param {(x: number, y: number) => [number, number, number]} shade */
function png(size, shade) {
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(size * 3 + 1);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = shade(x, y);
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The mark: a moss field with a rounded canvas "a" bowl, echoing the header
 * logo tile in the app. `inset` leaves the safe zone maskable icons require.
 */
function agrocerMark(size, inset) {
  const centre = size / 2;
  const outer = size * (0.5 - inset);
  const bowlRadius = outer * 0.42;
  const bowlCentre = centre + outer * 0.12;
  const stemX = centre + outer * 0.44;

  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    const bowl = Math.hypot(px - centre, py - bowlCentre);
    const inBowlRing = bowl < bowlRadius && bowl > bowlRadius * 0.52;
    const inStem =
      px > stemX - outer * 0.13 &&
      px < stemX &&
      py > centre - outer * 0.5 &&
      py < bowlCentre + bowlRadius;

    return inBowlRing || inStem ? CANVAS : MOSS_600;
  };
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.12 },
  { file: 'icon-512.png', size: 512, inset: 0.12 },
  // Maskable icons get cropped to a circle on some launchers, so the mark sits
  // inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.24 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.12 },
];

for (const { file, size, inset } of targets) {
  writeFileSync(join(OUT_DIR, file), png(size, agrocerMark(size, inset)));
  console.log(`wrote ${file} (${size}x${size})`);
}
