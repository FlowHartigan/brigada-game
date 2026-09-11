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

async function imageCoversFrame(image: Locator, frame: Locator) {
  const imageBox = await image.boundingBox();
  const frameBox = await frame.boundingBox();
  if (!imageBox || !frameBox) return false;
  const centerX = frameBox.x + frameBox.width / 2;
  const centerY = frameBox.y + frameBox.height / 2;
  return centerX >= imageBox.x && centerX <= imageBox.x + imageBox.width && centerY >= imageBox.y && centerY <= imageBox.y + imageBox.height;
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
      await expect.poll(() => playerImage.evaluate(img => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 1536 && image.naturalHeight === 1024;
      })).toBe(true);
      expect(await imageCoversFrame(playerImage, playerFrame)).toBe(true);

      const opponentName = await opponent.locator("h2").textContent();
      const opponentFighter = fighters.find(candidate => candidate.name === opponentName);
      expect(opponentFighter).toBeTruthy();
      expect(opponentName).not.toBe(fighter.name);
      await expect(opponentImage).toBeVisible();
      await expect(opponentImage).toHaveAttribute("src", rosterSource);
      await expect(opponentImage).toHaveAttribute("data-fighter", opponentFighter!.id);
      await expect(opponentImage).toHaveAttribute("data-crop-x", cropX[opponentFighter!.id]);
      await expect.poll(() => opponentImage.evaluate(img => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 1536 && image.naturalHeight === 1024;
      })).toBe(true);
      expect(await imageCoversFrame(opponentImage, opponentFrame)).toBe(true);

      expect(await playerImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await playerImage.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      expect(await opponentImage.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      expect(await playerFrame.evaluate(element => getComputedStyle(element).overflow)).toBe("hidden");
      expect(await opponentFrame.evaluate(element => getComputedStyle(element).overflow)).toBe("hidden");

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
