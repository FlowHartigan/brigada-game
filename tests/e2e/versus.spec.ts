import { expect, test, type Locator } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

const landscapeViewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

async function frameContainsVisiblePixels(locator: Locator) {
  return locator.evaluate((frame) => {
    const img = frame.querySelector("img") as HTMLImageElement | null;
    if (!img || !img.complete || img.naturalWidth !== 1152 || img.naturalHeight !== 128) return false;
    const index = Number((frame as HTMLElement).dataset.frame ?? "-1");
    if (index < 0 || index > 8) return false;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.drawImage(img, index * 128, 0, 128, 128, 0, 0, 128, 128);
    const alpha = context.getImageData(0, 0, 128, 128).data;
    for (let i = 3; i < alpha.length; i += 4) {
      if (alpha[i] > 0) return true;
    }
    return false;
  });
}

for (const viewport of landscapeViewports) {
  test(`premium VS screen uses real visible fighter images at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
      const playerArt = player.locator(".versus-portrait");
      const opponentArt = opponent.locator(".versus-portrait");
      const playerFrame = playerArt.locator(".fighter-sprite-frame");
      const opponentFrame = opponentArt.locator(".fighter-sprite-frame");
      const playerImage = playerArt.locator("img.fighter-sprite-image");
      const opponentImage = opponentArt.locator("img.fighter-sprite-image");

      await expect(player.locator("h2")).toHaveText(fighter.name);
      await expect(player.locator("p")).toHaveText(fighter.title);

      const opponentName = await opponent.locator("h2").textContent();
      expect(fighters.map(candidate => candidate.name)).toContain(opponentName);
      expect(opponentName).not.toBe(fighter.name);

      await expect(playerImage).toBeVisible();
      await expect(opponentImage).toBeVisible();
      await expect.poll(() => playerImage.evaluate((img) => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 1152 && image.naturalHeight === 128;
      })).toBe(true);
      await expect.poll(() => opponentImage.evaluate((img) => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 1152 && image.naturalHeight === 128;
      })).toBe(true);

      expect(await frameContainsVisiblePixels(playerFrame)).toBe(true);
      expect(await frameContainsVisiblePixels(opponentFrame)).toBe(true);
      expect(await playerImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");

      await expect(playerArt).toBeInViewport({ ratio: .85 });
      await expect(opponentArt).toBeInViewport({ ratio: .85 });
      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
}
