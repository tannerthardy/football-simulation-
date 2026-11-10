import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { runFilmPairs } from '../scripts/film-pairs.js';
import { selections, setupSchema, outcome, executionBytes } from '../scripts/film-pairs/model.js';
import { renderPairs } from '../scripts/film-pairs/render.js';
import { firstDifference } from '../scripts/diag/saved-play.js';

describe('matched snap film pairs', () => {
  it('rejects ambiguous/unresolved inputs and incompatible setup contracts', () => {
    expect(() => selections({ format: 'film-pairs-v1', plays: ['missing'] })).toThrow('Unresolved');
    expect(() => selections({ format: 'film-pairs-v1', plays: [{ id: 'a', path: 'a.bin', seed: 7 }] })).toThrow('Ambiguous');
    expect(() => selections({ format: 'film-pairs-v1', plays: [{ id: 'a', path: 'a.bin' }, { id: 'a', path: 'b.bin' }] })).toThrow('duplicate');
    expect(selections({ format: 'film-pairs-v1', sources: { a: { path: 'a.bin' } }, plays: ['a'] }).plays[0].path).toBe('a.bin');
    expect(setupSchema('export interface PlaySetup { seed: number; }')).not.toBe(setupSchema('export interface PlaySetup { seed: number; newField: boolean; }'));
    expect(() => setupSchema('unknown')).toThrow('missing');
    expect(executionBytes({a:undefined})).not.toEqual(executionBytes({}));
    expect(executionBytes(-0)).not.toEqual(executionBytes(0));
    expect(executionBytes(NaN)).not.toEqual(executionBytes(null));
  });

  it('captures three ordinary snaps once and reports no change on the SAME pinned commit', () => {
    const parent = resolve('out'); mkdirSync(parent, { recursive: true });
    const dir = mkdtempSync(resolve(parent, 'film-pairs-selftest-'));
    const beforeStatus = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const file = resolve(dir, 'selection.json');
    // Plays 5-7: with the QB's throwing motion (#408) plays 3 and 4 of this game are no longer scrimmage snaps.
    writeFileSync(file, JSON.stringify({ format: 'film-pairs-v1', plays: [5, 6, 7].map(play => ({ id: `same-P${play}`, seed: 7, game: 1, play, note: 'same ref native control' })) }));
    try {
      const batch = runFilmPairs({ base: sha, head: sha, plays: file, out: resolve(dir, 'batch') });
      const registered = execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
      expect(registered.split('\n').filter(line => line.startsWith('worktree ' + dir + '/'))).toEqual([]);
      expect(batch.captureCount).toBe(3);
      expect(batch.pairs.map(p => [p.noChange, p.firstDifference])).toEqual([[true, null], [true, null], [true, null]]);
      expect(batch.htmlBytes).toBeLessThan(15_000_000);
      const html = readFileSync(resolve(dir, 'batch/index.html'), 'utf8');
      expect(html).toContain('byte-identical complete recorded values');
      expect(html).toContain('Same snap, two engines');
      expect(html).toContain('Download this viewer');
      expect(existsSync(resolve(dir, 'batch/before-preflight.bin'))).toBe(true);
      expect(existsSync(resolve(dir, 'batch/after-preflight.bin'))).toBe(true);
      expect(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })).toBe(beforeStatus);
      const registry = resolve(dir, 'registry.json');
      const captured = JSON.parse(readFileSync(resolve(dir, 'batch/captured.json'), 'utf8'));
      writeFileSync(registry, JSON.stringify({ format: 'film-pairs-v1', sources: Object.fromEntries(captured.map((p: any) => [p.id, { path: p.path, sha256: p.fileSha256 }])), plays: captured.map((p: any) => p.id) }));
      expect(selections(JSON.parse(readFileSync(registry, 'utf8'))).plays).toHaveLength(3);
    } finally {
      const registered = execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
      if (!registered.split('\n').some(line => line.startsWith('worktree ' + dir + '/')))
        rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);

  it('labels missing contact unknown, preserves event times and safely embeds notes', () => {
    const summary = outcome({ yards: 2, outcome: 'tackle', events: [{ t: 1.2, type: 'block_contact' }, { t: 2.2, type: 'tackle_wrap' }, { t: 3, type: 'tackle' }] } as any);
    expect(summary.firstContact).toBe(2.2);
    expect(outcome({ yards: 0, outcome: 'incomplete', events: [] } as any).firstContact).toBeNull();
    const arm = { summary, frames: [], players: [], los: 40 };
    const html = renderPairs([{ id: 'a', note: '</script><script>bad()</script>', noChange: true, firstDifference: null, before: arm, after: arm }], 'base', 'head');
    expect(html).not.toContain('</script><script>bad()');
    expect(html).toContain('\\u003c/script>');
    expect(firstDifference({ t: .4, pos: 1 }, { t: .4, pos: 2 })).toMatchObject({ time: .4, timeBasis: 'recorded' });
  });
});
