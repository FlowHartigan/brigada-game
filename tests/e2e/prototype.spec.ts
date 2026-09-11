import { expect, test } from "@playwright/test";
import { expectFighterPixels, fighterSrc, holdDefense, releaseDefense, saveVisual } from "./visual-helpers";

test("mobile landscape player sees real fighter pixels through the full game flow and combat states", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/BRIGADA FIGHT/);
  await page.getByRole("button", { name: "FIGHT" }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE" }).click();

  const showcase = page.locator('.selection-showcase img.fighter-art-image[data-fighter="hartz"]');
  await expectFighterPixels(showcase, fighterSrc("hartz"));
  await saveVisual(page, "flow-selection-hartz");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();

  const vsPlayerImage = page.locator(".versus-fighter.left img.fighter-sprite-direct");
  await expectFighterPixels(vsPlayerImage, fighterSrc("hartz"));
  const vsOpponentImage = page.locator(".versus-fighter.right img.fighter-sprite-direct");
  const opponentId = await vsOpponentImage.getAttribute("data-fighter");
  expect(opponentId).toBeTruthy();
  await expectFighterPixels(vsOpponentImage, fighterSrc(opponentId!));
  await saveVisual(page, `flow-vs-hartz-${opponentId}`);

  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();

  const playerSprite = page.locator(".arena-left.fighter-hartz");
  const playerImage = playerSprite.locator("img.fighter-sprite-direct");
  await expect(playerImage).toHaveAttribute("data-state", "idle");
  await expectFighterPixels(playerImage, fighterSrc("hartz"));

  const opponentSprite = page.locator(".arena-right");
  const opponentImage = opponentSprite.locator("img.fighter-sprite-direct");
  const arenaOpponentId = await opponentImage.getAttribute("data-fighter");
  expect(arenaOpponentId).toBeTruthy();
  await expectFighterPixels(opponentImage, fighterSrc(arenaOpponentId!));
  await saveVisual(page, `flow-fight-hartz-${arenaOpponentId}`);

  const attack = page.getByRole("button", { name: /ATTAQUE/ });
  const defend = page.getByRole("button", { name: /DÉFENSE/ });
  const dodge = page.getByRole("button", { name: /ESQUIVE/ });
  const special = page.getByRole("button", { name: /SPÉCIAL/ });

  await expect(attack).toBeVisible();
  await expect(defend).toBeVisible();
  await expect(dodge).toBeVisible();
  await expect(special).toBeVisible();

  await holdDefense(page, defend);
  await expectFighterPixels(playerSprite.locator("img.fighter-sprite-direct"), fighterSrc("hartz"));
  await saveVisual(page, "flow-fight-hartz-defend");
  await releaseDefense(page, defend);

  await expect(dodge).toBeEnabled({ timeout: 2_000 });
  await dodge.click();
  await expect(dodge).toBeDisabled();
  await expectFighterPixels(playerSprite.locator("img.fighter-sprite-direct"), fighterSrc("hartz"));
  await saveVisual(page, "flow-fight-hartz-dodge");

  const enemyHp = page.locator(".opponent-hud .hud-name span");
  const hpBefore = await enemyHp.textContent();
  await expect(attack).toBeEnabled({ timeout: 3_000 });
  await attack.click();
  await expect.poll(async () => enemyHp.textContent()).not.toBe(hpBefore);
  await expectFighterPixels(playerSprite.locator("img.fighter-sprite-direct"), fighterSrc("hartz"));
  await saveVisual(page, "flow-fight-hartz-attack");

  await expect(special).toBeEnabled({ timeout: 12_000 });
  await special.click();
  await expect(special).toBeDisabled();
  await expectFighterPixels(playerSprite.locator("img.fighter-sprite-direct"), fighterSrc("hartz"));
  await saveVisual(page, "flow-fight-hartz-special");

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
