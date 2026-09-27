# Performance and reliability review — 2026-09-27

Reviewed the Next.js/React shell, Phaser presentation loop, fighter asset routing,
deterministic combat and AI, mobile styling, browser tests, and CI/deployment configuration.
This repository is a browser game; it does not contain a React Native application.

## Changes

- Memoize Phaser and fallback sprite components so unchanged visual props do not
  repeat React rendering on every combat timer update.
- Skip Phaser sprite geometry and diagnostic DOM writes when presentation and
  positions are unchanged. Time-driven stun animation and impact freeze still run.
- Stop alpha scanning after the first opaque pixel per row: vertical bounds do
  not require inspecting the remaining pixels. Cache failed measurements as well.
- Handle rejected Phaser initialization while retaining the React fallback.
- Release held movement and defense on window blur or page hiding.
- Keep UI timestamps at least as recent as the current engine snapshot. Browser
  QA exposed an actual `Combat time cannot move backwards` crash when React
  replayed queued movement after a newer update. Engine validation remains strict.
- Wait for presentation readiness in fallback and landing assertions instead of
  assuming the engine and Phaser complete on the same frame.
- Exclude generated Playwright output and TypeScript incremental caches from Git.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`,
`npm run check:source-size`, and `npm run test:e2e`.
New browser regressions cover focus loss, backwards wall-clock adjustment, and
zero repeated ground-metric DOM mutations during idle combat.

The existing browser suite covers the five fighters, action assets, hit effects,
jumps, fallback rendering, selection, VS, results, and mobile/desktop viewports.
No FPS or battery improvement is claimed without device profiling. Native iOS
and Android testing is outside this web repository. Production deployment remains
restricted to `main`; ordinary review branches do not deploy automatically.
