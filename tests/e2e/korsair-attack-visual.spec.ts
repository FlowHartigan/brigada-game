import { expect, test, type Page } from "@playwright/test";
import { expectPhaserCombatReady } from "./visual-helpers";

const IDLE_SRC = "/fighters/korsair-v2/idle.png";
const ATTACK_SRC = "/fighters/korsair-v2/attack.png";

async function pixelFingerprint(page: Page, source: string) {
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");

    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    let visiblePixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 8) visiblePixels += 1;
      hash ^= pixels[index];
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 1];
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 2];
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 3];
      hash = Math.imul(hash, 16777619);
    }

    return {
      width: canvas.width,
      height: canvas.height,
      visiblePixels,
      hash: hash >>> 0,
    };
  }, source);
}

test("KORSAIR visibly swaps from idle to attack1/2/3 in Phaser", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });

  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "KORSAIR — CONTRETEMPS", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

  await expectPhaserCombatReady(page, "korsair");

  const stage = page.getByTestId("phaser-combat-stage");
  const fallback = page.locator(".arena-left img.fighter-sprite-direct");
  const attackButton = page.getByRole("button", { name: /ATTAQUE/ });

  await expect(stage).toHaveAttribute("data-player-state", "idle");
  await expect(stage).toHaveAttribute("data-player-texture", "brigada-fighter-korsair-idle");
  await expect(fallback).toHaveAttribute("src", IDLE_SRC);

  const idleFingerprint = await pixelFingerprint(page, IDLE_SRC);
  const attackFingerprint = await pixelFingerprint(page, ATTACK_SRC);
  expect(idleFingerprint.visiblePixels).toBeGreaterThan(100);
  expect(attackFingerprint.visiblePixels).toBeGreaterThan(100);
  expect(attackFingerprint.hash).not.toBe(idleFingerprint.hash);

  for (const state of ["attack1", "attack2", "attack3"] as const) {
    await expect(attackButton).toBeEnabled({ timeout: 4_000 });
    await attackButton.click();

    await expect(stage).toHaveAttribute("data-player-state", state, { timeout: 650 });
    await expect(stage).toHaveAttribute(
      "data-player-texture",
      `brigada-fighter-korsair-${state}`,
      { timeout: 650 },
    );
    await expect(fallback).toHaveAttribute("data-state", state, { timeout: 650 });
    await expect(fallback).toHaveAttribute("src", ATTACK_SRC, { timeout: 650 });
  }
});
