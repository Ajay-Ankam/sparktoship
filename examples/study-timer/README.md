# Study Timer

A browser-based study timer built with Vite and vanilla TypeScript.

## Features

- **Configurable duration** — enter any duration in `MM:SS` format or as plain minutes (e.g. `25:00` or `25`)
- **Start / Pause / Resume / Reset** — full session control
- **Accurate timing** — remaining time is computed from wall-clock timestamps (`Date.now()`), not by counting animation frames; stays correct if the browser tab is inactive or the device sleeps
- **Visible completion state** — clock turns green, a banner appears, and the progress bar fills to 100%
- **ARIA-labelled controls** — the progressbar exposes `aria-valuenow` on every frame; buttons and inputs carry `aria-label` attributes
- **Responsive dark-theme layout** — works on desktop and mobile viewports; a `min-width: 360px` breakpoint adjusts padding

## Setup

Requires Node.js 18 or later.

```powershell
cd examples\study-timer
npm install
```

## Usage

### Development server

```powershell
npm run dev
# Opens at http://localhost:5173
```

### Run tests

```powershell
npm test
# 39 tests covering state transitions, pause/resume accuracy,
# tab-inactivity timing, completion detection, and formatting helpers
```

### Type check

```powershell
npm run typecheck
# tsc --noEmit, exits 0 on success
```

### Production build

```powershell
npm run build
# Vite bundles into dist/
```

## How timing works

The `Timer` class stores two values:

- `startedAt` — the wall-clock timestamp when the session was last started or resumed
- `remainingAtStart` — how much time was left at that moment

`remaining` is computed as `remainingAtStart - (Date.now() - startedAt)` on every read. No tick-counting is involved, so a hidden tab or device sleep does not cause the display to drift.

When the tab becomes visible again (via the Page Visibility API), the render loop restarts and the existing wall-clock diff is used immediately — no special correction is needed.

## Known limitations

- **No browser verification** — timing accuracy when a tab is actually hidden has been validated only by unit tests with a mocked clock, not by a live browser session.
- **No persistence** — the timer resets on page refresh; session history is not saved.
- **No audio alert** — completion is visual only (banner + colour change).
- **No accessibility audit** — ARIA attributes are present and updated, but have not been verified with a screen reader.

## Project structure

```
examples/study-timer/
├── index.html          # HTML shell with ARIA roles
├── src/
│   ├── timer.ts        # Pure Timer class — no DOM dependencies
│   ├── main.ts         # DOM wiring, requestAnimationFrame loop
│   └── style.css       # Dark theme, state-driven colours
├── tests/
│   └── timer.test.ts   # 39 Vitest tests
├── package.json
├── tsconfig.json
└── vite.config.ts
```
