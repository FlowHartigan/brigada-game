import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterSrc, saveVisual } from "./visual-helpers";

test("every fighter stays visibly rendered through Select, VS, Combat, dodge, defend and special", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 844, height: 390 });

  for (const fighter of fighters) {
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();
    await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();

    const selectionImage = page.locator(`.selection-showcase img.fighter-art-image[data-fighter="${fighter.id}"]`);
    await expectFighterPixels(selectionImage, fighterSrc(fighter.id));

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    const vsPlayerImage = page.locator(".versus-fighter.left img.fighter-sprite-direct");
    const vsOpponentImage = page.locator(".versus-fighter.right img.fighter-sprite-direct");
    await expectFighterPixels(vsPlayerImage, fighterSrc(fighter.id));
    const opponentId = await vsOpponentImage.getAttribute("data-fighter");
    expect(opponentId).toBeTruthy();
    await expectFighterPixels(vsOpponentImage, fighterSrc(opponentId!));
    await saveVisual(page, `regression-vs-${fighter.id}-${opponentId}`);

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    const arena = page.locator(".arena-left");
    const playerImage = arena.locator("img.fighter-sprite-direct");
    const opponentImage = page.locator(".arena-right img.fighter-sprite-direct");
    await expectFighterPixels(playerImage, fighterSrc(fighter.id));
    const combatOpponentId = await opponentImage.getAttribute("data-fighter");
    expect(combatOpponentId).toBeTruthy();
    await expectFighterPixels(opponentImage, fighterSrc(combatOpponentId!));
    await saveVisual(page, `regression-fight-${fighter.id}-${combatOpponentId}`);

    const attack = page.getByRole("button", { name: /ATTAQUE/ });
    const dodge = page.getByRole("button", { name: /ESQUIVE/ });
    const defend = page.getByRole("button", { name: /DÉFENSE/ });
    const special = page.getByRole("button", { name: /SPÉCIAL/ });

    await expect(attack).toBeEnabled({ timeout: 3_000 });
    await attack.click();
    await expectFighterPixels(playerImage, fighterSrc(fighter.id));

    await expect(dodge).toBeEnabled({ timeout: 3_000 });
    await dodge.click();
    await expect(arena.locator('img.fighter-sprite-direct[data-state="dodge"]')).toBeVisible();
    await expectFighterPixels(playerImage, fighterSrc(fighter.id));

    await expect(defend).toBeEnabled({ timeout: 3_000 });
    const defendBox = await defend.boundingBox();
    expect(defendBox).not.toBeNull();
    if (defendBox) {
      await page.mouse.move(defendBox.x + defendBox.width / 2, defendBox.y + defendBox.height / 2);
      await page.mouse.down();
      await expect(arena.locator('img.fighter-sprite-direct[data-state="defend"]')).toBeVisible();
      await expectFighterPixels(playerImage, fighterSrc(fighter.id));
      await page.mouse.up();
    }

    await expect(special).toBeEnabled({ timeout: 12_000 });
    await special.click();
    await expect(arena.locator('img.fighter-sprite-direct[data-state="special"]')).toBeVisible({ timeout: 1_000 });
    await expectFighterPixels(playerImage, fighterSrc(fighter.id));
    await saveVisual(page, `regression-special-${fighter.id}`);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
