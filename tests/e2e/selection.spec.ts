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

async function imageCoversFrame(image: Locator, frame: Locator) {
  const imageBox = await image.boundingBox();
  const frameBox = await frame.boundingBox();
  if (!imageBox || !frameBox) return false;
  const centerX = frameBox.x + frameBox.width / 2;
  const centerY = frameBox.y + frameBox.height / 2;
  return centerX >= imageBox.x && centerX <= imageBox.x + imageBox.width && centerY >= imageBox.y && centerY <= imageBox.y + imageBox.height;
}

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }]) {
  test(`all five fighters are visibly cropped from approved art and can be confirmed at ${viewport.width}x${viewport.height}`, async ({ page }) => {
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

      const cardImages = page.locator(".fighter-card img.fighter-art-image");
      await expect(cardImages).toHaveCount(5);
      await expect.poll(() => cardImages.evaluateAll(images => images.every(img => {
        const image = img as HTMLImageElement;
        return image.complete && image.naturalWidth === 1536 && image.naturalHeight === 1024 && image.getAttribute("src") === "/art/brigada-pixel-rave-roster-v1.webp";
      }))).toBe(true);

      for (const candidate of fighters) {
        const cardImage = page.locator(`.fighter-card img.fighter-art-image[data-fighter="${candidate.id}"]`);
        const frame = cardImage.locator("xpath=..");
        await expect(cardImage).toBeVisible();
        await expect(cardImage).toHaveAttribute("src", rosterSource);
        await expect(cardImage).toHaveAttribute("data-crop-x", cropX[candidate.id]);
        expect(await imageCoversFrame(cardImage, frame)).toBe(true);
        expect(await cardImage.evaluate(image => getComputedStyle(image).opacity)).toBe("1");
        expect(await cardImage.evaluate(image => getComputedStyle(image).visibility)).toBe("visible");
        expect(await frame.evaluate(element => getComputedStyle(element).overflow)).toBe("hidden");
        const portraitBox = await frame.boundingBox();
        expect(portraitBox).not.toBeNull();
        if (portraitBox) {
          expect(portraitBox.width).toBeGreaterThan(30);
          expect(portraitBox.height).toBeGreaterThan(30);
        }
      }

      await page.getByRole("button", { name: `${fighter.name} — ${fighter.title}`, exact: true }).click();
      await expect(page.locator(".fighter-card[aria-pressed=true]")).toHaveCount(1);
      await expect(page.locator(".selection-name h2")).toHaveText(fighter.name);
      await expect(page.locator(".selection-name p")).toHaveText(fighter.title);
      await expect(page.locator(".selection-special strong")).toHaveText(fighter.special.name);
      await expect(page.locator(".selection-stats .stat-row strong")).toHaveText(Object.values(fighter.stats).map(String));

      const showcaseImage = page.locator(".selection-showcase img.fighter-art-image");
      const showcaseFrame = page.locator(".selection-showcase .roster-sprite");
      await expect(showcaseImage).toBeVisible();
      await expect(showcaseImage).toHaveAttribute("src", rosterSource);
      await expect(showcaseImage).toHaveAttribute("data-fighter", fighter.id);
      await expect(showcaseImage).toHaveAttribute("data-crop-x", cropX[fighter.id]);
      expect(await imageCoversFrame(showcaseImage, showcaseFrame)).toBe(true);
      expect(await showcaseImage.evaluate(image => getComputedStyle(image).imageRendering)).toBe("pixelated");
      expect(await showcaseImage.evaluate(image => getComputedStyle(image).visibility)).toBe("visible");

      const box = await showcaseFrame.boundingBox();
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
