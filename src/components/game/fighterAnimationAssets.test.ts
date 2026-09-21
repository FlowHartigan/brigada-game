import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  FIGHTER_ACTION_STATES,
  fighterActionImage,
  fighterCanonicalSpriteState,
  fighterJumpImage,
  fighterPreloadStates,
  fighterSpriteImage,
} from "./fighterAnimationAssets";

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

  it("avoids a duplicate idle texture when no dedicated jump frame exists", () => {
    expect(fighterPreloadStates("hartz")).toContain("jump");

    for (const fighter of fighters.filter((candidate) => candidate.id !== "hartz")) {
      expect(fighterPreloadStates(fighter.id)).not.toContain("jump");
      expect(fighterSpriteImage(fighter.id, "jump")).toBe(
        `/fighters/${fighter.id}-v2/idle.png`,
      );
    }
  });

  it("shares Phaser textures when approved states reuse the same PNG", () => {
    for (const id of ["kavaleur", "korsair"] as const) {
      expect(fighterCanonicalSpriteState(id, "attack2")).toBe("attack1");
      expect(fighterCanonicalSpriteState(id, "attack3")).toBe("attack1");
      expect(fighterCanonicalSpriteState(id, "stunned")).toBe("hit");
      expect(fighterPreloadStates(id)).toEqual([
        "idle",
        "attack1",
        "defend",
        "dodge",
        "special",
        "hit",
        "win",
      ]);
    }

    expect(fighterPreloadStates("hartz")).toHaveLength(11);
    expect(fighterPreloadStates("petoux")).toHaveLength(10);
    expect(fighterPreloadStates("nexmos")).toHaveLength(10);
  });

  it("provides the approved combat visual source for every action of every fighter", () => {
    for (const fighter of fighters) {
      const frames = FIGHTER_ACTION_STATES.map((state) =>
        fighterActionImage(fighter.id, state),
      );

      if (
        fighter.id === "hartz" ||
        fighter.id === "petoux" ||
        fighter.id === "nexmos"
      ) {
        expect(frames).toEqual(
          FIGHTER_ACTION_STATES.map((state) => `/fighters/${fighter.id}-v2/${state}.png`),
        );
        for (const frame of frames) {
          expect(frame).toMatch(
            new RegExp(`^/fighters/${fighter.id}-v2/.+\\.png$`),
          );
        }
        expect(new Set(frames).size).toBe(FIGHTER_ACTION_STATES.length);
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
