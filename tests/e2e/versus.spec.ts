import { expect, test, type Locator } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

const rosterSource = "/art/brigada-pixel-rave-roster-v1.webp";
const cropX: Record<string, string> = {
  hartz: "3%",
  petoux: "26%",
  nexmos: "49%",
  kavaleur: "73%",
  korsair: "96%",
};

const landscapeViewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

async function imageContainsVisiblePixels(locator: Locator) {
  return locator.evaluate((img) => {
    const image = img as HTMLImageElement;
    if (!image.complete || image.naturalWidth < 100 || image.naturalHeight < 100) return false;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.drawImage(image, 0, 0, 64, 64);
    const pixels = context.getImageData(0, 0, 64, 64).data;
    let opaque = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 20) opaque += 1;
      const luminance = Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
    }
    return opaque > 500 && max - min > 20;
  });
}

for (const viewport of landscapeViewports) {
  test(`premium VS screen visibly crops the exact fighters at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

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
      const playerFrame = player.locator(".versus-portrait");
      const opponentFrame = opponent.locator(".versus-portrait");
      const playerImage = player.locator("img.fighter-sprite-direct");
      const opponentImage = opponent.locator("img.fighter-sprite-direct");

      await expect(player.locator("h2")).toHaveText(fighter.name);
      await expect(player.locator("p")).toHaveText(fighter.title);
      await expect(playerImage).toBeVisible();
      await expect(playerImage).toHaveAttribute("src", rosterSource);
      await expect(playerImage).toHaveAttribute("data-fighter", fighter.id);
      await expect(playerImage).toHaveAttribute("data-crop-x", cropX[fighter.id]);
      expect(await imageContainsVisiblePixels(playerImage)).toBe(true);

      const opponentName = await opponent.locator("h2").textContent();
      const opponentFighter = fighters.find(candidate => candidate.name === opponentName);
      expect(opponentFighter).toBeTruthy();
      expect(opponentName).not.toBe(fighter.name);
      await expect(opponentImage).toBeVisible();
      await expect(opponentImage).toHaveAttribute("src", rosterSource);
      await expect(opponentImage).toHaveAttribute("data-fighter", opponentFighter!.id);
      await expect(opponentImage).toHaveAttribute("data-crop-x", cropX[opponentFighter!.id]);
      expect(await imageContainsVisiblePixels(opponentImage)).toBe(true);

      expect(await playerImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await playerImage.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).opacity)).toBe("1");

      const playerBox = await playerFrame.boundingBox();
      const opponentBox = await opponentFrame.boundingBox();
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

    expect(errors).toEqual([]);
  });
}
