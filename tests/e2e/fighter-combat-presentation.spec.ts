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
  // Keep both fighters idle while measuring their baseline, after selecting the pair.
  await page.evaluate(() => { window.__BRIGADA_COMBAT_RNG__ = () => 0.999999; });
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
  for (const side of ["player", "opponent"]) {
    await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-visible-height`)))
      .toBeCloseTo(200.2, 1);
    await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-ground-y`)))
      .toBeCloseTo(326, 1);
  }
  // Measure the real DOM fallback's decoded alpha bounds through its CSS matrix.
  const fallback = await page.locator(".arena-fighter img").evaluateAll(async (nodes) => {
    return Promise.all(nodes.map(async (node) => {
      const img = node as HTMLImageElement;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let top = canvas.height, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] >= 8) {
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      const style = getComputedStyle(img);
      const matrix = new DOMMatrix(style.transform);
      const fittedScale = Math.min(img.clientWidth / canvas.width, img.clientHeight / canvas.height);
      const height = (bottom - top + 1) * fittedScale * Math.abs(matrix.a);
      return { ratio: height / img.clientHeight, uniform: Math.abs(matrix.a) - Math.abs(matrix.d) };
    }));
  });
  for (const fighter of fallback) {
    expect(fighter.ratio).toBeCloseTo(0.72 * 1.3, 2);
    expect(fighter.uniform).toBeCloseTo(0, 5);
  }
  const canvas = await stage.locator("canvas").boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.y).toBeGreaterThanOrEqual(0);
  expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
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

    for (const [playerId, opponentId] of pairings) {
      await openFight(page, playerId, opponentId);
      await expectNormalizedPresentation(page);
    }
  });
});
