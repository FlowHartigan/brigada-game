import { expect, test } from "@playwright/test";
import {
  expectAnimatedFighterPixels,
  expectFighterPixels,
  fighterSrc,
  holdDefense,
  releaseDefense,
  saveVisual,
} from "./visual-helpers";

test("mobile landscape player sees real fighter action frames through the full game flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  // The app still uses the real Utility AI. This deterministic browser-only RNG
  // makes its weighted choice land on WAIT so visual assertions are not raced
  // by an unrelated AI hit while the test captures a specific player action.
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/BRIGADA FIGHT/);
  await page.getByRole("button", { name: "FIGHT" }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE" }).click();

  const showcase = page.locator('.selection-showcase img.fighter-art-image[data-fighter="hartz"]');
  await expectFighterPixels(page, showcase, fighterSrc("hartz"));
  await saveVisual(page, "flow-selection-hartz");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();

  const vsPlayerImage = page.locator(".versus-fighter.left img.fighter-sprite-direct");
  await expectFighterPixels(page, vsPlayerImage, fighterSrc("hartz"));
  const vsOpponentImage = page.locator(".versus-fighter.right img.fighter-sprite-direct");
  const opponentId = await vsOpponentImage.getAttribute("data-fighter");
  expect(opponentId).toBeTruthy();
  await expectFighterPixels(page, vsOpponentImage, fighterSrc(opponentId!));
  await saveVisual(page, `flow-vs-hartz-${opponentId}`);

  await page.getByRole("button", { name: "COMBATTRE" }).click();
  await expect(page.locator(".fight-screen")).toBeVisible();

  const phaserStage = page.getByTestId("phaser-combat-stage");
  await expect(phaserStage).toBeVisible();
  const phaserCanvas = phaserStage.locator("canvas");
  await expect(phaserCanvas).toHaveCount(1, { timeout: 5_000 });
  await expect
    .poll(async () =>
      phaserCanvas.evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        return canvas.width > 0 && canvas.height > 0;
      }),
    )
    .toBe(true);

  const playerSprite = page.locator(".arena-left.fighter-hartz");
  const playerImage = playerSprite.locator("img.fighter-sprite-direct");
  await expect(playerImage).toHaveAttribute("data-state", "idle");
  await expectFighterPixels(page, playerImage, fighterSrc("hartz"));

  const opponentImage = page.locator(".arena-right img.fighter-sprite-direct");
  const arenaOpponentId = await opponentImage.getAttribute("data-fighter");
  expect(arenaOpponentId).toBeTruthy();
  await expectFighterPixels(page, opponentImage, fighterSrc(arenaOpponentId!));
  await saveVisual(page, `flow-fight-hartz-${arenaOpponentId}`);

  const attack = page.getByRole("button", { name: /ATTAQUE/ });
  const defend = page.getByRole("button", { name: /DÉFENSE/ });
  const dodge = page.getByRole("button", { name: /ESQUIVE/ });
  const special = page.getByRole("button", { name: /SPÉCIAL/ });

  await holdDefense(page, defend);
  await expectAnimatedFighterPixels(page, playerImage, "defend");
  await saveVisual(page, "flow-fight-hartz-defend");
  await releaseDefense(page, defend);
  await expect(playerImage).toHaveAttribute("data-state", "idle", { timeout: 1_000 });

  await expect(dodge).toBeEnabled({ timeout: 2_000 });
  await dodge.click();
  await expectAnimatedFighterPixels(page, playerImage, "dodge");
  await saveVisual(page, "flow-fight-hartz-dodge");

  const enemyHp = page.locator(".opponent-hud .hud-name span");
  const hpBefore = await enemyHp.textContent();

  await expect(attack).toBeEnabled({ timeout: 3_000 });
  await attack.click();
  await expect.poll(async () => enemyHp.textContent()).not.toBe(hpBefore);
  await expectAnimatedFighterPixels(page, playerImage, "attack1");
  await saveVisual(page, "flow-fight-hartz-attack1");

  await expect(attack).toBeEnabled({ timeout: 2_000 });
  await attack.click();
  await expectAnimatedFighterPixels(page, playerImage, "attack2");
  await saveVisual(page, "flow-fight-hartz-attack2");

  await expect(attack).toBeEnabled({ timeout: 2_000 });
  await attack.click();
  await expectAnimatedFighterPixels(page, playerImage, "attack3");
  await saveVisual(page, "flow-fight-hartz-attack3");

  await expect(special).toBeEnabled({ timeout: 12_000 });
  await special.click();
  await expect(special).toBeDisabled();
  await expectAnimatedFighterPixels(page, playerImage, "special");
  await saveVisual(page, "flow-fight-hartz-special");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
