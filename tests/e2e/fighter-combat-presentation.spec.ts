import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectPhaserCombatReady } from "./visual-helpers";

const pairings = [
  ["hartz", "petoux"],
  ["petoux", "nexmos"],
  ["nexmos", "kavaleur"],
  ["kavaleur", "korsair"],
  ["korsair", "hartz"],
] as const;

function opponentRng(playerId: string, opponentId: string) {
  const candidates = fighters.filter((fighter) => fighter.id !== playerId);
  const index = candidates.findIndex((fighter) => fighter.id === opponentId);
  if (index < 0) throw new Error(`Invalid pairing ${playerId} / ${opponentId}`);
  return (index + 0.5) / candidates.length;
}

async function openFight(page: Page, playerId: string, opponentId: string) {
  await page.addInitScript((value: number) => {
    window.__BRIGADA_COMBAT_RNG__ = () => value;
  }, opponentRng(playerId, opponentId));

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  const player = fighters.find((fighter) => fighter.id === playerId)!;
  await page.getByRole("button", { name: `${player.name} — ${player.title}`, exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expectPhaserCombatReady(page, playerId, opponentId);
}

async function expectNormalizedPresentation(page: Page) {
  const stage = page.getByTestId("phaser-combat-stage");
  await expect.poll(async () => {
    const [playerHeight, opponentHeight, playerGround, opponentGround] = await Promise.all([
      stage.getAttribute("data-player-visible-height"),
      stage.getAttribute("data-opponent-visible-height"),
      stage.getAttribute("data-player-ground-y"),
      stage.getAttribute("data-opponent-ground-y"),
    ]);
    return Math.abs(Number(playerHeight) - Number(opponentHeight));
  }, { timeout: 5_000 }).toBeLessThanOrEqual(2);
  await expect.poll(async () => {
    const [playerGround, opponentGround] = await Promise.all([
      stage.getAttribute("data-player-ground-y"),
      stage.getAttribute("data-opponent-ground-y"),
    ]);
    return Math.abs(Number(playerGround) - Number(opponentGround));
  }, { timeout: 5_000 }).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test.describe("fighter combat presentation", () => {
  test("normalizes all five fighters on a mobile landscape arena", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 844, height: 390 });

    for (const [playerId, opponentId] of pairings) {
      await openFight(page, playerId, opponentId);
      await expectNormalizedPresentation(page);
    }
  });

  test("keeps representative mixed-size pairings normalized on desktop", async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    for (const [playerId, opponentId] of [pairings[0], pairings[3]]) {
      await openFight(page, playerId, opponentId);
      await expectNormalizedPresentation(page);
    }
  });
});
