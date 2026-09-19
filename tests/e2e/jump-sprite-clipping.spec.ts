import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import {
  GRAVITY,
  JUMP_VELOCITY,
} from "../../src/game/engine/spatial";

const theoreticalJumpPeak =
  (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);

async function enterFight(page: Page, fighterId: string) {
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  const fighter = fighters.find((candidate) => candidate.id === fighterId)!;
  await page.getByRole("button", {
    name: `${fighter.name} — ${fighter.title}`,
    exact: true,
  }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

  const stage = page.getByTestId("phaser-combat-stage");
  await expect(stage).toHaveAttribute("data-fighters-ready", "true", { timeout: 8_000 });
  return stage;
}

async function expectJumpHeadroom(page: Page, fighterId: string) {
  const stage = await enterFight(page, fighterId);

  const stageHeight = Number(await stage.getAttribute("data-stage-height"));
  const gameplayScale = Number(await stage.getAttribute("data-gameplay-vertical-scale"));
  const renderPadding = Number(await stage.getAttribute("data-render-vertical-padding"));
  const safeMargin = Number(await stage.getAttribute("data-fighter-top-safe-margin"));
  const groundY = Number(await stage.getAttribute("data-player-ground-y"));
  const visibleHeight = Number(await stage.getAttribute("data-player-visible-height"));

  expect(stageHeight).toBe(480);
  expect(gameplayScale).toBe(360);
  expect(renderPadding).toBe((stageHeight - gameplayScale) / 2);
  expect(groundY).toBeCloseTo(326, 1);

  // Exact theoretical apex, independent of browser sampling cadence.
  const theoreticalVisibleTop =
    groundY -
    theoreticalJumpPeak * gameplayScale -
    visibleHeight +
    renderPadding;
  expect(theoreticalVisibleTop).toBeGreaterThanOrEqual(safeMargin);

  await page.keyboard.down("ArrowUp");
  try {
    await expect.poll(
      async () => Number(await stage.getAttribute("data-player-y")),
      { timeout: 1_500, intervals: [16, 20, 32] },
    ).toBeGreaterThan(0.31);

    const visibleTop = Number(await stage.getAttribute("data-player-visible-top"));
    const visibleBottom = Number(await stage.getAttribute("data-player-visible-bottom"));

    expect(visibleTop).toBeGreaterThanOrEqual(safeMargin);
    expect(visibleBottom).toBeLessThanOrEqual(stageHeight);

    await page.screenshot({
      path: `test-results/visual-jump-headroom-${fighterId}-${page.viewportSize()!.width}.png`,
      fullPage: true,
    });
  } finally {
    await page.keyboard.up("ArrowUp");
  }

  await expect.poll(
    async () => Number(await stage.getAttribute("data-player-y")),
    { timeout: 2_500, intervals: [32, 50, 80] },
  ).toBe(0);

  expect(Number(await stage.getAttribute("data-player-ground-y"))).toBeCloseTo(326, 1);
}

test.describe("jump sprite clipping", () => {
  test("all five fighters keep their full opaque head inside Phaser at mobile landscape", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 844, height: 390 });

    for (const fighter of fighters) {
      await expectJumpHeadroom(page, fighter.id);
    }
  });

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    test(`HARTZ keeps full jump headroom at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize(viewport);
      await expectJumpHeadroom(page, "hartz");
    });
  }

  test("React fallback also keeps HARTZ fully inside the arena at jump apex", async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 844, height: 390 });

    await page.route("**/fighters/korsair-v2/special.png", (route) => route.abort());
    await page.addInitScript(() => {
      window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
    });
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();
    await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

    const stage = page.getByTestId("phaser-combat-stage");
    await expect(stage).toHaveAttribute("data-fighters-ready", "false", { timeout: 8_000 });
    const image = page.locator(".arena-left > .fighter-sprite-direct");
    await expect(image).toHaveCSS("opacity", "1");

    await page.keyboard.down("ArrowUp");
    try {
      await expect.poll(
        async () => Number(await stage.getAttribute("data-player-y")),
        { timeout: 1_500, intervals: [16, 20, 32] },
      ).toBeGreaterThan(0.31);

      const arenaBox = await page.locator(".arena-shell").boundingBox();
      const fighterBox = await image.boundingBox();
      expect(arenaBox).not.toBeNull();
      expect(fighterBox).not.toBeNull();
      expect(fighterBox!.y).toBeGreaterThanOrEqual(arenaBox!.y - 1);
      expect(fighterBox!.y + fighterBox!.height).toBeLessThanOrEqual(
        arenaBox!.y + arenaBox!.height + 1,
      );
    } finally {
      await page.keyboard.up("ArrowUp");
    }
  });
});
