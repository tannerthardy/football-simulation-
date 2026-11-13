import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { eventDevelopCommit, filmPackOptions } from '../scripts/film-pack.js';
import { fieldZone, selectFilmPlays, stratifiedSample, stratum, type SelectionPlay } from '../scripts/film-pack-selection.js';
import { renderFilmPart, splitFilmParts } from '../scripts/film-pack-render.js';
import { packReplayPlay } from '../scripts/replay-data.js';
import type { WeirdEvent } from '../scripts/scorecard/weird/types.js';

const play = (n: number, change: Partial<SelectionPlay> = {}): SelectionPlay => ({
  id: `G1-P${String(n).padStart(3, '0')}`, game: 1, kind: 'run', down: 1, distance: 10, yardline: 30,
  call: 'Inside zone', defense: 'Cover 3', yards: 4, filmed: true, nullified: false,
  flags: { big: false, sack: false, to: false }, ...change,
});
const event = (n: number, detector: WeirdEvent['detector'], severity = 1): WeirdEvent => ({
  id: play(n).id, play: n, detector, severity, t0: 1, t1: 2, players: ['LB_M'], text: 'Inspect this episode',
});

describe('film pack sampling', () => {
  it('allocates proportionally while retaining sparse cells, with isolated seeded sampling', () => {
    const population = [...Array(80).fill('a'), ...Array(20).fill('b')].map((cell, id) => ({ cell, id }));
    const first = stratifiedSample(population, p => p.cell, 10, new Rng(7));
    expect(first.strata).toEqual([{ key: 'a', population: 80, selected: 8 }, { key: 'b', population: 20, selected: 2 }]);
    expect(first.items).toEqual(stratifiedSample(population, p => p.cell, 10, new Rng(7)).items);
    expect(new Set(first.items.map(p => p.id)).size).toBe(10);
    expect(first.items).not.toEqual(stratifiedSample(population, p => p.cell, 10, new Rng(8)).items);
    const rare = stratifiedSample([...population, { cell: 'rare', id: 101 }], p => p.cell, 4, new Rng(7));
    expect(rare.strata.every(c => c.selected >= 1)).toBe(true);
  });

  it('reports impossible quotas and preserves all non-empty cells without padding', () => {
    const selected = selectFilmPlays([play(1), play(2, { down: 2 }), play(3, { down: 3 })], [], 7,
      { ordinary: 2, 'watch-first': 40, 'big-plays': 20 });
    expect(selected.plays).toHaveLength(3);
    expect(selected.selection.notes.join('\n')).toContain('3 non-empty strata exceed ordinary quota 2');
    expect(selected.selection.counts).toEqual({ ordinary: 3, 'watch-first': 0, 'big-plays': 0 });
    expect(stratifiedSample([], String, 120, new Rng(7)).items).toEqual([]);
  });

  it('uses run/pass, down, distance and offensive field-zone boundaries', () => {
    expect(stratum(play(1, { kind: 'pass', down: 4, distance: 3, yardline: 20 }))).toBe('pass/down-4/short/own-20');
    expect(stratum(play(1, { distance: 4, yardline: 80 }))).toBe('run/down-1/medium/red-zone');
    expect(stratum(play(1, { distance: 7, yardline: 79 }))).toBe('run/down-1/medium/middle');
    expect(stratum(play(1, { distance: 8 }))).toContain('/long/');
    expect(fieldZone(21)).toBe('middle');
  });

  it('keeps groups disjoint and caps noisy detectors at ten unique selected plays', () => {
    const population = Array.from({ length: 100 }, (_, n) => play(n + 1,
      { flags: { big: true, sack: false, to: false } }));
    const events = population.flatMap((p, i) => [event(i + 1, 'stuck', i + 1), event(i + 1, 'turned', 0.01)]);
    const result = selectFilmPlays(population, events, 101, { ordinary: 20, 'watch-first': 40, 'big-plays': 20 });
    expect(new Set(result.plays.map(p => p.id)).size).toBe(result.plays.length);
    expect(result.plays.filter(p => p.detector?.id === 'stuck')).toHaveLength(10);
    expect(result.plays.filter(p => p.detector?.id === 'turned')).toHaveLength(10);
    expect(result.selection.counts).toEqual({ ordinary: 20, 'watch-first': 20, 'big-plays': 20 });
    expect(result.selection.detectorEvents).toEqual({ stuck: 100, turned: 100 });
    expect(result.selection.notes.join('\n')).toContain('under the 10-per-detector cap');
    const reordered = selectFilmPlays(population.slice().reverse(), events, 101,
      { ordinary: 20, 'watch-first': 40, 'big-plays': 20 });
    expect(reordered).toEqual(result);
  });

  it('ranks frequency times severity, and ordinary selection does not depend on outcomes', () => {
    const population = Array.from({ length: 30 }, (_, n) => play(n + 1));
    const events = [event(1, 'turned', 10), ...Array.from({ length: 20 }, (_, i) => event(i + 2, 'stuck', 1))];
    const result = selectFilmPlays(population, events, 19, { ordinary: 1, 'watch-first': 2, 'big-plays': 0 });
    expect(result.plays.filter(p => p.group === 'watch-first').map(p => p.detector?.id)).toEqual(['stuck', 'stuck']);
    expect(result.plays.filter(p => p.group === 'watch-first').map(p => p.detector?.rankScore)).toEqual([20, 20]);
    const changed = population.map(p => ({ ...p, yards: 99, flags: { ...p.flags, big: true } }));
    expect(selectFilmPlays(changed, [], 19, { ordinary: 1, 'watch-first': 2, 'big-plays': 0 }).plays[0].id)
      .toBe(result.plays[0].id);
  });

  it('accounts for excluded inputs and rejects ambiguous IDs or invalid detector scores', () => {
    const result = selectFilmPlays([play(1), play(2, { nullified: true }), play(3, { filmed: false }),
      play(4, { kind: 'punt' }), play(5, { distance: NaN })], [], 7);
    expect(result.selection.population).toEqual({ total: 5, eligible: 1,
      excluded: { nullified: 1, 'no-body-frames': 1, 'not-run-or-pass': 1, 'invalid-situation': 1 } });
    expect(() => selectFilmPlays([play(1), play(1)], [], 7)).toThrow('Duplicate input play id');
    expect(() => selectFilmPlays([play(1)], [event(1, 'stuck', NaN)], 7)).toThrow('Invalid event severity');
  });

  it('carries an added candidate detector through the existing ranking and ten-play cap', () => {
    const population = Array.from({ length: 20 }, (_, n) => play(n + 1));
    const events = population.map((_, n) => ({ ...event(n + 1, 'frozen', n + 1), candidate: true as const }));
    const result = selectFilmPlays(population, events, 19, { ordinary: 1, 'watch-first': 40, 'big-plays': 0 });
    const watch = result.plays.filter(p => p.group === 'watch-first');
    expect(watch).toHaveLength(10);
    expect(watch.every(p => p.detector?.id === 'frozen' && p.detector.candidate
      && p.detector.frequency === 20 && p.detector.rankScore === 20 * p.detector.severity)).toBe(true);
    expect(new Set(result.plays.map(p => p.id)).size).toBe(11);
  });
});

