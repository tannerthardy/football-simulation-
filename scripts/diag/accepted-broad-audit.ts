/** Specific preselected accepted-build audit. Default/--plan runs zero plays.
 * First freeze a manifest, then --run the same manifest. No engine changes,
 * outcome selection, automatic reruns, interventions or general audit framework.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayLog } from '../../src/game/game.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGES, COVERAGE_BY_ID, FRONTS, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import type { Fixture } from '../roster-screen.js';
import { packReplayPlay } from '../replay-data.js';
import { compactReplayPlays } from '../replay-telemetry-packing.js';
import { sourceVersion } from '../source-version.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const configPath = 'config/accepted-broad-audit.json';
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
function atomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n'); renameSync(tmp, path);
}
function finite(value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nonfinite native evidence');
  if (value && typeof value === 'object') for (const v of Object.values(value)) finite(v);
}
const args = process.argv.slice(2);
let mode: 'plan' | 'run' = 'plan', destination = 'out/accepted-broad-audit', manifestArg: string | undefined, checkpoint: string | undefined;
while (args.length) {
  const a = args.shift();
  if (a === '--plan' || a === '--run') mode = a === '--run' ? 'run' : 'plan';
  else if (a === '--out' || a === '--manifest' || a === '--checkpoint') {
    const value = args.shift(); if (!value || value.startsWith('--')) throw new Error(`Missing ${a} value`);
    if (a === '--out') destination = value; else if (a === '--manifest') manifestArg = value; else checkpoint = value;
  } else throw new Error(`Unknown option ${a}`);
}
const out = resolve(destination), manifestPath = resolve(manifestArg ?? join(out, 'manifest.json'));
const config = json(configPath);
if (mode === 'run' && checkpoint !== config.checkpoint) throw new Error('This >32-snap audit requires --checkpoint with the exact frozen config reason');
const fixture = json(config.fixture) as Fixture;
const profile = json('config/baseline.json');
if (config.schemaVersion !== 1 || fixture.matchups.length !== 4 || config.calls.length !== 12 || config.budget.maxSnaps !== 48)
  throw new Error('This collector requires the frozen four-matchup, twelve-call, 48-play panel');
if (!(config.budget.batchMs > 0 && config.budget.batchMs <= 90000 && config.budget.caseMs > 0 && config.budget.caseMs <= 5000))
  throw new Error('Audit wall caps cannot exceed 90 seconds per batch and five seconds per case');
execFileSync('git', ['diff', '--quiet', config.acceptedCommit, '--', 'src']);
if (config.recordEvery !== 1 || config.recordLevel !== 'full' || config.energy !== 1 || config.audibles !== false)
  throw new Error('Recording/energy/audible settings differ from the declared audit');
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
if (process.versions.node !== profile.nodeVersion || hash(flags) !== hash(profile.flags))
  throw new Error('Use pinned Node and scripts/baseline.mjs --candidate; runtime flags must match the declared profile');
const declaredInputs = [configPath, config.fixture, 'config/baseline.json', 'package-lock.json', '.nvmrc',
  'scripts/diag/accepted-broad-audit.ts', 'scripts/source-version.ts', 'scripts/replay-data.ts',
  'scripts/replay-telemetry-packing.ts', 'scripts/baseline.mjs', 'viewer/replay.template.html'];
const provenance = () => ({
  acceptedCommit: config.acceptedCommit,
  sourceSha256: sourceVersion(), node: process.version, platform: process.platform, arch: process.arch,
  flags, worldDefaults: profile.worldDefaults,
  files: Object.fromEntries(declaredInputs.map(p => [p, fileHash(p)])),
  measurement: 'Native full PlayResult/events plus full 20-Hz replay telemetry; no fault or win classifier.',
});
const cases: Array<{ id: string; matchup: string; callIndex: number; concept: string; inputSha256: string; setup: PlaySetup }> = [];
for (const m of fixture.matchups) {
  for (const players of [m.offense, m.defense]) if (Object.values(players).length !== 11 || new Set(Object.values(players).map(p => p!.id)).size !== 11)
    throw new Error(`Incomplete/duplicate frozen lineup ${m.id}`);
  for (let callIndex = 0; callIndex < config.calls.length; callIndex++) {
    const c = config.calls[callIndex], run = RUN_BY_ID[c.concept], pass = PASS_BY_ID[c.concept];
    const formation = FORMATION_BY_ID[c.formation], front = FRONT_BY_ID[c.front], coverage = COVERAGE_BY_ID[c.coverage];
    const pressure = c.pressure === null ? null : PRESSURE_BY_ID[c.pressure];
    if ((!run && !pass) || !formation || formation.personnel !== '11' || !front?.personnel.includes('nickel') || !coverage
      || (c.pressure !== null && (!pressure || !pressure.coverages.includes(coverage.id)))) throw new Error(`Invalid fixed call ${c.concept}`);
    if (c.seed !== (callIndex % 2 === 0 ? 71001 : 71002)) throw new Error('Seeds must alternate by fixed call index');
    const setup: PlaySetup = { offense: structuredClone(m.offense), defense: structuredClone(m.defense),
      offCall: run ? { formation, flip: false, kind: 'run', run, label: `${formation.name} · ${run.name}` }
        : { formation, flip: false, kind: 'pass', pass, label: `${formation.name} · ${pass.name}` },
      defCall: { personnel: 'nickel', front, coverage, pressure,
        label: `${front.name} · ${coverage.name}${pressure ? ` + ${pressure.name}` : ''}` },
      los: config.los, ballY: config.ballY, firstDownX: config.firstDownX, down: config.down,
      seed: c.seed, audibles: false, record: true, recordEvery: 1, recordLevel: 'full' };
    cases.push({ id: `A${String(cases.length + 1).padStart(3, '0')}`, matchup: m.id, callIndex, concept: c.concept, inputSha256: hash(setup), setup });
  }
}
if (cases.length !== 48) throw new Error('Incomplete preselected panel');
const planned = { schema: 'accepted-broad-audit-manifest-v1', panel: config.id, decision: config.decision, checkpoint: config.checkpoint,
  selection: config.selection, fixtureSelection: fixture.selection, budget: config.budget,
  limitations: config.limitations, timing: 'Native event times are retained. Positional frame t labels the enclosing tick start after physics; same-tick joins are bins, not continuous contact instants. Initial bodies are stored separately because the first tick can replace the t=0 replay frame.',
  provenance: provenance(), planned: cases.length, cases };
const manifest = { ...planned, manifestSha256: hash(planned) };
if (mode === 'plan') {
  if (existsSync(manifestPath) && hash(json(manifestPath)) !== hash(manifest)) throw new Error('Existing manifest differs; preserve it and choose a new output location');
  if (!existsSync(manifestPath)) atomic(manifestPath, manifest);
  console.log(`Plan frozen: 0 simulations; ${cases.length} declared full plays; ${manifestPath}; SHA256 ${manifest.manifestSha256}`);
  process.exit(0);
}
if (!existsSync(manifestPath)) throw new Error('Freeze --plan before --run');
const saved = json(manifestPath);
if (hash(saved) !== hash(manifest)) throw new Error('Manifest/input/source/runner/environment mismatch; no simulations executed');
if (existsSync(join(out, 'summary.json')) || existsSync(join(out, 'cases'))) throw new Error('Existing run evidence retained; no automatic rerun or overwrite');
mkdirSync(join(out, 'cases'), { recursive: true });
const startedAt = new Date().toISOString(), start = performance.now(), cpu = process.cpuUsage();
type SummaryRow = { id: string; matchup: string; concept: string; status: string; [key: string]: unknown };
const rows: SummaryRow[] = [], skipped: string[] = [], packed: Array<ReturnType<typeof packReplayPlay>> = [];
let status = 'complete', error: string | null = null;
class BudgetExceeded extends Error {}
function filmPlay(sim: PlaySim, result: PlayResult, index: number): ReturnType<typeof packReplayPlay> {
  const setup = cases[index].setup, formation = setup.offCall.formation;
  const log: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: config.down,
    distance: config.firstDownX - config.los, yardline: config.los - 10,
    call: setup.offCall.label, defense: setup.defCall.label, text: `${cases[index].id} · ${cases[index].matchup} · ${result.outcome} · ${result.offenseYards.toFixed(1)} yd`,
    yards: result.offenseYards, score: { home: 0, away: 0 }, kind: setup.offCall.kind, stats: result.stats, outcome: result.outcome,
    plan: { personnel: '11', formation: formation.id, qb: formation.qb,
      concept: setup.offCall.kind === 'run' ? setup.offCall.run!.scheme : cases[index].concept,
      playAction: setup.offCall.pass?.family === 'playaction', audible: false, defPersonnel: 'nickel', front: setup.defCall.front.id,
      coverage: sim.defCall.coverage.id, called: setup.defCall.coverage.id, family: sim.defCall.coverage.family,
      shell: sim.defCall.coverage.shell, pressure: !!setup.defCall.pressure, rushers: sim.defAlign.rushers.length },
    replay: { los: sim.los, firstDownX: sim.firstDownX, flip: false, frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      profiles: sim.agents.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
        weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) } };
  return { ...packReplayPlay(log, 0), id: cases[index].id };
}
function writeSummary(): void {
  const used = process.cpuUsage(cpu);
  atomic(join(out, 'summary.json'), { schema: 'accepted-broad-audit-summary-v1', manifestSha256: manifest.manifestSha256,
    provenance: manifest.provenance, startedAt, updatedAt: new Date().toISOString(), status, error,
    planned: cases.length, attempted: rows.length, complete: rows.filter(r => r.status === 'complete').length,
    partial: rows.filter(r => r.status !== 'complete').length, skipped, elapsedMs: performance.now() - start,
    cpuMs: (used.user + used.system) / 1000, budget: config.budget, rows });
}
for (let index = 0; index < cases.length; index++) {
  const c = cases[index];
  if (performance.now() - start >= config.budget.batchMs) {
    status = 'budget-exhausted'; error = 'Batch wall limit reached before next case'; skipped.push(...cases.slice(index).map(c => c.id)); break;
  }
  const caseStart = performance.now(), caseCpu = process.cpuUsage();
  let sim: PlaySim | undefined, initial: unknown, result: PlayResult | undefined;
  try {
    sim = new PlaySim(structuredClone(c.setup));
    if (sim.agents.length !== 22 || sim.offense.length !== 11 || sim.defense.length !== 11
      || new Set(sim.agents.map(a => a.player.id)).size !== 22) throw new Error('Expected all 22 actual players with unique identities');
    if (sim.agents.some(a => a.body.energy !== 1)) throw new Error('Expected fresh full energy for every actor');
    initial = { t: sim.t, ball: structuredClone(sim.ballPos()), carrier: sim.carrier?.idx ?? null,
      agents: sim.agents.map(a => ({ index: a.idx, playerId: a.player.id, team: a.team, slot: a.slot, name: a.name,
        jersey: a.player.jersey, position: a.player.position, player: structuredClone(a.player), profile: structuredClone(a.profile),
        body: structuredClone(a.body), behavior: a.behavior.kind })),
      resolvedOffCall: structuredClone(sim.offCall), resolvedDefCall: structuredClone(sim.defCall),
      offAlign: structuredClone(sim.offAlign), defAlign: structuredClone(sim.defAlign) };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      if (performance.now() - start >= config.budget.batchMs || performance.now() - caseStart >= config.budget.caseMs)
        throw new BudgetExceeded(`Wall limit at native t=${sim!.t}; tick-boundary cap cannot preempt one physics tick`);
      tick();
    };
    result = sim.run(); finite(result);
    if (!result.frames?.length || !result.telemetry || result.telemetry.level !== 'full') throw new Error('Missing full recorded evidence');
    const rawPath = join(out, 'cases', `${c.id}.json`);
    atomic(rawPath, { schema: 'accepted-broad-audit-case-v1', manifestSha256: manifest.manifestSha256, caseId: c.id,
      matchup: c.matchup, concept: c.concept, inputSha256: c.inputSha256, setup: c.setup, initial,
      actors: sim.agents.map(a => ({ idx: a.idx, id: a.player.id, team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, position: a.player.position })),
      initialBodies: (initial as { agents: Array<{ index: number; playerId: string; body: unknown }> }).agents.map(a => ({ idx: a.index, id: a.playerId, body: a.body })), result,
      final: { t: sim.t, phase: sim.phase, bodies: sim.agents.map(a => structuredClone(a.body)), rng: structuredClone(sim.rng) },
      censoring: { wallBudget: false, max25Seconds: result.outcome === 'timeout' || result.duration >= 25 } });
    const caseUsed = process.cpuUsage(caseCpu);
    rows.push({ id: c.id, matchup: c.matchup, concept: c.concept, seed: c.setup.seed, kind: c.setup.offCall.kind,
      front: c.setup.defCall.front.id, coverageCalled: c.setup.defCall.coverage.id, coverageResolved: sim.defCall.coverage.id,
      pressure: c.setup.defCall.pressure?.id ?? null, status: 'complete', inputSha256: c.inputSha256,
      path: rawPath, sha256: fileHash(rawPath), bytes: readFileSync(rawPath).byteLength,
      outcome: result.outcome, possession: result.possession, offenseYards: result.offenseYards, endX: result.endX,
      duration: result.duration, stats: result.stats, nativeEvents: result.events,
      max25SecondsCensored: result.outcome === 'timeout' || result.duration >= 25,
      frameCount: result.frames.length, wallMs: performance.now() - caseStart, cpuMs: (caseUsed.user + caseUsed.system) / 1000 });
    packed.push(filmPlay(sim, result, index));
    console.log(`${c.id} ${c.matchup}/${c.concept}: complete (${(performance.now() - caseStart).toFixed(0)}ms)`);
  } catch (caught) {
    status = caught instanceof BudgetExceeded ? 'budget-exhausted' : 'failed'; error = `${c.id}: ${String(caught)}`;
    const path = join(out, 'cases', `${c.id}.partial.json`);
    atomic(path, { schema: 'accepted-broad-audit-partial-v1', manifestSha256: manifest.manifestSha256, caseId: c.id,
      inputSha256: c.inputSha256, setup: c.setup, initial, result, error,
      partial: sim ? { t: sim.t, phase: sim.phase, events: sim.events, frames: sim.frames,
        telemetry: Reflect.get(sim, 'trace').data, bodies: sim.agents.map(a => structuredClone(a.body)) } : null });
    rows.push({ id: c.id, matchup: c.matchup, concept: c.concept, status, path, sha256: fileHash(path), error, wallMs: performance.now() - caseStart });
    skipped.push(...cases.slice(index + 1).map(c => c.id)); writeSummary(); break;
  }
  writeSummary();
}
const current = provenance();
if (hash(current) !== hash(manifest.provenance)) { status = 'failed'; error = 'Source, runner, input or environment changed during collection'; }
writeSummary();
const data = { meta: { sourceSha256: manifest.provenance.sourceSha256, manifestSha256: manifest.manifestSha256,
  telemetryLevel: 'full', cohort: `${config.id}; preselected balanced diagnostic panel, not a game/NFL population`,
  seed: 71001, final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Frozen Offense', abbr: 'OFF', color: '#a3302a', text: '#ffffff' },
  away: { name: 'Frozen Defense', abbr: 'DEF', color: '#1d4f91', text: '#ffffff' } },
  games: [{ seed: 71001, final: { home: 0, away: 0 }, quarters: [] }], plays: compactReplayPlays(packed),
  catalog: { coverage: Object.fromEntries(COVERAGES.map(c => [c.id, c.name])), front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])),
    formation: Object.fromEntries(FORMATIONS.map(f => [f.id, f.name])) } };
const template = readFileSync('viewer/replay.template.html', 'utf8'), marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Missing existing replay data marker');
writeFileSync(join(out, 'film.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/'))}\n</body></html>\n`);
writeSummary();
console.log(`${status}: ${rows.filter(r => r.status === 'complete').length}/${cases.length} complete; ${skipped.length} skipped; ${(performance.now() - start).toFixed(0)}ms; ${out}`);
if (status !== 'complete') process.exitCode = 1;
