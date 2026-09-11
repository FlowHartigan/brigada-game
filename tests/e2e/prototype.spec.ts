import { expect, test } from "@playwright/test";

test("mobile landscape player can reach and use the fight controls", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/BRIGADA FIGHT/);
  await expect(page.getByText("BRIGADA FIGHT")).toBeVisible();

  await page.getByRole("button", { name: "FIGHT" }).click();
  await expect(page.locator(".select-screen .fighter-grid")).toBeVisible();

  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE" }).click();
  await expect(page.locator(".selection-name h2")).toHaveText("HARTZ");
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "COMBATTRE" })).toBeVisible();

  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();

  const playerSprite = page.locator(".arena-left.fighter-hartz");
  await expect(playerSprite).toBeVisible();
  const idleSprite = await playerSprite.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(idleSprite).toContain("data:image/png;base64");
  const rendering = await playerSprite.evaluate((element) => getComputedStyle(element).imageRendering);
  expect(rendering).toBe("pixelated");

  const opponentSprite = page.locator(".arena-right");
  const opponentArt = await opponentSprite.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(opponentArt).toContain("data:image/png;base64");

  const attack = page.getByRole("button", { name: /ATTAQUE/ });
  const defend = page.getByRole("button", { name: /DÉFENSE/ });
  const dodge = page.getByRole("button", { name: /ESQUIVE/ });
  const special = page.getByRole("button", { name: /SPÉCIAL/ });

  await expect(attack).toBeVisible();
  await expect(defend).toBeVisible();
  await expect(dodge).toBeVisible();
  await expect(special).toBeVisible();
  await expect(special).toBeDisabled();

  const enemyHp = page.locator(".opponent-hud .hud-name span");
  const hpBefore = await enemyHp.textContent();
  await attack.click();
  await expect.poll(async () => enemyHp.textContent()).not.toBe(hpBefore);

  await expect(dodge).toBeEnabled({ timeout: 2_000 });
  await dodge.click();
  await expect(dodge).toBeDisabled();

  await expect(defend).toBeEnabled({ timeout: 2_000 });
  const box = await defend.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(defend).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => playerSprite.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe(idleSprite);
    await page.mouse.up();
    await expect(defend).toHaveAttribute("aria-pressed", "false");
  }

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
