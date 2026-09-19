'use strict';

/**
 * Erzeugt die PNG-App-Icons (Favicon, Apple-Touch-Icon, PWA-Icons) aus einem
 * einfachen, prozedural gezeichneten "Demonic App Store"-Monogramm (Buchstabe
 * "D" vor dunklem Rot/Violett-Glow, plus zwei angedeutete Hörner). Kein
 * externes Bild, keine Bildbearbeitungs-Abhängigkeit – reines Node + zlib.
 *
 * Nutzung: node tools/generate-icons.js
 * (Bei Bedarf später einfach durch ein eigenes Logo ersetzen.)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'client', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------- CRC32 ----
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------- PNG ------
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  // Jede Scanline bekommt ein Filter-Byte (0 = none)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ------------------------------------------------------------ Zeichnen -----
function makeCanvas(size) {
  return { size, data: new Float64Array(size * size * 4) }; // RGBA, 0..255 als float für Blending
}

function setPixel(canvas, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  const srcA = a / 255;
  const dstA = canvas.data[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  canvas.data[i] = (r * srcA + canvas.data[i] * dstA * (1 - srcA)) / outA;
  canvas.data[i + 1] = (g * srcA + canvas.data[i + 1] * dstA * (1 - srcA)) / outA;
  canvas.data[i + 2] = (b * srcA + canvas.data[i + 2] * dstA * (1 - srcA)) / outA;
  canvas.data[i + 3] = outA * 255;
}

function fillRect(canvas, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(canvas.size, Math.ceil(y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(canvas.size, Math.ceil(x1)); x += 1) {
      setPixel(canvas, x, y, color[0], color[1], color[2], color[3] !== undefined ? color[3] : 255);
    }
  }
}

function dist(x, y, cx, cy) {
  return Math.sqrt((x - cx) * (x - cy) === 0 ? 0 : (x - cx) ** 2 + (y - cy) ** 2);
}

function drawBackground(canvas) {
  const s = canvas.size;
  const base = [11, 10, 16];
  const red = [255, 45, 61];
  const violet = [124, 58, 237];

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      let r = base[0];
      let g = base[1];
      let b = base[2];

      const dRed = Math.hypot(x - s * 0.28, y - s * 0.22) / (s * 0.75);
      const redAmt = Math.max(0, 1 - dRed) ** 1.6 * 0.55;
      r += (red[0] - r) * redAmt;
      g += (red[1] - g) * redAmt;
      b += (red[2] - b) * redAmt;

      const dViolet = Math.hypot(x - s * 0.82, y - s * 0.86) / (s * 0.8);
      const violetAmt = Math.max(0, 1 - dViolet) ** 1.6 * 0.4;
      r += (violet[0] - r) * violetAmt;
      g += (violet[1] - g) * violetAmt;
      b += (violet[2] - b) * violetAmt;

      setPixel(canvas, x, y, r, g, b, 255);
    }
  }
}

function drawGlowCircle(canvas, cx, cy, radius, color) {
  const s = canvas.size;
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(s, Math.ceil(cy + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(s, Math.ceil(cx + radius)); x += 1) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 1) continue;
      const alpha = (1 - d) ** 2 * 180;
      setPixel(canvas, x, y, color[0], color[1], color[2], alpha);
    }
  }
}

function drawLetterD(canvas, opts) {
  const s = canvas.size;
  const { scale = 1, color = [246, 243, 245] } = opts;

  const left = s * (0.5 - 0.22 * scale);
  const right = s * (0.5 + 0.22 * scale);
  const top = s * (0.5 - 0.24 * scale);
  const bottom = s * (0.5 + 0.24 * scale);
  const stemRight = left + (right - left) * 0.42;

  const bowlCx = stemRight;
  const bowlCy = (top + bottom) / 2;
  const outerR = (bottom - top) / 2;
  const strokeW = (right - left) * 0.42;
  const innerR = Math.max(0, outerR - strokeW);

  for (let y = Math.floor(top) - 2; y <= Math.ceil(bottom) + 2; y += 1) {
    for (let x = Math.floor(left) - 2; x <= Math.ceil(right) + 2; x += 1) {
      let inside = false;
      if (x >= left && x <= stemRight && y >= top && y <= bottom) {
        inside = true;
      } else if (x >= bowlCx) {
        const d = Math.hypot(x - bowlCx, y - bowlCy);
        if (d <= outerR && d >= innerR) inside = true;
      }
      if (inside) {
        setPixel(canvas, x, y, color[0], color[1], color[2], 255);
      }
    }
  }
}

function fillTriangle(canvas, p1, p2, p3, color) {
  const minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0], p3[0])));
  const maxX = Math.min(canvas.size, Math.ceil(Math.max(p1[0], p2[0], p3[0])));
  const minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1], p3[1])));
  const maxY = Math.min(canvas.size, Math.ceil(Math.max(p1[1], p2[1], p3[1])));

  function sign(a, b, c) {
    return (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
  }

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const pt = [x + 0.5, y + 0.5];
      const d1 = sign(pt, p1, p2);
      const d2 = sign(pt, p2, p3);
      const d3 = sign(pt, p3, p1);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) {
        setPixel(canvas, x, y, color[0], color[1], color[2], 255);
      }
    }
  }
}

function drawHorns(canvas) {
  const s = canvas.size;
  const color = [255, 77, 94, 210];
  fillTriangle(
    canvas,
    [s * 0.27, s * 0.24],
    [s * 0.36, s * 0.24],
    [s * 0.21, s * 0.06],
    color
  );
  fillTriangle(
    canvas,
    [s * 0.64, s * 0.24],
    [s * 0.73, s * 0.24],
    [s * 0.79, s * 0.06],
    color
  );
}

function renderIcon({ size, maskable = false, monochrome = false }) {
  const canvas = makeCanvas(size);
  drawBackground(canvas);
  drawGlowCircle(canvas, size * 0.5, size * 0.5, size * 0.42, [255, 45, 61]);

  const scale = maskable ? 0.62 : 0.86;
  if (!maskable && size >= 96) {
    drawHorns(canvas);
  }
  drawLetterD(canvas, { scale, color: monochrome ? [255, 255, 255] : [246, 243, 245] });

  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < canvas.data.length; i += 1) {
    buf[i] = Math.max(0, Math.min(255, Math.round(canvas.data[i])));
  }
  return encodePNG(size, size, buf);
}

const targets = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-192-maskable.png', size: 192, maskable: true },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
];

for (const t of targets) {
  const png = renderIcon(t);
  fs.writeFileSync(path.join(OUT_DIR, t.file), png);
  // eslint-disable-next-line no-console
  console.log(`[icons] ${t.file} (${t.size}x${t.size}) geschrieben.`);
}
