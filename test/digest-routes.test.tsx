import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import type { NightDigest } from '../src/digest/types.js';

function jobsIn(html: string): string[] {
  return [...html.matchAll(/data-job="([^"]+)"/g)].map((match) => match[1] ?? '');
}

describe('digest routes', () => {
  let dir = '';

  afterEach(() => {
    if (dir !== '') rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  function appWith(files: Record<string, string>) {
    dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(dir, name), body);
    }
    const config: RigConfig = {
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir: dir,
    };
    return createApp(config);
  }

  const night = '2026-10-28';
  const rotate =
    '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}\n';
  const sync =
    '{"at":"2026-10-28T23:10:00+01:00","job":"lane/sync","status":"fail","owner":null,"error":"nope"}\n';

  it('returns 200 and the same jobs, in the same order, on the page and the JSON', async () => {
    const app = appWith({ [`${night}.jsonl`]: sync + rotate });
    const page = await app.request(`/digest/${night}`);
    const json = await app.request(`/api/digest/${night}`);
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);
    const body = (await json.json()) as NightDigest;
    expect(body.rows.map((row) => row.job)).toEqual(['lane/sync', 'rig/rotate-logs']);
    expect(jobsIn(await page.text())).toEqual(body.rows.map((row) => row.job));
  });

  it('returns 404 for a night with no file', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-02')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-02')).status).toBe(404);
  });

  it('renders nothing ran for an empty night', async () => {
    const app = appWith({ [`${night}.jsonl`]: '' });
    const page = await app.request(`/digest/${night}`);
    const json = await app.request(`/api/digest/${night}`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(await json.json()).toMatchObject({ empty: true, rows: [], badLines: 0 });
  });

  it('renders a night with a bad line', async () => {
    const app = appWith({ [`${night}.jsonl`]: `${rotate}{"job":\n` });
    const page = await app.request(`/digest/${night}`);
    const json = await app.request(`/api/digest/${night}`);
    expect(page.status).toBe(200);
    const body = (await json.json()) as NightDigest;
    expect(body.badLines).toBe(1);
    expect(jobsIn(await page.text())).toEqual(['rig/rotate-logs']);
    expect(body.rows.map((row) => row.job)).toEqual(['rig/rotate-logs']);
  });
});
