import { expect, test, type Page } from "@playwright/test";

async function enterHartzVsKorsair(page: Page) {
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.locator(".versus-fighter.right h2")).toHaveText("KORSAIR");
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();

  const stage = page.getByTestId("phaser-combat-stage");
  await expect(stage).toHaveAttribute("data-fighters-ready", "true", { timeout: 8_000 });
  return stage;
}

test("fighters dynamically face each other after an aerial crossover", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1280, height: 720 });

  const stage = await enterHartzVsKorsair(page);
  const playerX = async () => Number(await stage.getAttribute("data-player-x"));
  const opponentX = async () => Number(await stage.getAttribute("data-opponent-x"));
  const playerY = async () => Number(await stage.getAttribute("data-player-y"));

  await expect(stage).toHaveAttribute("data-player-facing", "1");
  await expect(stage).toHaveAttribute("data-opponent-facing", "-1");

  await page.keyboard.down("ArrowRight");
  try {
    await expect.poll(async () => (await opponentX()) - (await playerX()), {
      timeout: 4_000,
      intervals: [32, 50, 80],
    }).toBeLessThanOrEqual(0.10);
  } finally {
    await page.keyboard.up("ArrowRight");
  }

  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowRight");
  try {
    await expect.poll(playerY, { timeout: 1_500 }).toBeGreaterThan(0.20);
    await expect.poll(async () => (await playerX()) - (await opponentX()), {
      timeout: 2_500,
      intervals: [20, 32, 50],
    }).toBeGreaterThan(0.01);

    await expect(stage).toHaveAttribute("data-player-facing", "-1", { timeout: 1_000 });
    await expect(stage).toHaveAttribute("data-opponent-facing", "1", { timeout: 1_000 });
  } finally {
    await page.keyboard.up("ArrowRight");
    await page.keyboard.up("ArrowUp");
  }

  await expect.poll(playerY, { timeout: 2_500 }).toBe(0);
  expect(await playerX()).toBeGreaterThan(await opponentX());
  await expect(stage).toHaveAttribute("data-player-facing", "-1");
  await expect(stage).toHaveAttribute("data-opponent-facing", "1");

  const enemyHp = page.locator(".opponent-hud .hud-name span");
  const hpBefore = await enemyHp.textContent();
  const attack = page.getByRole("button", { name: /ATTAQUE/ });
  await expect(attack).toBeEnabled({ timeout: 3_000 });
  await attack.click();
  await expect.poll(async () => enemyHp.textContent(), { timeout: 2_000 }).not.toBe(hpBefore);
  await expect(stage).toHaveAttribute("data-player-facing", "-1");
});
