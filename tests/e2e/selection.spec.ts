import { expect, test, type Locator } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";

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

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }]) {
  test(`all five fighters render real images and can be confirmed at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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

      await expect.poll(() => page.locator(".fighter-card img.fighter-art-image").evaluateAll(images => images.every(img => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 128 && image.naturalHeight === 128 && image.src.includes("/fighters/");
      }))).toBe(true);

      await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
      await expect(page.locator(".fighter-card[aria-pressed=true]")).toHaveCount(1);
      await expect(page.locator(".selection-name h2")).toHaveText(fighter.name);
      await expect(page.locator(".selection-name p")).toHaveText(fighter.title);
      await expect(page.locator(".selection-special strong")).toHaveText(fighter.special.name);
      await expect(page.locator(".selection-stats .stat-row strong")).toHaveText(Object.values(fighter.stats).map(String));

      const showcaseImage = page.locator(".selection-showcase img.fighter-art-image");
      await expect(showcaseImage).toBeVisible();
      await expect(showcaseImage).toHaveAttribute("src", `/fighters/${fighter.id}.png`);
      expect(await imageContainsVisiblePixels(showcaseImage)).toBe(true);
      expect(await showcaseImage.evaluate(image => getComputedStyle(image).imageRendering)).toBe("pixelated");

      const box = await showcaseImage.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(80);
        expect(box.height).toBeGreaterThan(80);
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
