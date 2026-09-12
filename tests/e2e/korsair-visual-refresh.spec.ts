import { expect, test } from "@playwright/test";
import {
  expectFighterPixels,
  expectPhaserCombatReady,
  fighterArtSrc,
  fighterSrc,
  korsairActionSrc,
  saveVisual,
} from "./visual-helpers";

test("KORSAIR keeps the refreshed identity from Select through Result", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "KORSAIR — CONTRETEMPS", exact: true }).click();

  const selection = page.locator('.selection-showcase img.fighter-art-image[data-fighter="korsair"]');
  await expectFighterPixels(page, selection, fighterArtSrc("korsair"));
  await saveVisual(page, "korsair-refresh-selection");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  const vsPlayer = page.locator(".versus-fighter.left img.fighter-sprite-direct");
  await expectFighterPixels(page, vsPlayer, fighterSrc("korsair"));
  await saveVisual(page, "korsair-refresh-vs");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expectPhaserCombatReady(page, "korsair");

  const playerImage = page.locator(".arena-left img.fighter-sprite-direct");
  await expect(playerImage).toHaveAttribute("src", fighterSrc("korsair"));
  await saveVisual(page, "korsair-refresh-combat-idle");

  const attack = page.getByRole("button", { name: /ATTAQUE/ });
  await expect(attack).toBeEnabled({ timeout: 4_000 });
  await attack.click();
  await expect(playerImage).toHaveAttribute("src", korsairActionSrc("attack1"), {
    timeout: 1_000,
  });
  await saveVisual(page, "korsair-refresh-combat-attack");

  // Keep Utility AI waiting and finish the match with normal player attacks.
  // This drives the real combat engine instead of mutating React or Phaser state.
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await page.locator(".result-screen").isVisible()) break;
    if (await attack.isEnabled()) {
      await attack.click();
    } else {
      await page.waitForTimeout(80);
    }
  }

  await expect(page.locator(".result-screen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "KORSAIR WINS" })).toBeVisible();
  const resultImage = page.locator('.result-screen img.fighter-sprite-direct[data-fighter="korsair"]');
  await expect(resultImage).toHaveAttribute("src", korsairActionSrc("win"));
  await expect(resultImage).toHaveAttribute("data-state", "win");
  await saveVisual(page, "korsair-refresh-result");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
