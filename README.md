# LA BRIGADE: 0+0=FIGHT

Mobile-first 2D fighting game playable directly in a web browser.

## Core concept

- Choose one of 5 members of La Brigade.
- Fight a randomly selected opponent from the remaining roster.
- Real-time combat designed for touch screens.
- Four actions only: **Attack**, **Defense**, **Dodge**, **Special**.
- Character stats directly influence combat behavior.
- Short, replayable fights targeting roughly 45–75 seconds.

## Technical direction

- Next.js + React + TypeScript
- Phaser 4 for the 2D combat scene
- Deterministic TypeScript combat engine separated from rendering
- Vitest for game-logic tests
- Playwright/browser verification for end-to-end checks
- Vercel for preview and production deployments

AI is not part of the deterministic combat loop. Future generative features may enrich dialogue, flavor text, events, or solo content without controlling frame-critical gameplay.

## Development workflow

Work is developed on feature branches, verified with automated tests and a browser preview, then merged into `main`.

See `AGENTS.md` and `docs/` on the active development branch for project rules, architecture, and roadmap.
