import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

const landscapeViewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

for (const viewport of landscapeViewports) {
  test(`premium VS screen uses the real matchup visuals at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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

      await expect(player.locator("h2")).toHaveText(fighter.name);
      await expect(player.locator("p")).toHaveText(fighter.title);

      const opponentName = await opponent.locator("h2").textContent();
      expect(fighters.map(candidate => candidate.name)).toContain(opponentName);
      expect(opponentName).not.toBe(fighter.name);

      const playerBackground = await playerArt.evaluate(element => getComputedStyle(element).backgroundImage);
      const opponentBackground = await opponentArt.evaluate(element => getComputedStyle(element).backgroundImage);
      expect(playerBackground).toContain("brigada-fighters-atlas-v1.png");
      expect(opponentBackground).toContain("brigada-fighters-atlas-v1.png");
      expect(await playerArt.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");
      expect(await opponentArt.evaluate(element => getComputedStyle(element).imageRendering)).toBe("pixelated");

      await expect(playerArt).toBeInViewport({ ratio: .85 });
      await expect(opponentArt).toBeInViewport({ ratio: .85 });
      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
}
