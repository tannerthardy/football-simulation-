/** Saved-record controls only: a timing/identity report must never need new games. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compatibility, engineSettings, inputIdentity, provenance, sha256, type Card } from '../scripts/scorecard/provenance.js';
import { gameSpecs, makeLeague, type GameRec } from '../scripts/scorecard/records.js';

const game = (ms: number): GameRec => ({
  game: 0, league: 0, seed: 7, home: 'H', away: 'A', points: 40, totalYds: 600, penalties: 4,
  third: 10, thirdConv: 4, fga: 2, fgm: 1, xpa: 3, xpm: 3, fumLost: 0, punts: 6, tie: false,
  ms, plays: [], probe: {},
});
const legacy = (): Card => ({ meta: { commit: 'historical-pin', date: '2026-10-22', seed: 7,
  games: 1, leagues: 1, node: process.version }, arms: [{ name: 'saved', env: {}, games: [game(1000)] }] });
const current = (): Card => {
  const c = legacy();
  c.meta.provenance = { ...provenance(), cpuModel: 'test CPU', cpuQuotaCores: 4 };
  Object.assign(c.meta, { workersRequested: 4, workersUsed: 1, wallMs: 2500, probes: [] });
  c.meta.timing = { gameMs: 'simulateGame-elapsed', wallMs: 'collection-elapsed', cpu: 'not-collected' };
  Object.assign(c.arms[0], { workerProcesses: 1, settings: engineSettings({}) });
  c.arms[0].games[0].inputSha256 = 'fixed-input';
  return c;
};
const folders: string[] = [];
afterEach(() => folders.splice(0).forEach((p) => rmSync(p, { recursive: true, force: true })));
const folder = () => { const p = mkdtempSync(join(tmpdir(), 'scorecard-provenance-')); folders.push(p); return p; };
const save = (dir: string, name: string, c: Card) => { const p = join(dir, name); writeFileSync(p, JSON.stringify(c)); return p; };
const run = (args: string[]) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/scorecard/run.ts', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

describe('scorecard timing and provenance', () => {
  it('resolves source defaults and inherited/arm switches without recording unrelated secrets', () => {
    const defaults = engineSettings({});
    // Every source switch has exactly one FLAGS.md row, so a new flag needs its
    // row rather than a hand-edited count here.
    const registered = [...readFileSync('docs/FLAGS.md', 'utf8').matchAll(/^\| `([A-Z0-9_]+)` \|/gm)].map(m => m[1]);
    expect(new Set(registered).size).toBe(registered.length);
    expect(Object.keys(defaults).sort()).toEqual([...registered].sort());
    expect(defaults).toMatchObject({ LIVE_AIM: true, RUN_READ: false, RUN_CONTACT_COMPONENTS: true, SHED_PURSUE: true, PURSUE_AROUND: true,
      CF_FLOW: null, DEF_GETOFF: 1, GAIT_STEP: 0 });
    const resolved = engineSettings({ GH_TOKEN: 'never-record-this', RUN_READ: '1', LIVE_AIM: '0',
      DEF_GETOFF: '0.75', GAIT_STEP: '2', CF_FLOW: 'hold' });
    expect(resolved).toMatchObject({ RUN_READ: true, LIVE_AIM: false, DEF_GETOFF: .75, GAIT_STEP: 2, CF_FLOW: 'hold' });
    expect(JSON.stringify(resolved)).not.toContain('never-record-this');
    expect(() => engineSettings({ DEF_GETOFF: 'not-a-number' })).toThrow('Nonfinite engine setting');
    expect(() => engineSettings({}, "process.env.NEW_FLAG === '1' || process.env.NEW_FLAG === '2'"))
      .toThrow('Unsupported engine setting read');
    expect(() => engineSettings({}, "process.env['NEW_FLAG']"))
      .toThrow('Unsupported engine environment access');
  });

  it('identifies actual teams and options before simulation, without drawing another game', () => {
    const teams = makeLeague(7, 0), spec = gameSpecs(7, 1, 1)[0];
    const before = JSON.stringify(teams);
    const id = inputIdentity(spec, teams[spec.home], teams[spec.away], false);
    expect(inputIdentity(spec, teams[spec.home], teams[spec.away], false)).toBe(id);
    expect(JSON.stringify(teams)).toBe(before);
    expect(inputIdentity({ ...spec, seed: 8 }, teams[spec.home], teams[spec.away], false)).not.toBe(id);
    expect(inputIdentity(spec, teams[spec.home], teams[spec.away], true)).not.toBe(id);
    teams[spec.home].coach.passRate += .01;
    expect(inputIdentity(spec, teams[spec.home], teams[spec.away], false)).not.toBe(id);
  });

  it('captures separate engine, measurement and dependency content identities', () => {
    const p = provenance();
    for (const key of ['engineSha256', 'measurementSha256', 'lockfileSha256'] as const) expect(p[key]).toMatch(/^[a-f0-9]{64}$/);
    expect(p.lockfileSha256).toBe(sha256(readFileSync('package-lock.json', 'utf8')));
  });

  it('keeps source/settings differences visible as treatments, while checking measurement and inputs', () => {
    const a = current(), b = structuredClone(a);
    b.meta.provenance!.engineSha256 = 'candidate-engine';
    b.arms[0].settings!.RUN_READ = true;
    expect(compatibility(a, b, a.arms[0], b.arms[0])).toEqual({ measurements: [], timing: [] });
    b.meta.provenance!.measurementSha256 = 'different-operator';
    b.arms[0].games[0].inputSha256 = 'different-roster';
    expect(compatibility(a, b, a.arms[0], b.arms[0]).measurements).toEqual([
      'measurementSha256 differs', 'actual game inputs differ',
    ]);
  });

  it('separates worker-count differences from football measurement compatibility', () => {
    const a = current(), b = structuredClone(a);
    b.meta.workersUsed = 4;
    b.arms[0].workerProcesses = 4;
    const result = compatibility(a, b, a.arms[0], b.arms[0]);
    expect(result.measurements).toEqual([]);
    expect(result.timing).toContain('workersUsed differs');
    expect(result.timing).toContain('arm worker count differs');
  });

  it('reports legacy elapsed time, preserves missing metadata, and never upgrades the saved producer', () => {
    const dir = folder(), c = legacy(), input = save(dir, 'legacy.json', c), output = join(dir, 'copy.json');
    const bytes = readFileSync(input);
    const report = run(['--from', input, '--out', output, '--compare', input, '--metrics', 'points', '--splits', 'none']);
    expect(report).toContain('1.0 s elapsed per game');
    expect(report).toContain('Workers requested: unavailable');
    expect(report).toContain('Collection elapsed: unavailable');
    expect(report).toContain('CPU time: not collected');
    expect(report).not.toContain('s CPU per game');
    expect(report).toContain('Comparison unverified');
    expect(report).not.toContain('**moved**');
    expect(report).toContain('resolved engine switches: unavailable');
    expect(readFileSync(input)).toEqual(bytes);
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(c);
  });

  it('reports captured wall/workers and suppresses timing warnings for different worker conditions', () => {
    const dir = folder(), a = current(), b = structuredClone(a);
    b.arms[0].games[0].ms = 2000;
    const base = save(dir, 'base.json', a), input = save(dir, 'candidate.json', b);
    const report = run(['--from', input, '--compare', base, '--metrics', 'points', '--splits', 'none']);
    expect(report).toContain('Collection elapsed: 2.5 s');
    expect(report).toContain('Workers requested: 4; peak concurrent worker processes: 1');
    expect(report).toContain('100% more elapsed time per game');
    b.meta.workersUsed = 4;
    save(dir, 'candidate.json', b);
    const different = run(['--from', input, '--compare', base, '--metrics', 'points', '--splits', 'none']);
    expect(different).toContain('Elapsed slowdown guardrail unverified');
    expect(different).not.toContain('**Guardrail:**');
  });

  it('warns on a two-arm elapsed slowdown when shared host metadata is unavailable', () => {
    const dir = folder(), c = current();
    // A host without /sys/fs/cgroup/cpu.max records a null quota, not "unlimited".
    Object.assign(c.meta.provenance!, { cpuModel: null, cpuQuotaCores: null });
    c.arms[0].name = 'base';
    const slower = structuredClone(c.arms[0]);
    slower.name = 'slower';
    slower.games[0].ms = 1200;
    c.arms.push(slower);
    expect(compatibility(c, c, c.arms[0], slower).timing).toEqual([]);
    // Two independent captures with unknown hosts still cannot establish a match.
    const separate = structuredClone(c);
    expect(compatibility(c, separate, c.arms[0], separate.arms[1]).timing).toEqual([
      'cpuModel unavailable', 'cpuQuotaCores unavailable',
    ]);
    const input = save(dir, 'two-arm-no-quota.json', c);
    const report = run(['--from', input, '--metrics', 'points', '--splits', 'none']);
    expect(report).toContain('**Guardrail:** slower has 20% more elapsed time per game than base.');
    expect(report).toContain('cpuModel: unavailable');
    expect(report).toContain('cpuQuotaCores: unavailable');
    expect(report).not.toContain('Elapsed slowdown guardrail unverified');
  });

  it('rejects overwriting an input before either reporting or simulation', () => {
    const dir = folder(), input = save(dir, 'legacy.json', legacy()), bytes = readFileSync(input);
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/scorecard/run.ts', '--from', input, '--out', input],
      { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Cannot overwrite a saved scorecard input');
    expect(readFileSync(input)).toEqual(bytes);
  });
});
