import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import {
  expectAnimatedFighterPixels,
  expectFighterPixels,
  fighterSrc,
  holdDefense,
  releaseDefense,
  saveVisual,
} from "./visual-helpers";

const actionStates = ["attack1", "attack2", "attack3"] as const;

async function setDeterministicRandom(page: Page, value: number) {
  await page.evaluate((nextValue: number) => {
    Math.random = () => nextValue;
  }, value);
}

test("every fighter uses real combat action frames without breaking Select, VS or Combat", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });

  // Start deterministic: selection picks a stable opponent and Utility AI
  // chooses its first legal action so its own animation can be observed.
  await page.addInitScript(() => {
    Math.random = () => 0;
  });

  for (const fighter of fighters) {
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();
    await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();

    const selectionImage = page.locator(`.selection-showcase img.fighter-art-image[data-fighter="${fighter.id}"]`);
    await expectFighterPixels(page, selectionImage, fighterSrc(fighter.id));

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    const vsPlayerImage = page.locator(".versus-fighter.left img.fighter-sprite-direct");
    const vsOpponentImage = page.locator(".versus-fighter.right img.fighter-sprite-direct");
    await expectFighterPixels(page, vsPlayerImage, fighterSrc(fighter.id));
    const opponentId = await vsOpponentImage.getAttribute("data-fighter");
    expect(opponentId).toBeTruthy();
    await expectFighterPixels(page, vsOpponentImage, fighterSrc(opponentId!));

    await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
    const playerImage = page.locator(".arena-left img.fighter-sprite-direct");
    const opponentImage = page.locator(".arena-right img.fighter-sprite-direct");
    await expectFighterPixels(page, playerImage, fighterSrc(fighter.id));
    const combatOpponentId = await opponentImage.getAttribute("data-fighter");
    expect(combatOpponentId).toBeTruthy();
    await expectFighterPixels(page, opponentImage, fighterSrc(combatOpponentId!));

    const attack = page.getByRole("button", { name: /ATTAQUE/ });
    const dodge = page.getByRole("button", { name: /ESQUIVE/ });
    const defend = page.getByRole("button", { name: /DÉFENSE/ });
    const special = page.getByRole("button", { name: /SPÉCIAL/ });

    // First prove the AI itself animates when it performs a real attack.
    await expect.poll(
      async () => opponentImage.getAttribute("data-state"),
      { timeout: 4_000, intervals: [50, 50, 100, 100, 150, 200] },
    ).toMatch(/^attack[123]$/);
    const opponentAnimatedState = await opponentImage.getAttribute("data-state");
    await expectAnimatedFighterPixels(page, opponentImage, opponentAnimatedState!);
    await saveVisual(page, `anim-${fighter.id}-ai-${opponentAnimatedState}`);

    // Make Utility AI choose WAIT while we validate player frames. This avoids
    // unrelated enemy hits racing short-lived presentation states.
    await setDeterministicRandom(page, 0.999999);
    await page.waitForTimeout(700);

    await holdDefense(page, defend);
    await expectAnimatedFighterPixels(page, playerImage, "defend");
    await saveVisual(page, `anim-${fighter.id}-defend`);
    await releaseDefense(page, defend);

    await expect(dodge).toBeEnabled({ timeout: 4_000 });
    await dodge.click();
    await expectAnimatedFighterPixels(page, playerImage, "dodge");
    await saveVisual(page, `anim-${fighter.id}-dodge`);

    // Each real combo hit swaps the attacking fighter and the struck opponent.
    for (const state of actionStates) {
      await expect(attack).toBeEnabled({ timeout: 4_000 });
      await attack.click();
      await expect(playerImage).toHaveAttribute("data-state", state, { timeout: 500 });
      await expect(opponentImage).toHaveAttribute("data-state", "hit", { timeout: 500 });
      await expectAnimatedFighterPixels(page, opponentImage, "hit");
      await expectAnimatedFighterPixels(page, playerImage, state);
      await saveVisual(page, `anim-${fighter.id}-${state}`);
      if (state === "attack1") {
        await saveVisual(page, `anim-${fighter.id}-hit`);
      }
    }

    await expect(special).toBeEnabled({ timeout: 12_000 });
    await special.click();
    await expectAnimatedFighterPixels(page, playerImage, "special");
    await saveVisual(page, `anim-${fighter.id}-special`);

    // Re-enable aggressive deterministic AI only for an actual guard break.
    await setDeterministicRandom(page, 0);
    await expect(defend).toBeEnabled({ timeout: 4_000 });
    await holdDefense(page, defend);
    await expect.poll(
      async () => playerImage.getAttribute("data-state"),
      { timeout: 10_000, intervals: [100, 150, 200, 250, 300] },
    ).toBe("stunned");
    await expectAnimatedFighterPixels(page, playerImage, "stunned");
    await saveVisual(page, `anim-${fighter.id}-stunned`);
    await releaseDefense(page, defend);

    // Whatever the AI does next, both fighters must remain visibly rendered.
    const finalState = await playerImage.getAttribute("data-state");
    if (!finalState || finalState === "idle") {
      await expectFighterPixels(page, playerImage, fighterSrc(fighter.id));
    } else {
      await expectAnimatedFighterPixels(page, playerImage, finalState);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
