"use client";

import { memo, useEffect, useRef } from "react";
import type { CombatEvent, CombatSide } from "@/game/engine/combat";
import type { Facing } from "@/game/engine/spatial";
import type { FighterId } from "@/game/engine/types";
import { impactFreezeDurationMs } from "./combatPresentationTiming";
import {
  fighterCanonicalSpriteState,
  fighterPreloadStates,
  fighterSpriteImage,
  type FighterSpriteState,
} from "./fighterAnimationAssets";
import {
  COMBAT_FIGHTER_SCALE_MULTIPLIER,
  fighterCombatPresentation,
  fighterSourceBounds,
  FIGHTER_COMBAT_SCALE,
} from "./fighterPresentation";

const STAGE_WIDTH = 1600;
/**
 * Keep gameplay-to-pixel geometry on the historical 360px stage, but give
 * Phaser extra transparent render space above/below it. The camera scroll
 * compensates for Phaser's vertical centering so the arena ground stays at
 * exactly the same on-screen position.
 */
const GAMEPLAY_VERTICAL_SCALE = 360;
const RENDER_STAGE_HEIGHT = 480;
const RENDER_VERTICAL_PADDING = (RENDER_STAGE_HEIGHT - GAMEPLAY_VERTICAL_SCALE) / 2;
const FIGHTER_TOP_SAFE_MARGIN = 6;
const PLAYER_X = 430;
const OPPONENT_X = 1170;
const FIGHTER_BASE_Y = 326;
const BASE_FIGHTER_VISIBLE_HEIGHT = 154 * FIGHTER_COMBAT_SCALE;
const FIGHTER_VISIBLE_HEIGHT =
  BASE_FIGHTER_VISIBLE_HEIGHT * COMBAT_FIGHTER_SCALE_MULTIPLIER;
const IMPACT_Y = 220;

type PhaserCombatStageProps = {
  lastEvent?: CombatEvent;
  playerId: FighterId;
  opponentId: FighterId;
  playerState: FighterSpriteState;
  opponentState: FighterSpriteState;
  playerX: number;
  opponentX: number;
  playerY: number;
  opponentY: number;
  playerFacing: Facing;
  opponentFacing: Facing;
  onFightersReady?: (ready: boolean) => void;
};

type FighterPresentation = {
  player: FighterSpriteState;
  opponent: FighterSpriteState;
};

type VisibleTextureBounds = {
  height: number;
  bottomPadding: number;
};

function sideX(side?: CombatSide): number {
  if (side === "player") return PLAYER_X;
  if (side === "opponent") return OPPONENT_X;
  return STAGE_WIDTH / 2;
}

function fighterTextureKey(id: FighterId, state: FighterSpriteState): string {
  const textureState = fighterCanonicalSpriteState(id, state);
  return `brigada-fighter-${id}-${textureState}`;
}

function fighterTextureLabel(id: FighterId, state: FighterSpriteState): string {
  return `brigada-fighter-${id}-${state}`;
}

