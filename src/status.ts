import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import type { DigestCounts } from './digest/types.js';
import { openNight } from './digest/open-night.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightOnDisk = DigestCounts & { night: string };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightOnDisk[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): NightOnDisk[] {
  let names: string[];
  try {
    names = readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
  return names.map((night) => {
    const digest = openNight(runsDir, night);
    const counts = digest?.counts ?? { ok: 0, retry: 0, fail: 0 };
    return { night, ...counts };
  });
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir),
  };
}
