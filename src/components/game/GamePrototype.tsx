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
import { runtimeCombatRng } from "@/game/runtimeRng";

import { FighterArt } from "./FighterArt";
import { FighterSprite } from "./FighterSprite";
import { PhaserCombatStage } from "./PhaserCombatStage";
import { resolveFighterSpriteState } from "./fighterSpriteState";

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

const fighterAccents: Record<FighterId, string> = {
  hartz: "#acd6e7",
  petoux: "#e9c9a4",
  nexmos: "#ff493d",
  kavaleur: "#ff69b2",
  korsair: "#e7aa54",
};

function FighterCard({
  fighter,
  active,
  onSelect,
}: {
  fighter: FighterDefinition;
  active: boolean;
  onSelect: (id: FighterId) => void;
}) {
  return (
    <button
      className={`fighter-card${active ? " is-selected" : ""}`}
      style={{ "--fighter-accent": fighterAccents[fighter.id] } as React.CSSProperties}
      aria-pressed={active}
      aria-label={`${fighter.name} — ${fighter.title}`}
      onClick={() => onSelect(fighter.id)}
    >
      <div className="fighter-portrait">
        <FighterArt id={fighter.id} portrait />
      </div>
      <div className="fighter-card-label">
        <strong>{fighter.name}</strong>
        <span>{fighter.title}</span>
      </div>
      {active && (
        <span className="selection-marker" aria-hidden="true">
          P1
        </span>
      )}
    </button>
  );
}

function cooldownLabel(remainingMs: number): string {
  if (remainingMs <= 0) return "PRÊT";
  return `${(remainingMs / 1000).toFixed(1)}s`;
}

