# AGENTS.md — Brigada Game

This file defines the operating rules for every coding agent working on this repository.

## Product goal

Build **LA BRIGADE: 0+0=FIGHT**, a mobile-first 2D fighting game playable directly in a browser.

The first milestone is a small, polished fighting prototype rather than a broad game with many systems.

## Non-negotiable gameplay rules

1. Combat is real-time, not turn-based.
2. The player has four primary actions only:
   - Attack
   - Defense
   - Dodge
   - Special
3. No virtual movement joystick in the MVP.
4. Fighters automatically face one another and remain inside combat distance rules.
5. Character stats must materially affect gameplay:
   - Strength
   - Vitality
   - Speed
   - Defense
6. A match should target roughly 45–75 seconds.
7. The opponent AI must be deterministic / utility-based for the MVP. Do not put an LLM in the frame-critical combat loop.
8. The game engine is the source of truth. Rendering must never own combat rules.

## Architecture rules

- Use TypeScript with strict typing.
- Keep deterministic game rules framework-agnostic under `src/game/engine`.
- Keep Phaser rendering/input under `src/game/phaser`.
- Keep React/Next.js UI outside the engine.
- Do not make game-rule calculations directly inside React components or Phaser scenes.
- Keep fighter configuration data-driven.
- Prefer pure functions for calculations so they can be unit tested.
- Randomness must be injected or isolated so tests can be deterministic.
- Do not add a database, authentication, analytics, AI runtime, or multiplayer until a milestone explicitly requires it.

## Mobile-first rules

- The fight view targets landscape orientation first.
- Touch targets must be comfortably usable with thumbs.
- Avoid hover-only interactions.
- Prevent accidental text selection and browser gestures in the combat surface where appropriate.
- Support safe areas on modern phones.
- UI must remain readable on small mobile landscape viewports.

## Visual direction

Working direction: **2D Rave Comic**.

- Dark anthracite / black base.
- Off-white chalk-like typography and UI accents.
- Rave / techno atmosphere.
- School / blackboard visual references where appropriate.
- Arena prototype: **La Salle de Retenue**, a classroom transformed into an underground rave.
- Blackboard signature: **0 + 0 = TECHNO**.

Do not invent a real member's physical traits when no reliable visual reference exists. Placeholder silhouettes are preferred until approved source references are available.

## Fighter roster

The MVP roster is fixed to:

- HARTZ
- PETOUX
- NEXMOS
- KAVALEUR
- KORSAIR

Do not add/remove fighters without explicit product direction.

## Agent roles

These are logical responsibilities. A single coding agent may perform several roles during one task, but it must respect the ownership boundaries.

### Lead / Architecture

Owns:
- task decomposition
- architecture
- cross-system decisions
- acceptance criteria
- integration review

Must avoid unnecessary abstractions and scope growth.

### Gameplay

Owns primarily:
- `src/game/engine/**`
- combat rules
- fighter stats
- cooldowns
- damage
- guard
- dodge windows
- utility AI

Gameplay behavior must be covered by tests.

### Phaser / Presentation

Owns primarily:
- `src/game/phaser/**`
- combat scene
- visual entities
- camera feedback
- hit effects
- animation state presentation

It consumes engine state; it does not redefine engine rules.

### UI

Owns primarily:
- `src/app/**`
- `src/components/**`
- menu / selection / VS / result flows
- responsive layout
- touch controls

### QA

Owns:
- unit and integration test coverage
- browser verification
- mobile viewport verification
- console/runtime error checks
- regression reports

QA must test behavior, not just whether the page renders.

## Definition of done for a gameplay feature

A gameplay feature is complete only when:

1. The rule is implemented in the deterministic engine.
2. Relevant unit tests pass.
3. The UI/Phaser presentation reflects the engine state.
4. Type checking passes.
5. Production build passes.
6. The feature is manually/browser verified at a mobile landscape viewport.
7. No new browser console errors are introduced.

## Git workflow

- `main` is production-ready.
- Work on focused `feat/*`, `fix/*`, or `chore/*` branches.
- Use clear commit messages.
- Keep PRs focused.
- Do not commit secrets, API keys, tokens, local environment files, or generated dependency folders.
- Preview/test before merging to `main`.

## Scope discipline

For the core prototype, explicitly avoid:

- multiplayer
- user accounts
- store / monetization
- campaign mode
- RPG progression
- large content generation systems
- generative combat AI
- backend persistence

The core question for the prototype is:

> Is a 60-second fight with Attack / Defense / Dodge / Special genuinely fun on a phone?