describe('film pack documents and command', () => {
  it('qualifies shallow CI source identity against actual merge parents', () => {
    const base = 'a'.repeat(40), branch = 'b'.repeat(40), merge = 'c'.repeat(40);
    const commit = `tree ${'d'.repeat(40)}\nparent ${base}\nparent ${branch}\n\nMerge PR`;
    const event = { pull_request: { base: { ref: 'develop', sha: base }, head: { sha: branch } } };
    expect(eventDevelopCommit(merge, commit, event)).toBe(base);
    expect(eventDevelopCommit(merge, commit, { pull_request: { ...event.pull_request, head: { sha: merge } } })).toBeUndefined();
    expect(eventDevelopCommit(merge, commit, { pull_request: { ...event.pull_request, base: { ref: 'main', sha: base } } })).toBeUndefined();
    expect(eventDevelopCommit(merge, '', event)).toBeUndefined();
    expect(eventDevelopCommit(base, '', { ref: 'refs/heads/develop', after: base })).toBe(base);
    expect(eventDevelopCommit(branch, '', { ref: 'refs/heads/develop', after: base })).toBeUndefined();
  });

  it('splits by actual UTF-8 bytes and rejects an oversized individual clip', () => {
    const render = (items: string[]) => `<p>${items.join('')}</p>`;
    const parts = splitFilmParts(['éé', 'éé', 'éé'], render, 16);
    expect(parts.map(p => p.items.length)).toEqual([2, 1]);
    expect(parts.every(p => p.bytes === Buffer.byteLength(p.html) && p.bytes < 16)).toBe(true);
    expect(() => splitFilmParts(['ééééé'], render, 16)).toThrow('One film clip cannot fit');
    expect(splitFilmParts([], render)).toEqual([]);
  });

  it('uses the existing body renderer and review grouping without altering football calls', () => {
    const template = readFileSync('viewer/replay.template.html', 'utf8');
    const clip = packReplayPlay({ index: 0, quarter: 1, clock: 900, offense: 'IRN', down: 1, distance: 10,
      yardline: 25, call: 'Test', defense: 'Cover 3', text: '</script><script>bad()</script>', yards: 4,
      score: { home: 0, away: 0 }, kind: 'run', replay: { los: 25, firstDownX: 35, flip: false,
        players: [{ team: 'O', slot: 'RB', name: 'Runner', jersey: 28, pos: 'RB' }], events: [],
        frames: [{ t: 0, agents: [25, 26, 0], ball: [25, 26, 1], carrier: 0 },
          { t: 0.1, agents: [26, 26, 0], ball: [26, 26, 1], carrier: 0 }] } }, 0);
    const selection = selectFilmPlays([play(1)], [], 7).plays[0];
    const before = JSON.stringify(clip);
    const html = renderFilmPart(template, { meta: {}, games: [], catalog: {} }, [{ clip, selection }]);
    expect(html).toContain('<option value="_filmPackGroup" selected>');
    expect(html).toContain('20 pair slots reserved for F2');
    expect(html).toContain('1. Ordinary');
    expect(html).not.toContain('<details open>'); // The index must not bury the viewer below 180 reasons.
    expect(html).toContain('<canvas');
    expect(html).not.toContain('</script><script>bad()');
    expect(JSON.stringify(clip)).toBe(before);
    expect(() => renderFilmPart('missing', { meta: {}, games: [], catalog: {} }, [])).toThrow('Replay template contract changed');
  });

  it('accepts the documented command and rejects missing, repeated and invalid inputs', () => {
    expect(filmPackOptions(['--seed', '101', '--games', '12', '--out', 'out/film-pack/review']))
      .toEqual({ seed: 101, games: 12, out: 'out/film-pack/review' });
    expect(filmPackOptions(['--run-only', '--seed', '11', '--games', '2']))
      .toEqual({ seed: 11, games: 2, out: 'out/film-pack/seed11-run', runOnly: true });
    for (const args of [['--seed'], ['--games', '0'], ['--games', '1.5'], ['--seed', '-1'],
      ['--seed', '4294967295', '--games', '2'], ['--games', '1', '--games', '2'], ['--unknown', '1'], ['--run-only', '--run-only'], ['--run-only', 'yes']]) {
      expect(() => filmPackOptions(args)).toThrow();
    }
  });
});
