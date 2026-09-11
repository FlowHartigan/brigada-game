import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }]) {
  test(`all five fighters can be previewed and confirmed at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    for (const fighter of fighters) {
      await page.goto("/");
      await expect(page).toHaveTitle("BRIGADA FIGHT");
      await page.getByRole("button", { name: "FIGHT", exact: true }).click();
      const cards = page.locator(".fighter-card");
      await expect(cards).toHaveCount(5);
      for (const card of await cards.all()) await expect(card).toBeInViewport({ ratio: 1 });
      await expect.poll(() => page.locator(".fighter-card img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 1536))).toBe(true);
      await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
      await expect(page.locator(".fighter-card[aria-pressed=true]")).toHaveCount(1);
      await expect(page.locator(".selection-name h2")).toHaveText(fighter.name);
      await expect(page.locator(".selection-name p")).toHaveText(fighter.title);
      await expect(page.locator(".selection-special strong")).toHaveText(fighter.special.name);
      await expect(page.locator(".selection-stats .stat-row strong")).toHaveText(Object.values(fighter.stats).map(String));
      expect(await page.locator(".select-screen img").evaluateAll(images => images.every(image => getComputedStyle(image).imageRendering === "pixelated"))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });
      await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
      await expect(page.locator(".versus-screen")).toBeVisible();
      await expect(page.locator(".versus-fighter.left h2")).toHaveText(fighter.name);
      const opponent = await page.locator(".versus-fighter.right h2").textContent();
      expect(fighters.map(candidate => candidate.name)).toContain(opponent);
      expect(opponent).not.toBe(fighter.name);
    }
    expect(errors).toEqual([]);
  });
}
