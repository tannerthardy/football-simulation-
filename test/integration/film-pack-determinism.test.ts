import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import type { FilmPackManifest } from '../../scripts/film-pack-types.js';

const run = promisify(execFile);

describe('native film pack reproducibility', () => {
  it('builds one actual game twice with byte-identical manifest and film', async () => {
    mkdirSync('out', { recursive: true });
    const root = mkdtempSync('out/film-pack-determinism-');
    try {
      const first = join(root, 'first'), second = join(root, 'second');
      // Real CLI children keep the worker responsive during synchronous native
      // games; no RPC timeout override or simulation/identity assertion waiver.
      for (const out of [first, second]) await run(process.execPath,
        ['--import', 'tsx', 'scripts/film-pack.ts', '--seed', '101', '--games', '1', '--out', out]);
      const a = JSON.parse(readFileSync(join(first, 'manifest.json'), 'utf8')) as FilmPackManifest;
      const b = JSON.parse(readFileSync(join(second, 'manifest.json'), 'utf8')) as FilmPackManifest;
      expect(a.plays.length).toBeGreaterThan(0);
      expect(readFileSync(join(first, 'manifest.json')).equals(readFileSync(join(second, 'manifest.json')))).toBe(true);
      expect(b).toEqual(a);
      for (const part of a.parts) {
        expect(part.bytes).toBeLessThan(15_000_000);
        expect(readFileSync(join(first, part.file)).equals(readFileSync(join(second, part.file)))).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 240_000); // Two required native games; no broad campaign or statistical gate.
  // Raised from 180 s (CEO, 2026-10-28): develop already took 163 s on a 4-core cloud container, and the
  // engaged-flow law (#347) gives seed 101 more plays (134 -> 142) at 0.635 s each (was 0.596): 90 s per build.
});
