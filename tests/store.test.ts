import { useTempDataDir, cleanupTempDataDir } from './helpers';
import { ensureDataDir, readCollectionSync, withCollection, hashInput } from '../src/store';

describe('store', () => {
  beforeEach(() => {
    useTempDataDir();
  });

  afterEach(() => {
    cleanupTempDataDir();
  });

  it('creates all collection files on first use', () => {
    ensureDataDir();
    const projects = readCollectionSync('projects');
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(0);
  });

  it('writes and reads back a record', async () => {
    await withCollection('projects', (projects) => ({
      data: [...projects, { id: '1', name: 'test', description: '', workspacePath: 'C:\\test', createdAt: '', updatedAt: '' }],
      result: null,
    }));

    const projects = readCollectionSync('projects');
    expect(projects.length).toBe(1);
    expect(projects[0]!.name).toBe('test');
  });

  it('returns the value from the callback', async () => {
    const result = await withCollection('projects', (projects) => ({
      data: projects,
      result: 42,
    }));
    expect(result).toBe(42);
  });

  it('hashInput returns a stable string', () => {
    const a = hashInput({ foo: 'bar', baz: 1 });
    const b = hashInput({ baz: 1, foo: 'bar' });
    // Same keys and values in different order should hash the same
    // (we sort keys in hashInput)
    expect(typeof a).toBe('string');
    expect(a.length).toBe(16);
    // Note: JSON.stringify with sorted keys makes order-independent hashes
    expect(a).toBe(b);
  });

  it('hashInput differs for different inputs', () => {
    const a = hashInput({ foo: 'bar' });
    const b = hashInput({ foo: 'baz' });
    expect(a).not.toBe(b);
  });
});
