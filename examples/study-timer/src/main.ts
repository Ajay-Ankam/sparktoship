import './style.css';
import { Timer, formatMs, parseInputMs, type TimerState } from './timer';

// ─── DOM refs ────────────────────────────────────────────────────────────────

const durationInput  = document.getElementById('duration-input')  as HTMLInputElement;
const clockEl        = document.getElementById('clock')            as HTMLElement;
const statusEl       = document.getElementById('status-label')     as HTMLElement;
const progressBar    = document.getElementById('progress-bar')     as HTMLElement;
const progressFill   = document.getElementById('progress-fill')   as HTMLElement;
const completionEl   = document.getElementById('completion-banner') as HTMLElement;
const btnStart       = document.getElementById('btn-start')        as HTMLButtonElement;
const btnPause       = document.getElementById('btn-pause')        as HTMLButtonElement;
const btnResume      = document.getElementById('btn-resume')       as HTMLButtonElement;
const btnReset       = document.getElementById('btn-reset')        as HTMLButtonElement;

// ─── State ───────────────────────────────────────────────────────────────────

let timer: Timer = createTimer();
let rafId: number | null = null;

function createTimer(): Timer {
  const ms = parseInputMs(durationInput.value) ?? 25 * 60 * 1000;
  return new Timer(ms);
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render(): void {
  const snap = timer.snapshot();
  const { state, remainingMs, durationMs } = snap;

  // Clock
  clockEl.textContent = formatMs(remainingMs);
  clockEl.dataset['state'] = state;

  // Status label
  const labels: Record<string, string> = {
    idle: '',
    running: 'Running',
    paused: 'Paused',
    completed: 'Session complete!',
  };
  statusEl.textContent = labels[state] ?? '';
  statusEl.dataset['state'] = state;

  // Progress bar — update both visual fill and accessible value
  const pct = durationMs > 0 ? ((durationMs - remainingMs) / durationMs) * 100 : 0;
  progressFill.style.width = `${pct.toFixed(1)}%`;
  progressFill.dataset['state'] = state;
  progressBar.setAttribute('aria-valuenow', Math.round(pct).toString());

  // Completion banner
  completionEl.classList.toggle('visible', state === 'completed');

  // Buttons
  btnStart.style.display  = state === 'idle'    ? '' : 'none';
  btnPause.style.display  = state === 'running' ? '' : 'none';
  btnResume.style.display = state === 'paused'  ? '' : 'none';
  btnReset.disabled       = state === 'idle';

  // Duration input: only editable when idle
  durationInput.disabled = state !== 'idle';
}

// ─── Animation loop ───────────────────────────────────────────────────────────

function loop(): void {
  const changed = timer.tick();
  render();
  if (changed || timer.state === 'completed') {
    stopLoop();
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ─── Button handlers ──────────────────────────────────────────────────────────

btnStart.addEventListener('click', () => {
  // Re-create the timer from current input so duration is fresh.
  const ms = parseInputMs(durationInput.value);
  if (!ms) {
    durationInput.focus();
    durationInput.select();
    return;
  }
  timer = new Timer(ms);
  timer.start();
  startLoop();
  render();
});

btnPause.addEventListener('click', () => {
  if (timer.state !== 'running') return;
  stopLoop();
  timer.pause();
  render();
});

btnResume.addEventListener('click', () => {
  if (timer.state !== 'paused') return;
  timer.resume();
  startLoop();
  render();
});

btnReset.addEventListener('click', () => {
  stopLoop();
  timer.reset();
  render();
});

// ─── Page Visibility API ─────────────────────────────────────────────────────
// When the tab becomes visible again, the remaining time is re-computed from
// wall-clock diff — no special logic needed here. The loop only needs to
// restart rendering; the Timer class tracks real elapsed time independently.

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timer.state === 'running') {
    // The timer may have completed while the tab was hidden.
    timer.tick();
    // Re-read state after tick(). Widen to full union so TS doesn't
    // keep the 'running' narrowing from the outer if condition.
    const stateNow: TimerState = timer.state as TimerState;
    if (stateNow === 'completed') {
      stopLoop();
    } else {
      startLoop();
    }
    render();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

render();
