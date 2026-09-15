import { expect, test, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { saveVisual } from "./visual-helpers";

const viewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 1280, height: 720 },
] as const;

const visualPairs = [
  ["petoux", "kavaleur"],
  ["hartz", "nexmos"],
  ["korsair", "petoux"],
  ["kavaleur", "korsair"],
] as const;

async function openVersus(page: Page, playerId: string, opponentId: string) {
  const choices = fighters.filter((fighter) => fighter.id !== playerId);
  const opponentIndex = choices.findIndex((fighter) => fighter.id === opponentId);
  await page.addInitScript((randomValue) => {
    window.__BRIGADA_COMBAT_RNG__ = () => randomValue;
  }, (opponentIndex + 0.5) / choices.length);

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  const player = fighters.find((fighter) => fighter.id === playerId)!;
  await page.getByRole("button", { name: `${player.name} — ${player.title}`, exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.locator(".versus-screen")).toBeVisible();
}

test("captures the pre-normalization VS baseline", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const [playerId, opponentId] of visualPairs) {
      await openVersus(page, playerId, opponentId);
      await saveVisual(
        page,
        `vs-before-${playerId}-${opponentId}-${viewport.width}x${viewport.height}`,
      );
    }
  }
});
