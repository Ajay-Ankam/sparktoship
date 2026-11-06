import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync, hashInput, withIdempotencyLock } from './store.js';
import type { Project, RequestLogEntry } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description: string;
  workspacePath: string;
  requestId?: string;
}

export interface CreateProjectResult {
  project: Project;
  created: boolean; // false when returning an existing result via requestId
}

// ─── Operations ──────────────────────────────────────────────────────────────

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const { name, description, workspacePath, requestId } = input;

  if (requestId) {
    // Acquire the idempotency lock so that check-request → create-entity →
    // record-request is atomic relative to any other caller (same process or
    // separate OS process) using the same requestId.
    return withIdempotencyLock(async () => {
      // Re-read inside the lock; a concurrent caller may have just written.
      const prior = findRequest('create_project', requestId, input);
      if (prior) {
        const projects = readCollectionSync('projects');
        const project = projects.find((p) => p.id === prior.resultId);
        if (!project) throw new Error(`Request log points to missing project ${prior.resultId}`);
        return { project, created: false };
      }

      const project = buildProject(name, description, workspacePath);

      await withCollection('projects', (projects) => ({
        data: [...projects, project],
        result: null,
      }));
      await writeRequestEntry('create_project', requestId, input, project.id);

      return { project, created: true };
    });
  }

  const project = buildProject(name, description, workspacePath);
  await withCollection('projects', (projects) => ({
    data: [...projects, project],
    result: null,
  }));
  return { project, created: true };
}

function buildProject(
  name: string,
  description: string,
  workspacePath: string,
): Project {
  const now = new Date().toISOString();
  return { id: uuidv4(), name, description, workspacePath, createdAt: now, updatedAt: now };
}

export function listProjects(): Project[] {
  return readCollectionSync('projects');
}

export function getProject(idOrName: string): Project | undefined {
  const projects = readCollectionSync('projects');
  return (
    projects.find((p) => p.id === idOrName) ??
    projects.find((p) => p.name.toLowerCase() === idOrName.toLowerCase())
  );
}

export function requireProject(idOrName: string): Project {
  const project = getProject(idOrName);
  if (!project) throw new Error(`Project not found: ${idOrName}`);
  return project;
}

// ─── Request-log helpers (shared with other modules) ─────────────────────────

/**
 * Synchronous read of the request log. Must only be called while the
 * idempotency lock is held (enforced by convention, not type system).
 *
 * Returns the matching entry, or null if none. Throws on hash conflict.
 */
export function findRequest(
  operation: string,
  requestId: string,
  input: unknown,
): RequestLogEntry | null {
  const requests = readCollectionSync('requests');
  const prior = requests.find(
    (r) => r.requestId === requestId && r.operation === operation,
  );
  if (!prior) return null;

  const hash = hashInput(input);
  if (prior.inputHash !== hash) {
    throw new Error(
      `Duplicate request ID "${requestId}" with conflicting input (operation: ${operation}). ` +
        `Original input hash: ${prior.inputHash}, new input hash: ${hash}.`,
    );
  }
  return prior;
}

/**
 * Append a new entry to the request log. Must only be called while the
 * idempotency lock is held.
 */
export async function writeRequestEntry(
  operation: string,
  requestId: string,
  input: unknown,
  resultId: string,
): Promise<void> {
  const entry: RequestLogEntry = {
    requestId,
    operation,
    inputHash: hashInput(input),
    resultId,
    createdAt: new Date().toISOString(),
  };
  await withCollection('requests', (requests) => ({
    data: [...requests, entry],
    result: null,
  }));
}

// ─── Deprecated shims (kept for internal callers during migration) ────────────

/** @deprecated Use findRequest inside withIdempotencyLock instead. */
export async function checkRequest(
  operation: string,
  requestId: string,
  input: unknown,
): Promise<RequestLogEntry | null> {
  return findRequest(operation, requestId, input);
}

/** @deprecated Use writeRequestEntry inside withIdempotencyLock instead. */
export async function recordRequest(
  operation: string,
  requestId: string,
  input: unknown,
  resultId: string,
): Promise<void> {
  return writeRequestEntry(operation, requestId, input, resultId);
}
