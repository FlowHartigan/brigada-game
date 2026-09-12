"use client";

import { useEffect, useRef } from "react";
import type { CombatEvent, CombatSide } from "@/game/engine/combat";
import type { FighterId } from "@/game/engine/types";
import { impactFreezeDurationMs } from "./combatPresentationTiming";
import { fighterActionImage, type FighterSpriteState } from "./fighterAnimationAssets";
import { fighterImage } from "./fighterImages";

const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 360;
const PLAYER_X = 430;
const OPPONENT_X = 1170;
const FIGHTER_BASE_Y = 326;
const FIGHTER_HEIGHT = 258;
const IMPACT_Y = 220;

const FIGHTER_STATES: FighterSpriteState[] = [
  "idle",
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

type PhaserCombatStageProps = {
  lastEvent?: CombatEvent;
  playerId: FighterId;
  opponentId: FighterId;
  playerState: FighterSpriteState;
  opponentState: FighterSpriteState;
  onFightersReady?: (ready: boolean) => void;
};

type FighterPresentation = {
  player: FighterSpriteState;
  opponent: FighterSpriteState;
};

function sideX(side?: CombatSide): number {
  if (side === "player") return PLAYER_X;
  if (side === "opponent") return OPPONENT_X;
  return STAGE_WIDTH / 2;
}

function fighterTextureKey(id: FighterId, state: FighterSpriteState): string {
  return `brigada-fighter-${id}-${state}`;
}

function fighterTextureSource(id: FighterId, state: FighterSpriteState): string {
  return state === "idle" ? fighterImage(id) : fighterActionImage(id, state);
}

export function PhaserCombatStage({
  lastEvent,
  playerId,
  opponentId,
  playerState,
  opponentState,
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

  useEffect(() => {
    latestEventRef.current = lastEvent;
  }, [lastEvent]);

  useEffect(() => {
    fighterStateRef.current = {
      player: playerState,
      opponent: opponentState,
    };
  }, [playerState, opponentState]);

  useEffect(() => {
    readyCallbackRef.current = onFightersReady;
  }, [onFightersReady]);

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
        FIGHTER_STATES.map((state) => fighterTextureKey(id, state)),
      );

      class CombatBackdropScene extends Phaser.Scene {
        private playerSprite?: import("phaser").GameObjects.Image;
        private opponentSprite?: import("phaser").GameObjects.Image;
        private fightersReady = false;
        private fighterFreezeUntil = 0;

        constructor() {
          super("brigada-combat-backdrop");
        }

        preload() {
          for (const id of fighterIds) {
            for (const state of FIGHTER_STATES) {
              this.load.image(
                fighterTextureKey(id, state),
                fighterTextureSource(id, state),
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

          const background = this.add.graphics();
          background.fillStyle(0x171518, 1);
          background.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

          background.lineStyle(1, 0xffffff, 0.035);
          for (let x = 0; x <= STAGE_WIDTH; x += 48) {
            background.lineBetween(x, 0, x, STAGE_HEIGHT);
          }
          for (let y = 0; y <= STAGE_HEIGHT; y += 48) {
            background.lineBetween(0, y, STAGE_WIDTH, y);
          }

          this.add.circle(420, 40, 260, 0x742238, 0.12);
          this.add.circle(1220, 72, 230, 0x34304f, 0.1);

          const floor = this.add.graphics();
          floor.fillStyle(0x272321, 1);
          floor.fillRect(0, 270, STAGE_WIDTH, 90);
          floor.lineStyle(3, 0xffffff, 0.07);
          floor.lineBetween(0, 270, STAGE_WIDTH, 270);

          const board = this.add.graphics();
          board.fillStyle(0x57483b, 1);
          board.fillRoundedRect(560, 26, 480, 122, 6);
          board.fillStyle(0x18211e, 1);
          board.fillRoundedRect(572, 38, 456, 98, 2);

          this.add
            .text(STAGE_WIDTH / 2, 87, "0 + 0 = TECHNO", {
              color: "#e9e3d3",
              fontFamily: "Arial Black, Arial, sans-serif",
              fontSize: "38px",
              fontStyle: "bold",
            })
            .setOrigin(0.5);

          this.drawSpeaker(122, 178);
          this.drawSpeaker(STAGE_WIDTH - 190, 178);

          const light = this.add.graphics();
          light.fillStyle(0xd8ff3e, 0.035);
          light.fillTriangle(280, 0, 520, 0, 690, 300);
          light.fillStyle(0xff3f4f, 0.025);
          light.fillTriangle(1080, 0, 1320, 0, 910, 300);

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
            this.syncFighters();
          } else {
            stageHost.dataset.fightersReady = "false";
            readyCallbackRef.current?.(false);
          }
        }

        update() {
          if (this.fightersReady) this.syncFighters();

          const event = latestEventRef.current;
          if (!event || processedEventIdRef.current === event.id) return;

          processedEventIdRef.current = event.id;
          this.startImpactFreeze(event);

          const targetX = sideX(event.target);
          const actorX = sideX(event.actor);

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

        private syncFighters() {
          if (!this.playerSprite || !this.opponentSprite) return;
          if (this.time.now < this.fighterFreezeUntil) return;

          const playerVisual = fighterStateRef.current.player;
          const opponentVisual = fighterStateRef.current.opponent;

          this.syncFighterSprite(
            this.playerSprite,
            "player",
            playerId,
            playerVisual,
          );
          this.syncFighterSprite(
            this.opponentSprite,
            "opponent",
            opponentId,
            opponentVisual,
          );

          stageHost.dataset.playerState = playerVisual;
          stageHost.dataset.opponentState = opponentVisual;
          stageHost.dataset.playerTexture = fighterTextureKey(playerId, playerVisual);
          stageHost.dataset.opponentTexture = fighterTextureKey(opponentId, opponentVisual);
        }

        private syncFighterSprite(
          sprite: import("phaser").GameObjects.Image,
          side: CombatSide,
          id: FighterId,
          state: FighterSpriteState,
        ) {
          const textureKey = fighterTextureKey(id, state);
          if (sprite.texture.key !== textureKey && this.textures.exists(textureKey)) {
            sprite.setTexture(textureKey);
          }

          const direction = side === "player" ? 1 : -1;
          let x = sideX(side);
          let y = FIGHTER_BASE_Y;
          let alpha = 1;
          let rotation = 0;
          let targetHeight = FIGHTER_HEIGHT;

          if (state.startsWith("attack")) x += 18 * direction;
          if (state === "defend") x -= 10 * direction;
          if (state === "dodge") {
            x -= 36 * direction;
            alpha = 0.74;
            targetHeight *= 0.96;
          }
          if (state === "hit") {
            x -= 14 * direction;
            alpha = 0.84;
          }
          if (state === "stunned") {
            rotation = Math.sin(this.time.now / 34) * 0.025;
          }
          if (state === "special") {
            targetHeight *= 1.05;
            y -= 4;
          }

          const textureHeight = Math.max(1, sprite.height);
          const scale = targetHeight / textureHeight;

          sprite
            .setPosition(x, y)
            .setScale(scale)
            .setFlipX(side === "opponent")
            .setAlpha(alpha)
            .setRotation(rotation);
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

        private drawSpeaker(x: number, y: number) {
          const speaker = this.add.graphics();
          speaker.fillStyle(0x09090a, 1);
          speaker.fillRoundedRect(x, y, 68, 126, 6);
          speaker.lineStyle(2, 0x34343a, 1);
          speaker.strokeRoundedRect(x, y, 68, 126, 6);
          speaker.fillStyle(0x17171c, 1);
          speaker.fillCircle(x + 34, y + 36, 16);
          speaker.fillCircle(x + 34, y + 91, 23);
          speaker.lineStyle(2, 0x2e2e34, 1);
          speaker.strokeCircle(x + 34, y + 36, 16);
          speaker.strokeCircle(x + 34, y + 91, 23);
        }
      }

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: stageHost,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        backgroundColor: "#171518",
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
      data-player-fighter={playerId}
      data-opponent-fighter={opponentId}
      data-player-state={playerState}
      data-opponent-state={opponentState}
      aria-hidden="true"
    />
  );
}
