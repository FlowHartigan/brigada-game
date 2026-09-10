# Prototype Roadmap

## Milestone 0 — Repository foundation

Goal: make the repository safe and understandable for coding agents.

- [x] Initialize repository
- [x] Define agent rules
- [x] Capture approved game design
- [x] Define architecture
- [ ] Bootstrap Next.js / TypeScript / Phaser
- [ ] Add tests and CI commands
- [ ] Connect Vercel

## Milestone 1 — Vertical slice shell

Goal: complete the full game flow with placeholder visuals.

- [ ] Home screen
- [ ] Character select with five fighters
- [ ] Random opponent selection excluding chosen fighter
- [ ] VS transition
- [ ] Fight scene shell
- [ ] Result screen
- [ ] Rematch
- [ ] Return to character select

**Acceptance:** A user can move through the entire flow on a phone without a page reload.

## Milestone 2 — Deterministic combat core

Goal: combat is mechanically playable before visual polish.

- [ ] Fighter max HP from Vitality
- [ ] Base damage from Strength / Defense
- [ ] Three-hit attack chain
- [ ] Hold-to-block defense
- [ ] Guard meter
- [ ] Guard regeneration
- [ ] Guard break stun
- [ ] Dodge invulnerability and recovery
- [ ] Special cooldown
- [ ] Per-character special behavior
- [ ] Match timer
- [ ] KO / timeout winner
- [ ] Isolated deterministic RNG

**Acceptance:** All combat mechanics can be unit-tested without Phaser.

## Milestone 3 — Opponent AI

Goal: make solo combat readable and responsive.

- [ ] Utility scoring model
- [ ] Reaction delay
- [ ] Recent player-action memory
- [ ] Punish recovery windows
- [ ] Respond to excessive blocking
- [ ] Respond to attack spam
- [ ] Use special intelligently
- [ ] Difficulty tuning hooks

**Acceptance:** AI never selects impossible actions and demonstrates visibly different responses to aggressive vs defensive players.

## Milestone 4 — Phaser fighting presentation

Goal: the fight feels like a game rather than a UI demo.

- [ ] La Salle de Retenue arena
- [ ] Five distinguishable placeholder fighters
- [ ] Idle presentation
- [ ] Attack presentation
- [ ] Block presentation
- [ ] Dodge presentation
- [ ] Hit reactions
- [ ] Guard-break feedback
- [ ] KO presentation
- [ ] Special attack presentation
- [ ] Camera impact / hit-stop feedback

**Acceptance:** Every engine state has a readable on-screen presentation.

## Milestone 5 — Mobile controls and polish

Goal: enjoyable thumb-first controls.

- [ ] Landscape layout
- [ ] Large touch targets
- [ ] Safe-area support
- [ ] Press / hold feedback
- [ ] Special cooldown ring
- [ ] Haptics where supported
- [ ] Prevent accidental selection / gestures in fight surface
- [ ] Responsive small-screen test pass

**Acceptance:** All four actions are reliably usable on common phone landscape dimensions.

## Milestone 6 — Character identity pass

Goal: replace generic placeholders with approved Brigade identity.

- [ ] HARTZ approved character sheet
- [ ] PETOUX approved character sheet
- [ ] NEXMOS approved character sheet
- [ ] KAVALEUR visual reference / approved interpretation
- [ ] KORSAIR visual reference / approved interpretation
- [ ] Character color/effect signatures
- [ ] Victory poses
- [ ] Special move visual signatures

## Milestone 7 — Audio / juice

- [ ] Menu loop
- [ ] Fight loop
- [ ] Attack impact sounds
- [ ] Block / guard-break sounds
- [ ] KO cue
- [ ] Special cues
- [ ] Beat-synced visual moments where useful

## Milestone 8 — First public playable build

- [ ] Full browser regression
- [ ] Mobile Safari check
- [ ] Android Chrome check
- [ ] Performance pass
- [ ] Asset optimization
- [ ] Production deployment

## Explicitly later

Only after the fighting prototype is fun:

- AI-generated pre/post fight lines
- player persistence
- rankings
- additional arenas
- progression
- campaign
- multiplayer
