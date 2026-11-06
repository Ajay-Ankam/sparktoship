# Demo Script — Study Timer (60 seconds)

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
"The progressbar's `aria-valuenow` is updated on every frame, so screen readers track the live percentage — not just the visual fill."

**[35s]**  
*Click Reset.*  
"Reset brings everything back to idle. The duration input is editable again."

**[40s]**  
*In browser DevTools, open the Network tab, throttle to Offline, switch away from the tab for a few seconds, switch back.*  
"The timing uses `Date.now()` snapshots, not tick counting. Even if the tab is hidden — which pauses `requestAnimationFrame` — the wall-clock diff stays accurate."

> **Note:** The tab-hide behavior shown here is live browser behavior and was not verified in automated checks. The unit tests simulate this with a mocked clock.

**[55s]**  
"39 automated tests cover state transitions, pause/resume accuracy, edge cases at the deadline, and the ARIA values — all passing on Node, no browser required."

**[60s]**  
"Source is in `examples/study-timer/` — `timer.ts` is pure logic with no DOM, `main.ts` wires it to the page."

---

## Commands shown in demo

| Command | Evidence record | Result |
|---|---|---|
| `npm install` | `33dda682` (commit `6be1f3f`) | ✅ exit 0 |
| `npm run dev` | `55b49c39` (not_run — not verified) | starts at port 5173 |
| `npm test` | `a6362358` (commit `f1436b9`) | ✅ 39/39 |
| `npm run build` | `86b4ace5` (commit `f1436b9`) | ✅ clean |
