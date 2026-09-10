# Prototype Roadmap

## Milestone 0 — Repository foundation

Goal: make the repository safe and understandable for coding agents.

- [x] Initialize repository
- [x] Define agent rules
- [x] Capture approved game design
- [x] Define architecture
- [x] Bootstrap Next.js / TypeScript / Phaser
- [x] Add tests and CI commands
- [x] Connect Vercel

## Milestone 1 — Vertical slice shell

Goal: complete the full game flow with placeholder visuals.

- [x] Home screen
- [x] Character select with five fighters
- [x] Random opponent selection excluding chosen fighter
- [x] VS transition
- [x] Fight scene shell
- [x] Result screen
- [x] Rematch
- [x] Return to character select

**Acceptance:** Implemented in PR #6 and covered by browser QA.

## Milestone 2 — Deterministic combat core

Goal: combat is mechanically playable before visual polish.

- [x] Fighter max HP from Vitality
- [x] Base damage from Strength / Defense
- [x] Three-hit attack chain
- [x] Hold-to-block defense
- [x] Guard meter
- [x] Guard regeneration
- [x] Guard break stun
- [x] Dodge invulnerability and recovery
- [x] Special cooldown
- [x] Per-character special behavior
- [x] Match timer
- [x] KO / timeout winner
- [x] Isolated deterministic RNG

**Acceptance:** 22 unit tests cover the current engine and utility AI without Phaser.

## Milestone 3 — Opponent AI

Goal: make solo combat readable and responsive.

- [x] Utility scoring model
- [x] Reaction cadence
- [x] Recent player-action memory
- [x] Punish recovery windows
- [x] Respond to excessive blocking
- [x] Respond to attack spam
- [x] Respect special cooldown and legal actions
- [x] Difficulty tuning hooks through utility scores, without hidden stat buffs

**Acceptance:** AI returns semantic intentions and never mutates combat state directly.

## Milestone 4 — Phaser fighting presentation

Goal: the fight feels like a game rather than a UI demo.

- [ ] Replace DOM placeholders with a Phaser 4 scene
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

**Acceptance:** Every engine state has a readable on-screen presentation and Phaser owns no combat truth.

## Milestone 5 — Mobile controls and polish

Goal: enjoyable thumb-first controls.

- [x] Landscape-first layout
- [x] Large touch targets
- [x] Safe-area support
- [x] Press / hold defense interaction
- [x] Automated Chromium mobile-landscape test
- [ ] Visual special cooldown ring
- [ ] Haptics where supported
- [ ] Mobile Safari check
- [ ] Android Chrome check

**Acceptance:** Playwright verifies the core player flow and controls in a mobile-landscape browser with no browser/page errors.

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

## Quality gate for gameplay changes

Every gameplay PR must pass:

1. Vitest unit suite.
2. TypeScript typecheck.
3. Next.js production build.
4. Playwright Chromium mobile-landscape flow.
5. No browser/page errors in the tested flow.
6. Vercel Preview reaches READY.

## Explicitly later

Only after the fighting prototype is fun:

- AI-generated pre/post fight lines
- player persistence
- rankings
- additional arenas
- progression
- campaign
- multiplayer
