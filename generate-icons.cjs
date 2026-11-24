const fs = require("fs");
const zlib = require("zlib");

function createPNG(width, height, drawFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const idx = y * (width * 4 + 1) + 1 + x * 4;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const name = Buffer.from(type);
    const crcBuf = Buffer.concat([name, data]);
    let crc = 0xffffffff;
    for (let i = 0; i < crcBuf.length; i++) {
      crc ^= crcBuf[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, name, data, crcOut]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const drawMascot = (x, y, w, h) => {
  const cx = w / 2, cy = h / 2;
  const dx = (x - cx) / (w * 0.35), dy = (y - cy) / (h * 0.35);
  const dist = Math.sqrt(dx * dx + dy * dy);
  let r = 56, g = 189, b = 248, a = 255;
  if (dist < 0.85) { r = 251; g = 191; b = 36; }
  const eyeL = Math.hypot(dx + 0.3, dy + 0.15);
  const eyeR = Math.hypot(dx - 0.3, dy + 0.15);
  if (eyeL < 0.13 || eyeR < 0.13) { r = 15; g = 23; b = 42; }
  if (dy > 0.15 && dy < 0.35 && Math.abs(dx) < 0.35 && Math.abs(Math.hypot(dx, dy - 0.1) - 0.32) < 0.08) {
    r = 244; g = 63; b = 94;
  }
  return [r, g, b, a];
};

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/icon-only.png", createPNG(1024, 1024, drawMascot));
fs.writeFileSync("assets/splash.png", createPNG(1024, 1024, drawMascot));
console.log("Base icons generated successfully!");
