import { v4 as uuidv4 } from 'uuid';
import { withCollection, readCollectionSync, hashInput } from './store.js';
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

  // Duplicate protection: if a requestId was supplied, check for prior execution.
  if (requestId) {
    const existing = await checkRequest('create_project', requestId, input);
    if (existing) {
      const projects = readCollectionSync('projects');
      const project = projects.find((p) => p.id === existing.resultId);
      if (!project) throw new Error(`Request log points to missing project ${existing.resultId}`);
      return { project, created: false };
    }
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  const project: Project = {
    id,
    name,
    description,
    workspacePath,
    createdAt: now,
    updatedAt: now,
  };

  await withCollection('projects', (projects) => {
    return { data: [...projects, project], result: null };
  });

  if (requestId) {
    await recordRequest('create_project', requestId, input, id);
  }

  return { project, created: true };
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

export async function checkRequest(
  operation: string,
  requestId: string,
  input: unknown,
): Promise<RequestLogEntry | null> {
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

export async function recordRequest(
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
