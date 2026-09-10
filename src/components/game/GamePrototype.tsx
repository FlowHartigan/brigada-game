"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fighters, getFighter } from "@/game/data/fighters";
import {
  advanceCombat,
  canPerformAction,
  createCombatState,
  getGuardPercent,
  getHealthPercent,
  getRemainingTimeMs,
  performCombatAction,
  setDefense,
  type CombatState,
  type CombatSide,
} from "@/game/engine/combat";
import {
  chooseOpponentAction,
  type RecentPlayerAction,
} from "@/game/engine/opponent-ai";
import type { CombatAction, FighterDefinition, FighterId } from "@/game/engine/types";

type Scene = "home" | "select" | "versus" | "fight" | "result";

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
          <Stat label="VIE" value={fighter.stats.vitality} />
          <Stat label="VIT" value={fighter.stats.speed} />
          <Stat label="DEF" value={fighter.stats.defense} />
        </div>
        <p className="tagline">« {fighter.tagline} »</p>
      </div>
    </button>
  );
}

function cooldownLabel(remainingMs: number): string {
  if (remainingMs <= 0) return "PRÊT";
  return `${(remainingMs / 1000).toFixed(1)}s`;
}

export function GamePrototype() {
  const [scene, setScene] = useState<Scene>("home");
  const [selectedId, setSelectedId] = useState<FighterId | null>(null);
  const [opponentId, setOpponentId] = useState<FighterId | null>(null);
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const playerHistoryRef = useRef<RecentPlayerAction[]>([]);

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
    setCombatState(null);
    playerHistoryRef.current = [];
    setScene("versus");
  }

  function startFight() {
    if (!selectedId || !opponentId) return;
    const now = Date.now();
    playerHistoryRef.current = [];
    setCombatState(createCombatState(selectedId, opponentId, now));
    setScene("fight");
  }

  function resetToSelect() {
    setSelectedId(null);
    setOpponentId(null);
    setCombatState(null);
    playerHistoryRef.current = [];
    setScene("select");
  }

  function recordPlayerAction(action: CombatAction, at: number) {
    playerHistoryRef.current = [...playerHistoryRef.current, { action, at }].slice(-8);
  }

  function playerAction(action: Exclude<CombatAction, "defend">) {
    const now = Date.now();
    setCombatState((current) => {
      if (!current) return current;
      const transition = performCombatAction(current, "player", action, now);
      if (transition.accepted) recordPlayerAction(action, now);
      return transition.state;
    });
  }

  function playerDefense(active: boolean) {
    const now = Date.now();
    setCombatState((current) => {
      if (!current) return current;
      const transition = setDefense(current, "player", active, now);
      if (active && transition.accepted) recordPlayerAction("defend", now);
      return transition.state;
    });
  }

  useEffect(() => {
    if (scene !== "fight") return;

    const tick = window.setInterval(() => {
      setCombatState((current) => {
        if (!current || current.status !== "active") return current;
        return advanceCombat(current, Date.now()).state;
      });
    }, 80);

    return () => window.clearInterval(tick);
  }, [scene]);

  useEffect(() => {
    if (scene !== "fight") return;

    const think = window.setInterval(() => {
      setCombatState((current) => {
        if (!current || current.status !== "active") return current;
        const now = Date.now();
        let working = setDefense(current, "opponent", false, now).state;
        const intent = chooseOpponentAction(
          working,
          playerHistoryRef.current,
          now,
          Math.random,
        );

        if (intent === "wait") return working;
        if (intent === "defend") {
          return setDefense(working, "opponent", true, now).state;
        }

        working = performCombatAction(
          working,
          "opponent",
          intent,
          now,
          Math.random,
        ).state;
        return working;
      });
    }, 560);

    return () => window.clearInterval(think);
  }, [scene]);

  useEffect(() => {
    if (scene === "fight" && combatState?.status === "finished") {
      setScene("result");
    }
  }, [combatState?.status, scene]);

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

  if (!selected || !opponent) return null;

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
          <button className="primary-cta compact" onClick={startFight}>COMBATTRE</button>
        </div>
        <div className="versus-fighter right">
          <div className={`versus-portrait fighter-${opponent.id}`}>{opponent.name[0]}</div>
          <p>{opponent.title}</p>
          <h2>{opponent.name}</h2>
        </div>
      </section>
    );
  }

  if (!combatState) return null;

  if (scene === "result") {
    const playerWon = combatState.winner === "player";
    const opponentWon = combatState.winner === "opponent";
    const winnerName = playerWon ? selected.name : opponentWon ? opponent.name : "ÉGALITÉ";

    return (
      <section className="result-screen screen-panel">
        <p className="eyebrow">{combatState.endReason === "timeout" ? "TIME" : "KO"}</p>
        <div className={`result-portrait fighter-${playerWon ? selected.id : opponent.id}`}>
          {playerWon ? selected.name[0] : opponent.name[0]}
        </div>
        <h1>{combatState.winner === "draw" ? "DRAW" : `${winnerName} WINS`}</h1>
        <p className="result-detail">
          {Math.round(combatState.player.hp)} PV · {Math.round(combatState.opponent.hp)} PV
        </p>
        <div className="result-actions">
          <button className="primary-cta compact" onClick={startFight}>REVANCHE</button>
          <button className="secondary-cta" onClick={resetToSelect}>CHANGER DE PERSONNAGE</button>
        </div>
      </section>
    );
  }

  const player = combatState.player;
  const enemy = combatState.opponent;
  const remainingSeconds = Math.ceil(getRemainingTimeMs(combatState) / 1000);
  const specialRemaining = Math.max(0, player.specialReadyAt - combatState.now);
  const dodgeRemaining = Math.max(0, player.dodgeReadyAt - combatState.now);
  const lastEvent = combatState.recentEvents[combatState.recentEvents.length - 1];
  const attackAvailable = canPerformAction(combatState, "player", "attack");
  const dodgeAvailable = canPerformAction(combatState, "player", "dodge");
  const specialAvailable = canPerformAction(combatState, "player", "special");
  const defendAvailable = canPerformAction(combatState, "player", "defend") || player.isDefending;

  function fighterVisualState(side: CombatSide): string {
    if (!combatState) return "";
    const runtime = combatState[side];
    const recent = Boolean(lastEvent && combatState.now - lastEvent.at < 360);
    const wasHit = Boolean(
      recent &&
      lastEvent?.target === side &&
      ["hit", "counter", "guard-break"].includes(lastEvent.type),
    );
    const usedSpecial = Boolean(
      recent &&
      lastEvent?.actor === side &&
      ["special", "counter-ready", "counter"].includes(lastEvent.type),
    );

    return [
      runtime.isDefending ? "is-defending" : "",
      runtime.invulnerableUntil > combatState.now ? "is-dodging" : "",
      runtime.stunnedUntil > combatState.now ? "is-stunned" : "",
      wasHit ? "is-hit" : "",
      usedSpecial ? "is-special" : "",
    ].filter(Boolean).join(" ");
  }

  return (
    <section className="fight-screen screen-panel">
      <header className="fight-hud">
        <div className="hud-fighter">
          <div className="hud-name"><strong>{selected.name}</strong><span>{Math.ceil(player.hp)} PV</span></div>
          <div className="health-track"><div className="health-fill" style={{ width: `${getHealthPercent(player)}%` }} /></div>
          <div className="guard-track"><div className="guard-fill" style={{ width: `${getGuardPercent(player)}%` }} /></div>
          <div className="guard-label">GARDE {Math.ceil(player.guard)}</div>
        </div>
        <div className="round-timer">{remainingSeconds}</div>
        <div className="hud-fighter opponent-hud">
          <div className="hud-name"><strong>{opponent.name}</strong><span>{Math.ceil(enemy.hp)} PV</span></div>
          <div className="health-track"><div className="health-fill" style={{ width: `${getHealthPercent(enemy)}%` }} /></div>
          <div className="guard-track opponent-guard"><div className="guard-fill" style={{ width: `${getGuardPercent(enemy)}%` }} /></div>
          <div className="guard-label">GARDE {Math.ceil(enemy.guard)}</div>
        </div>
      </header>

      <div className="arena-shell">
        <div className="blackboard">0 + 0 = TECHNO</div>
        <div className="speaker speaker-left" />
        <div className="speaker speaker-right" />
        <div className={`arena-fighter arena-left fighter-${selected.id} ${fighterVisualState("player")}`}><span>{selected.name}</span></div>
        <div className={`arena-fighter arena-right fighter-${opponent.id} ${fighterVisualState("opponent")}`}><span>{opponent.name}</span></div>
        <div className="arena-floor" />
        <div className="combat-callout" key={lastEvent?.id ?? 0}>{lastEvent?.message ?? "FIGHT!"}</div>
      </div>

      <div className="fight-controls">
        <div className="control-cluster">
          <button
            className="fight-button"
            disabled={!dodgeAvailable}
            onPointerDown={() => playerAction("dodge")}
          >
            <span>ESQUIVE</span>
            <small>{dodgeAvailable ? "PRÊT" : cooldownLabel(dodgeRemaining)}</small>
          </button>
          <button
            className={`fight-button defend-button ${player.isDefending ? "is-active" : ""}`}
            disabled={!defendAvailable}
            aria-pressed={player.isDefending}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              playerDefense(true);
            }}
            onPointerUp={() => playerDefense(false)}
            onPointerCancel={() => playerDefense(false)}
            onLostPointerCapture={() => playerDefense(false)}
          >
            <span>DÉFENSE</span>
            <small>MAINTENIR</small>
          </button>
        </div>
        <div className="combat-status">
          <span>{player.stunnedUntil > combatState.now ? "GUARD BREAK" : "COMBAT"}</span>
          <strong>{lastEvent?.type === "unavailable" ? "COOLDOWN" : lastEvent?.message ?? "PRÊT"}</strong>
          <button className="text-button" onClick={resetToSelect}>QUITTER</button>
        </div>
        <div className="control-cluster primary-controls">
          <button
            className="fight-button attack-button"
            disabled={!attackAvailable}
            onPointerDown={() => playerAction("attack")}
          >
            <span>ATTAQUE</span>
            <small>COMBO ×3</small>
          </button>
          <button
            className={`fight-button special-button ${specialAvailable ? "is-ready" : ""}`}
            disabled={!specialAvailable}
            onPointerDown={() => playerAction("special")}
          >
            <span>SPÉCIAL</span>
            <small>{specialAvailable ? selected.special.name : cooldownLabel(specialRemaining)}</small>
          </button>
        </div>
      </div>
    </section>
  );
}
