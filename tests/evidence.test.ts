import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject } from '../src/projects';
import { createTask } from '../src/tasks';
import { addEvidence, listEvidence } from '../src/evidence';

async function setup() {
  const { project } = await createProject({
    name: 'ev-proj',
    description: 'desc',
    workspacePath: 'C:\\test\\ev-proj',
  });
  const { task } = await createTask({
    projectId: project.id,
    title: 'Test task',
    workflowType: 'prototype',
    scope: 'build it',
    acceptanceCriteria: ['it runs'],
  });
  return { project, task };
}

describe('evidence', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('records passed evidence', async () => {
    const { task } = await setup();
    const ev = await addEvidence({
      taskId: task.id,
      command: 'npm test',
      workingDirectory: 'C:\\test\\ev-proj',
      exitCode: 0,
      resultSummary: '5 tests passed',
      status: 'passed',
      gitCommit: 'abc1234',
    });
    expect(ev.status).toBe('passed');
    expect(ev.gitCommit).toBe('abc1234');
    expect(ev.taskId).toBe(task.id);
  });

  it('records failed evidence with non-zero exit code', async () => {
    const { task } = await setup();
    const ev = await addEvidence({
      taskId: task.id,
      command: 'npm test',
      workingDirectory: 'C:\\test\\ev-proj',
      exitCode: 1,
      resultSummary: '2 tests failed',
      status: 'failed',
      gitCommit: 'def5678',
    });
    expect(ev.status).toBe('failed');
    expect(ev.exitCode).toBe(1);
  });

  it('records not_run evidence', async () => {
    const { task } = await setup();
    const ev = await addEvidence({
      taskId: task.id,
      command: 'npm run typecheck',
      workingDirectory: 'C:\\test',
      exitCode: -1,
      resultSummary: 'skipped',
      status: 'not_run',
      gitCommit: 'aabbccdd',
    });
    expect(ev.status).toBe('not_run');
  });

  it('filters evidence by taskId', async () => {
    const { project } = await createProject({ name: 'p', description: '', workspacePath: 'C:\\p' });
    const { task: t1 } = await createTask({ projectId: project.id, title: 't1', workflowType: 'rescue', scope: 's', acceptanceCriteria: [] });
    const { task: t2 } = await createTask({ projectId: project.id, title: 't2', workflowType: 'story', scope: 's', acceptanceCriteria: [] });
    await addEvidence({ taskId: t1.id, command: 'cmd', workingDirectory: 'C:\\', exitCode: 0, resultSummary: 'ok', status: 'passed', gitCommit: 'abc1234' });
    await addEvidence({ taskId: t2.id, command: 'cmd', workingDirectory: 'C:\\', exitCode: 0, resultSummary: 'ok', status: 'passed', gitCommit: 'def5678' });
    expect(listEvidence(t1.id).length).toBe(1);
    expect(listEvidence(t2.id).length).toBe(1);
  });

  it('rejects invalid evidence status', async () => {
    const { task } = await setup();
    await expect(addEvidence({
      taskId: task.id,
      command: 'cmd',
      workingDirectory: 'C:\\',
      exitCode: 0,
      resultSummary: 'ok',
      status: 'unknown' as any,
      gitCommit: 'abc1234',
    })).rejects.toThrow(/evidence status/i);
  });

  it('rejects invalid git commit SHA', async () => {
    const { task } = await setup();
    await expect(addEvidence({
      taskId: task.id,
      command: 'cmd',
      workingDirectory: 'C:\\',
      exitCode: 0,
      resultSummary: 'ok',
      status: 'passed',
      gitCommit: 'not-a-sha!',
    })).rejects.toThrow(/git commit/i);
  });

  it('handles Windows paths with spaces in workingDirectory', async () => {
    const { task } = await setup();
    const dir = 'C:\\Users\\ajay ankam\\my project';
    const ev = await addEvidence({
      taskId: task.id,
      command: 'npm test',
      workingDirectory: dir,
      exitCode: 0,
      resultSummary: 'ok',
      status: 'passed',
      gitCommit: 'abc1234',
    });
    expect(ev.workingDirectory).toBe(dir);
    const all = listEvidence(task.id);
    expect(all[0]!.workingDirectory).toBe(dir);
  });

  it('rejects evidence for non-existent task', async () => {
    await expect(addEvidence({
      taskId: 'missing-id',
      command: 'cmd',
      workingDirectory: 'C:\\',
      exitCode: 0,
      resultSummary: 'ok',
      status: 'passed',
      gitCommit: 'abc1234',
    })).rejects.toThrow(/task not found/i);
  });
});
