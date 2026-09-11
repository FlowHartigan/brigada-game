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
  const playerFrame = playerSprite.locator(".fighter-sprite-frame");
  const playerImage = playerSprite.locator("img.fighter-sprite-image");
  await expect(playerSprite).toBeVisible();
  await expect(playerImage).toBeVisible();
  await expect.poll(() => playerImage.evaluate((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth === 1152 && image.naturalHeight === 128;
  })).toBe(true);
  await expect(playerFrame).toHaveAttribute("data-frame", "0");
  expect(await playerImage.evaluate((element) => getComputedStyle(element).imageRendering)).toBe("pixelated");

  const opponentSprite = page.locator(".arena-right");
  const opponentImage = opponentSprite.locator("img.fighter-sprite-image");
  await expect(opponentImage).toBeVisible();
  await expect.poll(() => opponentImage.evaluate((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth === 1152;
  })).toBe(true);

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
    await expect(playerFrame).toHaveAttribute("data-frame", "6");
    await page.mouse.up();
    await expect(defend).toHaveAttribute("aria-pressed", "false");
    await expect(playerFrame).toHaveAttribute("data-frame", "0");
  }

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
