import { describe, it, expect } from 'vitest';
import { Timer, formatMs, parseInputMs } from '../src/timer';

// ─── Clock helpers ────────────────────────────────────────────────────────────

function makeClock(startMs = 0): { now: () => number; advance: (ms: number) => void } {
  let t = startMs;
  return {
    now: () => t,
    advance: (ms: number) => { t += ms; },
  };
}

// ─── State transitions ────────────────────────────────────────────────────────

describe('Timer – state transitions', () => {
  it('starts in idle state', () => {
    const timer = new Timer(60_000);
    expect(timer.state).toBe('idle');
  });

  it('idle → running on start()', () => {
    const timer = new Timer(60_000);
    timer.start();
    expect(timer.state).toBe('running');
  });

  it('running → paused on pause()', () => {
    const timer = new Timer(60_000);
    timer.start();
    timer.pause();
    expect(timer.state).toBe('paused');
  });

  it('paused → running on resume()', () => {
    const timer = new Timer(60_000);
    timer.start();
    timer.pause();
    timer.resume();
    expect(timer.state).toBe('running');
  });

  it('running → completed when time runs out', () => {
    const clock = makeClock();
    const timer = new Timer(1_000, clock.now);
    timer.start();
    clock.advance(1_001);
    timer.tick();
    expect(timer.state).toBe('completed');
  });

  it('any state → idle on reset()', () => {
    const clock = makeClock();
    const timer = new Timer(5_000, clock.now);

    // from running
    timer.start();
    timer.reset();
    expect(timer.state).toBe('idle');

    // from paused
    timer.start();
    timer.pause();
    timer.reset();
    expect(timer.state).toBe('idle');

    // from completed
    timer.start();
    clock.advance(6_000);
    timer.tick();
    timer.reset();
    expect(timer.state).toBe('idle');
  });

  it('throws when starting from non-idle state', () => {
    const timer = new Timer(60_000);
    timer.start();
    expect(() => timer.start()).toThrow(/Cannot start/);
  });

  it('throws when pausing from non-running state', () => {
    const timer = new Timer(60_000);
    expect(() => timer.pause()).toThrow(/Cannot pause/);
  });

  it('throws when resuming from non-paused state', () => {
    const timer = new Timer(60_000);
    expect(() => timer.resume()).toThrow(/Cannot resume/);
  });

  it('pause() at exactly the deadline resolves to completed, not paused', () => {
    // Reproduces the reviewer's probe: advance clock past duration, then call
    // pause() before tick() fires.
    const clock = makeClock();
    const timer = new Timer(1_000, clock.now);
    timer.start();
    clock.advance(1_001);  // time has expired — no tick yet
    timer.pause();         // should resolve expiry, not enter paused
    expect(timer.state).toBe('completed');
    expect(timer.remaining).toBe(0);
  });
});

// ─── Remaining time ───────────────────────────────────────────────────────────

describe('Timer – remaining time', () => {
  it('remaining equals duration before starting', () => {
    const timer = new Timer(30_000);
    expect(timer.remaining).toBe(30_000);
  });

  it('remaining decrements while running', () => {
    const clock = makeClock();
    const timer = new Timer(30_000, clock.now);
    timer.start();
    clock.advance(5_000);
    expect(timer.remaining).toBe(25_000);
  });

  it('remaining does not change while paused', () => {
    const clock = makeClock();
    const timer = new Timer(30_000, clock.now);
    timer.start();
    clock.advance(5_000);
    timer.pause();
    const snap = timer.remaining;
    clock.advance(10_000); // time passes while paused — should NOT count
    expect(timer.remaining).toBe(snap);
  });

  it('remaining resumes from paused value, not from zero', () => {
    const clock = makeClock();
    const timer = new Timer(30_000, clock.now);
    timer.start();
    clock.advance(10_000);  // 20s left
    timer.pause();
    clock.advance(60_000);  // pause for a minute — should not count
    timer.resume();
    clock.advance(5_000);   // 15s left
    expect(timer.remaining).toBe(15_000);
  });

  it('remaining floors at 0, never goes negative', () => {
    const clock = makeClock();
    const timer = new Timer(5_000, clock.now);
    timer.start();
    clock.advance(999_999);
    expect(timer.remaining).toBe(0);
  });

  it('remaining is 0 after completion', () => {
    const clock = makeClock();
    const timer = new Timer(1_000, clock.now);
    timer.start();
    clock.advance(1_500);
    timer.tick();
    expect(timer.remaining).toBe(0);
  });

  it('remaining resets to duration after reset()', () => {
    const clock = makeClock();
    const timer = new Timer(30_000, clock.now);
    timer.start();
    clock.advance(10_000);
    timer.reset();
    expect(timer.remaining).toBe(30_000);
  });
});

