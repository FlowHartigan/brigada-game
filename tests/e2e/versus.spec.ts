import { expect, test, type Locator } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

const landscapeViewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

async function imageContainsVisiblePixels(locator: Locator) {
  return locator.evaluate((img) => {
    const image = img as HTMLImageElement;
    if (!image.complete || image.naturalWidth !== 128 || image.naturalHeight !== 128) return false;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, 128, 128).data;
    let count = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 20) count += 1;
    }
    return count > 250;
  });
}

for (const viewport of landscapeViewports) {
  test(`premium VS screen renders the exact fighter PNGs at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const fighter of fighters) {
      await page.goto("/");
      await page.getByRole("button", { name: "FIGHT", exact: true }).click();
      await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
      await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

      const screen = page.locator(".versus-screen");
      await expect(screen).toBeVisible();
      await expect(page.locator(".versus-center > strong")).toHaveText("VS");

      const player = page.locator(".versus-fighter.left");
      const opponent = page.locator(".versus-fighter.right");
      const playerImage = player.locator("img.fighter-sprite-direct");
      const opponentImage = opponent.locator("img.fighter-sprite-direct");

      await expect(player.locator("h2")).toHaveText(fighter.name);
      await expect(player.locator("p")).toHaveText(fighter.title);
      await expect(playerImage).toBeVisible();
      await expect(playerImage).toHaveAttribute("src", `/fighters/${fighter.id}.png`);
      expect(await imageContainsVisiblePixels(playerImage)).toBe(true);

      const opponentName = await opponent.locator("h2").textContent();
      const opponentFighter = fighters.find(candidate => candidate.name === opponentName);
      expect(opponentFighter).toBeTruthy();
      expect(opponentName).not.toBe(fighter.name);
      await expect(opponentImage).toBeVisible();
      await expect(opponentImage).toHaveAttribute("src", `/fighters/${opponentFighter!.id}.png`);
      expect(await imageContainsVisiblePixels(opponentImage)).toBe(true);

      expect(await playerImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");

      const playerBox = await playerImage.boundingBox();
      const opponentBox = await opponentImage.boundingBox();
      expect(playerBox).not.toBeNull();
      expect(opponentBox).not.toBeNull();
      if (playerBox && opponentBox) {
        expect(playerBox.width).toBeGreaterThan(100);
        expect(playerBox.height).toBeGreaterThan(100);
        expect(opponentBox.width).toBeGreaterThan(100);
        expect(opponentBox.height).toBeGreaterThan(100);
      }

      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
}
