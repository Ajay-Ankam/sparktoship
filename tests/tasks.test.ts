import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject } from '../src/projects';
import {
  createTask,
  listTasks,
  requireTask,
  advanceTask,
  blockTask,
  failTask,
  resumeTask,
} from '../src/tasks';

async function makeProject() {
  const { project } = await createProject({
    name: 'test-proj',
    description: 'desc',
    workspacePath: 'C:\\Users\\test\\proj',
  });
  return project;
}

async function makeTask(projectId: string, overrides: Partial<Parameters<typeof createTask>[0]> = {}) {
  return createTask({
    projectId,
    title: 'Fix auth',
    workflowType: 'rescue',
    scope: 'Fix login bug',
    acceptanceCriteria: ['Login works', 'Tests pass'],
    ...overrides,
  });
}

describe('tasks – creation and listing', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('creates a task with status=proposed', async () => {
    const project = await makeProject();
    const { task, created } = await makeTask(project.id);
    expect(created).toBe(true);
    expect(task.status).toBe('proposed');
    expect(task.workflowType).toBe('rescue');
  });

  it('inherits workspacePath from project', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    expect(task.workspacePath).toBe(project.workspacePath);
  });

  it('allows overriding workspacePath', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id, { workspacePath: 'C:\\other\\path' });
    expect(task.workspacePath).toBe('C:\\other\\path');
  });

  it('filters tasks by project', async () => {
    const p1 = await makeProject();
    const { project: p2 } = await createProject({ name: 'p2', description: '', workspacePath: 'C:\\p2' });
    await makeTask(p1.id);
    await makeTask(p2.id);
    expect(listTasks(p1.id).length).toBe(1);
    expect(listTasks(p2.id).length).toBe(1);
  });

  it('rejects invalid workflowType', async () => {
    const project = await makeProject();
    await expect(makeTask(project.id, { workflowType: 'invalid' as any })).rejects.toThrow(/workflow type/i);
  });

  it('rejects if project does not exist', async () => {
    await expect(makeTask('nonexistent-id')).rejects.toThrow(/project not found/i);
  });

  it('idempotent with same requestId', async () => {
    const project = await makeProject();
    const r1 = await makeTask(project.id, { requestId: 'task-req-1' });
    const r2 = await makeTask(project.id, { requestId: 'task-req-1' });
    expect(r1.task.id).toBe(r2.task.id);
    expect(r2.created).toBe(false);
  });
});

describe('tasks – status transitions', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('advances through the full pipeline', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    const id = task.id;

    expect((await advanceTask(id)).status).toBe('ready');
    expect((await advanceTask(id)).status).toBe('running');
    expect((await advanceTask(id)).status).toBe('awaiting_review');
    expect((await advanceTask(id)).status).toBe('completed');
  });

  it('refuses to advance a completed task', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    const id = task.id;
    await advanceTask(id); // proposed→ready
    await advanceTask(id); // ready→running
    await advanceTask(id); // running→awaiting_review
    await advanceTask(id); // awaiting_review→completed
    await expect(advanceTask(id)).rejects.toThrow(/completed/i);
  });

  it('blocks a task and records reason + resumeFrom', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    await advanceTask(task.id); // proposed→ready
    const blocked = await blockTask(task.id, 'Waiting on API key');
    expect(blocked.status).toBe('blocked');
    expect(blocked.blockedReason).toBe('Waiting on API key');
    expect(blocked.resumeFrom).toBe('ready');
  });

  it('resumes a blocked task to its prior status', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    await advanceTask(task.id); // proposed→ready
    await advanceTask(task.id); // ready→running
    await blockTask(task.id, 'Dep issue');
    const resumed = await resumeTask(task.id);
    expect(resumed.status).toBe('running');
    expect(resumed.blockedReason).toBeUndefined();
    expect(resumed.resumeFrom).toBeUndefined();
  });

  it('fails a task and records reason', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    const failed = await failTask(task.id, 'Requirement impossible');
    expect(failed.status).toBe('failed');
    expect(failed.failedReason).toBe('Requirement impossible');
  });

  it('resumes a failed task to proposed', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    await failTask(task.id, 'Build broke');
    const resumed = await resumeTask(task.id);
    expect(resumed.status).toBe('proposed');
  });

  it('refuses to block an already-completed task', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    const id = task.id;
    await advanceTask(id);
    await advanceTask(id);
    await advanceTask(id);
    await advanceTask(id); // completed
    await expect(blockTask(id, 'too late')).rejects.toThrow(/active/i);
  });

  it('refuses to resume an active task', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    await expect(resumeTask(task.id)).rejects.toThrow(/blocked or failed/i);
  });

  it('refuses to advance a blocked task', async () => {
    const project = await makeProject();
    const { task } = await makeTask(project.id);
    await blockTask(task.id, 'reason');
    await expect(advanceTask(task.id)).rejects.toThrow(/blocked/i);
  });
});
