import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { createProject, listProjects, getProject } from '../src/projects';

const BASE_INPUT = {
  name: 'my-app',
  description: 'A test project',
  workspacePath: 'C:\\Users\\test\\my-app',
};

describe('projects', () => {
  beforeEach(() => {
    useTempDataDir();
  });

  afterEach(() => {
    cleanupTempDataDir();
  });

  it('creates a project and returns it', async () => {
    const { project, created } = await createProject(BASE_INPUT);
    expect(created).toBe(true);
    expect(project.name).toBe('my-app');
    expect(project.id).toBeTruthy();
  });

  it('persists across reads', async () => {
    await createProject(BASE_INPUT);
    const projects = listProjects();
    expect(projects.length).toBe(1);
    expect(projects[0]!.name).toBe('my-app');
  });

  it('looks up by name case-insensitively', async () => {
    await createProject(BASE_INPUT);
    const p = getProject('MY-APP');
    expect(p?.name).toBe('my-app');
  });

  it('returns undefined for missing project', () => {
    const p = getProject('nonexistent');
    expect(p).toBeUndefined();
  });

  it('idempotent with same requestId and input', async () => {
    const r1 = await createProject({ ...BASE_INPUT, requestId: 'req-1' });
    const r2 = await createProject({ ...BASE_INPUT, requestId: 'req-1' });
    expect(r1.project.id).toBe(r2.project.id);
    expect(r2.created).toBe(false);
    expect(listProjects().length).toBe(1);
  });

  it('rejects same requestId with conflicting input', async () => {
    await createProject({ ...BASE_INPUT, requestId: 'req-dup' });
    await expect(
      createProject({ ...BASE_INPUT, name: 'different-name', requestId: 'req-dup' }),
    ).rejects.toThrow(/conflicting input/i);
  });

  it('handles Windows paths with spaces', async () => {
    const { project } = await createProject({
      ...BASE_INPUT,
      workspacePath: 'C:\\Users\\ajay ankam\\my project',
    });
    expect(project.workspacePath).toBe('C:\\Users\\ajay ankam\\my project');
    const fetched = getProject(project.id);
    expect(fetched?.workspacePath).toBe('C:\\Users\\ajay ankam\\my project');
  });
});
