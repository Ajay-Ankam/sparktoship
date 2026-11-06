import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync } from './store.js';
import { requireTask } from './tasks.js';
import { EVIDENCE_STATUSES } from './types.js';
import type { Evidence, EvidenceStatus } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddEvidenceInput {
  taskId: string;
  command: string;
  workingDirectory: string;
  exitCode: number;
  resultSummary: string;
  status: EvidenceStatus;
  gitCommit: string;
  timestamp?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEvidenceStatus(s: string): EvidenceStatus {
  if (!EVIDENCE_STATUSES.includes(s as EvidenceStatus)) {
    throw new Error(
      `Invalid evidence status "${s}". Must be one of: ${EVIDENCE_STATUSES.join(', ')}.`,
    );
  }
  return s as EvidenceStatus;
}

function validateGitCommit(sha: string): string {
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error(
      `Invalid git commit SHA "${sha}". Must be a hex string of 7–40 characters.`,
    );
  }
  return sha;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export async function addEvidence(input: AddEvidenceInput): Promise<Evidence> {
  validateEvidenceStatus(input.status);
  validateGitCommit(input.gitCommit);

  // Confirm the task exists before writing evidence.
  requireTask(input.taskId);

  const evidence: Evidence = {
    id: uuidv4(),
    taskId: input.taskId,
    command: input.command,
    workingDirectory: input.workingDirectory,
    exitCode: input.exitCode,
    resultSummary: input.resultSummary,
    timestamp: input.timestamp ?? new Date().toISOString(),
    status: input.status,
    gitCommit: input.gitCommit,
  };

  await withCollection('evidence', (all) => ({ data: [...all, evidence], result: null }));
  return evidence;
}

export function listEvidence(taskId?: string): Evidence[] {
  const all = readCollectionSync('evidence');
  return taskId ? all.filter((e) => e.taskId === taskId) : all;
}

export function getEvidence(id: string): Evidence | undefined {
  return readCollectionSync('evidence').find((e) => e.id === id);
}
