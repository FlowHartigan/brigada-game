import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  fighterActionImage,
  fighterJumpImage,
  type FighterActionVisualState,
} from "./fighterAnimationAssets";

const actionStates: readonly FighterActionVisualState[] = [
  "attack1",
  "attack2",
  "attack3",
  "defend",
  "dodge",
  "special",
  "hit",
  "stunned",
  "win",
];

function refreshedPngExpected(id: "kavaleur" | "korsair") {
  const root = `/fighters/${id}-v2`;
  return [
    `${root}/attack.png`,
    `${root}/attack.png`,
    `${root}/attack.png`,
    `${root}/defend.png`,
    `${root}/dodge.png`,
    `${root}/special.png`,
    `${root}/hit.png`,
    `${root}/hit.png`,
    `${root}/win.png`,
  ];
}

describe("fighter animation assets", () => {
  it("uses HARTZ's approved jump frame without changing the other fighters' current art", () => {
    expect(fighterJumpImage("hartz")).toBe("/fighters/hartz-v2/jump.png");

    for (const fighter of fighters.filter((candidate) => candidate.id !== "hartz")) {
      expect(fighterJumpImage(fighter.id)).toBe(`/fighters/${fighter.id}-v2/idle.png`);
    }
  });

  it("provides the approved combat visual source for every action of every fighter", () => {
    for (const fighter of fighters) {
      const frames = actionStates.map((state) =>
        fighterActionImage(fighter.id, state),
      );

      if (
        fighter.id === "hartz" ||
        fighter.id === "petoux" ||
        fighter.id === "nexmos"
      ) {
        expect(frames).toEqual(
          actionStates.map((state) => `/fighters/${fighter.id}-v2/${state}.png`),
        );
        for (const frame of frames) {
          expect(frame).toMatch(
            new RegExp(`^/fighters/${fighter.id}-v2/.+\\.png$`),
          );
        }
        expect(new Set(frames).size).toBe(actionStates.length);
        continue;
      }

      if (fighter.id === "kavaleur" || fighter.id === "korsair") {
        expect(frames).toEqual(refreshedPngExpected(fighter.id));
        for (const frame of frames) {
          expect(frame).toMatch(
            new RegExp(`^/fighters/${fighter.id}-v2/.+\\.png$`),
          );
        }
        expect(new Set(frames).size).toBe(6);
        continue;
      }

      expect.unreachable(`Unhandled fighter ${fighter.id}`);
    }
  });
});
