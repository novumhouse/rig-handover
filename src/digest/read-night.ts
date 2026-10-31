import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestCounts, DigestRow, NightDigest, RunStatus } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export class NightMissingError extends Error {
  readonly night: string;

  constructor(night: string) {
    super(`no run log for ${night}`);
    this.name = 'NightMissingError';
    this.night = night;
  }
}

type ParsedLine = {
  at: string;
  atMs: number;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
  index: number;
};

function isEnoent(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function parseLine(line: string, index: number): ParsedLine | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.at !== 'string' || typeof record.job !== 'string') return null;
  if (record.status !== 'ok' && record.status !== 'retry' && record.status !== 'fail') return null;
  if (!(record.owner === null || typeof record.owner === 'string')) return null;
  if (record.error !== undefined && typeof record.error !== 'string') return null;
  const atMs = Date.parse(record.at);
  if (Number.isNaN(atMs)) return null;
  return {
    at: record.at,
    atMs,
    job: record.job,
    status: record.status,
    owner: record.owner,
    error: record.error ?? null,
    index,
  };
}

function fold(lines: ParsedLine[]): DigestRow {
  const ordered = [...lines].sort((a, b) => a.atMs - b.atMs || a.index - b.index);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) {
    throw new Error('fold called with no lines');
  }
  let retries = 0;
  // Keep the latest error string. A later ok does not erase why the job retried.
  let lastError: string | null = null;
  for (const line of ordered) {
    if (line.status === 'retry') retries += 1;
    if (line.error) lastError = line.error;
  }
  return {
    job: first.job,
    owner: last.owner,
    runs: ordered.length,
    retries,
    lastStatus: last.status,
    lastError,
    firstAt: first.at,
    lastAt: last.at,
  };
}

export function readNight(runsDir: string, night: string): NightDigest {
  if (!NIGHT.test(night)) throw new NightMissingError(night);
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (error) {
    if (isEnoent(error)) throw new NightMissingError(night);
    throw error;
  }

  const counts: DigestCounts = { ok: 0, retry: 0, fail: 0 };
  const byJob = new Map<string, ParsedLine[]>();
  let badLines = 0;
  let sawContent = false;

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.trim() === '') continue;
    sawContent = true;
    const parsed = parseLine(line, index);
    if (!parsed) {
      badLines += 1;
      continue;
    }
    counts[parsed.status] += 1;
    const group = byJob.get(parsed.job);
    if (group) group.push(parsed);
    else byJob.set(parsed.job, [parsed]);
  }

  const rows = [...byJob.values()]
    .map((group) => fold(group))
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  return { rows, badLines, counts, empty: !sawContent };
}
