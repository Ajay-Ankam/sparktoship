// ─── Workflow types ────────────────────────────────────────────────────────────

export type WorkflowType = 'rescue' | 'prototype' | 'story';

export const WORKFLOW_TYPES: WorkflowType[] = ['rescue', 'prototype', 'story'];

// ─── Task status ───────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'proposed'
  | 'ready'
  | 'running'
  | 'awaiting_review'
  | 'completed'
  | 'blocked'
  | 'failed';

export const ACTIVE_STATUSES: TaskStatus[] = [
  'proposed',
  'ready',
  'running',
  'awaiting_review',
];

/** Valid forward transitions for the main pipeline. */
export const PIPELINE_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus>> = {
  proposed: 'ready',
  ready: 'running',
  running: 'awaiting_review',
  awaiting_review: 'completed',
};

// ─── Evidence status ───────────────────────────────────────────────────────────

export type EvidenceStatus = 'passed' | 'failed' | 'not_run';

export const EVIDENCE_STATUSES: EvidenceStatus[] = ['passed', 'failed', 'not_run'];

// ─── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Task ──────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  projectId: string;
  title: string;
  workflowType: WorkflowType;
  scope: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  workspacePath: string;
  /** Reason recorded when transitioning to 'blocked'. */
  blockedReason?: string;
  /** Reason recorded when transitioning to 'failed'. */
  failedReason?: string;
  /**
   * The status to restore when resuming from 'blocked'.
   * Not used for 'failed' (always resumes to 'proposed').
   */
  resumeFrom?: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Evidence ──────────────────────────────────────────────────────────────────

export interface Evidence {
  id: string;
  taskId: string;
  /** The exact command that was run. */
  command: string;
  /** Absolute directory where the command ran. */
  workingDirectory: string;
  /** Process exit code (0 = success). */
  exitCode: number;
  /** Human-readable summary of what the command produced. */
  resultSummary: string;
  timestamp: string;
  status: EvidenceStatus;
  /** Exact git commit SHA the evidence was captured at. */
  gitCommit: string;
}

// ─── Handoff ───────────────────────────────────────────────────────────────────

export interface Handoff {
  id: string;
  taskId: string;
  targetAgent: string;
  /** Git commit SHA at the time of handoff. */
  commit: string;
  /** Evidence IDs that back this handoff. */
  evidenceIds: string[];
  /** Known limitations or caveats. */
  limitations: string[];
  createdAt: string;
  /** Caller-supplied idempotency key. */
  requestId: string;
}

// ─── Request log (duplicate protection) ───────────────────────────────────────

export interface RequestLogEntry {
  /** Caller-supplied idempotency key. */
  requestId: string;
  /** e.g. 'create_project', 'create_task', 'create_handoff' */
  operation: string;
  /**
   * Stable hash of the normalised input payload.
   * Used to detect conflicting reuse of the same request ID.
   */
  inputHash: string;
  /** ID of the resource that was created. */
  resultId: string;
  createdAt: string;
}

// ─── Store shape ───────────────────────────────────────────────────────────────

export interface StoreData {
  projects: Project[];
  tasks: Task[];
  evidence: Evidence[];
  handoffs: Handoff[];
  requests: RequestLogEntry[];
}
