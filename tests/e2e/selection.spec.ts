import { expect, test } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterArtSrc, saveVisual } from "./visual-helpers";

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
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

for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 1280, height: 720 }]) {
  test(`HARTZ full-body card stays intact across selection states at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "FIGHT", exact: true }).click();
    const card = page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true });
    const image = card.locator("img");
    for (const state of ["selected", "unselected", "hovered"] as const) {
      if (state === "selected") await card.click();
      if (state === "unselected") await page.getByRole("button", { name: "KAVALEUR — CAVALCADE", exact: true }).click();
      if (state === "hovered") await card.hover();
      await expect(card).toHaveAttribute("aria-pressed", state === "selected" ? "true" : "false");
      await expectFighterPixels(page, image, "/fighters/hartz-v2/front.png");
      await expect(image).toHaveCSS("image-rendering", "pixelated");
      await expect(image).toHaveCSS("object-fit", "contain");
      const bounds = await image.evaluate(async (node) => {
        const img = node as HTMLImageElement;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3]) {
            left = Math.min(left, x); right = Math.max(right, x + 1);
            top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
          }
        }
        const box = img.getBoundingClientRect();
        const frame = img.parentElement!.getBoundingClientRect();
        const scale = Math.min(box.width / canvas.width, box.height / canvas.height);
        const x = box.x + (box.width - canvas.width * scale) / 2;
        const y = box.y + (box.height - canvas.height * scale) / 2;
        return { left: x + left * scale - frame.left, right: frame.right - x - right * scale,
          top: y + top * scale - frame.top, bottom: frame.bottom - y - bottom * scale };
      });
      for (const margin of Object.values(bounds)) expect(margin).toBeGreaterThanOrEqual(-1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
