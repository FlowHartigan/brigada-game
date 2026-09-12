"use client";

import { useEffect, useRef } from "react";
import type { CombatEvent } from "@/game/engine/combat";

const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 360;

type PhaserCombatStageProps = {
  lastEvent?: CombatEvent;
};

export function PhaserCombatStage({ lastEvent }: PhaserCombatStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestEventRef = useRef<CombatEvent | undefined>(lastEvent);
  const processedEventIdRef = useRef<number | null>(null);

  useEffect(() => {
    latestEventRef.current = lastEvent;
  }, [lastEvent]);

  useEffect(() => {
    let game: import("phaser").Game | null = null;
    let cancelled = false;

    async function mountPhaser() {
      const Phaser = (await import("phaser")).default;
      const parent = hostRef.current;

      if (cancelled || !parent) return;

      class CombatBackdropScene extends Phaser.Scene {
        constructor() {
          super("brigada-combat-backdrop");
        }

        create() {
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
        }

        update() {
          const event = latestEventRef.current;
          if (!event || processedEventIdRef.current === event.id) return;

          processedEventIdRef.current = event.id;

          switch (event.type) {
            case "hit":
              this.cameras.main.shake(70, 0.0025);
              break;
            case "block":
              this.cameras.main.shake(55, 0.0015);
              break;
            case "guard-break":
              this.cameras.main.shake(150, 0.007);
              this.cameras.main.flash(90, 255, 231, 160, false);
              break;
            case "special":
              this.cameras.main.shake(110, 0.004);
              this.cameras.main.flash(80, 216, 255, 62, false);
              break;
            case "ko":
              this.cameras.main.shake(240, 0.01);
              this.cameras.main.flash(140, 255, 63, 79, false);
              break;
            default:
              break;
          }
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
        parent,
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
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="phaser-combat-stage"
      data-testid="phaser-combat-stage"
      aria-hidden="true"
    />
  );
}
