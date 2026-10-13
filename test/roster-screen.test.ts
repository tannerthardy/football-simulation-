import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PlaySim } from '../src/sim/playsim.js';
import { casesFor, caseKey, digest, runScreen, simulateCase, validateBaseline, type Fixture, type Provenance, type Measurement } from '../scripts/roster-screen.js';
import { auditBudget } from '../scripts/roster-audit.js';

const fixture: Fixture = JSON.parse(readFileSync('config/roster-screen.json', 'utf8'));
const provenance: Provenance = { sourceSha256: 'baseline-source', node: process.version, platform: process.platform, arch: process.arch,
  dependenciesSha256: 'deps', collectorSha256: 'collector', fixtureSha256: 'fixture', flags: { FLAG: '1' }, worldDefaults: {}, measurementVersion: 1 };
const result: Measurement = { signature: 'unchanged', outcome: 'tackle', yards: 4, yac: 2, completed: true, missed: 0, broken: 0, duration: 3 };
const dirs: string[] = [];
const temporary = () => { const path = mkdtempSync(join(tmpdir(), 'roster-screen-')); dirs.push(path); return path; };
afterEach(() => { for (const p of dirs.splice(0)) rmSync(p, { recursive: true, force: true }); });

describe('bounded roster screen and evidence reuse', () => {
  it('plans 32 fixed cases, supports an 8-snap call subset and never reshuffles the fixture', () => {
    const before = digest(fixture), all = casesFor(fixture);
    expect(all).toHaveLength(32);
    expect(casesFor(fixture, ['mesh'])).toHaveLength(8);
    expect(casesFor(fixture, ['mesh'], ['ordinary'])).toHaveLength(2);
    expect(new Set(all.map(c => c.inputSha256)).size).toBe(32);
    expect(digest(fixture)).toBe(before);
    expect(() => casesFor(fixture, ['unknown'])).toThrow('Unknown screen call');
    expect(() => runScreen([...all, all[0]], provenance, { cache: temporary(), simulate: () => result })).toThrow('32-snap');
  });

  it('reuses exact per-case evidence across full and subset runs, but invalidates every material provenance input', () => {
    const cases = casesFor(fixture, ['mesh'], ['ordinary']), cache = temporary(); let executed = 0;
    const simulate = () => { executed++; return result; };
    const baseline = runScreen(cases, provenance, { cache, simulate });
    expect(baseline.executed).toBe(2);
    const repeat = runScreen([cases[0]], provenance, { cache, simulate });
    expect([repeat.executed, repeat.cached, executed]).toEqual([0, 1, 2]);
    for (const k of Object.keys(provenance)) {
      const changed = { ...provenance, [k]: `different-${k}` } as unknown as Provenance;
      expect(caseKey(cases[0], changed)).not.toBe(caseKey(cases[0], provenance));
    }
    expect(caseKey({ ...cases[0], inputSha256: 'different-player' }, provenance)).not.toBe(caseKey(cases[0], provenance));
    const candidate = { ...provenance, sourceSha256: 'candidate' };
    expect(() => validateBaseline(baseline, cases, candidate, provenance.sourceSha256, provenance.flags)).not.toThrow();
    expect(() => validateBaseline(baseline, cases, { ...candidate, measurementVersion: 2 }, provenance.sourceSha256, provenance.flags)).toThrow('compatibility');
    expect(() => validateBaseline({ ...baseline, status: 'failed' }, cases, candidate, provenance.sourceSha256, provenance.flags)).toThrow('incomplete');
  });

  it('rejects corrupt cache data without silently repeating or accepting it', () => {
    const cases = casesFor(fixture, ['mesh'], ['ordinary']), cache = temporary();
    const first = runScreen(cases, provenance, { cache, simulate: () => result });
    const path = join(cache, `${first.rows[0].key}.json`);
    writeFileSync(path, JSON.stringify({ ...first.rows[0], result: { ...result, yards: 99 } }));
    const repeat = runScreen(cases, provenance, { cache, simulate: () => { throw new Error('must not run'); } });
    expect(repeat.status).toBe('failed'); expect(repeat.executed).toBe(0);
    expect(repeat.error).toContain('Invalid cached evidence');
  });

  it('stops on a declared unaffected-control regression and retains skipped cases', () => {
    const cases = casesFor(fixture, ['mesh']), cache = temporary();
    const baseline = runScreen(cases, provenance, { cache, simulate: () => result });
    const candidate = runScreen(cases, { ...provenance, sourceSha256: 'candidate' }, { cache, baseline,
      unchanged: [cases.at(-1)!.id], simulate: () => ({ ...result, signature: 'changed' }) });
    expect(candidate.status).toBe('failed'); expect(candidate.executed).toBe(1);
    expect(candidate.rows[0].caseId).toBe(cases.at(-1)!.id); expect(candidate.skipped).toHaveLength(7);
  });

  it('does not stop early on favorable results, and never passes exhausted budgets or nonfinite results', () => {
    const cases = casesFor(fixture, ['mesh']);
    const complete = runScreen(cases, provenance, { cache: temporary(), simulate: () => result });
    expect([complete.status, complete.executed]).toEqual(['complete', 8]);
    const limited = runScreen(cases, provenance, { cache: temporary(), maxMs: 0, simulate: () => result });
    expect([limited.status, limited.executed]).toEqual(['budget-exhausted', 0]);
    const invalid = runScreen(cases, provenance, { cache: temporary(), simulate: () => ({ ...result, yards: NaN }) });
    expect(invalid.status).toBe('failed'); expect(invalid.rows).toHaveLength(0);
  });

  it('enforces tick-boundary budgets without changing native execution or RNG', () => {
    const c = casesFor(fixture, ['slant_flat'], ['ordinary'])[0];
    const measured = simulateCase(c, Infinity), sim = new PlaySim(structuredClone(c.setup)), r = sim.run();
    expect(measured.signature).toBe(digest({ result: { ...r, frames: undefined, telemetry: undefined },
      bodies: sim.agents.map(a => a.body), minds: sim.agents.map(a => a.mind), rng: sim.rng, perception: sim.perception, intents: sim.intents }));
    expect(() => simulateCase(c, 0)).toThrow('Wall budget exhausted');
  });

  it('reports the expensive audit bill without executing it', () => {
    expect(auditBudget('games', { teams: 64, pairs: 12, reps: 8 }).games).toBe(96);
    expect(auditBudget('encounters', { teams: 64, pairs: 12, reps: 8 }).snaps).toBe(6912);
    expect(auditBudget('profiles', { teams: 8, pairs: 1, reps: 1 })).toEqual({ profiles: 1272, snaps: 0, games: 0 });
    const command = ['--import', 'tsx', 'scripts/roster-audit.ts', 'games'];
    const implicit = spawnSync(process.execPath, command, { encoding: 'utf8' });
    expect(implicit.status).toBe(1); expect(implicit.stderr).toContain('Specify --pairs and --reps');
    const unreasoned = spawnSync(process.execPath, [...command, '--pairs', '1', '--reps', '1'], { encoding: 'utf8' });
    expect(unreasoned.status).toBe(1); expect(unreasoned.stderr).toContain('--checkpoint');
    const plan = spawnSync(process.execPath, [...command, '--plan'], { encoding: 'utf8' });
    expect(plan.status).toBe(0); expect(JSON.parse(plan.stdout)).toMatchObject({ simulations: 0, budget: { games: 96 } });
  });
});
