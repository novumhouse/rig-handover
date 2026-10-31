import { NightMissingError, readNight } from './read-night.js';
import type { NightDigest } from './types.js';

export function openNight(runsDir: string, night: string): NightDigest | null {
  try {
    return readNight(runsDir, night);
  } catch (error) {
    if (error instanceof NightMissingError) return null;
    throw error;
  }
}
