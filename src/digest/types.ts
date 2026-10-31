// Morning digest contract. Section 2 starts against this file.
// The reader issue replaces the body of readNight; the signature stays.

export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type DigestCounts = {
  ok: number;
  retry: number;
  fail: number;
};

export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
  counts: DigestCounts;
  empty: boolean;
};

export function readNight(runsDir: string, night: string): NightDigest {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented');
}
