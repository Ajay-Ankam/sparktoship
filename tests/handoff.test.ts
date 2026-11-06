import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject } from '../src/projects';
import { createTask, advanceTask } from '../src/tasks';
import { addEvidence } from '../src/evidence';
import { createHandoff, listHandoffs } from '../src/handoff';

async function setupReadyForHandoff() {
  const { project } = await createProject({
    name: 'handoff-proj',
    description: 'desc',
    workspacePath: 'C:\\test\\handoff-proj',
  });
  const { task } = await createTask({
    projectId: project.id,
    title: 'Review this',
    workflowType: 'prototype',
    scope: 'build a thing',
    acceptanceCriteria: ['works'],
  });
  // Advance to awaiting_review
  await advanceTask(task.id); // proposed→ready
  await advanceTask(task.id); // ready→running
  await advanceTask(task.id); // running→awaiting_review

  const ev = await addEvidence({
    taskId: task.id,
    command: 'npm test',
    workingDirectory: 'C:\\test',
    exitCode: 0,
    resultSummary: 'All tests pass',
    status: 'passed',
    gitCommit: 'abc1234567',
  });

  return { project, task, ev };
}

describe('handoff', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('creates a handoff for a task in awaiting_review', async () => {
    const { task, ev } = await setupReadyForHandoff();
    const { handoff, created } = await createHandoff({
      taskId: task.id,
      targetAgent: 'sparktoship-reviewer',
      commit: 'abc1234567',
      evidenceIds: [ev.id],
      limitations: ['End-to-end flow not yet wired'],
      requestId: 'h-req-1',
    });
    expect(created).toBe(true);
    expect(handoff.targetAgent).toBe('sparktoship-reviewer');
    expect(handoff.evidenceIds).toContain(ev.id);
    expect(handoff.limitations.length).toBe(1);
  });

  it('idempotent with same requestId', async () => {
    const { task, ev } = await setupReadyForHandoff();
    const input = {
      taskId: task.id,
      targetAgent: 'sparktoship-reviewer',
      commit: 'abc1234567',
      evidenceIds: [ev.id],
      limitations: [],
      requestId: 'h-req-idem',
    };
    const r1 = await createHandoff(input);
    const r2 = await createHandoff(input);
    expect(r1.handoff.id).toBe(r2.handoff.id);
    expect(r2.created).toBe(false);
  });

  it('rejects if task not in awaiting_review', async () => {
    const { project } = await createProject({ name: 'p', description: '', workspacePath: 'C:\\p' });
    const { task } = await createTask({ projectId: project.id, title: 't', workflowType: 'story', scope: 's', acceptanceCriteria: [] });
    // task is still 'proposed'
    await expect(createHandoff({
      taskId: task.id,
      targetAgent: 'reviewer',
      commit: 'abc1234',
      evidenceIds: [],
      limitations: [],
    })).rejects.toThrow(/awaiting_review/i);
  });

  it('rejects if evidence belongs to different task', async () => {
    const { task: t1, ev } = await setupReadyForHandoff();

    // Create a second task at awaiting_review
    const { project } = await createProject({ name: 'p2', description: '', workspacePath: 'C:\\p2' });
    const { task: t2 } = await createTask({ projectId: project.id, title: 't2', workflowType: 'rescue', scope: 's', acceptanceCriteria: [] });
    await advanceTask(t2.id);
    await advanceTask(t2.id);
    await advanceTask(t2.id);

    // ev belongs to t1, but we're making a handoff for t2
    await expect(createHandoff({
      taskId: t2.id,
      targetAgent: 'reviewer',
      commit: 'abc1234567',
      evidenceIds: [ev.id],
      limitations: [],
    })).rejects.toThrow(/belongs to task/i);
  });

  it('rejects an invalid commit SHA', async () => {
    const { task } = await setupReadyForHandoff();
    await expect(createHandoff({
      taskId: task.id,
      targetAgent: 'reviewer',
      commit: 'not-a-sha!!',
      evidenceIds: [],
      limitations: [],
    })).rejects.toThrow(/git commit/i);
  });

  it('filters handoffs by taskId', async () => {
    const { task, ev } = await setupReadyForHandoff();
    await createHandoff({
      taskId: task.id,
      targetAgent: 'reviewer',
      commit: 'abc1234567',
      evidenceIds: [ev.id],
      limitations: [],
    });
    expect(listHandoffs(task.id).length).toBe(1);
    expect(listHandoffs('other-id').length).toBe(0);
  });
});
