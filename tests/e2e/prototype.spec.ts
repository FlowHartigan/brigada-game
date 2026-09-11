import { expect, test } from "@playwright/test";

const rosterSource = "/art/brigada-pixel-rave-roster-v1.webp";

test("mobile landscape player sees fighter art through the full game flow and can use combat controls", async ({ page }) => {
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
  const showcase = page.locator('.selection-showcase img.fighter-art-image[data-fighter="hartz"]');
  await expect(showcase).toBeVisible();
  await expect(showcase).toHaveAttribute("src", rosterSource);
  await expect(showcase).toHaveAttribute("data-crop-x", "3%");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();

  const vsPlayerImage = page.locator(".versus-fighter.left img.fighter-sprite-direct");
  await expect(vsPlayerImage).toBeVisible();
  await expect(vsPlayerImage).toHaveAttribute("src", rosterSource);
  await expect(vsPlayerImage).toHaveAttribute("data-fighter", "hartz");
  await expect.poll(() => vsPlayerImage.evaluate((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 100 && image.naturalHeight > 100;
  })).toBe(true);

  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();

  const playerSprite = page.locator(".arena-left.fighter-hartz");
  const playerIdleImage = playerSprite.locator("img.fighter-sprite-direct");
  await expect(playerSprite).toBeVisible();
  await expect(playerIdleImage).toBeVisible();
  await expect(playerIdleImage).toHaveAttribute("src", rosterSource);
  await expect(playerIdleImage).toHaveAttribute("data-fighter", "hartz");
  await expect(playerIdleImage).toHaveAttribute("data-state", "idle");
  await expect.poll(() => playerIdleImage.evaluate((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 100 && image.naturalHeight > 100;
  })).toBe(true);
  expect(await playerIdleImage.evaluate((element) => getComputedStyle(element).imageRendering)).toBe("pixelated");

  const opponentSprite = page.locator(".arena-right");
  const opponentImage = opponentSprite.locator("img.fighter-sprite-direct");
  await expect(opponentImage).toBeVisible();
  await expect(opponentImage).toHaveAttribute("src", rosterSource);
  await expect.poll(() => opponentImage.evaluate((img) => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 100 && image.naturalHeight > 100;
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

    const defendImage = playerSprite.locator('img.fighter-sprite-direct[data-state="defend"]');
    await expect(defendImage).toBeVisible();
    await expect(defendImage).toHaveAttribute("src", rosterSource);
    await expect(defendImage).toHaveAttribute("data-fighter", "hartz");

    await page.mouse.up();
    await expect(defend).toHaveAttribute("aria-pressed", "false");
    await expect(playerSprite.locator('img.fighter-sprite-direct[data-state="idle"]')).toBeVisible();
  }

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
