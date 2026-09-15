import { expect, test } from "@playwright/test";

const fighterSources = {
  hartz: "/fighters/hartz-v2/idle.png",
  petoux: "/fighters/petoux.png",
  nexmos: "/fighters/nexmos.png",
  kavaleur: "/fighters/kavaleur-v2/idle.png",
  korsair: "/fighters/korsair-v2/idle.png",
} as const;

test("reports VS fighter alpha bounds", async ({ page }) => {
  await page.goto("/");

  const measurements = await page.evaluate(async (sources) => {
    const entries = await Promise.all(
      Object.entries(sources).map(async ([id, source]) => {
        const image = new Image();
        image.src = source;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("2D canvas unavailable");
        context.drawImage(image, 0, 0);

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

        if (maxX < minX || maxY < minY) throw new Error(`No visible pixels for ${id}`);

        return [id, {
          sourceWidth: canvas.width,
          sourceHeight: canvas.height,
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          bottomPadding: canvas.height - (maxY + 1),
        }] as const;
      }),
    );

    return Object.fromEntries(entries);
  }, fighterSources);

  console.log(`VS_ALPHA_BOUNDS=${JSON.stringify(measurements)}`);
  for (const measurement of Object.values(measurements)) {
    expect(measurement.width).toBeGreaterThan(0);
    expect(measurement.height).toBeGreaterThan(0);
  }
});
