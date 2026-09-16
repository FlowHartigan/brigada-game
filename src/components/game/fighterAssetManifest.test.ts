import { describe, expect, it } from "vitest";
import { fighters } from "@/game/data/fighters";
import {
  fighterActionImage,
  type FighterActionVisualState,
} from "./fighterAnimationAssets";
import { fighterAssetManifest } from "./fighterAssetManifest";
import {
  fighterArtImage,
  fighterCardImage,
  fighterImage,
  fighterPortraitImage,
} from "./fighterImages";

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

const expectedNeutralSources = {
  hartz: {
    selection: "/fighters/hartz-v2/front.png",
    idle: "/fighters/hartz-v2/idle.png",
  },
  petoux: {
    selection: "/fighters/petoux-v2/front.png",
    idle: "/fighters/petoux-v2/idle.png",
  },
  nexmos: {
    selection: "/fighters/nexmos-v2/front.png",
    idle: "/fighters/nexmos-v2/idle.png",
  },
  kavaleur: {
    selection: "/fighters/kavaleur-v2/front.png",
    idle: "/fighters/kavaleur-v2/idle.png",
  },
  korsair: {
    selection: "/fighters/korsair-v2/front.png",
    idle: "/fighters/korsair-v2/idle.png",
  },
} as const;

describe("fighter asset manifest", () => {
  it("keeps every fighter neutral source on the approved current artwork", () => {
    for (const fighter of fighters) {
      const expected = expectedNeutralSources[fighter.id];
      expect(fighterAssetManifest[fighter.id].selection).toBe(expected.selection);
      expect(fighterAssetManifest[fighter.id].idle).toBe(expected.idle);
      expect(fighterArtImage(fighter.id)).toBe(expected.selection);
      expect(fighterImage(fighter.id)).toBe(expected.idle);
    }
  });

  it("routes PETOUX compact card through the side-profile v2 sprite", () => {
    expect(fighterArtImage("petoux")).toBe("/fighters/petoux-v2/front.png");
    expect(fighterImage("petoux")).toBe("/fighters/petoux-v2/idle.png");
    expect(fighterPortraitImage("petoux")).toBe("/fighters/petoux-v2/portrait.png");
    expect(fighterCardImage("petoux")).toBe("/fighters/petoux-v2/idle.png");
  });

  it("routes NEXMOS selection, card, portrait and idle through the v2 pack", () => {
    expect(fighterArtImage("nexmos")).toBe("/fighters/nexmos-v2/front.png");
    expect(fighterCardImage("nexmos")).toBe("/fighters/nexmos-v2/idle.png");
    expect(fighterPortraitImage("nexmos")).toBe("/fighters/nexmos-v2/portrait.png");
    expect(fighterImage("nexmos")).toBe("/fighters/nexmos-v2/idle.png");
  });

  it("provides every combat action through the same manifest", () => {
    for (const fighter of fighters) {
      const entry = fighterAssetManifest[fighter.id];
      expect(Object.keys(entry.actions).sort()).toEqual([...actionStates].sort());

      for (const state of actionStates) {
        expect(entry.actions[state]).toBeTruthy();
        expect(fighterActionImage(fighter.id, state)).toBe(entry.actions[state]);
      }
    }
  });
});
