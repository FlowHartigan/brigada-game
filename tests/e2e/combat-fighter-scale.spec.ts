import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

async function enterFight(page: Page, fighterName: string, fighterTitle: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", {
    name: `${fighterName} — ${fighterTitle}`,
    exact: true,
  }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

  const stage = page.getByTestId("phaser-combat-stage");
  await expect(stage).toHaveAttribute("data-fighters-ready", "true", { timeout: 8_000 });
  return stage;
}

for (const viewport of [
  { width: 844, height: 390, label: "mobile-landscape" },
  { width: 1280, height: 720, label: "desktop-1280" },
  { width: 1920, height: 1080, label: "desktop-1920" },
]) {
  test(`all fighters render 30 percent larger in combat at ${viewport.label}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
    });

    for (const fighter of fighters) {
      const stage = await enterFight(page, fighter.name, fighter.title);

      await expect(stage).toHaveAttribute("data-combat-scale-multiplier", "1.3");
      await expect(stage).toHaveAttribute("data-player-state", "idle", { timeout: 3_000 });

      const metrics = await stage.evaluate((node) => {
        const element = node as HTMLElement;
        return {
          playerX: Number(element.dataset.playerX),
          playerY: Number(element.dataset.playerY),
          baseHeight: Number(element.dataset.baseFighterVisibleHeight),
          targetHeight: Number(element.dataset.targetFighterVisibleHeight),
          visibleHeight: Number(element.dataset.playerVisibleHeight),
          groundY: Number(element.dataset.playerGroundY),
        };
      });

      // Presentation-only change: gameplay spawn coordinates stay untouched.
      expect(metrics.playerX).toBeCloseTo(0.28, 3);
      expect(metrics.playerY).toBe(0);

      expect(metrics.targetHeight / metrics.baseHeight).toBeGreaterThanOrEqual(1.27);
      expect(metrics.targetHeight / metrics.baseHeight).toBeLessThanOrEqual(1.33);
      expect(metrics.visibleHeight / metrics.baseHeight).toBeGreaterThanOrEqual(1.27);
      expect(metrics.visibleHeight / metrics.baseHeight).toBeLessThanOrEqual(1.33);

      // Alpha silhouette remains fully inside the internal Phaser stage.
      expect(metrics.groundY - metrics.visibleHeight).toBeGreaterThanOrEqual(0);
      expect(metrics.groundY).toBeLessThanOrEqual(360);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      if (fighter.id === "hartz") {
        const idleHeight = metrics.visibleHeight;
        await page.keyboard.press("ArrowUp");
        await expect.poll(
          async () => Number(await stage.getAttribute("data-player-y")),
          { timeout: 1_500, intervals: [20, 32, 50] },
        ).toBeGreaterThan(0.05);

        const airborneHeight = Number(await stage.getAttribute("data-player-visible-height"));
        expect(airborneHeight).toBeCloseTo(idleHeight, 3);

        await expect.poll(
          async () => Number(await stage.getAttribute("data-player-y")),
          { timeout: 2_500, intervals: [32, 50, 80] },
        ).toBe(0);

        const landedHeight = Number(await stage.getAttribute("data-player-visible-height"));
        expect(landedHeight).toBeCloseTo(idleHeight, 3);
      }
    }
  });
}
