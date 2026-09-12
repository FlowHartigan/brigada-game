import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterArtSrc, saveVisual } from "./visual-helpers";

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }]) {
  test(`all five standalone fighters are visibly rendered at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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

      for (const candidate of fighters) {
        const cardImage = page.locator(`.fighter-card img.fighter-art-image[data-fighter="${candidate.id}"]`);
        await expectFighterPixels(page, cardImage, fighterArtSrc(candidate.id));
      }

      await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
      await expect(page.locator(".fighter-card[aria-pressed=true]")).toHaveCount(1);
      await expect(page.locator(".selection-name h2")).toHaveText(fighter.name);
      await expect(page.locator(".selection-name p")).toHaveText(fighter.title);
      await expect(page.locator(".selection-special strong")).toHaveText(fighter.special.name);

      const showcaseImage = page.locator(`.selection-showcase img.fighter-art-image[data-fighter="${fighter.id}"]`);
      await expectFighterPixels(page, showcaseImage, fighterArtSrc(fighter.id));
      expect(await showcaseImage.evaluate(image => getComputedStyle(image).imageRendering)).toBe("pixelated");

      const showcaseFrame = page.locator(".selection-showcase .roster-sprite");
      const box = await showcaseFrame.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(80);
        expect(box.height).toBeGreaterThan(80);
      }

      await saveVisual(page, `selection-${viewport.width}x${viewport.height}-${fighter.id}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(page.getByRole("button", { name: "COMBATTRE", exact: true })).toBeInViewport({ ratio: 1 });
    }

    expect(errors).toEqual([]);
  });
}
