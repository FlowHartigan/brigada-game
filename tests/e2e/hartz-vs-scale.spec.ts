import { expect, test, type Locator, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterSrc, saveVisual } from "./visual-helpers";

const viewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 1280, height: 720 },
];

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

async function visibleAlphaBox(image: Locator) {
  return image.evaluate(async (node) => {
    const element = node as HTMLImageElement;
    await element.decode();
    const canvas = document.createElement("canvas");
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(element, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1);
      }
    }
    const frameElement = element.parentElement!;
    const frame = frameElement.getBoundingClientRect();
    const frameScale = frame.height / frameElement.offsetHeight;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const fit = Math.min(width / canvas.width, height / canvas.height);
    const contentX = (width - canvas.width * fit) / 2;
    const contentY = (height - canvas.height * fit) / 2;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    const scale = Math.abs(matrix.a);
    const originX = width / 2;
    const originY = height;
    const mapX = (x: number) => originX + scale * (contentX + x * fit - originX) + matrix.e;
    const mapY = (y: number) => originY + scale * (contentY + y * fit - originY) + matrix.f;
    return {
      height: (mapY(maxY) - mapY(minY)) * frameScale,
      top: mapY(minY) * frameScale,
      bottom: frame.height - mapY(maxY) * frameScale,
      left: mapX(minX) * frameScale,
      right: frame.width - mapX(maxX) * frameScale,
      ratio: element.naturalWidth / element.naturalHeight,
      rendering: getComputedStyle(element).imageRendering,
    };
  });
}

for (const viewport of viewports) {
  test(`HARTZ matches KORSAIR's visible VS height on both sides at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const reverse of [false, true]) {
      await openVersus(page, reverse ? "korsair" : "hartz", reverse ? "hartz" : "korsair");
      const hartz = page.locator('.versus-screen img[data-fighter="hartz"]');
      const korsair = page.locator('.versus-screen img[data-fighter="korsair"]');
      await expectFighterPixels(page, hartz, fighterSrc("hartz"));
      await expectFighterPixels(page, korsair, fighterSrc("korsair"));
      const hartzBox = await visibleAlphaBox(hartz);
      const korsairBox = await visibleAlphaBox(korsair);
      expect(Math.abs(hartzBox.height - korsairBox.height) / korsairBox.height).toBeLessThan(0.08);
      expect(Math.abs(hartzBox.bottom - korsairBox.bottom)).toBeLessThan(8);
      for (const margin of [hartzBox.top, hartzBox.bottom, hartzBox.left, hartzBox.right]) {
        expect(margin).toBeGreaterThanOrEqual(-1);
      }
      expect(hartzBox.ratio).toBeCloseTo(448 / 416, 5);
      expect(hartzBox.rendering).toBe("pixelated");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await saveVisual(page, `hartz-vs-korsair-normalized-${viewport.width}`);
  });

  test(`HARTZ keeps the same VS calibration against the other roster at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const opponent of ["petoux", "nexmos", "kavaleur"] as const) {
      for (const reverse of [false, true]) {
        await openVersus(page, reverse ? opponent : "hartz", reverse ? "hartz" : opponent);
        const hartz = page.locator('.versus-screen img[data-fighter="hartz"]');
        await expectFighterPixels(page, hartz, fighterSrc("hartz"));
        const box = await visibleAlphaBox(hartz);
        expect(box.top).toBeGreaterThanOrEqual(-1);
        expect(box.bottom).toBeGreaterThanOrEqual(-1);
      }
    }
  });
}
