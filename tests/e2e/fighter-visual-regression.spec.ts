import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function expectAnimatedSource(image: Locator, state: string) {
  await expect(image).toHaveAttribute("data-state", state, { timeout: 500 });
  await expect(image).toHaveAttribute("data-animated", "true");
  const source = await image.getAttribute("src");
  expect(source).toMatch(/^data:image\/webp;base64,/);
  expect(source!.length).toBeGreaterThan(300);
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
    await expectAnimatedSource(playerImage, "dodge");
    await saveVisual(page, `anim-${fighter.id}-dodge`);

    // Both state attributes are asserted before doing any expensive pixel
    // analysis. One real Chromium screenshot then captures attack + hit at the
    // same instant, preventing one transient frame from expiring while the
    // other is being analyzed.
    for (const state of actionStates) {
      await expect(attack).toBeEnabled({ timeout: 4_000 });
      await attack.click();
      await expectAnimatedSource(playerImage, state);
      await expectAnimatedSource(opponentImage, "hit");
      await saveVisual(page, `anim-${fighter.id}-${state}-vs-hit`);
    }

    // Validate guard break before any fighter-specific special mechanics can
    // alter the interaction (notably KORSAIR's Contretemps counter window).
    await setDeterministicRandom(page, 0);
    await expect(defend).toBeEnabled({ timeout: 4_000 });
    await holdDefense(page, defend);
    await expect.poll(
      async () => playerImage.getAttribute("data-state"),
      { timeout: 10_000, intervals: [100, 150, 200, 250, 300] },
    ).toBe("stunned");
    await expectAnimatedFighterPixels(page, playerImage, "stunned");
    await saveVisual(page, `anim-${fighter.id}-stunned`);

    // Freeze the AI again as soon as the guard break has been proven, then
    // release defense and validate the fighter's own special in isolation.
    await setDeterministicRandom(page, 0.999999);
    await releaseDefense(page, defend);
    await expect(special).toBeEnabled({ timeout: 12_000 });
    await special.click();
    await expectAnimatedSource(playerImage, "special");
    await saveVisual(page, `anim-${fighter.id}-special`);

    // Whatever transient state remains, both fighters must stay rendered.
    const finalState = await playerImage.getAttribute("data-state");
    if (!finalState || finalState === "idle") {
      await expectFighterPixels(page, playerImage, fighterSrc(fighter.id));
    } else {
      await expectAnimatedFighterPixels(page, playerImage, finalState);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});