function PhaserCombatStageComponent({
  lastEvent,
  playerId,
  opponentId,
  playerState,
  opponentState,
  playerX,
  opponentX,
  playerY,
  opponentY,
  playerFacing,
  opponentFacing,
  onFightersReady,
}: PhaserCombatStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestEventRef = useRef<CombatEvent | undefined>(lastEvent);
  const processedEventIdRef = useRef<number | null>(null);
  const fighterStateRef = useRef<FighterPresentation>({
    player: playerState,
    opponent: opponentState,
  });
  const readyCallbackRef = useRef(onFightersReady);
  const fighterSyncVersionRef = useRef(0);
  const fighterPositionRef = useRef({
    player: { x: playerX, y: playerY, facing: playerFacing },
    opponent: { x: opponentX, y: opponentY, facing: opponentFacing },
  });

  useEffect(() => {
    latestEventRef.current = lastEvent;
  }, [lastEvent]);

  useEffect(() => {
    fighterStateRef.current = {
      player: playerState,
      opponent: opponentState,
    };
    fighterSyncVersionRef.current += 1;
  }, [playerState, opponentState]);

  useEffect(() => {
    readyCallbackRef.current = onFightersReady;
  }, [onFightersReady]);

  useEffect(() => {
    fighterPositionRef.current = {
      player: { x: playerX, y: playerY, facing: playerFacing },
      opponent: { x: opponentX, y: opponentY, facing: opponentFacing },
    };
    fighterSyncVersionRef.current += 1;
  }, [playerX, opponentX, playerY, opponentY, playerFacing, opponentFacing]);

  useEffect(() => {
    let game: import("phaser").Game | null = null;
    let cancelled = false;

    async function mountPhaser() {
      const Phaser = (await import("phaser")).default;
      const host = hostRef.current;

      if (cancelled || !host) return;
      const stageHost: HTMLDivElement = host;

      const fighterIds = [playerId, opponentId] as const;
      const requiredTextureKeys = fighterIds.flatMap((id) =>
        fighterPreloadStates(id).map((state) => fighterTextureKey(id, state)),
      );

      class CombatBackdropScene extends Phaser.Scene {
        private playerSprite?: import("phaser").GameObjects.Image;
        private opponentSprite?: import("phaser").GameObjects.Image;
        private fightersReady = false;
        private fighterFreezeUntil = 0;
        private lastFighterSyncVersion = -1;
        private readonly visibleBounds = new Map<string, VisibleTextureBounds>();

        constructor() {
          super("brigada-combat-backdrop");
        }

        preload() {
          for (const id of fighterIds) {
            for (const state of fighterPreloadStates(id)) {
              this.load.image(
                fighterTextureKey(id, state),
                fighterSpriteImage(id, state),
              );
            }
          }

          this.load.on("loaderror", (file: { key?: string }) => {
            if (!file.key?.startsWith("brigada-fighter-")) return;
            stageHost.dataset.fighterLoadError = file.key;
          });
        }

        create() {
          stageHost.dataset.hitStop = "idle";
          this.cameras.main.setScroll(0, -RENDER_VERTICAL_PADDING);

          this.fightersReady = requiredTextureKeys.every((key) =>
            this.textures.exists(key),
          );

          if (this.fightersReady) {
            this.playerSprite = this.add
              .image(
                PLAYER_X,
                FIGHTER_BASE_Y,
                fighterTextureKey(playerId, fighterStateRef.current.player),
              )
              .setOrigin(0.5, 1)
              .setDepth(10);

            this.opponentSprite = this.add
              .image(
                OPPONENT_X,
                FIGHTER_BASE_Y,
                fighterTextureKey(opponentId, fighterStateRef.current.opponent),
              )
              .setOrigin(0.5, 1)
              .setDepth(10);

            stageHost.dataset.fightersReady = "true";
            stageHost.dataset.playerFighter = playerId;
            stageHost.dataset.opponentFighter = opponentId;
            readyCallbackRef.current?.(true);
            this.syncFighters(true);
          } else {
            stageHost.dataset.fightersReady = "false";
            readyCallbackRef.current?.(false);
          }
        }

        update() {
          if (this.fightersReady) {
            this.syncFighters();
          } else {
            this.syncFallbackAnchors();
          }

          const event = latestEventRef.current;
          if (!event || processedEventIdRef.current === event.id) return;

          processedEventIdRef.current = event.id;
          this.startImpactFreeze(event);

          const targetX =
            event.target === "player"
              ? fighterPositionRef.current.player.x * STAGE_WIDTH
              : event.target === "opponent"
                ? fighterPositionRef.current.opponent.x * STAGE_WIDTH
                : STAGE_WIDTH / 2;
          const actorX =
            event.actor === "player"
              ? fighterPositionRef.current.player.x * STAGE_WIDTH
              : fighterPositionRef.current.opponent.x * STAGE_WIDTH;

          switch (event.type) {
            case "hit":
              this.cameras.main.shake(70, 0.0025);
              this.spawnImpactBurst(targetX, IMPACT_Y, 0xfff0be, 1);
              break;
            case "block":
              this.cameras.main.shake(55, 0.0015);
              this.spawnBlockRing(targetX, IMPACT_Y, 0xd5e6ff);
              this.spawnImpactBurst(targetX, IMPACT_Y, 0x9fc5ff, 0.65);
              break;
            case "guard-break":
              this.cameras.main.shake(150, 0.007);
              this.cameras.main.flash(90, 255, 231, 160, false);
              this.spawnGuardBreak(targetX, IMPACT_Y);
              break;
            case "special":
              this.cameras.main.shake(110, 0.004);
              this.cameras.main.flash(80, 216, 255, 62, false);
              this.spawnSpecialPulse(actorX, IMPACT_Y);
              break;
            case "counter":
              this.cameras.main.shake(115, 0.005);
              this.spawnImpactBurst(targetX, IMPACT_Y, 0xff67b7, 1.25);
              break;
            case "armor":
              this.spawnBlockRing(targetX, IMPACT_Y, 0xffd18c);
              break;
            case "ko":
              this.cameras.main.shake(240, 0.01);
              this.cameras.main.flash(140, 255, 63, 79, false);
              this.spawnKoWave(targetX, IMPACT_Y);
              break;
            default:
              break;
          }
        }

        private startImpactFreeze(event: CombatEvent) {
          const duration = impactFreezeDurationMs(event.type);
          if (duration <= 0) return;

          this.fighterFreezeUntil = Math.max(
            this.fighterFreezeUntil,
            this.time.now + duration,
          );

          const eventId = String(event.id);
          stageHost.dataset.hitStop = "active";
          stageHost.dataset.hitStopEvent = eventId;
          stageHost.dataset.lastHitStopType = event.type;
          stageHost.dataset.lastHitStopMs = String(duration);

          window.setTimeout(() => {
            if (
              !cancelled &&
              stageHost.dataset.hitStopEvent === eventId
            ) {
              stageHost.dataset.hitStop = "idle";
            }
          }, duration);
        }

        private syncFallbackAnchors() {
          const arena = stageHost.parentElement;
          const canvas = this.game.canvas;
          if (!arena || !canvas) return;

          const arenaRect = arena.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          if (canvasRect.width <= 0 || arenaRect.height <= 0) return;

          const displayScale = canvasRect.width / STAGE_WIDTH;
          const canvasLeft = canvasRect.left - arenaRect.left;
          const canvasTop = canvasRect.top - arenaRect.top;

          for (const side of ["player", "opponent"] as const) {
            const id = side === "player" ? playerId : opponentId;
            const state = fighterStateRef.current[side];
            const position = fighterPositionRef.current[side];
            const anchor = arena.querySelector<HTMLElement>(
              side === "player" ? ".arena-left" : ".arena-right",
            );
            if (!anchor) continue;

            const direction = position.facing;
            let x = position.x * STAGE_WIDTH;
            let y =
              FIGHTER_BASE_Y -
              position.y * GAMEPLAY_VERTICAL_SCALE;
            let targetVisibleHeight = FIGHTER_VISIBLE_HEIGHT;

            if (state.startsWith("attack")) x += 18 * direction;
            if (state === "defend") x -= 10 * direction;
            if (state === "dodge") {
              // Keep the DOM fallback frame at the historical anatomical scale.
              // The dodge PNG itself carries the crouched silhouette; shrinking
              // the whole fallback frame here would double-apply that reduction.
              x -= 36 * direction;
            }
            if (state === "hit") x -= 14 * direction;
            if (state === "special") {
              targetVisibleHeight *= 1.05;
              y -= 4;
            }

            const requestedTextureKey = fighterTextureKey(id, state);
            const textureKey = this.textures.exists(requestedTextureKey)
              ? requestedTextureKey
              : fighterTextureKey(id, "idle");
            if (!this.textures.exists(textureKey)) continue;

            const bounds = this.measureVisibleBounds(textureKey);
            const presentation = fighterCombatPresentation[id];
            const referenceHeight =
              id === "hartz"
                ? fighterSourceBounds.hartz.visibleHeight
                : bounds.height;
            const scale =
              (targetVisibleHeight / referenceHeight) * presentation.scale;

            x += presentation.offsetX * direction;
            y += bounds.bottomPadding * scale + presentation.offsetY;

            const texture = this.textures.get(textureKey);
            const source = texture.getSourceImage() as CanvasImageSource & {
              width?: number;
              height?: number;
            };
            const sourceWidth = Math.max(1, Number(source.width) || 1);
            const sourceHeight = Math.max(1, Number(source.height) || 1);

            const renderX =
              canvasLeft + x * displayScale;
            const renderFrameBottomY =
              canvasTop +
              (y + RENDER_VERTICAL_PADDING) * displayScale;
            const renderBottom = arenaRect.height - renderFrameBottomY;

            anchor.style.setProperty("--fighter-render-left", `${renderX}px`);
            anchor.style.setProperty("--fighter-render-bottom", `${renderBottom}px`);
            anchor.style.setProperty(
              "--fighter-render-frame-width",
              `${sourceWidth * scale * displayScale}px`,
            );
            anchor.style.setProperty(
              "--fighter-render-frame-height",
              `${sourceHeight * scale * displayScale}px`,
            );
            anchor.classList.add("is-phaser-fallback-aligned");
          }
        }

        private syncFighters(force = false) {
          if (!this.playerSprite || !this.opponentSprite) return;

          const playerVisual = fighterStateRef.current.player;
          const opponentVisual = fighterStateRef.current.opponent;
          const syncVersion = fighterSyncVersionRef.current;
          const metadataChanged = syncVersion !== this.lastFighterSyncVersion;
          const hasContinuousAnimation =
            playerVisual === "stunned" || opponentVisual === "stunned";

          if (!force && !metadataChanged && !hasContinuousAnimation) return;
          if (this.time.now < this.fighterFreezeUntil) return;

          const playerMetrics = this.syncFighterSprite(
            this.playerSprite,
            "player",
            playerId,
            playerVisual,
          );
          const opponentMetrics = this.syncFighterSprite(
            this.opponentSprite,
            "opponent",
            opponentId,
            opponentVisual,
          );

          if (force || metadataChanged) {
            stageHost.dataset.playerState = playerVisual;
            stageHost.dataset.opponentState = opponentVisual;
            stageHost.dataset.playerTexture = fighterTextureLabel(playerId, playerVisual);
            stageHost.dataset.opponentTexture = fighterTextureLabel(opponentId, opponentVisual);
            stageHost.dataset.playerVisibleHeight = String(playerMetrics.visibleHeight);
            stageHost.dataset.opponentVisibleHeight = String(opponentMetrics.visibleHeight);
            stageHost.dataset.playerGroundY = String(playerMetrics.groundY);
            stageHost.dataset.opponentGroundY = String(opponentMetrics.groundY);
            stageHost.dataset.playerVisibleTop = String(playerMetrics.visibleTop);
            stageHost.dataset.playerVisibleBottom = String(playerMetrics.visibleBottom);
            stageHost.dataset.opponentVisibleTop = String(opponentMetrics.visibleTop);
            stageHost.dataset.opponentVisibleBottom = String(opponentMetrics.visibleBottom);
          }

          this.lastFighterSyncVersion = syncVersion;
        }

        private syncFighterSprite(
          sprite: import("phaser").GameObjects.Image,
          side: CombatSide,
          id: FighterId,
          state: FighterSpriteState,
        ): {
          visibleHeight: number;
          groundY: number;
          visibleTop: number;
          visibleBottom: number;
        } {
          const textureKey = fighterTextureKey(id, state);
          if (sprite.texture.key !== textureKey && this.textures.exists(textureKey)) {
            sprite.setTexture(textureKey);
          }

          const direction = fighterPositionRef.current[side].facing;
          let x = fighterPositionRef.current[side].x * STAGE_WIDTH;
          let y =
            FIGHTER_BASE_Y -
            fighterPositionRef.current[side].y * GAMEPLAY_VERTICAL_SCALE;
          let alpha = 1;
          let rotation = 0;
          let targetVisibleHeight = FIGHTER_VISIBLE_HEIGHT;

          if (state.startsWith("attack")) x += 18 * direction;
          if (state === "defend") x -= 10 * direction;
          if (state === "dodge") {
            x -= 36 * direction;
            alpha = 0.74;
            targetVisibleHeight *= 0.96;
          }
          if (state === "hit") {
            x -= 14 * direction;
            alpha = 0.84;
          }
          if (state === "stunned") {
            rotation = Math.sin(this.time.now / 34) * 0.025;
          }
          if (state === "special") {
            targetVisibleHeight *= 1.05;
            y -= 4;
          }

          const bounds = this.measureVisibleBounds(textureKey);
          const presentation = fighterCombatPresentation[id];
          // HARTZ poses share one anatomical scale, including crouches and raised arms.
          const referenceHeight = id === "hartz" ? fighterSourceBounds.hartz.visibleHeight : bounds.height;
          const scale = (targetVisibleHeight / referenceHeight) * presentation.scale;
          x += presentation.offsetX * direction;
          y += bounds.bottomPadding * scale + presentation.offsetY;

          sprite
            .setPosition(x, y)
            .setScale(scale)
            .setFlipX(direction === -1)
            .setAlpha(alpha)
            .setRotation(rotation);

          const visibleHeight = bounds.height * scale;
          const groundY = y - bounds.bottomPadding * scale;
          // Phaser world coordinates can now go slightly negative. Camera scroll
          // maps them into the transparent render padding without changing the
          // historical gameplay geometry or the on-screen ground line.
          const visibleTop = groundY - visibleHeight + RENDER_VERTICAL_PADDING;
          const visibleBottom = groundY + RENDER_VERTICAL_PADDING;

          return {
            visibleHeight,
            groundY,
            visibleTop,
            visibleBottom,
          };
        }

        private measureVisibleBounds(textureKey: string): VisibleTextureBounds {
          const cached = this.visibleBounds.get(textureKey);
          if (cached) return cached;

          const texture = this.textures.get(textureKey);
          const source = texture.getSourceImage() as CanvasImageSource & {
            width?: number;
            height?: number;
          };
          const width = Math.max(1, Number(source.width) || 1);
          const height = Math.max(1, Number(source.height) || 1);
          const fallback = { height, bottomPadding: 0 };

          try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) return fallback;
            context.drawImage(source, 0, 0, width, height);
            const alpha = context.getImageData(0, 0, width, height).data;
            let minY = height;
            let maxY = -1;
            for (let yIndex = 0; yIndex < height; yIndex += 1) {
              for (let xIndex = 0; xIndex < width; xIndex += 1) {
                if (alpha[(yIndex * width + xIndex) * 4 + 3] < 8) continue;
                minY = Math.min(minY, yIndex);
                maxY = Math.max(maxY, yIndex);
              }
            }
            const measured = maxY >= minY
              ? { height: maxY - minY + 1, bottomPadding: height - maxY - 1 }
              : fallback;
            this.visibleBounds.set(textureKey, measured);
            return measured;
          } catch {
            return fallback;
          }
        }

        private spawnImpactBurst(
          x: number,
          y: number,
          color: number,
          intensity: number,
        ) {
          const angles = [-70, -42, -18, 12, 38, 67, 112, 150, 196, 232];

          for (const degrees of angles) {
            const radians = (degrees * Math.PI) / 180;
            const distance = (42 + (Math.abs(degrees) % 3) * 14) * intensity;
            const shard = this.add
              .rectangle(x, y, 26 * intensity, 5, color, 0.92)
              .setRotation(radians)
              .setDepth(20);

            this.tweens.add({
              targets: shard,
              x: x + Math.cos(radians) * distance,
              y: y + Math.sin(radians) * distance,
              alpha: 0,
              scaleX: 0.25,
              duration: 145 + Math.abs(degrees % 40),
              ease: "Cubic.Out",
              onComplete: () => shard.destroy(),
            });
          }

          const core = this.add.circle(x, y, 20 * intensity, color, 0.72).setDepth(19);
          this.tweens.add({
            targets: core,
            scale: 2.1,
            alpha: 0,
            duration: 120,
            ease: "Quad.Out",
            onComplete: () => core.destroy(),
          });
        }

        private spawnBlockRing(x: number, y: number, color: number) {
          const ring = this.add
            .circle(x, y, 32, 0x000000, 0)
            .setStrokeStyle(6, color, 0.88)
            .setDepth(18);

          this.tweens.add({
            targets: ring,
            scale: 2.25,
            alpha: 0,
            duration: 190,
            ease: "Cubic.Out",
            onComplete: () => ring.destroy(),
          });
        }

        private spawnGuardBreak(x: number, y: number) {
          this.spawnImpactBurst(x, y, 0xffe7a0, 1.55);

          for (const radius of [42, 68]) {
            const ring = this.add
              .circle(x, y, radius, 0x000000, 0)
              .setStrokeStyle(7, 0xffefb0, 0.78)
              .setDepth(17);

            this.tweens.add({
              targets: ring,
              scale: 2.7,
              alpha: 0,
              duration: 260 + radius,
              ease: "Cubic.Out",
              onComplete: () => ring.destroy(),
            });
          }
        }

        private spawnSpecialPulse(x: number, y: number) {
          for (const [index, radius] of [32, 58, 86].entries()) {
            const pulse = this.add
              .circle(x, y, radius, 0xd8ff3e, 0.04)
              .setStrokeStyle(5, 0xd8ff3e, 0.62)
              .setDepth(16);

            this.tweens.add({
              targets: pulse,
              scale: 2.4,
              alpha: 0,
              duration: 260 + index * 70,
              delay: index * 28,
              ease: "Sine.Out",
              onComplete: () => pulse.destroy(),
            });
          }
        }

        private spawnKoWave(x: number, y: number) {
          this.spawnImpactBurst(x, y, 0xff3f4f, 1.8);

          const wave = this.add
            .circle(x, y, 48, 0xff3f4f, 0.08)
            .setStrokeStyle(10, 0xff3f4f, 0.76)
            .setDepth(15);

          this.tweens.add({
            targets: wave,
            scale: 5.2,
            alpha: 0,
            duration: 420,
            ease: "Cubic.Out",
            onComplete: () => wave.destroy(),
          });
        }
      }

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: stageHost,
        width: STAGE_WIDTH,
        height: RENDER_STAGE_HEIGHT,
        transparent: true,
        pixelArt: true,
        audio: { noAudio: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: CombatBackdropScene,
      });
    }

    void mountPhaser();

    return () => {
      cancelled = true;
      readyCallbackRef.current?.(false);
      game?.destroy(true);
    };
  }, [opponentId, playerId]);

  return (
    <div
      ref={hostRef}
      className="phaser-combat-stage"
      data-testid="phaser-combat-stage"
      data-presentation="fighter-rendering-v1"
      data-background-layer="css-arena"
      data-player-fighter={playerId}
      data-opponent-fighter={opponentId}
      data-player-state={playerState}
      data-opponent-state={opponentState}
      data-player-x={playerX.toFixed(4)}
      data-opponent-x={opponentX.toFixed(4)}
      data-player-y={playerY.toFixed(4)}
      data-opponent-y={opponentY.toFixed(4)}
      data-player-facing={String(playerFacing)}
      data-opponent-facing={String(opponentFacing)}
      data-combat-scale-multiplier={String(COMBAT_FIGHTER_SCALE_MULTIPLIER)}
      data-base-fighter-visible-height={BASE_FIGHTER_VISIBLE_HEIGHT.toFixed(4)}
      data-target-fighter-visible-height={FIGHTER_VISIBLE_HEIGHT.toFixed(4)}
      data-stage-height={String(RENDER_STAGE_HEIGHT)}
      data-gameplay-vertical-scale={String(GAMEPLAY_VERTICAL_SCALE)}
      data-render-vertical-padding={String(RENDER_VERTICAL_PADDING)}
      data-fighter-top-safe-margin={String(FIGHTER_TOP_SAFE_MARGIN)}
      aria-hidden="true"
    />
  );
}