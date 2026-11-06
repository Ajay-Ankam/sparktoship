/**
 * Test helpers: set up an isolated data directory for each test suite
 * so tests don't interfere with each other or the user's real data.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

let tempDir: string | null = null;

/** Call once in beforeAll / beforeEach to get a fresh data directory. */
export function useTempDataDir(): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-test-'));
  process.env['STS_DATA_DIR'] = tempDir;
  return tempDir;
}

/** Remove temp directory after tests. */
export function cleanupTempDataDir(): void {
  if (tempDir) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
    tempDir = null;
    delete process.env['STS_DATA_DIR'];
  }
}
