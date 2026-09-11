import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterSrc, saveVisual } from "./visual-helpers";

const landscapeViewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

for (const viewport of landscapeViewports) {
  test(`VS screen visibly renders the exact standalone fighters at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
      const playerImage = player.locator("img.fighter-sprite-direct");
      const opponentImage = opponent.locator("img.fighter-sprite-direct");

      await expect(player.locator("h2")).toHaveText(fighter.name);
      await expect(player.locator("p")).toHaveText(fighter.title);
      await expect(playerImage).toHaveAttribute("data-fighter", fighter.id);
      await expectFighterPixels(playerImage, fighterSrc(fighter.id));

      const opponentName = await opponent.locator("h2").textContent();
      const opponentFighter = fighters.find(candidate => candidate.name === opponentName);
      expect(opponentFighter).toBeTruthy();
      expect(opponentName).not.toBe(fighter.name);
      await expect(opponentImage).toHaveAttribute("data-fighter", opponentFighter!.id);
      await expectFighterPixels(opponentImage, fighterSrc(opponentFighter!.id));

      const playerFrame = player.locator(".versus-portrait");
      const opponentFrame = opponent.locator(".versus-portrait");
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

      await saveVisual(page, `vs-${viewport.width}x${viewport.height}-${fighter.id}-vs-${opponentFighter!.id}`);
      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }

    expect(errors).toEqual([]);
  });
}
