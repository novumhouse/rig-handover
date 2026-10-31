import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const digest = readNight('runs', '2026-10-28');

  it('returns 5 jobs and 1 bad line', () => {
    expect(digest.badLines).toBe(1);
    expect(digest.empty).toBe(false);
    expect(digest.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('keeps a null owner and counts retries without dropping the row', () => {
    const render = digest.rows.find((row) => row.job === 'digest/render');
    const refresh = digest.rows.find((row) => row.job === 'fixtures/refresh');
    const sync = digest.rows.find((row) => row.job === 'lane/sync');
    const backup = digest.rows.find((row) => row.job === 'notes/backup');
    expect(render).toMatchObject({
      owner: null,
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T05:41:09+01:00',
      lastAt: '2026-10-29T05:41:09+01:00',
    });
    expect(refresh).toMatchObject({
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(sync).toMatchObject({
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(backup).toMatchObject({
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });

  it('counts ok, retry, and fail lines', () => {
    expect(digest.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });
});
