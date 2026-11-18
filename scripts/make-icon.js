'use strict';
// Generates assets/icon.png (512px) and assets/tray.png (32px) with no
// dependencies: an indigo rounded square with a white chat bubble.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const SS = 4; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const p = pixel((x + (sx + .5) / SS) / size, (y + (sy + .5) / SS) / size);
        r += p[0] * p[3]; g += p[1] * p[3]; b += p[2] * p[3]; a += p[3];
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / (SS * SS)) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function roundRect(u, v, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(u, x1 - r)), cy = Math.max(y0 + r, Math.min(v, y1 - r));
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}
function icon(u, v) {
  if (!roundRect(u, v, 0.04, 0.04, 0.96, 0.96, 0.22)) return [0, 0, 0, 0];
  // vertical gradient indigo -> violet
  const bg = [Math.round(79 + 45 * v), Math.round(70 - 10 * v), Math.round(229 + 10 * v), 1];
  const bubble = roundRect(u, v, 0.22, 0.26, 0.78, 0.66, 0.14);
  // little tail at bottom-left
  const tail = v >= 0.6 && v <= 0.78 && u >= 0.3 && u <= 0.44 && (u - 0.3) <= (0.78 - v) * 0.8;
  if (bubble || tail) {
    // three dots
    for (const dx of [0.36, 0.5, 0.64]) if ((u - dx) ** 2 + (v - 0.46) ** 2 < 0.045 ** 2) return bg;
    return [255, 255, 255, 1];
  }
  return bg;
}
const out = path.join(__dirname, '..', 'assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png(512, icon));
fs.writeFileSync(path.join(out, 'tray.png'), png(32, icon));
console.log('icons written to', out);
