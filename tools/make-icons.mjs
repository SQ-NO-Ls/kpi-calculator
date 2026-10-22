// Generates icons/icon.svg and the PNG icons with zero dependencies (node:zlib only).
// Run: node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x24, 0x56, 0xe6];
const FG = [0xff, 0xff, 0xff];
// Three rising bars on a 512 grid, kept inside the maskable safe zone (central 80%).
const BARS = [
  { x: 128, y: 292, w: 68, h: 100 },
  { x: 222, y: 222, w: 68, h: 170 },
  { x: 316, y: 132, w: 68, h: 260 },
];
const BAR_R = 16;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#2456e6"/>
${BARS.map((b) => `  <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${BAR_R}" fill="#fff"/>`).join('\n')}
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), svg);

function inRoundRect(px, py, { x, y, w, h }, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// PNG icons are full-bleed squares: iOS and Android apply their own corner masks.
function render(size) {
  const SS = 4;
  const scale = 512 / size;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) * scale;
          const py = (y + (sy + 0.5) / SS) * scale;
          if (BARS.some((b) => inRoundRect(px, py, b, BAR_R))) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  return png(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`../icons/icon-${size}.png`, import.meta.url), render(size));
}
console.log('icons written');