export function GamePrototype() {
  const [scene, setScene] = useState<Scene>("home");
  const [previewId, setPreviewId] = useState<FighterId>("hartz");
  const [selectedId, setSelectedId] = useState<FighterId | null>(null);
  const [opponentId, setOpponentId] = useState<FighterId | null>(null);
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [phaserFightersReady, setPhaserFightersReady] = useState(false);
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
    const randomOpponent =
      candidates[Math.floor(runtimeCombatRng() * candidates.length)];

    setSelectedId(id);
    setOpponentId(randomOpponent.id);
    setCombatState(null);
    setPhaserFightersReady(false);
    playerHistoryRef.current = [];
    setScene("versus");
  }

  function startFight() {
    if (!selectedId || !opponentId) return;
    const now = Date.now();
    playerHistoryRef.current = [];
    setPhaserFightersReady(false);
    setCombatState(createCombatState(selectedId, opponentId, now));
    setScene("fight");
  }

  function resetToSelect() {
    setSelectedId(null);
    setOpponentId(null);
    setCombatState(null);
    setPhaserFightersReady(false);
    playerHistoryRef.current = [];
    setScene("select");
  }

  function recordPlayerAction(action: CombatAction, at: number) {
    playerHistoryRef.current = [
      ...playerHistoryRef.current,
      { action, at },
    ].slice(-8);
  }

  function playerAction(action: Exclude<CombatAction, "defend">) {
    const now = Date.now();
    setCombatState((current) => {
      if (!current) return current;
      const transition = performCombatAction(
        current,
        "player",
        action,
        now,
        runtimeCombatRng,
      );
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
          runtimeCombatRng,
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
          runtimeCombatRng,
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
          <h1>BRIGADA FIGHT</h1>
          <span>FIGHTING GAME · MOBILE WEB</span>
        </div>
        <button className="primary-cta" onClick={() => setScene("select")}>
          FIGHT
        </button>
        <p className="home-note">4 boutons. 5 combattants. Aucun répit.</p>
      </section>
    );
  }

  if (scene === "select") {
    const preview = getFighter(previewId);
    return (
      <section
        className="select-screen screen-panel"
        style={{ "--fighter-accent": fighterAccents[preview.id] } as React.CSSProperties}
      >
        <header className="screen-heading">
          <div>
            <p className="eyebrow">BRIGADA FIGHT</p>
            <h1>CHOISIS TON COMBATTANT</h1>
          </div>
          <button className="text-button" onClick={() => setScene("home")}>
            RETOUR
          </button>
        </header>
        <div className="selection-detail" key={preview.id}>
          <div className="selection-showcase" aria-hidden="true">
            <span className="showcase-number">
              0{fighters.findIndex((fighter) => fighter.id === preview.id) + 1}
            </span>
            <FighterArt id={preview.id} />
          </div>
          <div className="selection-info" aria-live="polite" aria-atomic="true">
            <div className="selection-name">
              <p>{preview.title}</p>
              <h2>{preview.name}</h2>
            </div>
            <div className="selection-stats">
              <Stat label="Force" value={preview.stats.strength} />
              <Stat label="Vitalité" value={preview.stats.vitality} />
              <Stat label="Vitesse" value={preview.stats.speed} />
              <Stat label="Défense" value={preview.stats.defense} />
            </div>
            <div className="selection-special">
              <span>SPÉCIALITÉ</span>
              <strong>{preview.special.name}</strong>
              <p>{preview.special.description}</p>
            </div>
            <button
              className="primary-cta selection-confirm"
              onClick={() => selectFighter(preview.id)}
            >
              COMBATTRE <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div className="fighter-grid" role="group" aria-label="Les cinq combattants">
          {fighters.map((fighter) => (
            <FighterCard
              key={fighter.id}
              fighter={fighter}
              active={previewId === fighter.id}
              onSelect={setPreviewId}
            />
          ))}
        </div>
        <div className="selection-footer">
          <span>LA BRIGADE · SAME CREW. DIFFERENT MOVES.</span>
          <span>0 + 0 = TECHNO</span>
        </div>
      </section>
    );
  }

  if (!selected || !opponent) return null;

  if (scene === "versus") {
    return (
      <section className="versus-screen screen-panel">
        <div className="versus-fighter left">
          <div className={`versus-portrait fighter-${selected.id}`}>
            <FighterSprite
              id={selected.id}
              label={selected.name}
              className="versus-sprite"
            />
          </div>
          <p>{selected.title}</p>
          <h2>{selected.name}</h2>
        </div>
        <div className="versus-center">
          <span>RANDOM MATCH</span>
          <strong>VS</strong>
          <button className="primary-cta compact" onClick={startFight}>
            COMBATTRE
          </button>
        </div>
        <div className="versus-fighter right">
          <div className={`versus-portrait fighter-${opponent.id}`}>
            <FighterSprite
              id={opponent.id}
              label={opponent.name}
              className="versus-sprite"
            />
          </div>
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
    const winnerName = playerWon
      ? selected.name
      : opponentWon
        ? opponent.name
        : "ÉGALITÉ";
    const winnerId = playerWon ? selected.id : opponent.id;

    return (
      <section className="result-screen screen-panel">
        <p className="eyebrow">
          {combatState.endReason === "timeout" ? "TIME" : "KO"}
        </p>
        <div className={`result-portrait fighter-${winnerId}`}>
          <FighterSprite
            id={winnerId}
            state={combatState.winner === "draw" ? "idle" : "win"}
            label={winnerName}
            className="result-sprite"
          />
        </div>
        <h1>
          {combatState.winner === "draw" ? "DRAW" : `${winnerName} WINS`}
        </h1>
        <p className="result-detail">
          {Math.round(combatState.player.hp)} PV · {Math.round(combatState.opponent.hp)} PV
        </p>
        <div className="result-actions">
          <button className="primary-cta compact" onClick={startFight}>
            REVANCHE
          </button>
          <button className="secondary-cta" onClick={resetToSelect}>
            CHANGER DE PERSONNAGE
          </button>
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
  const defendAvailable =
    canPerformAction(combatState, "player", "defend") || player.isDefending;
  const playerSpriteState = resolveFighterSpriteState(combatState, "player");
  const opponentSpriteState = resolveFighterSpriteState(combatState, "opponent");

  function fighterVisualState(side: CombatSide): string {
    const visualState = side === "player" ? playerSpriteState : opponentSpriteState;

    return [
      visualState === "defend" ? "is-defending" : "",
      visualState === "dodge" ? "is-dodging" : "",
      visualState === "stunned" ? "is-stunned" : "",
      visualState === "hit" ? "is-hit" : "",
      visualState === "special" ? "is-special" : "",
      visualState.startsWith("attack") ? "is-attacking" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <section className="fight-screen screen-panel">
      <header className="fight-hud">
        <div className="hud-fighter">
          <div className="hud-name">
            <strong>{selected.name}</strong>
            <span>{Math.ceil(player.hp)} PV</span>
          </div>
          <div className="health-track">
            <div
              className="health-fill"
              style={{ width: `${getHealthPercent(player)}%` }}
            />
          </div>
          <div className="guard-track">
            <div
              className="guard-fill"
              style={{ width: `${getGuardPercent(player)}%` }}
            />
          </div>
          <div className="guard-label">GARDE {Math.ceil(player.guard)}</div>
        </div>
        <div className="round-timer">{remainingSeconds}</div>
        <div className="hud-fighter opponent-hud">
          <div className="hud-name">
            <strong>{opponent.name}</strong>
            <span>{Math.ceil(enemy.hp)} PV</span>
          </div>
          <div className="health-track">
            <div
              className="health-fill"
              style={{ width: `${getHealthPercent(enemy)}%` }}
            />
          </div>
          <div className="guard-track opponent-guard">
            <div
              className="guard-fill"
              style={{ width: `${getGuardPercent(enemy)}%` }}
            />
          </div>
          <div className="guard-label">GARDE {Math.ceil(enemy.guard)}</div>
        </div>
      </header>

      <div className={`arena-shell${phaserFightersReady ? " has-phaser-fighters" : ""}`}>
        <PhaserCombatStage
          lastEvent={lastEvent}
          playerId={selected.id}
          opponentId={opponent.id}
          playerState={playerSpriteState}
          opponentState={opponentSpriteState}
          onFightersReady={setPhaserFightersReady}
        />
        <div
          className={`arena-fighter arena-left fighter-${selected.id} ${fighterVisualState("player")}`}
          data-renderer={phaserFightersReady ? "react-fallback-hidden" : "react-fallback"}
        >
          <FighterSprite
            id={selected.id}
            state={playerSpriteState}
            label={selected.name}
            className="arena-sprite"
          />
          <span>{selected.name}</span>
        </div>
        <div
          className={`arena-fighter arena-right fighter-${opponent.id} ${fighterVisualState("opponent")}`}
          data-renderer={phaserFightersReady ? "react-fallback-hidden" : "react-fallback"}
        >
          <FighterSprite
            id={opponent.id}
            state={opponentSpriteState}
            label={opponent.name}
            className="arena-sprite"
          />
          <span>{opponent.name}</span>
        </div>
        <div className="combat-callout" key={lastEvent?.id ?? 0}>
          {lastEvent?.message ?? "FIGHT!"}
        </div>
      </div>

      <div className="fight-controls">
        <div className="control-cluster">
          <button
            className="fight-button"
            disabled={!dodgeAvailable}
            onPointerDown={() => playerAction("dodge")}
          >
            <span>{actionLabels.dodge}</span>
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
            <span>{actionLabels.defend}</span>
            <small>MAINTENIR</small>
          </button>
        </div>
        <div className="combat-status">
          <span>
            {player.stunnedUntil > combatState.now ? "GUARD BREAK" : "COMBAT"}
          </span>
          <strong>
            {lastEvent?.type === "unavailable"
              ? "COOLDOWN"
              : lastEvent?.message ?? "PRÊT"}
          </strong>
          <button className="text-button" onClick={resetToSelect}>
            QUITTER
          </button>
        </div>
        <div className="control-cluster primary-controls">
          <button
            className="fight-button attack-button"
            disabled={!attackAvailable}
            onPointerDown={() => playerAction("attack")}
          >
            <span>{actionLabels.attack}</span>
            <small>COMBO ×3</small>
          </button>
          <button
            className={`fight-button special-button ${specialAvailable ? "is-ready" : ""}`}
            disabled={!specialAvailable}
            onPointerDown={() => playerAction("special")}
          >
            <span>{actionLabels.special}</span>
            <small>
              {specialAvailable
                ? selected.special.name
                : cooldownLabel(specialRemaining)}
            </small>
          </button>
        </div>
      </div>
    </section>
  );
}
