# Demo Script — Study Timer (~70 seconds)

**Purpose:** Walk through the study timer's core features in a live demo.  
**Prerequisite:** `npm install` and `npm run dev` already running at `http://localhost:5173`.

---

## Setup (before demo)

```powershell
cd examples\study-timer
npm install       # exits 0
npm run dev       # starts Vite dev server at http://localhost:5173
```

Open `http://localhost:5173` in a browser.

---

## Script

**[0s]**  
*Open the page. The clock shows `25:00` with a Start button.*  
"This is the study timer — a plain browser app built with Vite and TypeScript. No dependencies, no framework."

**[5s]**  
*Clear the duration input, type `0:10`, press Start.*  
"I'll set it to 10 seconds so we can see the full cycle. The clock turns blue and the progress bar fills as time passes."

**[12s]**  
*When the clock is around `00:05`, click Pause.*  
"Pause freezes the display. The colour shifts to amber — the remaining time is captured from the wall clock, not from how many frames fired."

**[18s]**  
*Click Resume.*  
"Resume picks up exactly where it left off."

**[25s]**  
*Let the timer run to 0.*  
"When time runs out, the clock turns green, the banner appears, and the progress bar reaches 100%."

*Point to the ARIA progressbar:*  
"The progressbar exposes an updated `aria-valuenow` on every frame — verified via an independent mocked-DOM probe in the reviewer's worktree: 0 at idle, the live percentage while running, 0 after reset, 100 at completion. Screen-reader behavior has not been verified."

**[35s]**  
*Click Reset, then set duration to `2:00` and click Start.*  
"Now switch to a different tab for 10–15 seconds, then come back."

**[50s]**  
*Switch back to the timer tab.*  
"If the remaining time dropped by roughly the time you were away, that's the wall-clock diff — `remainingAtStart − (now − startedAt)` — not animation frames. `requestAnimationFrame` stops when a tab is hidden; the diff doesn't."

> **Note:** This is an intended manual verification step; real background-tab behavior has not been verified in a live browser. Existing checks use mocked clocks/DOM.

**[62s]**  
"39 automated tests cover state transitions, pause/resume accuracy, and edge cases at the deadline — all passing on Node, no browser required. ARIA value correctness was verified by an independent mocked-DOM probe in the reviewer's worktree, not by the Node test suite."

**[68s]**  
"Source is in `examples/study-timer/` — `timer.ts` is pure logic with no DOM, `main.ts` wires it to the page."

---

## Commands shown in demo

| Command | Evidence record | Result |
|---|---|---|
| `npm install` | `33dda682` (commit `6be1f3f`) | ✅ exit 0 |
| `npm run dev` | `f0a0cbf7` (commit `5d3167e` — server startup only, not browser) | ✅ VITE v5.4.21 ready at http://localhost:5173/ |
| `npm test` | `a6362358` (commit `f1436b9`) | ✅ 39/39 |
| `npm run build` | `86b4ace5` (commit `f1436b9`) | ✅ clean |
