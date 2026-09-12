import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import {
  expectPhaserCombatReady,
  expectPhaserFighterState,
  holdDefense,
  saveVisual,
} from "./visual-helpers";

async function setDeterministicCombatRandom(page: Page, value: number) {
  await page.evaluate((nextValue: number) => {
    window.__BRIGADA_COMBAT_RNG__ = () => nextValue;
  }, value);
}

test("every fighter visibly enters stunned after a fresh guard break", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 844, height: 390 });

  // Keep the AI waiting until defense is definitely engaged without replacing
  // Math.random globally; Phaser needs browser randomness for internal keys.
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  for (const fighter of fighters) {
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();
    await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

    const playerImage = page.locator(".arena-left img.fighter-sprite-direct");
    const opponentImage = page.locator(".arena-right img.fighter-sprite-direct");
    const opponentId = await opponentImage.getAttribute("data-fighter");
    expect(opponentId).toBeTruthy();
    await expectPhaserCombatReady(page, fighter.id, opponentId!);

    const defend = page.getByRole("button", { name: /DÉFENSE/ });
    const guardLabel = page.locator(".guard-label").first();

    await holdDefense(page, defend);
    const guardBefore = await guardLabel.textContent();
    expect(guardBefore).toMatch(/GARDE\s+\d+/);

    // RNG=0 makes Utility AI choose the first legal positive-score action:
    // attack. In a fresh fight this produces deterministic blocked pressure.
    await setDeterministicCombatRandom(page, 0);

    const stage = page.getByTestId("phaser-combat-stage");
    await expect.poll(
      async () => stage.getAttribute("data-player-state"),
      { timeout: 10_000, intervals: [80, 100, 120, 160, 200] },
    ).toBe("stunned");

    await expect(guardLabel).toHaveText(/GARDE\s+0/);
    await expect(defend).toHaveAttribute("aria-pressed", "false");
    await expect(playerImage).toHaveAttribute("data-state", "stunned");
    await expectPhaserFighterState(page, "player", "stunned", fighter.id);
    await saveVisual(page, `guard-break-${fighter.id}-stunned`);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
