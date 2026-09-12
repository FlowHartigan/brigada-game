import { expect, test, type Page } from "@playwright/test";
import { expectPhaserCombatReady, saveVisual } from "./visual-helpers";

const ARENA_BACKGROUND = "/backgrounds/brigada-combat-arena.png";
const OLD_COMBAT_BACKGROUND = "brigada-pixel-rave-roster-v1.webp";

async function openFight(page: Page) {
  await page.addInitScript(() => {
    // Select KORSAIR as HARTZ's opponent and keep Utility AI waiting in combat.
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expectPhaserCombatReady(page, "hartz", "korsair");
}

async function expectArenaBackground(page: Page) {
  const arena = page.locator(".arena-shell");
  const stage = page.getByTestId("phaser-combat-stage");

  await expect(arena).toBeVisible();
  await expect(stage).toHaveAttribute("data-background-layer", "css-arena");

  const decoded = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, ARENA_BACKGROUND);
  expect(decoded).toEqual({ width: 960, height: 540 });

  const background = await arena.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      image: style.backgroundImage,
      position: style.backgroundPosition,
      size: style.backgroundSize,
      rendering: style.imageRendering,
      text: element.textContent ?? "",
    };
  });

  expect(background.image).toContain(ARENA_BACKGROUND);
  expect(background.image).not.toContain(OLD_COMBAT_BACKGROUND);
  expect(background.position).toContain("50%");
  expect(background.size).toBe("cover");
  expect(background.rendering).toBe("pixelated");
  expect(background.text).not.toMatch(/0\s*\+\s*0\s*=\s*TECHNO/i);

  // The Phaser canvas must stay transparent away from fighters/effects so the
  // dedicated CSS arena is the only background layer.
  const cornerAlpha = await stage.locator("canvas").evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    return context.getImageData(8, 8, 1, 1).data[3];
  });
  expect(cornerAlpha).toBe(0);

  for (const side of ["player", "opponent"] as const) {
    await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-visible-height`)))
      .toBeCloseTo(200.2, 1);
    await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-ground-y`)))
      .toBeCloseTo(326, 1);
  }

  await expect(page.locator(".arena-left")).toHaveAttribute("data-renderer", "react-fallback-hidden");
  await expect(page.locator(".arena-right")).toHaveAttribute("data-renderer", "react-fallback-hidden");
}

for (const viewport of [
  { width: 844, height: 390, screenshot: "visual-combat-background-844.png" },
  { width: 667, height: 375, screenshot: null },
  { width: 1280, height: 720, screenshot: "visual-combat-background-1280.png" },
] as const) {
  test(`Brigada arena background stays behind Phaser fighters at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openFight(page);
    await expectArenaBackground(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    if (viewport.screenshot) {
      await saveVisual(page, viewport.screenshot.replace(/^visual-|\.png$/g, ""));
    }
  });
}
