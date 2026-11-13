/** Offline report contracts only: no game collection or new statistical method. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rateCounts, changeReading } from '../scripts/scorecard/format.js';
import { METRICS, evaluate, interval, type Metric } from '../scripts/scorecard/metrics.js';
import type { Card } from '../scripts/scorecard/provenance.js';
import type { GameRec, PlayRec } from '../scripts/scorecard/records.js';

const metric = (id: string) => METRICS.find(m => m.id === id)!;
const play = (o: Partial<PlayRec> = {}): PlayRec => ({
  kind: 'pass', down: 1, dist: 10, yl: 25, quarter: 1, concept: 'smash', coverage: 'cover3', family: 'zone',
  formation: 'gun', personnel: '11', playAction: false, yards: 8, att: true, comp: true, sack: false,
  int: false, td: false, scramble: false, throwaway: false, missed: 0, broken: 0, firstDown: false, ...o,
});
const game = (i: number, o: Partial<GameRec> = {}): GameRec => ({
  game: i, league: 0, seed: 100 + i, home: 'H', away: 'A', points: 40, totalYds: 600, penalties: 4,
  third: 10, thirdConv: 4, fga: 0, fgm: 0, xpa: 0, xpm: 0, fumLost: 0, punts: 6, tie: false,
  ms: 1000, plays: [], probe: {}, inputSha256: `synthetic-input-${i}`, ...o,
});
const card = (games: GameRec[]): Card => ({
  meta: { commit: 'synthetic-producer', date: '2026-10-24', games: games.length, leagues: 1, seed: 7,
    node: process.version, probes: [], workersUsed: 1,
    timing: { gameMs: 'simulateGame-elapsed', wallMs: 'collection-elapsed', cpu: 'not-collected' },
    provenance: { engineSha256: 'fixture-engine', measurementSha256: 'fixture-measurements', lockfileSha256: 'fixture-lock',
      platform: process.platform, arch: process.arch, execution: 'node --import tsx', cpuModel: 'fixture CPU', cpuQuotaCores: 1 } },
  arms: [{ name: 'fixture', env: {}, settings: {}, workerProcesses: 1, games }],
});
const folders: string[] = [];
afterEach(() => folders.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
function report(saved: Card, base?: Card, metrics = 'fg', splits = 'none') {
  const dir = mkdtempSync(join(tmpdir(), 'scorecard-report-')); folders.push(dir);
  const input = join(dir, 'saved.json'), output = join(dir, 'copy.json'), prior = join(dir, 'base.json');
  writeFileSync(input, JSON.stringify(saved));
  const bytes = readFileSync(input);
  if (base) writeFileSync(prior, JSON.stringify(base));
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/scorecard/run.ts', '--from', input,
    '--out', output, '--metrics', metrics, '--splits', splits, '--min-plays', '1', '--probes', 'none',
    ...(base ? ['--compare', prior] : [])], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain('zero games simulated');
  expect(readFileSync(input)).toEqual(bytes);
  expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(saved);
  return result.stdout;
}

describe('honest saved-card uncertainty and exposure', () => {
  it('shows all-success exposure and keeps the existing zero-width interval without implying certainty', () => {
    const c = card([game(0, { fga: 17, fgm: 17 })]);
    const before = structuredClone(c), m = metric('fg');
    expect(evaluate(m, c.arms[0].games)).toEqual({ value: 100, n: 17 });
    expect(interval(m, c.arms[0].games)).toEqual([100, 100]);
    const text = report(c);
    expect(text).toContain('| FG % | 100.0% (17/17) | 100.0% to 100.0% |');
    expect(text).toContain('not a certain future success rate');
    expect(text).toContain('zero-width interval');
    expect(c).toEqual(before);
    expect(interval(m, c.arms[0].games)).toEqual([100, 100]);
  });

  it('reads one failure from stored counts, retaining the rate and interval', () => {
    const c = card([game(0, { fga: 17, fgm: 16 })]), m = metric('fg');
    const before = { estimate: evaluate(m, c.arms[0].games), ci: interval(m, c.arms[0].games) };
    expect(report(c)).toContain('| FG % | 94.1% (16/17) | 94.1% to 94.1% |');
    expect({ estimate: evaluate(m, c.arms[0].games), ci: interval(m, c.arms[0].games) }).toEqual(before);
    expect(before.estimate.value).toBe(16 / 17 * 100);
  });

  it('distinguishes recorded zero exposure from missing legacy counts', () => {
    expect(report(card([game(0)]))).toContain('| FG % | — (0/0; no exposure) | — to — |');
    const legacy = game(0);
    delete (legacy as Partial<GameRec>).fgm;
    delete (legacy as Partial<GameRec>).fga;
    expect(report(card([legacy]))).toContain('| FG % | — (counts unavailable) | — to — |');
  });

  it('does not turn a missing legacy outcome boolean or probe counter into an observed zero', () => {
    const legacy = play(); delete (legacy as Partial<PlayRec>).int;
    const games = [game(0, { plays: [legacy] })];
    // Preserve this existing numeric callback behavior; qualify the missing count.
    expect(evaluate(metric('int'), games).value).toBe(0);
    expect(rateCounts(metric('int'), games)).toBe(' (counts unavailable)');
    expect(report(card(games), undefined, 'int')).toContain('0.0% (counts unavailable)');
    const probe: Metric = { id: 'probe', label: 'Probe rate', scale: 100, probe: { num: 'hits', den: 'eligible' } };
    expect(rateCounts(probe, [game(0, { probe: { eligible: 20 } })])).toBe(' (counts unavailable)');
    expect(rateCounts(probe, [game(0, { probe: { hits: 0, eligible: 20 } })])).toBe(' (0/20)');
  });

  it('retains resolved differences and ranking while calling them estimates', () => {
    const base = card(Array.from({ length: 4 }, (_, i) => game(i, { fga: 4, fgm: 1 })));
    const now = card(Array.from({ length: 4 }, (_, i) => game(i, { fga: 4, fgm: 3 })));
    expect(interval(metric('fg'), now.arms[0].games, base.arms[0].games)).toEqual([50, 50]);
    const text = report(now, base);
    expect(text).toContain('| FG % | 25.0% (4/16) | 75.0% (12/16) | +50.0 | +50.0 to +50.0 | **moved** |');
    expect(text).toContain('## Largest estimated changes');
    expect(text).toContain('(n=16): 25.0% (4/16) → 75.0% (12/16)');
    expect(text).not.toContain('Biggest real moves');
  });

  it('describes an interval spanning zero as unresolved rather than noise', () => {
    const base = card(Array.from({ length: 4 }, (_, i) => game(i, { fga: 4, fgm: 2 })));
    const now = card(Array.from({ length: 4 }, (_, i) => game(i, { fga: 4, fgm: i % 2 ? 3 : 1 })));
    const ci = interval(metric('fg'), now.arms[0].games, base.arms[0].games);
    expect(ci[0]).toBeLessThan(0); expect(ci[1]).toBeGreaterThan(0);
    const text = report(now, base);
    expect(text).toContain('not resolved by this sample');
    expect(text).not.toContain('noise');
    expect(text).not.toContain('## Largest estimated changes');
    expect(interval(metric('fg'), now.arms[0].games, base.arms[0].games)).toEqual(ci);
    expect(changeReading(50, 50, 0, 0, true)).toBe('not resolved by this sample');
  });

  it('keeps incompatible or missing provenance unverified even when point estimates differ', () => {
    const base = card([game(0, { fga: 4, fgm: 1 })]);
    const now = card([game(0, { fga: 4, fgm: 3 })]);
    now.meta.provenance!.measurementSha256 = 'different-operator';
    const incompatible = report(now, base);
    expect(incompatible).toContain('measurementSha256 differs');
    expect(incompatible).toContain('| unverified |');
    expect(incompatible).not.toContain('**moved**');
    expect(incompatible).not.toContain('not resolved by this sample');
    delete now.meta.provenance;
    const missing = report(now, base);
    expect(missing).toContain('engine source identity unavailable');
    expect(missing).toContain('| unverified |');
    expect(changeReading(0, 1, NaN, NaN, true)).toBe('interval unavailable');
    expect(changeReading(NaN, 1, NaN, NaN, true)).toBe('unavailable');
  });

  it('uses actual split eligibility for counts and preserves the interval marker', () => {
    const rows = [play({ concept: 'smash', int: true }), play({ concept: 'smash' }),
      play({ concept: 'drive' }), play({ concept: 'drive', att: false, sack: true })];
    const c = card([game(0, { plays: rows })]);
    expect(rateCounts(metric('int'), c.arms[0].games, p => p.concept === 'drive')).toBe(' (0/1)');
    const text = report(c, c, 'int', 'concept');
    expect(text).toContain('| smash | 2 | 50.0% (1/2) → 50.0% (1/2) |');
    expect(text).toContain('| drive | 2 | 0.0% (0/1) → 0.0% (0/1) |');
    expect(text).toContain('◆ marks a cell whose 90% change interval excludes zero.');
  });
});
