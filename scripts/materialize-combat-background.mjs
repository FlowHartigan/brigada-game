import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const sourceDir = resolve(projectRoot, ".asset-import", "arena");
const outputPath = resolve(
  projectRoot,
  "public",
  "backgrounds",
  "brigada-combat-arena.webp",
);
const expectedPartCount = 11;
const expectedWidth = 1672;
const expectedHeight = 941;

const partPattern = /^part-(\d+)\.b64$/;
const partFiles = (await readdir(sourceDir))
  .filter((name) => partPattern.test(name))
  .sort((left, right) => {
    const leftIndex = Number(left.match(partPattern)?.[1] ?? 0);
    const rightIndex = Number(right.match(partPattern)?.[1] ?? 0);
    return leftIndex - rightIndex;
  });

if (partFiles.length !== expectedPartCount) {
  throw new Error(
    `Combat background staging is incomplete: expected ${expectedPartCount} parts, found ${partFiles.length}`,
  );
}

const expectedNames = Array.from({ length: expectedPartCount }, (_, index) =>
  `part-${String(index).padStart(2, "0")}.b64`,
);

for (let index = 0; index < expectedNames.length; index += 1) {
  if (partFiles[index] !== expectedNames[index]) {
    throw new Error(
      `Combat background staging is incomplete: expected ${expectedNames[index]}, found ${partFiles[index] ?? "nothing"}`,
    );
  }
}

const encodedParts = await Promise.all(
  partFiles.map(async (name) =>
    (await readFile(resolve(sourceDir, name), "utf8")).replace(/\s+/g, ""),
  ),
);

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X") {
    return {
      width: readUint24LE(buffer, 24) + 1,
      height: readUint24LE(buffer, 27) + 1,
    };
  }

  if (chunkType === "VP8L") {
    if (buffer[20] !== 0x2f || buffer.length < 25) return null;
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + b0 + ((b1 & 0x3f) << 8),
      height: 1 + (b1 >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10),
    };
  }

  if (chunkType === "VP8 ") {
    if (
      buffer.length < 30 ||
      buffer[23] !== 0x9d ||
      buffer[24] !== 0x01 ||
      buffer[25] !== 0x2a
    ) {
      return null;
    }
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

function isExpectedWebp(buffer) {
  const dimensions = webpDimensions(buffer);
  return (
    dimensions?.width === expectedWidth &&
    dimensions?.height === expectedHeight
  );
}

const joinedDecode = Buffer.from(encodedParts.join(""), "base64");
const independentlyDecoded = Buffer.concat(
  encodedParts.map((part) => Buffer.from(part, "base64")),
);

const webp = isExpectedWebp(joinedDecode)
  ? joinedDecode
  : isExpectedWebp(independentlyDecoded)
    ? independentlyDecoded
    : null;

if (!webp) {
  const joinedDimensions = webpDimensions(joinedDecode);
  const independentDimensions = webpDimensions(independentlyDecoded);
  throw new Error(
    `Combat background staging did not decode to the expected ${expectedWidth}x${expectedHeight} WebP ` +
      `(joined=${joinedDimensions ? `${joinedDimensions.width}x${joinedDimensions.height}` : "invalid"}, ` +
      `per-part=${independentDimensions ? `${independentDimensions.width}x${independentDimensions.height}` : "invalid"})`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, webp);

console.log(
  `Materialized combat background: ${expectedWidth}x${expectedHeight}, ${webp.length} bytes -> ${outputPath}`,
);
