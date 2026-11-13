/** Opt-in transfer screen. Default invocation plans zero simulations.
 * Run through baseline.mjs. --baseline creates/reuses the pinned reference;
 * --compare path executes only missing candidate cases, at most 32 snaps.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Player } from '../src/players/types.js';
import type { OffSlot, DefSlot } from '../src/playbook/types.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import { sourceVersion } from './source-version.js';

export const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileDigest = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const collectorDigest = () => digest({ screen: fileDigest(import.meta.filename), sourceVersion: fileDigest('scripts/source-version.ts') });
export interface Fixture {
  schemaVersion: number; id: string; source: string; selection: string;
  calls: Array<{ id: string; coverage: string }>; seeds: number[];
  matchups: Array<{ id: string; rationale: string; vector: Record<string, number>;
    offense: Partial<Record<OffSlot, Player>>; defense: Partial<Record<DefSlot, Player>> }>;
}
export interface Case { id: string; setup: PlaySetup; inputSha256: string }
export function casesFor(fixture: Fixture, calls?: string[], matchups?: string[]): Case[] {
  if (fixture.schemaVersion !== 1 || fixture.matchups.length !== 4 || fixture.calls.length !== 4 || fixture.seeds.length !== 2)
    throw new Error('Screen fixture must have four matchups, four calls and two seeds');
  for (const id of calls ?? []) if (!fixture.calls.some(c => c.id === id)) throw new Error(`Unknown screen call: ${id}`);
  for (const id of matchups ?? []) if (!fixture.matchups.some(m => m.id === id)) throw new Error(`Unknown screen matchup: ${id}`);
  const cases: Case[] = [];
  for (const m of fixture.matchups.filter(m => !matchups || matchups.includes(m.id))) {
    for (const players of [m.offense, m.defense]) if (Object.values(players).length !== 11 || new Set(Object.values(players).map(p => p!.id)).size !== 11)
      throw new Error(`Incomplete or duplicate lineup: ${m.id}`);
    for (const c of fixture.calls.filter(c => !calls || calls.includes(c.id))) for (const seed of fixture.seeds) {
      if (!RUN_BY_ID[c.id] && !PASS_BY_ID[c.id]) throw new Error(`Missing playbook call: ${c.id}`);
      if (!COVERAGE_BY_ID[c.coverage]) throw new Error(`Missing coverage: ${c.coverage}`);
      const run = RUN_BY_ID[c.id];
      const setup: PlaySetup = { offense: structuredClone(m.offense), defense: structuredClone(m.defense),
        offCall: run ? { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run, label: c.id }
          : { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[c.id], label: c.id },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[c.coverage], pressure: null, label: c.coverage },
        los: 35, ballY: 160 / 6, firstDownX: 45, seed, audibles: false };
      cases.push({ id: `${m.id}/${c.id}/${seed}`, setup, inputSha256: digest(setup) });
    }
  }
  if (!cases.length || cases.length > 32 || new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Screen must contain 1–32 distinct cases');
  return cases;
}
export interface Provenance { sourceSha256: string; node: string; platform: string; arch: string;
  dependenciesSha256: string; collectorSha256: string; fixtureSha256: string;
  flags: Record<string, string | null>; worldDefaults: unknown; measurementVersion: number }
export interface Measurement { signature: string; outcome: string; yards: number; yac: number | null;
  completed: boolean; missed: number; broken: number; duration: number; initialProfilesSha256?: string }
export interface Entry { caseId: string; inputSha256: string; key: string; provenance: Provenance;
  result: Measurement; resultSha256: string; wallMs: number; cpuMs: number }
export interface Report { schemaVersion: number; status: 'complete' | 'failed' | 'budget-exhausted';
  provenance: Provenance; planned: number; executed: number; cached: number; elapsedMs: number;
  rows: Array<Entry & { cacheHit: boolean; unchanged?: boolean; deltaYards?: number; deltaYac?: number | null }>;
  skipped: string[]; error?: string }
export const caseKey = (c: Case, provenance: Provenance) => digest({ schemaVersion: 1, caseId: c.id, inputSha256: c.inputSha256, provenance });
class BudgetExceeded extends Error {}
function finite(v: unknown): void {
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Nonfinite simulation result');
  if (v && typeof v === 'object') for (const x of Object.values(v)) finite(x);
}
function validEntry(entry: Entry, c: Case, provenance: Provenance): void {
  if (entry.key !== caseKey(c, provenance) || entry.caseId !== c.id || entry.inputSha256 !== c.inputSha256
    || digest(entry.provenance) !== digest(provenance) || digest(entry.result) !== entry.resultSha256)
    throw new Error(`Invalid cached evidence: ${c.id}`);
  finite(entry.result);
}
export function validateBaseline(baseline: Report, cases: Case[], provenance: Provenance, pinnedSource: string, pinnedFlags: unknown): void {
  if (baseline.schemaVersion !== 1 || baseline.status !== 'complete' || baseline.rows.length !== baseline.planned
    || baseline.skipped.length || baseline.error) throw new Error('Baseline is incomplete or failed');
  if (baseline.provenance.sourceSha256 !== pinnedSource || digest(baseline.provenance.flags) !== digest(pinnedFlags))
    throw new Error('Baseline must use the pinned runtime and flags');
  for (const k of ['node', 'platform', 'arch', 'dependenciesSha256', 'collectorSha256', 'fixtureSha256', 'measurementVersion', 'worldDefaults'] as const)
    if (digest(baseline.provenance[k]) !== digest(provenance[k])) throw new Error(`Baseline compatibility mismatch: ${k}`);
  if (new Set(baseline.rows.map(r => r.caseId)).size !== baseline.rows.length) throw new Error('Duplicate baseline evidence');
  for (const c of cases) {
    const row = baseline.rows.find(r => r.caseId === c.id);
    if (!row) throw new Error(`Baseline does not contain ${c.id}`);
    validEntry(row, c, baseline.provenance);
  }
}
function atomic(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n'); renameSync(tmp, path);
}
export function runScreen(cases: Case[], provenance: Provenance, opts: {
  cache: string; maxMs?: number; caseMs?: number; baseline?: Report; unchanged?: string[];
  simulate: (c: Case, budgetMs: number) => Measurement;
}): Report {
  if (!cases.length || cases.length > 32) throw new Error('Screen exceeds the 32-snap budget');
  const protectedIds = new Set(opts.unchanged ?? []);
  for (const id of protectedIds) if (!cases.some(c => c.id === id)) throw new Error(`Unknown protected case: ${id}`);
  if (protectedIds.size && !opts.baseline) throw new Error('Protected controls require a baseline');
  // Put declared unaffected controls first so regressions stop the expensive tail.
  const ordered = [...cases].sort((a, b) => Number(protectedIds.has(b.id)) - Number(protectedIds.has(a.id)));
  const start = performance.now();
  const report: Report = { schemaVersion: 1, status: 'complete', provenance, planned: cases.length, executed: 0, cached: 0,
    elapsedMs: 0, rows: [], skipped: [] };
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    try {
      const key = caseKey(c, provenance), path = join(opts.cache, `${key}.json`);
      let entry: Entry, cacheHit = false;
      if (existsSync(path)) {
        entry = JSON.parse(readFileSync(path, 'utf8')); validEntry(entry, c, provenance); report.cached++; cacheHit = true;
      } else {
        if (opts.maxMs !== undefined && performance.now() - start >= opts.maxMs) {
          report.status = 'budget-exhausted'; report.skipped = ordered.slice(i).map(r => r.id); break;
        }
        const wall = performance.now(), cpu = process.cpuUsage(); report.executed++;
        const remaining = opts.maxMs === undefined ? Infinity : opts.maxMs - (performance.now() - start);
        const result = opts.simulate(c, Math.min(opts.caseMs ?? Infinity, remaining)); finite(result);
        const used = process.cpuUsage(cpu);
        entry = { caseId: c.id, inputSha256: c.inputSha256, key, provenance, result, resultSha256: digest(result),
          wallMs: performance.now() - wall, cpuMs: (used.user + used.system) / 1000 };
        atomic(path, entry);
      }
      const row: Report['rows'][number] = { ...entry, cacheHit };
      const b = opts.baseline?.rows.find(r => r.caseId === c.id);
      if (b) { row.unchanged = b.result.signature === row.result.signature; row.deltaYards = row.result.yards - b.result.yards;
        row.deltaYac = row.result.yac === null || b.result.yac === null ? null : row.result.yac - b.result.yac; }
      report.rows.push(row);
      if (protectedIds.has(c.id) && !row.unchanged) throw new Error(`Protected unchanged control regressed: ${c.id}`);
    } catch (error) {
      report.status = error instanceof BudgetExceeded ? 'budget-exhausted' : 'failed';
      report.error = `${c.id}: ${String(error)}`; report.skipped = ordered.slice(i + 1).map(r => r.id); break;
    }
  }
  report.elapsedMs = performance.now() - start;
  return report;
}
export function simulateCase(c: Case, budgetMs: number): Measurement {
  const start = performance.now(), sim = new PlaySim(structuredClone(c.setup));
  const initialProfilesSha256 = digest(sim.agents.map(a => ({ slot: a.slot, position: a.player.position, energy: a.body.energy, profile: a.profile })));
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    if (performance.now() - start >= budgetMs) throw new BudgetExceeded(`Wall budget exhausted at simulation t=${sim.t}; no completed result cached`);
    tick();
  };
  const r = sim.run();
  finite([r, sim.agents.map(a => [a.pos, a.vel])]);
  return { signature: digest({ result: { ...r, frames: undefined, telemetry: undefined }, bodies: sim.agents.map(a => a.body),
    minds: sim.agents.map(a => a.mind), rng: sim.rng, perception: sim.perception, intents: sim.intents }),
    outcome: r.outcome, yards: r.offenseYards, yac: r.stats.completed ? r.stats.yac ?? null : null,
    completed: r.stats.completed, missed: r.stats.missedTackles, broken: r.stats.brokenTackles, duration: r.duration, initialProfilesSha256 };
}
async function main() {
  const args = process.argv.slice(2);
  let baselineMode = false, plan = false, compare: string | undefined, calls: string[] | undefined, matchups: string[] | undefined;
  let out: string | undefined, cache = 'out/roster-screen/cache', maxMs = 30000, caseMs = 5000, unchanged: string[] = [];
  while (args.length) {
    const a = args.shift();
    if (a === '--baseline') baselineMode = true;
    else if (a === '--plan') plan = true;
    else if (['--compare', '--calls', '--matchups', '--out', '--cache', '--max-ms', '--case-ms', '--unchanged'].includes(a!)) {
      const v = args.shift(); if (!v || v.startsWith('--')) throw new Error(`Missing value: ${a}`);
      if (a === '--compare') compare = v;
      if (a === '--calls') calls = v.split(','); if (a === '--matchups') matchups = v.split(',');
      if (a === '--out') out = v; if (a === '--cache') cache = v; if (a === '--unchanged') unchanged = v.split(',');
      if (a === '--max-ms') { maxMs = Number(v); if (!Number.isFinite(maxMs) || maxMs <= 0) throw new Error('max-ms must be positive'); }
      if (a === '--case-ms') { caseMs = Number(v); if (!Number.isFinite(caseMs) || caseMs <= 0) throw new Error('case-ms must be positive'); }
    } else throw new Error(`Unknown argument: ${a}`);
  }
  if (baselineMode && compare) throw new Error('Choose baseline or compare');
  const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
  const fixture: Fixture = JSON.parse(readFileSync('config/roster-screen.json', 'utf8'));
  const cases = casesFor(fixture, calls, matchups);
  if (plan || (!baselineMode && !compare)) {
    console.log(JSON.stringify({ mode: 'plan', simulations: 0, plannedSnaps: cases.length, maxSnaps: 32,
      matchups: fixture.matchups.map(({ id, rationale, vector }) => ({ id, rationale, vector })), cases: cases.map(c => c.id) }, null, 2)); return;
  }
  if (process.versions.node !== profile.nodeVersion) throw new Error(`Use Node ${profile.nodeVersion}`);
  const source = sourceVersion();
  const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
  if (baselineMode && (source !== profile.sourceSha256 || digest(flags) !== digest(profile.flags)))
    throw new Error('Baseline collection requires the pinned runtime and flags via baseline.mjs');
  // Measurement/helper contents, not unrelated tests/docs, invalidate this cache.
  const provenance: Provenance = { sourceSha256: source, node: process.version, platform: process.platform, arch: process.arch,
    dependenciesSha256: fileDigest('package-lock.json'), collectorSha256: collectorDigest(),
    fixtureSha256: fileDigest('config/roster-screen.json'), flags, worldDefaults: profile.worldDefaults, measurementVersion: 1 };
  const baseline: Report | undefined = compare ? JSON.parse(readFileSync(compare, 'utf8')) : undefined;
  if (baseline) validateBaseline(baseline, cases, provenance, profile.sourceSha256, profile.flags);
  out ??= baselineMode ? 'out/roster-screen/baseline.json' : 'out/roster-screen/candidate.json';
  if (compare && resolve(out) === resolve(compare)) throw new Error('Candidate output must not overwrite the baseline');
  const report = runScreen(cases, provenance, { cache, maxMs, caseMs, baseline, unchanged, simulate: simulateCase });
  if (source !== sourceVersion() || provenance.collectorSha256 !== collectorDigest()
    || provenance.fixtureSha256 !== fileDigest('config/roster-screen.json') || provenance.dependenciesSha256 !== fileDigest('package-lock.json')) {
    report.status = 'failed'; report.error = 'Inputs changed during screening';
    for (const r of report.rows) if (!r.cacheHit) unlinkSync(join(cache, `${r.key}.json`));
  }
  atomic(out, { ...report, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    budget: { maxSnaps: 32, maxMs, caseMs },
    comparison: baseline ? { unchanged: report.rows.filter(r => r.unchanged).length,
      changed: report.rows.filter(r => !r.unchanged).map(r => ({ caseId: r.caseId, deltaYards: r.deltaYards, deltaYac: r.deltaYac,
        initialProfilesChanged: r.result.initialProfilesSha256 !== baseline.rows.find(b => b.caseId === r.caseId)!.result.initialProfilesSha256 })) } : null,
    interpretation: 'Transfer screen, not league validation. Outcome changes require mechanism review; no yardage targets or automatic promotion.' });
  console.log(`${report.status}: ${report.executed} simulated, ${report.cached} cached, ${report.skipped.length} skipped; ${(report.elapsedMs / 1000).toFixed(2)}s; ${out}`);
  if (report.status !== 'complete') { console.error(report.error ?? 'Time budget exhausted; partial evidence is not a pass'); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exitCode = 1; });
