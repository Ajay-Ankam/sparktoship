/**
 * Persistent JSON store with atomic writes and cross-process locking.
 *
 * Storage location: .sparktoship/ inside the process working directory
 * (or the directory supplied via STS_DATA_DIR env var).
 *
 * Each collection lives in its own JSON file so agent processes can hold
 * locks for the minimum necessary time and do not block each other on
 * unrelated collections.
 *
 * Atomic write: data is written to a sibling .tmp file first, then renamed
 * over the target atomically (single syscall on Windows NTFS via
 * fs.renameSync with the MOVEFILE_REPLACE_EXISTING flag provided by Node).
 *
 * Per-collection locking: proper-lockfile creates a lock directory (advisory)
 * next to each file. This guards against two processes reading stale data,
 * applying independent mutations, and racing to write.
 *
 * Idempotency lock: `withIdempotencyLock` provides a single coarse-grained
 * lock (idempotency.lock) that must be held for the entire
 * check-request → create-entity → record-request sequence. This prevents
 * two concurrent processes that both pass the initial checkRequest from each
 * creating a duplicate entity before either has recorded its request entry.
 * Lock ordering: idempotency.lock is always acquired BEFORE any
 * collection lock, ensuring no deadlock.
 */

import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import type { StoreData } from './types.js';

// ─── Path helpers ──────────────────────────────────────────────────────────────

export function getDataDir(): string {
  return process.env['STS_DATA_DIR'] ?? path.join(process.cwd(), '.sparktoship');
}

function collectionPath(dir: string, name: keyof StoreData): string {
  return path.join(dir, `${name}.json`);
}

// ─── Initialisation ───────────────────────────────────────────────────────────

function ensureFile(filePath: string, defaultValue: unknown[]): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
}

export function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const collections: Array<keyof StoreData> = [
    'projects',
    'tasks',
    'evidence',
    'handoffs',
    'requests',
  ];
  for (const col of collections) {
    ensureFile(collectionPath(dir, col), []);
  }
  // Ensure the idempotency lock sentinel file exists.
  const idempotencyLockFile = path.join(dir, 'idempotency.lock');
  if (!fs.existsSync(idempotencyLockFile)) {
    fs.writeFileSync(idempotencyLockFile, '', 'utf8');
  }
}

// ─── Atomic write ─────────────────────────────────────────────────────────────

function atomicWrite(filePath: string, data: unknown[]): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ─── Generic read/write with locking ─────────────────────────────────────────

type CollectionName = keyof StoreData;

/**
 * Read a collection. Callers should prefer `withCollection` to ensure
 * lock/unlock is always paired.
 */
function readCollection<K extends CollectionName>(
  dir: string,
  name: K,
): StoreData[K] {
  const filePath = collectionPath(dir, name);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as StoreData[K];
}

/**
 * Acquire an exclusive lock on a single collection file, run `fn` with the
 * current array, persist any changes (the return value replaces the array),
 * then release the lock.
 *
 * `fn` returns `{ data, result }`:
 *   - `data`   – the (possibly mutated) array to persist
 *   - `result` – arbitrary value to return to the caller
 */
export async function withCollection<K extends CollectionName, R>(
  name: K,
  fn: (current: StoreData[K]) => { data: StoreData[K]; result: R },
): Promise<R> {
  ensureDataDir();
  const dir = getDataDir();
  const filePath = collectionPath(dir, name);

  const release = await lockfile.lock(filePath, {
    retries: { retries: 5, minTimeout: 50, maxTimeout: 200 },
    stale: 10_000,
  });
  try {
    const current = readCollection(dir, name);
    const { data, result } = fn(current);
    atomicWrite(filePath, data as unknown[]);
    return result;
  } finally {
    await release();
  }
}

/**
 * Read a collection without locking (safe for read-only queries where
 * stale-by-milliseconds is acceptable).
 */
export function readCollectionSync<K extends CollectionName>(name: K): StoreData[K] {
  ensureDataDir();
  const dir = getDataDir();
  return readCollection(dir, name);
}

// ─── Idempotency lock ─────────────────────────────────────────────────────────

/**
 * Acquire the single idempotency lock before running `fn`.
 *
 * All operations that follow the check-request → create-entity →
 * record-request pattern MUST acquire this lock first so that the entire
 * sequence is atomic relative to other callers, including those in separate
 * OS processes.
 *
 * Lock ordering rule: idempotency.lock is always acquired BEFORE any
 * collection lock. Never acquire idempotency.lock while already holding a
 * collection lock.
 */
export async function withIdempotencyLock<R>(fn: () => Promise<R>): Promise<R> {
  ensureDataDir();
  const dir = getDataDir();
  const lockFile = path.join(dir, 'idempotency.lock');

  const release = await lockfile.lock(lockFile, {
    retries: { retries: 10, minTimeout: 50, maxTimeout: 300 },
    stale: 15_000,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

// ─── Hashing for duplicate detection ─────────────────────────────────────────

import crypto from 'crypto';

export function hashInput(input: unknown): string {
  const normalised = JSON.stringify(input, Object.keys(input as object).sort());
  return crypto.createHash('sha256').update(normalised).digest('hex').slice(0, 16);
}
