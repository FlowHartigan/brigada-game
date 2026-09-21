import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function appFile(name: string): URL {
  return new URL(`./${name}`, import.meta.url);
}

function withoutCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("legacy fighter CSS cleanup", () => {
  it("keeps VS portrait layout independent from the retired background atlas", () => {
    const css = readFileSync(appFile("vs-portrait-layout.css"), "utf8");
    const declarations = withoutCssComments(css);

    expect(declarations).not.toContain("brigada-fighters-atlas-v1");
    expect(declarations).not.toMatch(/background-(?:image|position|size)/);
    expect(existsSync(appFile("vs-atlas.css"))).toBe(false);
    expect(existsSync(appFile("fighter-sprite-images.css"))).toBe(false);
  });

  it("imports the layout-only VS stylesheet", () => {
    const layout = readFileSync(appFile("layout.tsx"), "utf8");

    expect(layout).toContain('import "./vs-portrait-layout.css";');
    expect(layout).not.toContain('import "./vs-atlas.css";');
    expect(layout).not.toContain('import "./fighter-sprite-images.css";');
  });
});
