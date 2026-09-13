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
  "brigada-combat-arena.png",
);

const partPattern = /^part-(\d+)\.b64$/;
const partFiles = (await readdir(sourceDir))
  .filter((name) => partPattern.test(name))
  .sort((left, right) => {
    const leftIndex = Number(left.match(partPattern)?.[1] ?? 0);
    const rightIndex = Number(right.match(partPattern)?.[1] ?? 0);
    return leftIndex - rightIndex;
  });

if (partFiles.length === 0) {
  throw new Error(`No combat background parts found in ${sourceDir}`);
}

const expectedNames = partFiles.map((_, index) =>
  `part-${String(index).padStart(2, "0")}.b64`,
);

for (let index = 0; index < expectedNames.length; index += 1) {
  if (partFiles[index] !== expectedNames[index]) {
    throw new Error(
      `Combat background parts are incomplete: expected ${expectedNames[index]}, found ${partFiles[index] ?? "nothing"}`,
    );
  }
}

const encoded = (
  await Promise.all(
    partFiles.map((name) => readFile(resolve(sourceDir, name), "utf8")),
  )
)
  .join("")
  .replace(/\s+/g, "");

const png = Buffer.from(encoded, "base64");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

if (png.length < 24 || !png.subarray(0, 8).equals(pngSignature)) {
  throw new Error("Combat background staging data did not decode to a valid PNG");
}

const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

if (width <= 0 || height <= 0) {
  throw new Error(`Combat background PNG has invalid dimensions: ${width}x${height}`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, png);

console.log(
  `Materialized combat background: ${width}x${height}, ${png.length} bytes -> ${outputPath}`,
);
