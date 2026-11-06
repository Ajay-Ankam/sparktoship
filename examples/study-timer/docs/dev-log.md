# Development Log — Study Timer

**Project:** SparkToShip Milestone 2 — Prototype workflow  
**Commits:** `6be1f3f` (initial), `f1436b9` (reviewer round 2 fixes)  
**Task:** `f039ad26` — Build browser study timer  
**Reviewed by:** sparktoship-reviewer (independent worktree, two-round review)

---

## Round 1 — Initial prototype (`6be1f3f`)

### Design decisions

**Wall-clock timing over tick counting.** An early draft tracked elapsed time by accumulating animation-frame deltas. When a browser tab goes hidden, `requestAnimationFrame` stops firing, so a tick-based timer would freeze. The final design stores `startedAt` (wall-clock timestamp) and `remainingAtStart` (remaining at last start/resume). `remaining` is a simple diff: no ticks needed, correct across any gap.

**Injectable clock for determinism.** The `Timer` constructor accepts `now: () => number`, defaulting to `Date.now`. Tests pass a fake clock that can be advanced arbitrarily. This made it possible to simulate a 10-minute tab-hide scenario without waiting 10 minutes.

**Pure Timer class.** The `Timer` class has no DOM dependencies — all state logic lives there, all display logic in `main.ts`. This keeps the 39-test suite fast (no DOM setup required) and makes the timing logic independently auditable.

**Vite + vanilla TypeScript.** No framework; the timer is a simple enough state machine that React/Vue would add complexity without benefit. Vitest runs in Node environment for the same reason.

### Checks at `6be1f3f`

| Check | Result |
|---|---|
| `npm install` | ✅ exit 0 |
| `npm run typecheck` | ✅ 0 errors |
| `npm test` | ✅ 38/38 |
| `npm run build` | ✅ clean |
| `npm run dev` (browser) | not_run — not verified in this session |

---

## Round 2 — Reviewer findings and fixes (`f1436b9`)

sparktoship-reviewer independently reviewed the prototype and found two issues.

### P2 — Pause suppresses completion at the deadline

**Finding:** If the user clicks Pause after the deadline has passed but before the next animation frame fires `tick()`, the timer enters `paused` state with `remainingMs: 0`. The completion banner never appears and Resume is shown instead.

**Fix:** `pause()` checks `remaining === 0` before transitioning. If time has run out, it resolves to `completed` immediately rather than entering `paused`.

**Regression test added:** `pause() at exactly the deadline resolves to completed, not paused` — advances injected clock past duration, calls `pause()` with no prior `tick()`, asserts `state === 'completed'`.

### P2 — ARIA progress always 0

**Finding:** The progressbar wrapper had a hardcoded `aria-valuenow="0"` in the HTML. `render()` only updated the CSS fill width, not the ARIA attribute. Assistive technology always read 0%.

**Fix:** Added `id="progress-bar"` to the wrapper; `render()` now calls `progressBar.setAttribute('aria-valuenow', Math.round(pct).toString())` on every frame.

**Reviewer-confirmed values:** 0 at idle, live percentage while running, 0 after reset, 100 at completion.

### Checks at `f1436b9`

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm test` | ✅ 39/39 |
| `npm run build` | ✅ clean |

---

## What is not implemented

- No session persistence across page refreshes
- No audio alert on completion
- No background-tab behavior verified in a live browser session
- No screen-reader audit performed
