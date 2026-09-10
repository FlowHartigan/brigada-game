# Technical Architecture

## Principle

The deterministic combat engine is the source of truth.

Rendering, UI, animation, sound, and future generative-AI features observe or request state transitions; they do not redefine combat rules.

## Runtime layers

```text
Next.js / React shell
        │
        ├── Menu / character select / VS / results
        │
        └── Phaser combat surface
                 │
                 ▼
        Deterministic Game Engine
                 │
        ┌────────┼────────┐
        │        │        │
     combat    AI      timing
     rules   utility    / RNG
```

## Planned source tree

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css

  components/
    game/
    ui/

  game/
    data/
      fighters.ts
    engine/
      types.ts
      combat.ts
      damage.ts
      guard.ts
      dodge.ts
      special.ts
      opponent-ai.ts
      rng.ts
    phaser/
      config.ts
      scenes/
      presentation/
    state/
      game-store.ts

  lib/
```

## Separation of concerns

### `src/game/data`

Static, data-driven fighter definitions and tuning values.

No rendering logic.

### `src/game/engine`

Pure or near-pure TypeScript combat logic.

It owns:

- HP
- guard
- attack sequence state
- cooldowns
- timing windows
- damage
- dodge invulnerability
- special rules
- match outcome
- utility AI decisions

The engine must remain testable without a browser or Phaser instance.

### `src/game/phaser`

Presentation adapter.

It owns:

- scene rendering
- fighter placeholders / sprites
- arena
- particles
- camera shake
- visual hit feedback
- animation presentation

It must consume game-engine state/events rather than invent rules.

### React / Next.js

Owns high-level flow:

- landing
- character selection
- VS screen
- fight HUD / touch controls
- result screen

The Phaser canvas may be dynamically loaded client-side inside the combat view.

## State model

High-level application state:

```text
HOME
  ↓
CHARACTER_SELECT
  ↓
VS
  ↓
FIGHT
  ↓
RESULT
```

Combat state is separate from app-navigation state.

## Input model

The game exposes semantic input commands:

```text
ATTACK
DEFENSE_START
DEFENSE_END
DODGE
SPECIAL
```

Touch UI dispatches these commands to the game controller.

Keyboard mappings may exist for desktop testing but are not the product's primary controls.

## Time model

Combat simulation should not depend on React render frequency.

Use a controlled engine update/tick fed by elapsed time. Cooldowns and state durations are represented numerically in milliseconds or seconds and updated through the game loop.

## Randomness

Randomness is isolated behind an RNG interface/function so tests can provide deterministic values.

Do not call `Math.random()` throughout combat rules.

## Utility AI

Opponent AI receives an immutable snapshot of combat state and returns an intended semantic action.

It never directly manipulates player/opponent state.

Possible API shape conceptually:

```text
decideOpponentAction(snapshot, recentPlayerActions, rng)
  -> attack | defend | dodge | special | wait
```

## Mobile performance

Prototype targets smooth gameplay on modern mobile browsers.

Guidelines:

- avoid unnecessary React rerenders during combat
- keep high-frequency animation inside Phaser
- keep HUD updates coarse enough to avoid DOM churn
- use lightweight placeholder graphics initially
- avoid large uncompressed assets
- dynamically load Phaser to avoid server-rendering issues

## Future backend / AI

The MVP is intentionally client-side and deterministic.

Future systems may add:

- Neon Postgres for player/session persistence
- Vercel AI SDK / AI Gateway for non-frame-critical generative features
- durable workflows for content generation or world simulation

No such dependency belongs in the first combat loop.

## Testing strategy

### Unit

Vitest covers:

- stat formulas
- damage bounds
- blocking
- guard break
- dodge timing
- cooldowns
- specials
- timer result
- opponent AI decision constraints

### Browser / E2E

Verify at minimum:

- landing renders
- character can be selected
- opponent never equals selected fighter
- fight starts
- all four controls respond
- match can reach result screen
- rematch works
- character select return works
- mobile landscape viewport has no critical clipping
- no framework error overlay or console-breaking errors

## Deployment workflow

- `main`: production-ready
- `feat/*`: implementation branches
- each branch should receive a Vercel preview once Vercel is connected
- validate preview before merge

A future Neon-backed milestone should use matching Neon branches for database-changing features.
