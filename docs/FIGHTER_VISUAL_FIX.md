# Fighter visual rendering fix

The runtime fighter visuals must use the standalone transparent PNG files under `public/fighters/`.

Do not replace them with crops from the roster composition or CSS background-position atlases on Select, VS, Result or Combat. Those approaches previously produced technically loaded images that were visually outside their frames.

Visual QA is enforced by Playwright through pixel checks and screenshots retained as the `fighter-visual-qa` CI artifact.
