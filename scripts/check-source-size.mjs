import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const SOURCE_ROOT = "src";
const MAX_SOURCE_BYTES = 512 * 1024;
const CHECKED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile() && CHECKED_EXTENSIONS.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const files = await collectFiles(SOURCE_ROOT);
const oversized = [];

for (const file of files) {
  const info = await stat(file);
  if (info.size > MAX_SOURCE_BYTES) {
    oversized.push({ file: relative(process.cwd(), file), size: info.size });
  }
}

if (oversized.length > 0) {
  console.error(`Source files must stay below ${MAX_SOURCE_BYTES / 1024} KiB:`);
  for (const { file, size } of oversized) {
    console.error(`- ${file}: ${(size / 1024).toFixed(1)} KiB`);
  }
  console.error("Move binary/generated payloads to public assets instead of embedding them in source code.");
  process.exit(1);
}

console.log(`Source-size check passed (${files.length} files, max ${MAX_SOURCE_BYTES / 1024} KiB each).`);
