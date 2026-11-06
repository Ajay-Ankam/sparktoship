/**
 * Timer – pure logic, no DOM dependencies.
 *
 * Elapsed time is calculated from wall-clock timestamps (Date.now()) so
 * the remaining time stays accurate when the browser tab is hidden or the
 * device sleeps.
 *
 * State machine:
 *
 *   idle ──start()──► running ──pause()──► paused
 *    ▲                   │                   │
 *    └────reset()────────┘                   │ resume()
 *    ▲                                       ▼
 *    └────reset()──────────────── running ◄──┘
 *                                   │
 *                               (time=0)
 *                                   ▼
 *                               completed
 *                                   │
 *                               reset()
 *                                   ▼
 *                                 idle
 */

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSnapshot {
  state: TimerState;
  durationMs: number;
  remainingMs: number;
  elapsedMs: number;
}

export class Timer {
  private readonly durationMs: number;
  /**
   * Remaining milliseconds as of the last start() or resume() call.
   * Combined with `startedAt` to get the live remaining time.
   */
  private remainingAtStart: number;
  /**
   * Wall-clock timestamp (ms) when the timer was last started or resumed.
   * null when idle, paused, or completed.
   */
  private startedAt: number | null = null;
  private _state: TimerState = 'idle';

  /** Injectable clock — defaults to Date.now. Override in tests. */
  now: () => number;

  constructor(durationMs: number, now: () => number = Date.now) {
    if (durationMs <= 0) throw new Error('durationMs must be positive');
    this.durationMs = durationMs;
    this.remainingAtStart = durationMs;
    this.now = now;
  }

  get state(): TimerState {
    return this._state;
  }

  // ─── State transitions ──────────────────────────────────────────────────────

  start(): void {
    if (this._state !== 'idle') {
      throw new Error(`Cannot start timer from state "${this._state}"`);
    }
    this.startedAt = this.now();
    this._state = 'running';
  }

  pause(): void {
    if (this._state !== 'running') {
      throw new Error(`Cannot pause timer from state "${this._state}"`);
    }
    // If time has already expired, resolve to completed rather than pausing.
    // This guards against the race where the deadline passes before the
    // animation frame fires but Pause is clicked before tick() is called.
    if (this.remaining === 0) {
      this.remainingAtStart = 0;
      this.startedAt = null;
      this._state = 'completed';
      return;
    }
    // Snapshot remaining time so we can resume from exactly here.
    this.remainingAtStart = this.remaining;
    this.startedAt = null;
    this._state = 'paused';
  }

  resume(): void {
    if (this._state !== 'paused') {
      throw new Error(`Cannot resume timer from state "${this._state}"`);
    }
    this.startedAt = this.now();
    this._state = 'running';
  }

  reset(): void {
    this.startedAt = null;
    this.remainingAtStart = this.durationMs;
    this._state = 'idle';
  }

  // ─── Computed properties ────────────────────────────────────────────────────

  /**
   * Current remaining time in milliseconds.
   * Always in [0, durationMs].
   * Decrements in real time while running (uses wall-clock diff).
   */
  get remaining(): number {
    if (this._state === 'running' && this.startedAt !== null) {
      const elapsed = this.now() - this.startedAt;
      return Math.max(0, this.remainingAtStart - elapsed);
    }
    return this.remainingAtStart;
  }

  /**
   * Elapsed milliseconds since the timer started (cumulative across
   * pause/resume cycles). Always in [0, durationMs].
   */
  get elapsed(): number {
    return Math.min(this.durationMs, this.durationMs - this.remaining);
  }

  // ─── Tick ───────────────────────────────────────────────────────────────────

  /**
   * Call on each animation frame (or timer interval). Transitions to
   * 'completed' once remaining reaches 0. Returns true if the state changed.
   */
  tick(): boolean {
    if (this._state === 'running' && this.remaining === 0) {
      this.remainingAtStart = 0;
      this.startedAt = null;
      this._state = 'completed';
      return true;
    }
    return false;
  }

  // ─── Snapshot ───────────────────────────────────────────────────────────────

  snapshot(): TimerSnapshot {
    return {
      state: this._state,
      durationMs: this.durationMs,
      remainingMs: this.remaining,
      elapsedMs: this.elapsed,
    };
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format milliseconds as MM:SS.
 * e.g. 150000 → "02:30"
 */
export function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parse a "MM:SS" or plain seconds string into milliseconds.
 * Returns null if the string is not parseable as a positive duration.
 */
export function parseInputMs(input: string): number | null {
  const trimmed = input.trim();

  // "MM:SS" format
  const mmss = /^(\d{1,3}):([0-5]\d)$/.exec(trimmed);
  if (mmss) {
    const minutes = parseInt(mmss[1]!, 10);
    const seconds = parseInt(mmss[2]!, 10);
    const ms = (minutes * 60 + seconds) * 1000;
    return ms > 0 ? ms : null;
  }

  // Plain integer minutes
  const mins = /^\d+$/.exec(trimmed);
  if (mins) {
    const ms = parseInt(trimmed, 10) * 60 * 1000;
    return ms > 0 ? ms : null;
  }

  return null;
}
