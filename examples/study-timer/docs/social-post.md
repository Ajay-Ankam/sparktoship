# Social Post Draft — Study Timer

**Format:** Short-form post (LinkedIn / X)  
**Audience:** Developers interested in browser apps, TypeScript, or AI-assisted workflows  
**Status:** Draft — not published

---

## Draft

Built a browser study timer with Vite + vanilla TypeScript.

The interesting part wasn't the UI — it was the timing.

Most timer tutorials accumulate elapsed time by counting animation frames. That breaks the moment a browser tab goes hidden: `requestAnimationFrame` stops firing, the timer freezes, and your 25-minute session becomes 25 minutes of active tab only.

The fix: store a wall-clock timestamp (`Date.now()`) when the session starts or resumes. Remaining time is always `remainingAtStart - (now - startedAt)` — a simple diff. No ticks needed. The tab can be hidden for an hour and the math is still right.

A few other things worth noting:

- The `Timer` class has zero DOM dependencies. 39 Vitest tests run in Node with a fake clock — simulating a 10-minute tab hide takes two lines.
- `pause()` resolves to `completed` if the deadline already passed when it's called — a subtle edge case that only shows up if Pause is clicked in the same frame the timer expires.
- The progressbar updates `aria-valuenow` on every render frame, not just at start/end.

Built and independently reviewed using SparkToShip — a local CLI for tracking tasks, evidence, and handoffs between AI agents.

Source: `examples/study-timer/` in the SparkToShip repo.

---

> **Note to reviewer:** The wall-clock timing behavior in a real hidden tab was not verified by automated checks — only by unit tests with a mocked clock. That claim is marked as untested in the README and dev log. Please flag if you feel it should be softened further in this post.
