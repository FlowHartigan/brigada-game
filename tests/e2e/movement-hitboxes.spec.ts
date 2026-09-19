import { expect, test } from "@playwright/test";

async function enterFight(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT" }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE" }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();
  return page.getByTestId("phaser-combat-stage");
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`keyboard movement and range combat at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const stage = await enterFight(page);

    const playerX = async () => Number(await stage.getAttribute("data-player-x"));
    const opponentX = async () => Number(await stage.getAttribute("data-opponent-x"));

    const startX = await playerX();
    await page.keyboard.down("a");
    await page.waitForTimeout(160);
    await page.keyboard.up("a");
    expect(await playerX()).toBeCloseTo(startX, 3);

    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(260);
    await page.keyboard.up("ArrowLeft");
    expect(await playerX()).toBeLessThan(startX);

    const enemyHp = page.locator(".opponent-hud .hud-name span");
    const hpFar = await enemyHp.textContent();
    const attack = page.getByRole("button", { name: /ATTAQUE/ });
    await expect(attack).toBeEnabled();
    await attack.click();
    await expect.poll(async () => enemyHp.textContent()).toBe(hpFar);
    await expect(stage).toHaveAttribute("data-player-state", /attack1|idle/);

    await expect(attack).toBeEnabled({ timeout: 3_000 });
    await page.keyboard.down("ArrowRight");
    await expect.poll(async () => (await opponentX()) - (await playerX()), { timeout: 4_000 }).toBeLessThan(0.2);
    await page.keyboard.up("ArrowRight");

    const hpNear = await enemyHp.textContent();
    await expect(attack).toBeEnabled({ timeout: 3_000 });
    await attack.click();
    await expect.poll(async () => enemyHp.textContent()).not.toBe(hpNear);

    const finalGap = (await opponentX()) - (await playerX());
    expect(finalGap).toBeGreaterThan(0.08);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
