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

if (partFiles.length === 0) {
  throw new Error("Combat background staging is empty");
}

for (let index = 0; index < partFiles.length; index += 1) {
  const expectedName = `part-${String(index).padStart(2, "0")}.b64`;
  if (partFiles[index] !== expectedName) {
    throw new Error(
      `Combat background staging is incomplete: expected ${expectedName}, found ${partFiles[index] ?? "nothing"}`,
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

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === "VP8X" && chunkSize >= 10 && dataOffset + 10 <= buffer.length) {
      return {
        width: readUint24LE(buffer, dataOffset + 4) + 1,
        height: readUint24LE(buffer, dataOffset + 7) + 1,
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && dataOffset + 5 <= buffer.length) {
      if (buffer[dataOffset] !== 0x2f) return null;
      const b0 = buffer[dataOffset + 1];
      const b1 = buffer[dataOffset + 2];
      const b2 = buffer[dataOffset + 3];
      const b3 = buffer[dataOffset + 4];
      return {
        width: 1 + b0 + ((b1 & 0x3f) << 8),
        height: 1 + (b1 >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10),
      };
    }

    if (chunkType === "VP8 " && chunkSize >= 10 && dataOffset + 10 <= buffer.length) {
      if (
        buffer[dataOffset + 3] !== 0x9d ||
        buffer[dataOffset + 4] !== 0x01 ||
        buffer[dataOffset + 5] !== 0x2a
      ) {
        return null;
      }
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function inspectWebp(buffer) {
  if (
    buffer.length < 20 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return { valid: false, reason: "missing RIFF/WEBP signature" };
  }

  const declaredLength = buffer.readUInt32LE(4) + 8;
  if (declaredLength !== buffer.length) {
    return {
      valid: false,
      reason: `truncated RIFF: header declares ${declaredLength} bytes, decoded ${buffer.length}`,
    };
  }

  let offset = 12;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      return { valid: false, reason: `truncated chunk header at byte ${offset}` };
    }

    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataEnd = offset + 8 + chunkSize;
    const paddedEnd = dataEnd + (chunkSize % 2);

    if (dataEnd > buffer.length || paddedEnd > buffer.length) {
      return {
        valid: false,
        reason: `truncated ${chunkType.trim() || "unknown"} chunk: needs ${paddedEnd} bytes, decoded ${buffer.length}`,
      };
    }

    offset = paddedEnd;
  }

  const dimensions = webpDimensions(buffer);
  if (!dimensions) {
    return { valid: false, reason: "missing decodable VP8/VP8L/VP8X dimensions" };
  }

  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    return {
      valid: false,
      reason: `unexpected dimensions ${dimensions.width}x${dimensions.height}`,
    };
  }

  return { valid: true, dimensions };
}

const joinedDecode = Buffer.from(encodedParts.join(""), "base64");
const independentlyDecoded = Buffer.concat(
  encodedParts.map((part) => Buffer.from(part, "base64")),
);

const joinedInspection = inspectWebp(joinedDecode);
const independentInspection = inspectWebp(independentlyDecoded);

const webp = joinedInspection.valid
  ? joinedDecode
  : independentInspection.valid
    ? independentlyDecoded
    : null;

if (!webp) {
  throw new Error(
    "Combat background staging is not a complete WebP: " +
      `joined=${joinedInspection.reason}; per-part=${independentInspection.reason}`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, webp);

console.log(
  `Materialized combat background: ${expectedWidth}x${expectedHeight}, ${webp.length} bytes -> ${outputPath}`,
);
