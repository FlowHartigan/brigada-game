import type { CSSProperties } from "react";
import type { FighterId } from "@/game/engine/types";
import { rosterImage } from "./rosterImage";

const art: Record<FighterId, { portraitX: number; x: number; width: number }> = {
  hartz: { portraitX: 375, x: 8, width: 304 },
  petoux: { portraitX: 536, x: 318, width: 304 },
  nexmos: { portraitX: 696, x: 632, width: 272 },
  kavaleur: { portraitX: 856, x: 908, width: 304 },
  korsair: { portraitX: 1016, x: 1212, width: 316 },
};

/** Display windows on the approved source: no redraw, mask, or distorted proportions. */
export function FighterArt({ id, portrait = false }: { id: FighterId; portrait?: boolean }) {
  const fighter = art[id];
  const width = portrait ? 148 : fighter.width;
  const height = portrait ? 126 : 410;
  const style = {
    "--art-width": `${1536 / width * 100}%`,
    "--art-left": `${-(portrait ? fighter.portraitX : fighter.x) / width * 100}%`,
    "--art-top": `${-(portrait ? 817 : 194) / height * 100}%`,
    "--art-ratio": `${width} / ${height}`,
  } as CSSProperties;
  return (
    <div className={portrait ? "roster-portrait" : "roster-sprite"} style={style} aria-hidden="true">
      <img src={rosterImage} alt="" draggable={false} />
    </div>
  );
}
