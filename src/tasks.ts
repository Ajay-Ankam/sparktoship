import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync, withIdempotencyLock } from './store.js';
import { findRequest, writeRequestEntry, requireProject } from './projects.js';
import {
  ACTIVE_STATUSES,
  PIPELINE_TRANSITIONS,
  WORKFLOW_TYPES,
} from './types.js';
import type { Task, WorkflowType, TaskStatus } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  projectId: string;
  title: string;
  workflowType: WorkflowType;
  scope: string;
  acceptanceCriteria: string[];
  workspacePath?: string;
  requestId?: string;
}

export interface CreateTaskResult {
  task: Task;
  created: boolean;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateWorkflowType(wt: string): WorkflowType {
  if (!WORKFLOW_TYPES.includes(wt as WorkflowType)) {
    throw new Error(
      `Invalid workflow type "${wt}". Must be one of: ${WORKFLOW_TYPES.join(', ')}.`,
    );
  }
  return wt as WorkflowType;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const { requestId } = input;

  validateWorkflowType(input.workflowType);

  if (requestId) {
    // Acquire the idempotency lock so that check-request → create-entity →
    // record-request is atomic relative to any concurrent caller.
    return withIdempotencyLock(async () => {
      const prior = findRequest('create_task', requestId, input);
      if (prior) {
        const tasks = readCollectionSync('tasks');
        const task = tasks.find((t) => t.id === prior.resultId);
        if (!task) throw new Error(`Request log points to missing task ${prior.resultId}`);
        return { task, created: false };
      }

      const project = requireProject(input.projectId);
      const task = buildTask(input, project.id, input.workspacePath ?? project.workspacePath);

      await withCollection('tasks', (tasks) => ({ data: [...tasks, task], result: null }));
      await writeRequestEntry('create_task', requestId, input, task.id);

      return { task, created: true };
    });
  }

  const project = requireProject(input.projectId);
  const task = buildTask(input, project.id, input.workspacePath ?? project.workspacePath);
  await withCollection('tasks', (tasks) => ({ data: [...tasks, task], result: null }));
  return { task, created: true };
}

function buildTask(
  input: CreateTaskInput,
  projectId: string,
  workspacePath: string,
): Task {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    projectId,
    title: input.title,
    workflowType: input.workflowType,
    scope: input.scope,
    acceptanceCriteria: input.acceptanceCriteria,
    status: 'proposed',
    workspacePath,
    createdAt: now,
    updatedAt: now,
  };
}

export function listTasks(projectId?: string): Task[] {
  const tasks = readCollectionSync('tasks');
  return projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
}

export function getTask(id: string): Task | undefined {
  return readCollectionSync('tasks').find((t) => t.id === id);
}

export function requireTask(id: string): Task {
  const task = getTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  return task;
}

// ─── Status transitions ───────────────────────────────────────────────────────

/**
 * Advance a task through the main pipeline:
 *   proposed → ready → running → awaiting_review → completed
 */
export async function advanceTask(id: string): Promise<Task> {
  return withCollection('tasks', (tasks) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);

    const task = tasks[idx]!;
    const next = PIPELINE_TRANSITIONS[task.status];

    if (!next) {
      throw new Error(
        `Cannot advance task from "${task.status}". ` +
          (task.status === 'completed'
            ? 'Task is already completed.'
            : task.status === 'blocked' || task.status === 'failed'
              ? `Task is ${task.status} — use resume instead.`
              : 'No forward transition defined.'),
      );
    }

    const updated: Task = { ...task, status: next, updatedAt: new Date().toISOString() };
    const data = [...tasks];
    data[idx] = updated;
    return { data, result: updated };
  });
}

/**
 * Transition a task to 'blocked', recording the reason and the status to
 * restore on resume.
 */
export async function blockTask(id: string, reason: string): Promise<Task> {
  return withCollection('tasks', (tasks) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);

    const task = tasks[idx]!;
    if (!ACTIVE_STATUSES.includes(task.status)) {
      throw new Error(
        `Cannot block task in status "${task.status}". ` +
          `Only active tasks (${ACTIVE_STATUSES.join(', ')}) can be blocked.`,
      );
    }

    const updated: Task = {
      ...task,
      status: 'blocked',
      blockedReason: reason,
      resumeFrom: task.status,
      updatedAt: new Date().toISOString(),
    };
    const data = [...tasks];
    data[idx] = updated;
    return { data, result: updated };
  });
}

/**
 * Transition a task to 'failed', recording the reason.
 */
export async function failTask(id: string, reason: string): Promise<Task> {
  return withCollection('tasks', (tasks) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);

    const task = tasks[idx]!;
    if (!ACTIVE_STATUSES.includes(task.status)) {
      throw new Error(
        `Cannot fail task in status "${task.status}". ` +
          `Only active tasks (${ACTIVE_STATUSES.join(', ')}) can be failed.`,
      );
    }

    const updated: Task = {
      ...task,
      status: 'failed',
      failedReason: reason,
      resumeFrom: task.status,
      updatedAt: new Date().toISOString(),
    };
    const data = [...tasks];
    data[idx] = updated;
    return { data, result: updated };
  });
}

/**
 * Resume a blocked task, restoring the status recorded in `resumeFrom`.
 * Resume a failed task by transitioning back to 'proposed'.
 */
export async function resumeTask(id: string): Promise<Task> {
  return withCollection('tasks', (tasks) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);

    const task = tasks[idx]!;

    let nextStatus: TaskStatus;
    if (task.status === 'blocked') {
      nextStatus = task.resumeFrom ?? 'proposed';
    } else if (task.status === 'failed') {
      nextStatus = 'proposed';
    } else {
      throw new Error(
        `Cannot resume task in status "${task.status}". Only blocked or failed tasks can be resumed.`,
      );
    }

    const updated: Task = {
      ...task,
      status: nextStatus,
      blockedReason: undefined,
      failedReason: undefined,
      resumeFrom: undefined,
      updatedAt: new Date().toISOString(),
    };
    const data = [...tasks];
    data[idx] = updated;
    return { data, result: updated };
  });
}
