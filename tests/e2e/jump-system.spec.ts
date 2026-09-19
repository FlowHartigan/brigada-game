import { expect, test, type Page } from "@playwright/test";

async function enterFight(page: Page) {
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();
  return page.getByTestId("phaser-combat-stage");
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`ArrowUp jump physics at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize(viewport);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const stage = await enterFight(page);
    await expect(stage).toHaveAttribute("data-fighters-ready", "true", { timeout: 8_000 });

    const playerY = async () => Number(await stage.getAttribute("data-player-y"));
    const playerX = async () => Number(await stage.getAttribute("data-player-x"));

    expect(await playerY()).toBe(0);

    for (const key of ["w", "z", " "]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(80);
      expect(await playerY()).toBe(0);
    }

    const attack = page.getByRole("button", { name: /ATTAQUE/ });
    const defend = page.getByRole("button", { name: /DÉFENSE/ });
    const dodge = page.getByRole("button", { name: /ESQUIVE/ });
    const special = page.getByRole("button", { name: /SPÉCIAL/ });

    await page.keyboard.down("ArrowUp");
    await expect.poll(playerY, { timeout: 1_500, intervals: [20, 32, 50] }).toBeGreaterThan(0.05);

    await expect(attack).toBeDisabled();
    await expect(defend).toBeDisabled();
    await expect(dodge).toBeDisabled();
    await expect(special).toBeDisabled();

    const peakSamples: number[] = [];
    for (let index = 0; index < 14; index += 1) {
      peakSamples.push(await playerY());
      await page.waitForTimeout(40);
    }
    expect(Math.max(...peakSamples)).toBeGreaterThan(0.18);

    await expect.poll(playerY, {
      timeout: 2_500,
      intervals: [32, 50, 80],
    }).toBe(0);

    // ArrowUp is still held: landing must not cause an automatic second jump.
    await page.waitForTimeout(220);
    expect(await playerY()).toBe(0);
    await page.keyboard.up("ArrowUp");

    const xBefore = await playerX();
    await page.keyboard.down("ArrowUp");
    await page.keyboard.down("ArrowRight");
    await expect.poll(playerY, { timeout: 1_500 }).toBeGreaterThan(0.05);
    await page.waitForTimeout(180);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.up("ArrowUp");
    expect(await playerX()).toBeGreaterThan(xBefore);

    await expect.poll(playerY, { timeout: 2_500 }).toBe(0);

    const finalX = await playerX();
    expect(finalX).toBeGreaterThanOrEqual(0.08);
    expect(finalX).toBeLessThanOrEqual(0.92);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
