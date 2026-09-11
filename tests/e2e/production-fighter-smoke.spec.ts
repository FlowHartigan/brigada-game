import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterSrc, saveVisual } from "./visual-helpers";

const productionUrl = "https://brigada-game.vercel.app";

test("production keeps fighters visible through selection VS and combat", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(productionUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveTitle("BRIGADA FIGHT");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();

  for (const fighter of fighters) {
    const cardImage = page.locator(`.fighter-card img.fighter-art-image[data-fighter="${fighter.id}"]`);
    await expectFighterPixels(page, cardImage, fighterSrc(fighter.id));
  }

  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
  const selectionImage = page.locator('.selection-showcase img.fighter-art-image[data-fighter="hartz"]');
  await expectFighterPixels(page, selectionImage, fighterSrc("hartz"));
  await saveVisual(page, "prod-selection-hartz");

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  const vsPlayer = page.locator(".versus-fighter.left img.fighter-sprite-direct");
  const vsOpponent = page.locator(".versus-fighter.right img.fighter-sprite-direct");
  await expectFighterPixels(page, vsPlayer, fighterSrc("hartz"));
  const opponentId = await vsOpponent.getAttribute("data-fighter");
  expect(opponentId).toBeTruthy();
  await expectFighterPixels(page, vsOpponent, fighterSrc(opponentId!));
  await saveVisual(page, `prod-vs-hartz-${opponentId}`);

  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  const player = page.locator(".arena-left img.fighter-sprite-direct");
  const opponent = page.locator(".arena-right img.fighter-sprite-direct");
  await expectFighterPixels(page, player, fighterSrc("hartz"));
  const arenaOpponentId = await opponent.getAttribute("data-fighter");
  expect(arenaOpponentId).toBeTruthy();
  await expectFighterPixels(page, opponent, fighterSrc(arenaOpponentId!));
  await saveVisual(page, `prod-fight-hartz-${arenaOpponentId}`);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
