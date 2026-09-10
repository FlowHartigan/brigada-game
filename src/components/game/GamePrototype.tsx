"use client";

import { useMemo, useState } from "react";
import { fighters, getFighter } from "@/game/data/fighters";
import { calculateGuardCapacity, calculateMaxHp } from "@/game/engine/formulas";
import type { CombatAction, FighterDefinition, FighterId } from "@/game/engine/types";

type Scene = "home" | "select" | "versus" | "fight";

const actionLabels: Record<CombatAction, string> = {
  attack: "ATTAQUE",
  defend: "DÉFENSE",
  dodge: "ESQUIVE",
  special: "SPÉCIAL",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <div className="stat-track" aria-hidden="true">
        <div className="stat-fill" style={{ width: `${value}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function FighterCard({
  fighter,
  onSelect,
}: {
  fighter: FighterDefinition;
  onSelect: (id: FighterId) => void;
}) {
  return (
    <button className="fighter-card" onClick={() => onSelect(fighter.id)}>
      <div className={`fighter-portrait fighter-${fighter.id}`} aria-hidden="true">
        <span>{fighter.name.slice(0, 1)}</span>
      </div>
      <div className="fighter-copy">
        <p className="eyebrow">{fighter.title}</p>
        <h2>{fighter.name}</h2>
        <p className="archetype">{fighter.archetype}</p>
        <div className="stats">
          <Stat label="FOR" value={fighter.stats.strength} />
          <Stat label="VIT" value={fighter.stats.vitality} />
          <Stat label="VIT." value={fighter.stats.speed} />
          <Stat label="DEF" value={fighter.stats.defense} />
        </div>
        <p className="tagline">« {fighter.tagline} »</p>
      </div>
    </button>
  );
}

export function GamePrototype() {
  const [scene, setScene] = useState<Scene>("home");
  const [selectedId, setSelectedId] = useState<FighterId | null>(null);
  const [opponentId, setOpponentId] = useState<FighterId | null>(null);
  const [lastAction, setLastAction] = useState<CombatAction | null>(null);

  const selected = useMemo(
    () => (selectedId ? getFighter(selectedId) : null),
    [selectedId],
  );
  const opponent = useMemo(
    () => (opponentId ? getFighter(opponentId) : null),
    [opponentId],
  );

  function selectFighter(id: FighterId) {
    const candidates = fighters.filter((fighter) => fighter.id !== id);
    const randomOpponent = candidates[Math.floor(Math.random() * candidates.length)];

    setSelectedId(id);
    setOpponentId(randomOpponent.id);
    setLastAction(null);
    setScene("versus");
  }

  function resetToSelect() {
    setSelectedId(null);
    setOpponentId(null);
    setLastAction(null);
    setScene("select");
  }

  if (scene === "home") {
    return (
      <section className="home-screen screen-panel">
        <div className="chalk-mark">0 + 0 = TECHNO</div>
        <div className="home-title">
          <p>LA BRIGADE</p>
          <h1>0+0=FIGHT</h1>
          <span>FIGHTING GAME · MOBILE WEB</span>
        </div>
        <button className="primary-cta" onClick={() => setScene("select")}>FIGHT</button>
        <p className="home-note">4 boutons. 5 combattants. Aucun répit.</p>
      </section>
    );
  }

  if (scene === "select") {
    return (
      <section className="select-screen screen-panel">
        <header className="screen-heading">
          <div>
            <p className="eyebrow">LA BRIGADE</p>
            <h1>CHOISIS TON COMBATTANT</h1>
          </div>
          <button className="text-button" onClick={() => setScene("home")}>RETOUR</button>
        </header>
        <div className="fighter-grid">
          {fighters.map((fighter) => (
            <FighterCard key={fighter.id} fighter={fighter} onSelect={selectFighter} />
          ))}
        </div>
      </section>
    );
  }

  if (!selected || !opponent) {
    return null;
  }

  if (scene === "versus") {
    return (
      <section className="versus-screen screen-panel">
        <div className="versus-fighter left">
          <div className={`versus-portrait fighter-${selected.id}`}>{selected.name[0]}</div>
          <p>{selected.title}</p>
          <h2>{selected.name}</h2>
        </div>
        <div className="versus-center">
          <span>RANDOM MATCH</span>
          <strong>VS</strong>
          <button className="primary-cta compact" onClick={() => setScene("fight")}>COMBATTRE</button>
        </div>
        <div className="versus-fighter right">
          <div className={`versus-portrait fighter-${opponent.id}`}>{opponent.name[0]}</div>
          <p>{opponent.title}</p>
          <h2>{opponent.name}</h2>
        </div>
      </section>
    );
  }

  const playerHp = calculateMaxHp(selected.stats.vitality);
  const opponentHp = calculateMaxHp(opponent.stats.vitality);
  const playerGuard = calculateGuardCapacity(selected.stats.defense);
  const opponentGuard = calculateGuardCapacity(opponent.stats.defense);

  return (
    <section className="fight-screen screen-panel">
      <header className="fight-hud">
        <div className="hud-fighter">
          <div className="hud-name"><strong>{selected.name}</strong><span>{playerHp} PV</span></div>
          <div className="health-track"><div className="health-fill" /></div>
          <div className="guard-label">GARDE {playerGuard}</div>
        </div>
        <div className="round-timer">60</div>
        <div className="hud-fighter opponent-hud">
          <div className="hud-name"><strong>{opponent.name}</strong><span>{opponentHp} PV</span></div>
          <div className="health-track"><div className="health-fill" /></div>
          <div className="guard-label">GARDE {opponentGuard}</div>
        </div>
      </header>

      <div className="arena-shell">
        <div className="blackboard">0 + 0 = TECHNO</div>
        <div className="speaker speaker-left" />
        <div className="speaker speaker-right" />
        <div className={`arena-fighter arena-left fighter-${selected.id}`}><span>{selected.name}</span></div>
        <div className={`arena-fighter arena-right fighter-${opponent.id}`}><span>{opponent.name}</span></div>
        <div className="arena-floor" />
        <div className="prototype-badge">PLACEHOLDER ARENA · PHASER NEXT</div>
      </div>

      <div className="fight-controls">
        <div className="control-cluster">
          {(["dodge", "defend"] as const).map((action) => (
            <button
              key={action}
              className={`fight-button ${lastAction === action ? "is-active" : ""}`}
              onPointerDown={() => setLastAction(action)}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
        <div className="combat-status">
          <span>PROTOTYPE INPUT</span>
          <strong>{lastAction ? actionLabels[lastAction] : "PRÊT"}</strong>
          <button className="text-button" onClick={resetToSelect}>CHANGER</button>
        </div>
        <div className="control-cluster primary-controls">
          {(["attack", "special"] as const).map((action) => (
            <button
              key={action}
              className={`fight-button ${action === "attack" ? "attack-button" : "special-button"} ${lastAction === action ? "is-active" : ""}`}
              onPointerDown={() => setLastAction(action)}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
