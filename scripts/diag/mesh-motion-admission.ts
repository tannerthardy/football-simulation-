/** One candidate continuation and one useful-defense control. Baselines are
 * the existing #81 captures; no new baseline, roster, seed, or bend policy.
 * The observer reads existing values; actual hand load is evaluation only.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { observeCommands, type CommandObservation } from '../../src/sim/command-observer.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const args = process.argv.slice(2), index = args.indexOf('--out'), out = index < 0 ? 'out/motion-admission/native-v1' : args[index + 1];
const opening = args.includes('--trace-opening');
const plan = { question: 'Does attainable-motion spacing admission improve the reacting A044 approach while preserving A008 and Z/CB_S load?',
  cases: [{ id: 'A044', until: 5.6 }, { id: 'A008', until: 3.4 }], nativeExecutions: 2,
  baseline: 'cb3823ee749a50ab51e4024b3cdc0dd4ce45341c', baselineDirectory: 'data/reviews/current/mesh-command-attribution',
  batchWallCapMs: 15000, fullGames: 0, generatedRosters: 0, physicsAndFlags: 'Unchanged accepted defaults; use baseline:run --candidate.' };
if (opening) { plan.cases = [{ id: 'A044', until: 1.95 }]; plan.nativeExecutions = 1;
  plan.question = 'Attribute the first earlier command divergence of the two-case candidate, not another football trial.'; }
if (!args.includes('--run')) { console.log(JSON.stringify(plan, null, 2)); process.exit(0); }
if (existsSync(`${out}/summary.json`)) throw Error('Preserve earlier evidence');
const read = (p: string) => JSON.parse(gunzipSync(readFileSync(p)).toString());
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const input = `${plan.baselineDirectory}/flex-windows.json.gz`;
if (createHash('sha256').update(readFileSync(input)).digest('hex') !== '11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191') throw Error('Saved input hash');
const saved = read(input), profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
if (hash(flags) !== hash(profile.flags) || process.versions.node !== profile.nodeVersion) throw Error('Use pinned Node/flags');
mkdirSync(out, { recursive: true });
const provenance = { sourceSha256: sourceVersion(), flags, node: process.version, worldDefaults: profile.worldDefaults };
writeFileSync(`${out}/plan.json`, JSON.stringify({ ...plan, provenance }, null, 2) + '\n');
const start = performance.now(), cpu = process.cpuUsage(), rows = [];
for (const c of plan.cases) {
  const inputCase = saved.cases.find((s: any) => s.caseId === c.id), setup = inputCase.setup as PlaySetup;
  if (hash(setup) !== inputCase.inputSha256) throw Error('Frozen setup mismatch');
  const begin = performance.now(), sim = new PlaySim(structuredClone(setup));
  const baseline = read(`${plan.baselineDirectory}/bend-v1/${c.id}-accepted.json.gz`), ticks = [], stages: CommandObservation[] = [];
  const focused = new Set([15, 19, 21]);
  const remove = observeCommands(sim, sim.agents, event => {
    if (opening || ['behavior', 'spacing'].includes(event.stage) || focused.has(event.actor) && sim.t >= 1.8 && sim.t <= 3) stages.push(event);
  });
  sim.event('snap', sim.slot('C') ?? sim.qb);
  while (sim.phase === 'live' && sim.t < c.until) {
    if (performance.now() - start > plan.batchWallCapMs) throw Error('Named two-case budget exhausted');
    const t = sim.t; sim.tick();
    ticks.push({ t, after: sim.t,
      agents: sim.agents.map(a => ({ idx: a.idx, pos: { ...a.pos }, vel: { ...a.vel }, state: a.body.support?.state })),
      commands: structuredClone(sim.intents), contacts: sim.lastStep?.contacts,
      zCornerBlock: sim.engagements.filter(e => e.blocker.idx === 9 && e.defender.idx === 17).map(e => ({
        a: e.blocker.idx, b: e.defender.idx, normalForce: e.hands?.normalForce ?? null, tangentForce: e.hands?.tangentForce ?? null,
        blockerVelocity: { ...e.blocker.vel }, defenderVelocity: { ...e.defender.vel }, type: e.type,
        actualContact: !!sim.lastStep?.contacts.some(p => p.i === 9 && p.j === 17 || p.i === 17 && p.j === 9) })) });
  }
  remove();
  const oldTicks = new Map<number, any>(baseline.ticks.map((t: any) => [t.t, t]));
  let firstDifference: unknown = null;
  for (const tick of ticks) {
    const old = oldTicks.get(tick.t); if (!old) continue;
    const actors = tick.agents.filter((a, idx) => hash(a) !== hash(old.agents[idx]) || hash(tick.commands[idx]) !== hash(old.commands[idx])).map(a => a.idx);
    if (actors.length) { firstDifference = { t: tick.t, actors }; break; }
  }
  const digest = hash({ ticks: ticks.filter(t => oldTicks.has(t.t)).map(({ zCornerBlock, ...rest }) => rest), events: sim.events, rng: { ...sim.rng } });
  const oldDigest = hash({ ticks: baseline.ticks, events: baseline.events, rng: baseline.rng });
  const data = { schema: 'mesh-motion-admission-v1', caseId: c.id, setupSha256: hash(setup), provenance, firstDifference,
    compatibleBaselineWindowsEqual: digest === oldDigest, stages, ticks, events: sim.events, rng: { ...sim.rng }, stoppedAt: sim.t };
  const bytes = gzipSync(JSON.stringify(data)); writeFileSync(`${out}/${c.id}.json.gz`, bytes);
  const actual = ticks.filter(t => t.t >= 4.5).flatMap(t => t.zCornerBlock.map(b => ({ t: t.t, ...b })));
  rows.push({ caseId: c.id, stoppedAt: sim.t, firstDifference, compatibleBaselineWindowsEqual: digest === oldDigest,
    teammateImpacts: ticks.flatMap(t => (t.contacts ?? []).filter(p => p.i === 15 && p.j === 21).map(p => ({ t: t.t, ...p }))),
    catchAndTackle: sim.events.filter(e => ['catch', 'tackle_wrap', 'tackle'].includes(e.type)),
    zCornerBlock: actual, elapsedMs: performance.now() - begin, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const used = process.cpuUsage(cpu), summary = { ...plan, provenance, rows, elapsedMs: performance.now() - start, cpuMs: (used.user + used.system) / 1000 };
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ elapsedMs: summary.elapsedMs, rows: rows.map(({ zCornerBlock, ...r }) => r) }));
