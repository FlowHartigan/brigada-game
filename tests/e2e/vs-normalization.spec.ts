import { expect, test, type Locator, type Page } from "@playwright/test";
import { fighters } from "../../src/game/data/fighters";
import { expectFighterPixels, fighterSrc, saveVisual } from "./visual-helpers";

const viewports = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 1280, height: 720 },
] as const;

const visualPairs = new Set([
  "petoux:kavaleur",
  "hartz:nexmos",
  "korsair:petoux",
  "kavaleur:korsair",
]);

async function openVersus(page: Page, playerId: string, opponentId: string) {
  const choices = fighters.filter((fighter) => fighter.id !== playerId);
  const opponentIndex = choices.findIndex((fighter) => fighter.id === opponentId);
  expect(opponentIndex).toBeGreaterThanOrEqual(0);

  await page.goto("/");
  await page.evaluate((randomValue) => {
    window.__BRIGADA_COMBAT_RNG__ = () => randomValue;
  }, (opponentIndex + 0.5) / choices.length);

  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  const player = fighters.find((fighter) => fighter.id === playerId)!;
  await page.getByRole("button", { name: `${player.name} — ${player.title}`, exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await expect(page.locator(".versus-screen")).toBeVisible();
}

async function visibleAlphaGeometry(image: Locator) {
  return image.evaluate(async (node) => {
    const element = node as HTMLImageElement;
    await element.decode();

    const canvas = document.createElement("canvas");
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas unavailable");
    context.drawImage(element, 0, 0);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) throw new Error("Image contains no opaque pixels");

    const frameElement = element.closest(".versus-portrait") as HTMLElement | null;
    if (!frameElement) throw new Error("Missing VS frame");

    const imageRect = element.getBoundingClientRect();
    const frameRect = frameElement.getBoundingClientRect();
    const imageStyle = getComputedStyle(element);
    const frameStyle = getComputedStyle(frameElement);
    const scaleX = imageRect.width / element.naturalWidth;
    const scaleY = imageRect.height / element.naturalHeight;
    const transform = frameStyle.transform === "none"
      ? new DOMMatrixReadOnly()
      : new DOMMatrixReadOnly(frameStyle.transform);
    const mirrored = transform.a < 0;
    const maxXExclusive = maxX + 1;
    const maxYExclusive = maxY + 1;

    const alphaLeft = mirrored
      ? imageRect.right - maxXExclusive * scaleX
      : imageRect.left + minX * scaleX;
    const alphaRight = mirrored
      ? imageRect.right - minX * scaleX
      : imageRect.left + maxXExclusive * scaleX;
    const alphaTop = imageRect.top + minY * scaleY;
    const alphaBottom = imageRect.top + maxYExclusive * scaleY;
    const alphaCenterX = (alphaLeft + alphaRight) / 2;
    const frameCenterX = (frameRect.left + frameRect.right) / 2;

    return {
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      alphaHeight: alphaBottom - alphaTop,
      groundY: alphaBottom,
      centerDelta: Math.abs(alphaCenterX - frameCenterX),
      topMargin: alphaTop - frameRect.top,
      bottomMargin: frameRect.bottom - alphaBottom,
      leftMargin: alphaLeft - frameRect.left,
      rightMargin: frameRect.right - alphaRight,
      sourceRatio: element.naturalWidth / element.naturalHeight,
      renderedRatio: imageRect.width / imageRect.height,
      imageRendering: imageStyle.imageRendering,
      objectFit: imageStyle.objectFit,
    };
  });
}

for (const viewport of viewports) {
  test(`normalizes every directed VS matchup at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const player of fighters) {
      for (const opponent of fighters) {
        if (player.id === opponent.id) continue;

        await openVersus(page, player.id, opponent.id);
        const playerImage = page.locator(`.versus-fighter.left img[data-fighter="${player.id}"]`);
        const opponentImage = page.locator(`.versus-fighter.right img[data-fighter="${opponent.id}"]`);

        await expectFighterPixels(page, playerImage, fighterSrc(player.id));
        await expectFighterPixels(page, opponentImage, fighterSrc(opponent.id));

        const left = await visibleAlphaGeometry(playerImage);
        const right = await visibleAlphaGeometry(opponentImage);

        // Both presentation containers are the same square, regardless of labels or source PNG size.
        expect(Math.abs(left.frameWidth - left.frameHeight)).toBeLessThan(0.5);
        expect(Math.abs(right.frameWidth - right.frameHeight)).toBeLessThan(0.5);
        expect(Math.abs(left.frameWidth - right.frameWidth)).toBeLessThan(0.5);
        expect(Math.abs(left.frameHeight - right.frameHeight)).toBeLessThan(0.5);

        // Visible alpha silhouettes share one target height and one ground line.
        const heightDifference = Math.abs(left.alphaHeight - right.alphaHeight) /
          Math.max(left.alphaHeight, right.alphaHeight);
        expect(heightDifference).toBeLessThan(0.02);
        expect(Math.abs(left.groundY - right.groundY)).toBeLessThanOrEqual(2);

        // Opaque silhouettes are centered and entirely contained in their frame.
        expect(left.centerDelta).toBeLessThanOrEqual(2);
        expect(right.centerDelta).toBeLessThanOrEqual(2);
        for (const margin of [
          left.topMargin,
          left.bottomMargin,
          left.leftMargin,
          left.rightMargin,
          right.topMargin,
          right.bottomMargin,
          right.leftMargin,
          right.rightMargin,
        ]) {
          expect(margin).toBeGreaterThanOrEqual(-0.5);
        }

        // The image itself keeps the source aspect ratio and nearest-neighbor rendering.
        expect(left.renderedRatio).toBeCloseTo(left.sourceRatio, 3);
        expect(right.renderedRatio).toBeCloseTo(right.sourceRatio, 3);
        expect(left.objectFit).toBe("contain");
        expect(right.objectFit).toBe("contain");
        expect(left.imageRendering).toBe("pixelated");
        expect(right.imageRendering).toBe("pixelated");

        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

        const key = `${player.id}:${opponent.id}`;
        if (visualPairs.has(key)) {
          await saveVisual(
            page,
            `vs-after-${player.id}-${opponent.id}-${viewport.width}x${viewport.height}`,
          );
        }
      }
    }
  });
}
