import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = process.cwd();
const ATLAS_PATH = join(ROOT, "public", "sprites", "brigada-fighters-atlas-v1.png");
const OUTPUT_DIR = join(ROOT, "public", "fighters");
const FRAME_SIZE = 128;
const FIGHTERS = ["hartz", "petoux", "nexmos", "kavaleur", "korsair"];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function decodeRgbaPng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Fighter atlas is not a valid PNG file.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatParts = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width !== FRAME_SIZE * 9 || height !== FRAME_SIZE) {
    throw new Error(`Unexpected fighter atlas size: ${width}x${height}; expected 1152x128.`);
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported fighter atlas format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}. Expected non-interlaced 8-bit RGBA.`);
  }
  if (idatParts.length === 0) {
    throw new Error("Fighter atlas contains no IDAT data.");
  }

  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatParts));
  const expectedInflated = height * (rowBytes + 1);
  if (inflated.length !== expectedInflated) {
    throw new Error(`Unexpected inflated atlas size: ${inflated.length}; expected ${expectedInflated}.`);
  }

  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const filtered = inflated.subarray(sourceOffset, sourceOffset + rowBytes);
    sourceOffset += rowBytes;
    const row = Buffer.alloc(rowBytes);

    for (let x = 0; x < rowBytes; x += 1) {
      const raw = filtered[x];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previousRow[x] ?? 0;
      const upLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] : 0;
      let value;

      switch (filter) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter ${filter} on row ${y}.`);
      }
      row[x] = value & 0xff;
    }

    row.copy(pixels, y * rowBytes);
    previousRow = row;
  }

  return { width, height, pixels };
}

function encodeRgbaPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 4;
  const raw = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y += 1) {
    const target = y * (rowBytes + 1);
    raw[target] = 0;
    pixels.copy(raw, target + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", deflateSync(raw, { level: 9 })),
    makeChunk("IEND"),
  ]);
}

function cropFrame(atlas, frameIndex) {
  const output = Buffer.alloc(FRAME_SIZE * FRAME_SIZE * 4);
  const sourceRowBytes = atlas.width * 4;
  const outputRowBytes = FRAME_SIZE * 4;
  const sourceX = frameIndex * FRAME_SIZE * 4;

  for (let y = 0; y < FRAME_SIZE; y += 1) {
    const sourceStart = y * sourceRowBytes + sourceX;
    atlas.pixels.copy(output, y * outputRowBytes, sourceStart, sourceStart + outputRowBytes);
  }
  return output;
}

function inspectFrame(name, pixels) {
  let opaquePixels = 0;
  let minX = FRAME_SIZE;
  let minY = FRAME_SIZE;
  let maxX = -1;
  let maxY = -1;
  const colors = new Set();

  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const index = (y * FRAME_SIZE + x) * 4;
      const alpha = pixels[index + 3];
      if (alpha > 20) {
        opaquePixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        if (colors.size < 128) {
          colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${alpha}`);
        }
      }
    }
  }

  if (opaquePixels <= 250) {
    throw new Error(`${name}: only ${opaquePixels} visible pixels found; fighter frame is effectively empty.`);
  }
  if (maxX - minX < 20 || maxY - minY < 40) {
    throw new Error(`${name}: visible bounds are suspiciously small (${minX},${minY})-(${maxX},${maxY}).`);
  }
  if (colors.size < 8) {
    throw new Error(`${name}: frame has insufficient visible color variation (${colors.size} colors).`);
  }

  return {
    opaquePixels,
    bounds: `${minX},${minY}-${maxX},${maxY}`,
    hash: createHash("sha256").update(pixels).digest("hex").slice(0, 12),
  };
}

const atlasBuffer = await readFile(ATLAS_PATH);
const atlas = decodeRgbaPng(atlasBuffer);
await mkdir(OUTPUT_DIR, { recursive: true });

const hashes = new Set();
for (const [frameIndex, fighter] of FIGHTERS.entries()) {
  const pixels = cropFrame(atlas, frameIndex);
  const report = inspectFrame(fighter, pixels);
  if (hashes.has(report.hash)) {
    throw new Error(`${fighter}: duplicate fighter frame detected (${report.hash}).`);
  }
  hashes.add(report.hash);

  const outputPath = join(OUTPUT_DIR, `${fighter}.png`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, encodeRgbaPng(FRAME_SIZE, FRAME_SIZE, pixels));
  console.log(`✓ ${fighter.padEnd(8)} ${report.opaquePixels.toString().padStart(5)} visible px  bounds ${report.bounds.padEnd(15)} sha ${report.hash}`);
}

console.log(`✓ Regenerated and validated ${FIGHTERS.length} fighter PNGs from ${ATLAS_PATH}`);
