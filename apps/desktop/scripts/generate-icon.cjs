const zlib = require('zlib');
const fs = require('fs');

const W = 1024, H = 1024;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function heartShape(x, y, cx, cy, size) {
  const nx = (x - cx) / size, ny = (y - cy) / size;
  const ny2 = ny - 0.1;
  return Math.pow(nx * nx + ny2 * ny2 - 0.3, 3) - nx * nx * ny2 * ny2 * ny2 < 0;
}

const raw = Buffer.alloc((1 + W * 4) * H);
const cx = W / 2, cy = H / 2 + 40, sz = W * 0.42;

for (let y = 0; y < H; y++) {
  const off = y * (1 + W * 4);
  raw[off] = 0;
  for (let x = 0; x < W; x++) {
    const p = off + 1 + x * 4;
    const dx = (x - cx) / (W / 2), dy = (y - cy) / (H / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (heartShape(x, y, cx, cy, sz)) {
      const t = Math.min(1, dist * 0.8);
      raw[p]     = Math.round(251 * (1 - t * 0.3) + 225 * t * 0.3); // R
      raw[p + 1] = Math.round(113 * (1 - t * 0.5) +  29 * t * 0.5); // G
      raw[p + 2] = Math.round(133 * (1 - t * 0.3) + 100 * t * 0.3); // B
      raw[p + 3] = 255;
    } else {
      const bgT = Math.min(1, dist * 0.6);
      raw[p]     = Math.round(255 * (1 - bgT) + 252 * bgT);
      raw[p + 1] = Math.round(241 * (1 - bgT) + 231 * bgT);
      raw[p + 2] = Math.round(242 * (1 - bgT) + 243 * bgT);
      raw[p + 3] = 255;
    }
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // RGBA

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
  chunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync('app-icon.png', png);
console.log('Created app-icon.png (' + Math.round(png.length / 1024) + ' KB)');