// ─── Elapsed time ─────────────────────────────────────────────────────────────

describe('Timer – elapsed time', () => {
  it('elapsed is 0 before starting', () => {
    const timer = new Timer(60_000);
    expect(timer.elapsed).toBe(0);
  });

  it('elapsed accumulates correctly through pause/resume cycles', () => {
    const clock = makeClock();
    const timer = new Timer(60_000, clock.now);
    timer.start();
    clock.advance(10_000);  // 10s elapsed
    timer.pause();
    clock.advance(30_000);  // pause gap should NOT count
    timer.resume();
    clock.advance(5_000);   // 15s total elapsed
    expect(timer.elapsed).toBe(15_000);
  });

  it('elapsed equals duration when completed', () => {
    const clock = makeClock();
    const timer = new Timer(5_000, clock.now);
    timer.start();
    clock.advance(6_000);
    timer.tick();
    expect(timer.elapsed).toBe(5_000);
  });
});

// ─── Tab-inactive scenario ────────────────────────────────────────────────────

describe('Timer – elapsed time is correct when tab is inactive', () => {
  it('remaining is accurate after a long invisible gap (simulates tab hide)', () => {
    const clock = makeClock();
    const timer = new Timer(25 * 60 * 1000, clock.now); // 25 minutes
    timer.start();

    // Simulate 3 minutes of "active" ticking
    clock.advance(3 * 60 * 1000);

    // Tab goes hidden — no ticks for 10 minutes (clock still advances)
    clock.advance(10 * 60 * 1000);

    // Tab becomes visible again: check remaining (should be 12 minutes)
    expect(timer.remaining).toBe(12 * 60 * 1000);
    expect(timer.elapsed).toBe(13 * 60 * 1000);
  });

  it('timer completes correctly even without ticks while hidden', () => {
    const clock = makeClock();
    const timer = new Timer(5_000, clock.now);
    timer.start();

    // Advance past the duration without ticking (tab hidden)
    clock.advance(10_000);

    // On becoming visible, one tick fires
    timer.tick();
    expect(timer.state).toBe('completed');
    expect(timer.remaining).toBe(0);
  });
});

// ─── Completion detection ──────────────────────────────────────────────────────

describe('Timer – completion', () => {
  it('tick() returns true exactly once at completion', () => {
    const clock = makeClock();
    const timer = new Timer(1_000, clock.now);
    timer.start();
    clock.advance(500);
    expect(timer.tick()).toBe(false); // not yet
    clock.advance(600);
    expect(timer.tick()).toBe(true);  // completed now
    expect(timer.tick()).toBe(false); // already completed, no change
  });

  it('snapshot() reports completed state', () => {
    const clock = makeClock();
    const timer = new Timer(2_000, clock.now);
    timer.start();
    clock.advance(3_000);
    timer.tick();
    const snap = timer.snapshot();
    expect(snap.state).toBe('completed');
    expect(snap.remainingMs).toBe(0);
    expect(snap.elapsedMs).toBe(2_000);
  });
});

// ─── formatMs ─────────────────────────────────────────────────────────────────

describe('formatMs', () => {
  it('formats 0 as 00:00', () => expect(formatMs(0)).toBe('00:00'));
  it('formats 25 minutes as 25:00', () => expect(formatMs(25 * 60 * 1000)).toBe('25:00'));
  it('formats 90 seconds as 01:30', () => expect(formatMs(90_000)).toBe('01:30'));
  it('rounds up partial seconds', () => expect(formatMs(1_500)).toBe('00:02'));
  it('formats exactly 1 minute', () => expect(formatMs(60_000)).toBe('01:00'));
  it('formats 1 ms as 00:01 (rounds up)', () => expect(formatMs(1)).toBe('00:01'));
});

// ─── parseInputMs ─────────────────────────────────────────────────────────────

describe('parseInputMs', () => {
  it('parses "25:00" as 25 minutes', () => expect(parseInputMs('25:00')).toBe(25 * 60 * 1000));
  it('parses "1:30" as 90 seconds', () => expect(parseInputMs('1:30')).toBe(90_000));
  it('parses "25" as 25 minutes', () => expect(parseInputMs('25')).toBe(25 * 60 * 1000));
  it('parses "0:30" as 30 seconds', () => expect(parseInputMs('0:30')).toBe(30_000));
  it('returns null for "0:00"', () => expect(parseInputMs('0:00')).toBeNull());
  it('returns null for "0"', () => expect(parseInputMs('0')).toBeNull());
  it('returns null for empty string', () => expect(parseInputMs('')).toBeNull());
  it('returns null for "abc"', () => expect(parseInputMs('abc')).toBeNull());
  it('trims whitespace', () => expect(parseInputMs('  10:00  ')).toBe(10 * 60 * 1000));
});
