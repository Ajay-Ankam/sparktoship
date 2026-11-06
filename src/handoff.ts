import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync, withIdempotencyLock } from './store.js';
import { findRequest, writeRequestEntry } from './projects.js';
import { requireTask } from './tasks.js';
import { getEvidence } from './evidence.js';
import type { Handoff } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateHandoffInput {
  taskId: string;
  targetAgent: string;
  commit: string;
  evidenceIds: string[];
  limitations: string[];
  requestId?: string;
}

export interface CreateHandoffResult {
  handoff: Handoff;
  created: boolean;
}

// ─── Validation (runs outside the lock so errors are fast) ───────────────────

function validateHandoffInput(input: CreateHandoffInput): void {
  const task = requireTask(input.taskId);

  if (task.status !== 'awaiting_review') {
    throw new Error(
      `Task ${input.taskId} must be in 'awaiting_review' status to create a handoff ` +
        `(current status: "${task.status}"). Advance the task first.`,
    );
  }

  for (const eid of input.evidenceIds) {
    const ev = getEvidence(eid);
    if (!ev) throw new Error(`Evidence not found: ${eid}`);
    if (ev.taskId !== input.taskId) {
      throw new Error(`Evidence ${eid} belongs to task ${ev.taskId}, not ${input.taskId}.`);
    }
  }

  if (!/^[0-9a-f]{7,40}$/i.test(input.commit)) {
    throw new Error(
      `Invalid git commit SHA "${input.commit}". Must be a hex string of 7–40 characters.`,
    );
  }
}

// ─── Operations ──────────────────────────────────────────────────────────────

export async function createHandoff(
  input: CreateHandoffInput,
): Promise<CreateHandoffResult> {
  const { requestId } = input;

  // Validate eagerly (before acquiring any lock) so errors surface fast.
  validateHandoffInput(input);

  if (requestId) {
    // Acquire the idempotency lock so that check-request → create-entity →
    // record-request is atomic relative to any concurrent caller.
    return withIdempotencyLock(async () => {
      const prior = findRequest('create_handoff', requestId, input);
      if (prior) {
        const handoffs = readCollectionSync('handoffs');
        const handoff = handoffs.find((h) => h.id === prior.resultId);
        if (!handoff)
          throw new Error(`Request log points to missing handoff ${prior.resultId}`);
        return { handoff, created: false };
      }

      const handoff = buildHandoff(input, requestId);
      await withCollection('handoffs', (all) => ({ data: [...all, handoff], result: null }));
      await writeRequestEntry('create_handoff', requestId, input, handoff.id);

      return { handoff, created: true };
    });
  }

  const handoff = buildHandoff(input, '');
  await withCollection('handoffs', (all) => ({ data: [...all, handoff], result: null }));
  return { handoff, created: true };
}

function buildHandoff(input: CreateHandoffInput, requestId: string): Handoff {
  return {
    id: uuidv4(),
    taskId: input.taskId,
    targetAgent: input.targetAgent,
    commit: input.commit,
    evidenceIds: input.evidenceIds,
    limitations: input.limitations,
    createdAt: new Date().toISOString(),
    requestId,
  };
}

export function listHandoffs(taskId?: string): Handoff[] {
  const all = readCollectionSync('handoffs');
  return taskId ? all.filter((h) => h.taskId === taskId) : all;
}

export function getHandoff(id: string): Handoff | undefined {
  return readCollectionSync('handoffs').find((h) => h.id === id);
}
