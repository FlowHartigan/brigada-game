import { expect, test, type Locator } from "@playwright/test";

const visualStates = [
  ["idle", null],
  ["attack1", "is-attacking"],
  ["attack2", "is-attacking"],
  ["attack3", "is-attacking"],
  ["defend", "is-defending"],
  ["dodge", "is-dodging"],
  ["hit", "is-hit"],
  ["stunned", "is-stunned"],
  ["special", "is-special"],
  ["win", null],
] as const;

const stateClasses = [
  "is-attacking",
  "is-defending",
  "is-dodging",
  "is-hit",
  "is-stunned",
  "is-special",
];

async function expectFramelessFighter(fighter: Locator) {
  const style = await fighter.evaluate((node) => {
    const computed = getComputedStyle(node);
    const before = getComputedStyle(node, "::before");

    return {
      borderTopWidth: computed.borderTopWidth,
      borderRightWidth: computed.borderRightWidth,
      borderBottomWidth: computed.borderBottomWidth,
      borderLeftWidth: computed.borderLeftWidth,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      boxShadow: computed.boxShadow,
      backgroundImage: computed.backgroundImage,
      backgroundColor: computed.backgroundColor,
      beforeDisplay: before.display,
    };
  });

  expect(style.borderTopWidth).toBe("0px");
  expect(style.borderRightWidth).toBe("0px");
  expect(style.borderBottomWidth).toBe("0px");
  expect(style.borderLeftWidth).toBe("0px");
  expect(style.outlineWidth).toBe("0px");
  expect(style.outlineStyle).toBe("none");
  expect(style.boxShadow).toBe("none");
  expect(style.backgroundImage).toBe("none");
  expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(style.beforeDisplay).toBe("none");
}

test("combat fighters never expose a rectangular frame in any presentation state", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });

  await page.addInitScript(() => {
    window.__BRIGADA_COMBAT_RNG__ = () => 0.999999;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "FIGHT", exact: true }).click();
  await page.getByRole("button", { name: "HARTZ — HIGH VOLTAGE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();
  await page.getByRole("button", { name: "COMBATTRE", exact: true }).click();

  const arena = page.locator(".arena-shell");
  await expect(arena).toHaveClass(/has-phaser-fighters/, { timeout: 5_000 });

  const fighters = [
    page.locator(".arena-left"),
    page.locator(".arena-right"),
  ];

  for (const fighter of fighters) {
    await expect(fighter).toHaveAttribute("data-renderer", "react-fallback-hidden");

    for (const [state, stateClass] of visualStates) {
      await fighter.evaluate(
        (node, payload) => {
          const element = node as HTMLElement;
          element.classList.remove(...payload.stateClasses);
          if (payload.stateClass) element.classList.add(payload.stateClass);
          element.dataset.regressionState = payload.state;
        },
        { state, stateClass, stateClasses },
      );

      await expect(fighter).toHaveAttribute("data-regression-state", state);
      await expectFramelessFighter(fighter);
    }
  }
});
