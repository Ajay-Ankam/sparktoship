/**
 * Concurrency and idempotency tests.
 *
 * These run in a single Node process but use Promise.all to simulate
 * concurrent callers racing on the same requestId. The idempotency lock
 * (`withIdempotencyLock`) must serialise them so only one entity is ever
 * created for a given requestId+input combination.
 */

import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject, listProjects } from '../src/projects';
import { createTask, listTasks } from '../src/tasks';
import { addEvidence } from '../src/evidence';
import { createHandoff } from '../src/handoff';
import { advanceTask } from '../src/tasks';

const BASE_PROJECT = {
  name: 'concurrent-proj',
  description: 'desc',
  workspacePath: 'C:\\Users\\test\\concurrent-proj',
};

describe('concurrent identical createProject with same requestId', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('produces exactly one project when raced', async () => {
    const CONCURRENCY = 8;
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        createProject({ ...BASE_PROJECT, requestId: 'race-proj-1' }),
      ),
    );

    // All calls must resolve successfully.
    expect(results.length).toBe(CONCURRENCY);

    // Every result must reference the same project id.
    const ids = new Set(results.map((r) => r.project.id));
    expect(ids.size).toBe(1);

    // Exactly one call reports `created: true`; the rest report `created: false`.
    const createdCount = results.filter((r) => r.created).length;
    expect(createdCount).toBe(1);

    // Exactly one project persisted.
    expect(listProjects().length).toBe(1);
  });

  it('rejects all callers when requestId is reused with conflicting input', async () => {
    // First call succeeds.
    await createProject({ ...BASE_PROJECT, requestId: 'conflict-proj-1' });

    // Concurrent calls with different input must all throw.
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        createProject({
          ...BASE_PROJECT,
          name: 'different-name',
          requestId: 'conflict-proj-1',
        }),
      ),
    );

    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect((r as PromiseRejectedResult).reason.message).toMatch(/conflicting input/i);
    }

    // Still only the original project exists.
    expect(listProjects().length).toBe(1);
    expect(listProjects()[0]!.name).toBe('concurrent-proj');
  });
});

describe('concurrent identical createTask with same requestId', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('produces exactly one task when raced', async () => {
    const { project } = await createProject(BASE_PROJECT);
    const CONCURRENCY = 6;

    const taskInput = {
      projectId: project.id,
      title: 'Concurrent task',
      workflowType: 'rescue' as const,
      scope: 'do something',
      acceptanceCriteria: ['it works'],
      requestId: 'race-task-1',
    };

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => createTask(taskInput)),
    );

    const ids = new Set(results.map((r) => r.task.id));
    expect(ids.size).toBe(1);

    const createdCount = results.filter((r) => r.created).length;
    expect(createdCount).toBe(1);

    expect(listTasks(project.id).length).toBe(1);
  });
});

describe('concurrent identical createHandoff with same requestId', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('produces exactly one handoff when raced', async () => {
    const { project } = await createProject(BASE_PROJECT);
    const { task } = await createTask({
      projectId: project.id,
      title: 'Handoff task',
      workflowType: 'prototype',
      scope: 'build it',
      acceptanceCriteria: ['runs'],
    });

    // Advance to awaiting_review
    await advanceTask(task.id);
    await advanceTask(task.id);
    await advanceTask(task.id);

    const ev = await addEvidence({
      taskId: task.id,
      command: 'npm test',
      workingDirectory: 'C:\\test',
      exitCode: 0,
      resultSummary: 'ok',
      status: 'passed',
      gitCommit: 'abc1234567',
    });

    const handoffInput = {
      taskId: task.id,
      targetAgent: 'sparktoship-reviewer',
      commit: 'abc1234567',
      evidenceIds: [ev.id],
      limitations: [],
      requestId: 'race-handoff-1',
    };

    const CONCURRENCY = 5;
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => createHandoff(handoffInput)),
    );

    const ids = new Set(results.map((r) => r.handoff.id));
    expect(ids.size).toBe(1);

    const createdCount = results.filter((r) => r.created).length;
    expect(createdCount).toBe(1);
  });
});
