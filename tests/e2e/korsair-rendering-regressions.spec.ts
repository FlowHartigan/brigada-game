import { expect, test } from '@playwright/test';
import { fighters } from '../../src/game/data/fighters';
import { fighterActionImage } from '../../src/components/game/fighterAnimationAssets';
import { fighterImage, fighterArtImage } from '../../src/components/game/fighterImages';
import { expectPhaserCombatReady, expectFighterPixels } from './visual-helpers';

const states = ['idle', 'attack1', 'attack2', 'attack3', 'defend', 'dodge', 'hit', 'stunned', 'special', 'win'] as const;

test('every Korsair PNG decodes with real transparent borders and a complete silhouette', async ({ page }) => {
  await page.goto('/');
  const sources = states.map(state => state === 'idle' ? fighterImage('korsair') : fighterActionImage('korsair', state));
  sources.push(fighterArtImage('korsair'), '/fighters/korsair-v2/portrait.png');
  for (const source of new Set(sources)) {
    const result = await page.evaluate(async src => {
      const img = new Image(); img.src = src; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      let visible = 0, transparent = 0, border = 0, minY = img.height, maxY = -1;
      for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
        const alpha = data[(y * img.width + x) * 4 + 3];
        if (alpha === 0) transparent++;
        if (alpha >= 8) { visible++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        if (x === 0 || y === 0 || x === img.width - 1 || y === img.height - 1) border = Math.max(border, alpha);
      }
      return { visible, transparent, border, height: maxY - minY + 1 };
    }, source);
    expect(result.border, source).toBe(0);
    expect(result.transparent, source).toBeGreaterThan(500);
    expect(result.visible, source).toBeGreaterThan(1000);
    expect(result.height, source).toBeGreaterThanOrEqual(120);
  }
});

for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
  test(`Korsair is visible at VS and both combat sides share scale at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    for (const opponent of fighters.filter(f => f.id !== 'korsair')) {
      const choices = fighters.filter(f => f.id !== 'korsair');
      const rng = (choices.findIndex(f => f.id === opponent.id) + 0.5) / choices.length;
      await page.goto('/');
      await page.evaluate(value => { window.__BRIGADA_COMBAT_RNG__ = () => value; }, rng);
      await page.getByRole('button', { name: 'FIGHT', exact: true }).click();
      await page.getByRole('button', { name: 'KORSAIR — CONTRETEMPS', exact: true }).click();
      await expectFighterPixels(page, page.locator('.selection-showcase img'), fighterArtImage('korsair'));
      await page.getByRole('button', { name: 'COMBATTRE', exact: true }).click();
      await expectFighterPixels(page, page.locator('.versus-fighter.left img'), fighterImage('korsair'));
      await expect(page.locator('.versus-portrait.fighter-korsair')).toHaveCSS('background-image', 'none');
      await page.evaluate(() => { window.__BRIGADA_COMBAT_RNG__ = () => 0.999999; });
      await page.getByRole('button', { name: 'COMBATTRE', exact: true }).click();
      await expectPhaserCombatReady(page, 'korsair', opponent.id);
      const stage = page.getByTestId('phaser-combat-stage');
      for (const side of ['player', 'opponent']) {
        await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-visible-height`))).toBeCloseTo(200.2, 1);
        await expect.poll(async () => Number(await stage.getAttribute(`data-${side}-ground-y`))).toBeCloseTo(326, 1);
      }
      for (const side of ['left', 'right']) {
        const wrapper = page.locator(`.arena-${side}`);
        await expect(wrapper).toHaveAttribute('data-renderer', 'react-fallback-hidden');
        const style = await wrapper.evaluate(n => {
          const s = getComputedStyle(n); return [s.backgroundColor, s.backgroundImage, s.boxShadow, s.outlineWidth];
        });
        expect(style).toEqual(['rgba(0, 0, 0, 0)', 'none', 'none', '0px']);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
