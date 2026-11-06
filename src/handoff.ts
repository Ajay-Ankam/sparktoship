import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync } from './store.js';
import { checkRequest, recordRequest } from './projects.js';
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

// ─── Operations ──────────────────────────────────────────────────────────────

export async function createHandoff(
  input: CreateHandoffInput,
): Promise<CreateHandoffResult> {
  const { requestId } = input;

  if (requestId) {
    const existing = await checkRequest('create_handoff', requestId, input);
    if (existing) {
      const handoffs = readCollectionSync('handoffs');
      const handoff = handoffs.find((h) => h.id === existing.resultId);
      if (!handoff)
        throw new Error(`Request log points to missing handoff ${existing.resultId}`);
      return { handoff, created: false };
    }
  }

  // Validate referenced task.
  const task = requireTask(input.taskId);

  if (task.status !== 'awaiting_review') {
    throw new Error(
      `Task ${input.taskId} must be in 'awaiting_review' status to create a handoff ` +
        `(current status: "${task.status}"). Advance the task first.`,
    );
  }

  // Validate referenced evidence items.
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

  const id = uuidv4();
  const handoff: Handoff = {
    id,
    taskId: input.taskId,
    targetAgent: input.targetAgent,
    commit: input.commit,
    evidenceIds: input.evidenceIds,
    limitations: input.limitations,
    createdAt: new Date().toISOString(),
    requestId: requestId ?? '',
  };

  await withCollection('handoffs', (all) => ({ data: [...all, handoff], result: null }));

  if (requestId) {
    await recordRequest('create_handoff', requestId, input, id);
  }

  return { handoff, created: true };
}

export function listHandoffs(taskId?: string): Handoff[] {
  const all = readCollectionSync('handoffs');
  return taskId ? all.filter((h) => h.taskId === taskId) : all;
}

export function getHandoff(id: string): Handoff | undefined {
  return readCollectionSync('handoffs').find((h) => h.id === id);
}
