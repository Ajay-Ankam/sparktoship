/**
 * Tests for P2: exit code validation.
 *
 * parseInt('garbage') produces NaN; JSON.stringify(NaN) produces "null".
 * The fix: validateExitCode in evidence.ts rejects non-integers before
 * persistence. parseIntArg in cli.ts rejects before the value reaches
 * addEvidence at all.
 */

import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject } from '../src/projects';
import { createTask } from '../src/tasks';
import { addEvidence } from '../src/evidence';

async function setup() {
  const { project } = await createProject({
    name: 'exit-code-proj',
    description: 'desc',
    workspacePath: 'C:\\test',
  });
  const { task } = await createTask({
    projectId: project.id,
    title: 'Test task',
    workflowType: 'prototype',
    scope: 'build it',
    acceptanceCriteria: ['runs'],
  });
  return task;
}

const VALID_BASE = {
  command: 'npm test',
  workingDirectory: 'C:\\test',
  resultSummary: 'ok',
  status: 'passed' as const,
  gitCommit: 'abc1234',
};

describe('evidence exit code validation', () => {
  beforeEach(() => { useTempDataDir(); });
  afterEach(() => { cleanupTempDataDir(); });

  it('accepts exit code 0', async () => {
    const task = await setup();
    const ev = await addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: 0 });
    expect(ev.exitCode).toBe(0);
  });

  it('accepts non-zero exit code', async () => {
    const task = await setup();
    const ev = await addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: 1, status: 'failed' });
    expect(ev.exitCode).toBe(1);
  });

  it('accepts negative exit code (e.g. killed process)', async () => {
    const task = await setup();
    const ev = await addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: -1, status: 'not_run' });
    expect(ev.exitCode).toBe(-1);
  });

  it('rejects NaN exit code', async () => {
    const task = await setup();
    await expect(
      addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: NaN }),
    ).rejects.toThrow(/exit code must be an integer/i);
  });

  it('rejects Infinity exit code', async () => {
    const task = await setup();
    await expect(
      addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: Infinity }),
    ).rejects.toThrow(/exit code must be an integer/i);
  });

  it('rejects float exit code', async () => {
    const task = await setup();
    await expect(
      addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: 1.5 }),
    ).rejects.toThrow(/exit code must be an integer/i);
  });

  it('does not persist on NaN — no evidence record created', async () => {
    const task = await setup();
    try {
      await addEvidence({ taskId: task.id, ...VALID_BASE, exitCode: NaN });
    } catch {
      // expected
    }
    const { listEvidence } = await import('../src/evidence');
    expect(listEvidence(task.id).length).toBe(0);
  });
});
