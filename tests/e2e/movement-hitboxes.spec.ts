import { expect, test } from "@playwright/test";
import { holdDefense, releaseDefense } from "./visual-helpers";

async function enterFight(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT" }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE" }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();
  return page.getByTestId("phaser-combat-stage");
}

test("losing window focus releases held movement and defense", async ({ page }) => {
  const stage = await enterFight(page);
  await expect(stage).toHaveAttribute("data-fighters-ready", "true");
  const playerX = async () => Number(await stage.getAttribute("data-player-x"));
  const startX = await playerX();

  await page.keyboard.down("ArrowLeft");
  await expect.poll(playerX).toBeLessThan(startX);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(100);
  const stoppedX = await playerX();
  await page.waitForTimeout(160);
  expect(await playerX()).toBe(stoppedX);
  await page.keyboard.up("ArrowLeft");

  const defense = page.getByRole("button", { name: /DÉFENSE/ });
  await holdDefense(page, defense);
  await expect(defense).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(defense).toHaveAttribute("aria-pressed", "false");
  await releaseDefense(page, defense);
});

test("combat survives a backwards wall-clock adjustment while moving", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const stage = await enterFight(page);
  await expect(stage).toHaveAttribute("data-fighters-ready", "true");
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const originalNow = Date.now.bind(Date);
    Date.now = () => originalNow() - 1_000;
  });
  const startX = Number(await stage.getAttribute("data-player-x"));
  await page.keyboard.down("ArrowLeft");
  await expect.poll(async () => Number(await stage.getAttribute("data-player-x"))).toBeLessThan(startX);
  await page.keyboard.up("ArrowLeft");
  await page.getByRole("button", { name: /ATTAQUE/ }).click();
  await expect(stage).toHaveAttribute("data-player-state", "attack1");
  expect(errors).toEqual([]);
});

test("idle combat does not rewrite unchanged Phaser layout metrics", async ({ page }) => {
  const stage = await enterFight(page);
  await expect(stage).toHaveAttribute("data-fighters-ready", "true");
  await expect(stage).toHaveAttribute("data-player-ground-y", "326");
  const mutations = await stage.evaluate((node) => new Promise<number>((resolve) => {
    let count = 0;
    const observer = new MutationObserver((records) => { count += records.length; });
    observer.observe(node, { attributes: true, attributeFilter: ["data-player-ground-y"] });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(count);
    }, 400);
  }));
  expect(mutations).toBe(0);
});

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
    await expect.poll(async () => (await opponentX()) - (await playerX()), { timeout: 4_000 }).toBeLessThan(0.16);
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
