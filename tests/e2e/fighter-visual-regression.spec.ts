import { expect, test, type Locator, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import {
  expectFighterPixels,
  expectPhaserCombatReady,
  expectPhaserFighterState,
  fighterSrc,
  holdDefense,
  releaseDefense,
  saveVisual,
} from "./visual-helpers";

const actionStates = ["attack1", "attack2", "attack3"] as const;

async function setDeterministicCombatRandom(page: Page, value: number) {
  await page.evaluate((nextValue: number) => {
    window.__BRIGADA_COMBAT_RNG__ = () => nextValue;
  }, value);
}

async function expectAnimatedSource(image: Locator, state: string) {
  await expect(image).toHaveAttribute("data-state", state, { timeout: 500 });
  await expect(image).toHaveAttribute("data-animated", "true");
  const source = await image.getAttribute("src");
  const fighterId = await image.getAttribute("data-fighter");

  if (fighterId === "korsair") {
    expect(source).toBe(`/fighters/korsair.png#combat-${state}`);
  } else {
    expect(source).toMatch(/^data:image\/webp;base64,/);
    expect(source!.length).toBeGreaterThan(300);
  }
}

test("every fighter uses real combat action frames without breaking Select, VS or Combat", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });

  // Start deterministic: selection picks a stable opponent and Utility AI
  // chooses its first legal action so its own animation can be observed.
  // Keep randomness scoped to combat so Phaser can keep using Math.random for
  // its own internal identifiers.
  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0;
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
    await expect(playerImage).toHaveAttribute("src", fighterSrc(fighter.id));
    const combatOpponentId = await opponentImage.getAttribute("data-fighter");
    expect(combatOpponentId).toBeTruthy();
    await expect(opponentImage).toHaveAttribute("src", fighterSrc(combatOpponentId!));

    await expectPhaserCombatReady(page, fighter.id, combatOpponentId!);
    await expectPhaserFighterState(page, "player", "idle", fighter.id);
    await expect(page.locator(".arena-left")).toHaveAttribute("data-renderer", "react-fallback-hidden");
    await expect(page.locator(".arena-right")).toHaveAttribute("data-renderer", "react-fallback-hidden");

    const stage = page.getByTestId("phaser-combat-stage");
    const attack = page.getByRole("button", { name: /ATTAQUE/ });
    const dodge = page.getByRole("button", { name: /ESQUIVE/ });
    const defend = page.getByRole("button", { name: /DÉFENSE/ });
    const special = page.getByRole("button", { name: /SPÉCIAL/ });

    // First prove the AI itself animates in Phaser when it performs a real attack.
    await expect.poll(
      async () => stage.getAttribute("data-opponent-state"),
      { timeout: 4_000, intervals: [50, 50, 100, 100, 150, 200] },
    ).toMatch(/^attack[123]$/);
    const opponentAnimatedState = await stage.getAttribute("data-opponent-state");
    await expectAnimatedSource(opponentImage, opponentAnimatedState!);
    await expectPhaserFighterState(page, "opponent", opponentAnimatedState!, combatOpponentId!);
    await saveVisual(page, `anim-${fighter.id}-ai-${opponentAnimatedState}`);

    // Make Utility AI choose WAIT while we validate player frames. This avoids
    // unrelated enemy hits racing short-lived presentation states.
    await setDeterministicCombatRandom(page, 0.999999);
    await page.waitForTimeout(700);

    await holdDefense(page, defend);
    await expectAnimatedSource(playerImage, "defend");
    await expectPhaserFighterState(page, "player", "defend", fighter.id);
    await saveVisual(page, `anim-${fighter.id}-defend`);
    await releaseDefense(page, defend);

    await expect(dodge).toBeEnabled({ timeout: 4_000 });
    await dodge.click();
    await expectAnimatedSource(playerImage, "dodge");
    await expectPhaserFighterState(page, "player", "dodge", fighter.id);
    await saveVisual(page, `anim-${fighter.id}-dodge`);

    // Keep the three attacks inside the real 900ms combo window. Full-page
    // screenshots are intentionally deferred until attack3 because screenshot
    // encoding can be slow enough on CI to expire a legitimate combo.
    for (const state of actionStates) {
      await expect(attack).toBeEnabled({ timeout: 4_000 });
      await attack.click();
      await expectAnimatedSource(playerImage, state);
      await expectAnimatedSource(opponentImage, "hit");
      await expectPhaserFighterState(page, "player", state, fighter.id);
      await expectPhaserFighterState(page, "opponent", "hit", combatOpponentId!);
    }
    await saveVisual(page, `anim-${fighter.id}-attack3-vs-hit`);

    await expect(special).toBeEnabled({ timeout: 12_000 });
    await special.click();
    await expectAnimatedSource(playerImage, "special");
    await expectPhaserFighterState(page, "player", "special", fighter.id);
    await saveVisual(page, `anim-${fighter.id}-special`);

    // Whatever transient state remains, Phaser must keep the fighter texture
    // synchronized with the deterministic presentation state.
    const finalState = await stage.getAttribute("data-player-state");
    expect(finalState).toBeTruthy();
    await expectPhaserFighterState(page, "player", finalState!, fighter.id);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
