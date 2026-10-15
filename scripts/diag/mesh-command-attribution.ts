/** Four frozen mesh witnesses only. No roster generation or full-play panel.
 * Default prints the cost plan; --run collects short observer-off/on pairs.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Rng } from '../../src/core/rng.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { observeCommands, type CommandObservation } from '../../src/sim/command-observer.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { Fixture } from '../roster-screen.js';
import { sourceVersion } from '../source-version.js';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fixture = JSON.parse(readFileSync('config/roster-screen.json', 'utf8')) as Fixture;
const cases = [
  { id: 'A008', from: 1.75, until: 2.65, input: '87645a60c8669235390eace771f16d941880adf4d4aa8e3167640fd2fc619229' },
  { id: 'A020', from: 1.95, until: 2.60, input: '02cc38e880ce494dd2142c92ad9646814ea89a52f9bef350b6ca177ab95c2688' },
  { id: 'A032', from: 1.95, until: 3.00, input: '2bb6a3ca5934811058b5fc7483369477fc34bfaf108f1cfcfa1f0f1ec4e2ea3d' },
  { id: 'A044', from: 1.95, until: 3.00, input: '8fcc80c75bf0770392a32cf1364a8bf8321957ed76258bd38684ebf9ee32daa5' },
];
const plan = { question: 'Attribute A020 prethrow stop and A044 convergence; retain useful A008/A032 defense.',
  accepted: '90edc52530caa71efdebf257f17d954a8a629ea0', savedSource: '8ca8deebe4afa91c3021bdd119bed8976cf00e47',
  cases, executions: 8, fullGames: 0, generatedRosters: 0, batchWallCapMs: 20000,
  interventions: 'Observer off/on only; no controller changes. Selected actors LB_M/NB/SS.',
  timing: 'Tick t is the command/pre-physics clock; after is t+.05. Native frame t labels the enclosing tick after physics.' };
const args = process.argv.slice(2);
if (!args.includes('--run')) { console.log(JSON.stringify(plan, null, 2)); process.exit(0); }
const outIndex = args.indexOf('--out'), out = outIndex < 0 ? 'out/mesh-command-attribution' : args[outIndex + 1];
if (!out || args.some((a, i) => !['--run', '--out'].includes(a) && i !== outIndex + 1)) throw Error('Use --run [--out path]');
if (existsSync(join(out, 'summary.json'))) throw Error('Preserve existing evidence; choose another output directory');
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
if (process.versions.node !== profile.nodeVersion || hash(flags) !== hash(profile.flags)) throw Error('Use pinned Node22 and baseline:run --candidate');
mkdirSync(out, { recursive: true });
const provenance = { sourceSha256: sourceVersion(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  fixtureSha256: createHash('sha256').update(readFileSync('config/roster-screen.json')).digest('hex'),
  node: process.version, flags, worldDefaults: profile.worldDefaults };
writeFileSync(join(out, 'plan.json'), JSON.stringify({ ...plan, provenance }, null, 2) + '\n');
const started = performance.now(), cpu = process.cpuUsage(), rows: unknown[] = [];
let draws = 0;
const next = Rng.prototype.nextU32;
Rng.prototype.nextU32 = function () { draws++; return next.call(this); };
try {
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i], m = fixture.matchups[i], formation = FORMATION_BY_ID.gun_doubles_11,
      pass = PASS_BY_ID.mesh, front = FRONT_BY_ID.under, coverage = COVERAGE_BY_ID.cover1;
    const setup: PlaySetup = { offense: structuredClone(m.offense), defense: structuredClone(m.defense),
      offCall: { formation, flip: false, kind: 'pass', pass, label: `${formation.name} · ${pass.name}` },
      defCall: { personnel: 'nickel', front, coverage, pressure: null, label: `${front.name} · ${coverage.name}` },
      los: 35, ballY: 26.666666666666668, firstDownX: 45, down: 1,
      seed: 71002, audibles: false, record: true, recordEvery: 1, recordLevel: 'full' };
    if (hash(setup) !== c.input) throw Error(`${c.id}: frozen input mismatch`);
    const arms = [];
    for (const observed of [false, true]) {
      const begin = performance.now(), drawStart = draws, sim = new PlaySim(structuredClone(setup));
      const selected = sim.agents.filter(a => ['LB_M', 'NB', 'SS'].includes(a.slot));
      const observations: CommandObservation[] = [], ticks: unknown[] = [];
      let reads = 0;
      const perceive = sim.perception.perceive.bind(sim.perception);
      sim.perception.perceive = (idx, delay) => { reads++; return perceive(idx, delay); };
      const remove = observed ? observeCommands(sim, selected, event => {
        if (sim.t >= c.from) observations.push(event);
      }) : () => {};
      sim.event('snap', sim.slot('C') ?? sim.qb);
      while (sim.phase === 'live' && sim.t < c.until) {
        if (performance.now() - started > plan.batchWallCapMs) throw Error('Batch cap reached; no retry');
        const t = sim.t;
        sim.tick();
        if (t >= c.from) ticks.push({ t, after: sim.t, bodies: sim.agents.map(a => structuredClone(a.body)),
          commands: structuredClone(sim.intents), contacts: structuredClone(sim.lastStep), rng: structuredClone(sim.rng) });
      }
      remove();
      const state = { t: sim.t, frames: sim.frames, trace: sim.trace.data, events: sim.events,
        bodies: sim.agents.map(a => structuredClone(a.body)), intents: sim.intents,
        minds: sim.agents.map(a => ({ ...a.mind })), rng: { ...sim.rng } };
      const receipt = { observed, digest: hash(state), draws: draws - drawStart, reads,
        elapsedMs: performance.now() - begin, ticks: sim.frames.length, stoppedAt: sim.t };
      arms.push(receipt);
      if (observed) {
        const evidence = { schema: 'mesh-command-attribution-v1', caseId: c.id, inputSha256: c.input, setup, provenance,
          timing: plan.timing, actors: sim.agents.map(a => ({ idx: a.idx, slot: a.slot, id: a.player.id, profile: a.profile })),
          observations, ticks, events: sim.events, receipt };
        const bytes = gzipSync(JSON.stringify(evidence));
        writeFileSync(join(out, `${c.id}.json.gz`), bytes);
      }
    }
    if (arms[0].digest !== arms[1].digest || arms[0].draws !== arms[1].draws || arms[0].reads !== arms[1].reads)
      throw Error(`${c.id}: observer changed behavior or information/RNG calls`);
    rows.push({ id: c.id, inputSha256: c.input, arms, neutral: true });
  }
} finally { Rng.prototype.nextU32 = next; }
const used = process.cpuUsage(cpu);
const summary = { ...plan, provenance, rows, elapsedMs: performance.now() - started, cpuMs: (used.user + used.system) / 1000 };
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ out, neutralPairs: rows.length, elapsedMs: summary.elapsedMs, cpuMs: summary.cpuMs }));
