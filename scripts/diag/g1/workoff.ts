/** Passive G1 contact requests versus achieved movement on #221's named taillab inputs.
 * node --import tsx scripts/diag/g1/workoff.ts --out out/g1/workoff/base.json \
 *   --common out/g1/workoff/base-plays.jsonl.gz
 * Add --only 'iz_strong|ace_11|cover4|0' for one exact unchanged named input.
 * Sixteen run snaps, two separately named pass controls, one passive repeat.
 * i0/i1 have different named execution streams; they are not paired mirrors.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import type { Vec2 } from '../../../src/core/vec.js';
import type { PlayLog } from '../../../src/game/game.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent, Engagement } from '../../../src/sim/agent.js';
import type { Perceived } from '../../../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import type { PlayResult } from '../../../src/sim/types.js';
import { commonPlay } from '../../mechanics/sim-export.js';
import { sourceVersion } from '../../source-version.js';

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return at < 0 ? fallback : process.argv[at + 1];
};
const out = arg('--out', 'out/g1/workoff/native.json'), commonOut = arg('--common', '');
const only = arg('--only', '');
if (!out || (process.argv.includes('--common') && !commonOut)) throw new Error('Missing output path');
if (process.argv.includes('--only') && !only) throw new Error('--only requires an exact seedName');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
const envKeys = [...new Set(files('src').flatMap(f => [...readFileSync(f, 'utf8')
  .matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1])))].sort();
const environment = Object.fromEntries(envKeys.map(k => [k, process.env[k] ?? null]));
const sourceBefore = sourceVersion(), started = performance.now();
const rng = new Rng(7);
// Exactly #221 taillab's sequential roster generation, not forked team RNGs.
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const seedFor = (name: string) => [...name].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
type Input = { kind: 'run' | 'pass'; concept: string; form: string; cov: string; i: number; seedName: string; seed: number };
const inputs: Input[] = [];
for (const concept of ['iz_strong', 'oz_strong']) for (const form of ['ace_11', 'gun_trips_11', 'i_pro_21', 'ace_12'])
  for (const i of [0, 1]) {
    const seedName = `${concept}|${form}|cover4|${i}`;
    inputs.push({ kind: 'run', concept, form, cov: 'cover4', i, seedName, seed: seedFor(seedName) });
  }
// Separate pass-control namespace: these are not #221 run inputs.
for (const i of [0, 1]) {
  const seedName = `pass|four_verts|ace_11|cover4|${i}`;
  inputs.push({ kind: 'pass', concept: 'four_verts', form: 'ace_11', cov: 'cover4', i, seedName, seed: seedFor(seedName) });
}
function setup(input: Input): PlaySetup {
  const formation = FORMATION_BY_ID[input.form];
  const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
  return { offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: input.kind === 'run'
      ? { formation, flip: input.i % 2 === 1, kind: 'run', run: RUN_BY_ID[input.concept], label: input.concept }
      : { formation, flip: input.i % 2 === 1, kind: 'pass', pass: PASS_BY_ID[input.concept], label: input.concept },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[input.cov], pressure: null, label: input.cov },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: input.seed, record: true };
}
const isDL = (a: Agent) => a.team === 'D' && /^(DE|DT|NT)/.test(a.slot);
const body = (a: Agent) => ({ position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing,
  energy: a.body.energy, supportState: a.body.support?.state ?? null,
  support: a.body.support ? structuredClone(a.body.support) : null });
const radial = (d: Agent, b: Agent) => {
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, distance = Math.hypot(dx, dy);
  return { distance, away: distance ? { x: dx / distance, y: dy / distance } : null };
};
const dot = (v: Vec2, u: Vec2 | null) => u ? v.x * u.x + v.y * u.y : null;
const projections = (velocity: Vec2 | undefined, basis: Vec2 | null) => !velocity ? null
  : { radial: dot(velocity, basis), tangential: dot(velocity, basis ? { x: -basis.y, y: basis.x } : null) };
const toward = (velocity: Vec2, position: Vec2, cue?: Perceived) => {
  if (!cue) return null;
  const dx = cue.pos.x - position.x, dy = cue.pos.y - position.y, distance = Math.hypot(dx, dy);
  return distance ? (velocity.x * dx + velocity.y * dy) / distance : null;
};
function hands(rep: Engagement) {
  const h = rep.hands;
  return !h ? null : { extension: h.extension, push: h.push, hold: h.hold, steer: h.steer,
    drive: h.drive ?? 0,
    normalForce: h.normalForce ?? null, tangentForce: h.tangentForce ?? null,
    actor: h.actor === rep.blocker.body ? rep.blocker.idx : h.actor === rep.defender.body ? rep.defender.idx : null };
}
type Seen = { at: number; target: number; role: 'QB' | 'RB' | 'blocker' | 'teammate'; cue: Perceived };
function inspect(sim: PlaySim) {
  let nextRep = 0;
  const ids = new WeakMap<Engagement, number>();
  const reps: Array<Record<string, unknown>> = [], events: Array<Record<string, unknown>> = [];
  const lastRep = new Map<number, Engagement>(), currentReads = new Map<number, Seen[]>();
  const pictures = new Map<number, Map<string, Seen>>();
  const requests = new Map<number, { t: number; data: Record<string, unknown> }>();
  const samples: Array<Record<string, unknown>> = [];
  const calls = new Map<number, Array<{ target: number; called: Vec2 | null | undefined }>>();
  let peerQuery: { observer: number; target: number } | null = null;
  const restoreCalls: Array<() => void> = [];
  // Observe actual installed-motion queries; never make an extra query.
  for (const target of sim.agents) {
    const behavior = target.behavior, original = behavior.calledMotion;
    if (!original) continue;
    behavior.calledMotion = function () {
      const called = original.call(this);
      if (peerQuery?.target === target.idx) {
        const rows = calls.get(peerQuery.observer) ?? [];
        rows.push({ target: target.idx, called: called ? { ...called } : called });
        calls.set(peerQuery.observer, rows);
      }
      return called;
    };
    restoreCalls.push(() => { behavior.calledMotion = original; });
  }
  const repId = (rep: Engagement) => {
    if (!ids.has(rep)) {
      const id = nextRep++;
      ids.set(rep, id);
      reps.push({ id, start: rep.start, initialType: rep.type, initialBlocker: rep.blocker.idx, defender: rep.defender.idx });
    }
    return ids.get(rep)!;
  };
  const originalSee = sim.see.bind(sim), originalStep = sim.world.step.bind(sim.world);
  sim.see = (...args) => {
    const cue = originalSee(...args), [observer, target] = args;
    peerQuery = observer.team === target.team ? { observer: observer.idx, target: target.idx } : null;
    if (isDL(observer)) {
      const role = target === sim.qb ? 'QB' : target === sim.slot('RB') ? 'RB'
        : target === observer.engagement?.blocker ? 'blocker' : target.team === observer.team ? 'teammate' : null;
      if (role) {
        const seen: Seen = { at: sim.t, target: target.idx, role, cue: structuredClone(cue) };
        const reads = currentReads.get(observer.idx) ?? [];
        reads.push(seen); currentReads.set(observer.idx, reads);
        const acquired = pictures.get(observer.idx) ?? new Map<string, Seen>();
        acquired.set(role, seen); pictures.set(observer.idx, acquired);
      }
    }
    return cue;
  };
  runContactObservers.set(sim, (rep, phase, data) => {
    if (!isDL(rep.defender)) return;
    const id = repId(rep);
    lastRep.set(rep.defender.idx, rep);
    if (phase === 'defender-movement') requests.set(id, { t: sim.t, data: structuredClone(data) });
    if (phase === 'end') events.push({ t: sim.t, id, blocker: rep.blocker.idx, phase, data: structuredClone(data) });
    if (phase === 'geometry') events.push({ t: sim.t, id, blocker: rep.blocker.idx, phase,
      data: Object.fromEntries(['axis', 'lat', 'phi', 'off', 'behind', 'facing', 'toD', 'baseB', 'baseD']
        .filter(k => data[k] !== undefined).map(k => [k, structuredClone(data[k])])) });
  });
  sim.world.step = (intents, dt) => {
    const pending = sim.defense.filter(isDL).map(d => {
      const active = d.engagement;
      if (active) { repId(active); lastRep.set(d.idx, active); }
      const rep = active ?? lastRep.get(d.idx);
      if (!rep) return null;
      const b = rep.blocker, separation = radial(d, b), acquired = pictures.get(d.idx);
      const qb = acquired?.get('QB'), rb = acquired?.get('RB');
      const carrying = [qb, rb].filter((s): s is Seen => s?.cue.carrying === true);
      const runner = carrying.length === 1 ? carrying[0] : undefined;
      const final = intents[d.idx], blockerFinal = intents[b.idx];
      const id = repId(rep), contact = requests.get(id);
      const sample: Record<string, unknown> = { t: sim.t, dt, rep: id, active: !!active, type: rep.type,
        defender: d.idx, blocker: b.idx, helpers: rep.helpers.map(h => h.idx), runFit: structuredClone(d.runFit),
        selectedAfterLOS: rep.type === 'run' && !!runner && runner.cue.pos.x > sim.los,
        acquisition: { status: carrying.length > 1 ? 'contradictory' : runner ? 'carrying_picture' : 'unavailable',
          runner: runner ? structuredClone(runner) : null,
          effectiveAge: runner?.cue.age === undefined ? null : runner.cue.age + sim.t - runner.at,
          qb: qb ? structuredClone(qb) : null, rb: rb ? structuredClone(rb) : null },
        consumedThisTick: currentReads.get(d.idx) ?? [], calledMotionQueries: calls.get(d.idx) ?? [], contactRequest: contact ?? null,
        finalDefenderIntent: final ? structuredClone(final) : null,
        finalBlockerIntent: blockerFinal ? structuredClone(blockerFinal) : null,
        before: { defender: body(d), blocker: body(b), separation: separation.distance,
          radialBasis: separation.away,
          velocityProjections: { defender: projections(d.vel, separation.away), blocker: projections(b.vel, separation.away),
            defenderRequest: projections(final?.vel, separation.away), blockerRequest: projections(blockerFinal?.vel, separation.away),
            relativeAchieved: projections({ x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, separation.away),
            relativeRequest: final && blockerFinal
              ? projections({ x: final.vel.x - blockerFinal.vel.x, y: final.vel.y - blockerFinal.vel.y }, separation.away) : null },
          relativeAwaySpeed: dot({ x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, separation.away),
          towardAcquiredRunnerSpeed: toward(d.vel, d.pos, runner?.cue),
          requestTowardAcquiredRunnerSpeed: final ? toward(final.vel, d.pos, runner?.cue) : null,
          requestedRelativeAwaySpeed: final && blockerFinal
            ? dot({ x: final.vel.x - blockerFinal.vel.x, y: final.vel.y - blockerFinal.vel.y }, separation.away) : null,
          hands: hands(rep), control: rep.control, phi: rep.phi },
        // Offline reality label only, never queried by or returned to a controller.
        physicalCarrier: sim.carrier ? { actor: sim.carrier.idx, ...body(sim.carrier) } : null };
      return { d, b, rep, runner, sample };
    }).filter((v): v is NonNullable<typeof v> => v !== null);
    const report = originalStep(intents, dt);
    for (const { d, b, rep, runner, sample } of pending) {
      const separation = radial(d, b);
      sample.after = { defender: body(d), blocker: body(b), separation: separation.distance,
        radialBasis: separation.away,
        velocityProjections: { defender: projections(d.vel, separation.away), blocker: projections(b.vel, separation.away),
          relativeAchieved: projections({ x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, separation.away) },
        relativeAwaySpeed: dot({ x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, separation.away),
        towardAcquiredRunnerSpeed: toward(d.vel, d.pos, runner?.cue), hands: hands(rep),
        control: rep.control, phi: rep.phi };
      samples.push(sample);
    }
    currentReads.clear();
    calls.clear(); peerQuery = null;
    return report;
  };
  const result = sim.run();
  sim.see = originalSee; sim.world.step = originalStep; runContactObservers.delete(sim);
  for (const restore of restoreCalls) restore();
  return { result, reps, events, samples };
}
function common(sim: PlaySim, input: Input, result: PlayResult, index: number) {
  const call = sim.offCall, defense = sim.defCall;
  const p: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: 25,
    call: input.concept, defense: input.cov, text: 'Controlled taillab-style snap; not a game situation',
    yards: result.offenseYards, score: { home: 0, away: 0 }, kind: input.kind,
    stats: result.stats, duration: result.duration, outcome: result.outcome,
    plan: { personnel: call.formation.personnel, formation: call.formation.id, qb: call.formation.qb,
      concept: input.concept, playAction: false, audible: false, defPersonnel: defense.personnel,
      front: defense.front.id, coverage: defense.coverage.id, family: defense.coverage.family,
      shell: defense.coverage.shell, pressure: false, rushers: sim.defAlign.rushers.length },
    replay: { frames: result.frames ?? [], events: result.events, los: sim.los, firstDownX: 45, flip: false,
      players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
        pos: a.player.position, weightLb: a.player.measurables.weightLb })) } };
  return commonPlay(p, `${input.kind}:${input.seedName}`);
}
const rows = [], commonRows = [];
const selectedInputs = only ? inputs.filter(input => input.seedName === only) : inputs;
if (!selectedInputs.length) throw new Error('Unknown exact --only seedName');
const signature = (sim: PlaySim, result: PlayResult) => hash({ result, bodies: sim.agents.map(a => a.body), rng: { ...sim.rng } });
for (const [index, input] of selectedInputs.entries()) {
  const sim = new PlaySim(setup(input));
  const collected = inspect(sim), executionSha256 = signature(sim, collected.result);
  let passiveVerified: boolean | null = null;
  if (index === 0) {
    const plain = new PlaySim(setup(input)), plainResult = plain.run();
    passiveVerified = executionSha256 === signature(plain, plainResult);
    if (!passiveVerified) throw new Error('Passive extraction changed the first native run');
  }
  if (commonOut) commonRows.push(common(sim, input, collected.result, index));
  const { frames: _frames, telemetry: _telemetry, ...result } = collected.result;
  rows.push({ input, actors: sim.agents.map(a => ({ idx: a.idx, id: a.player.id, slot: a.slot, team: a.team,
    position: a.player.position, profile: a.profile, runFit: a.runFit })), actualCalls: { offense: sim.offCall, defense: sim.defCall },
    result, executionSha256, passiveVerified, reps: collected.reps, events: collected.events, samples: collected.samples });
}
if (sourceVersion() !== sourceBefore) throw new Error('Engine changed during collection');
mkdirSync(dirname(out), { recursive: true });
if (commonOut) { mkdirSync(dirname(commonOut), { recursive: true });
  writeFileSync(commonOut, gzipSync(commonRows.filter(Boolean).map(r => JSON.stringify(r)).join('\n') + '\n')); }
const document = { schema: 'g1-workoff-native-v2', commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceBefore, sourceAfter: sourceVersion(), toolSha256: fileHash('scripts/diag/g1/workoff.ts'), node: process.version,
  settings: { environment, allSourceEnvironmentAbsent: Object.values(environment).every(v => v === null),
    rosterSeed: 7, rosterGeneration: 'one root Rng(7), generateTeam O then D sequentially', strength: .55,
    taillabSource: '753420f3b3eca4b7198abe499e58c5668bcff1cf', front: 'over', pressure: null,
    onlyExactSeedName: only || null,
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, record: true, recordLevel: 'light', recordEvery: 2 },
  definitions: { selection: '16 named taillab runs; i0/i1 are different seeds and flipped calls, not paired mirrors. Two separately named four-verts pass controls.',
    acquired: 'Only already-consumed PlaySim.see returns, copied by a passthrough. No new sighting, RNG draw or motion preview. carried-picture cohort excludes contradictory QB/RB positives.',
    requests: 'contactRequest is the existing run contact observer callback with its timestamp; final intents are read at World.step after modifiers.',
    timing: 'before at World.step entry t, after at t+dt with the same acquired cue. All DL rep samples are retained; selectedAfterLOS marks the primary acquired-carrying-past-LOS cohort.',
    relativeAway: 'Dot of achieved defender-minus-fixed-blocker velocity with blocker-to-defender radial direction. Request counterpart uses both final movement requests.',
    velocityProjections: 'Own and relative velocity projections on the stored blocker-to-defender radial unit and its counterclockwise tangent. Before/after use their respective achieved separation bases.',
    support: 'Passive structured copy of the existing own support state: foot, capture deviation, lean, load, felt load and other already-computed fields. No new physics or sensing.',
    towardRunner: 'Projection of own achieved/requested velocity toward the one acquired carrying QB/RB picture; never actual carrier position.',
    ending: 'Native outcome timeout remains unfinished. Run rep end reasons come from existing observer events; commonPlay end/proximity is a distinct operator.',
    common: 'Optional existing commonPlay adapter resamples native replay to0.1s and omits source actor IDs; use raw actor/rep maps for causal identity.' },
  limitations: ['Observed delayed picture is not modeled gaze/occlusion.', 'The carrying cue filter is offline exposure, not a claim that a particular read selected that cue.',
    'V2 adds support/force projections and an exact-input filter; V1 fields and default 18-input cohort are retained. Filtered runs do not establish cohort rates.',
    'Stored engagement type may convert pass to run; pass controls retain actual conversion/outcome.',
    'Whole physical outcomes include fouls; they are not league rates or evidence that every block should be defeated.'],
  commonExport: commonOut ? { path: commonOut, sha256: fileHash(commonOut), plays: commonRows.filter(Boolean).length } : null,
  elapsedSeconds: (performance.now() - started) / 1000, rows };
writeFileSync(out, JSON.stringify(document));
console.log(JSON.stringify({ out, commonOut: commonOut || null, sourceBefore, elapsedSeconds: document.elapsedSeconds,
  plays: rows.length, passiveVerified: rows[0].passiveVerified,
  rows: rows.map(r => ({ input: r.input, outcome: r.result.outcome, yards: r.result.offenseYards,
    samples: r.samples.length, selectedAfterLOS: r.samples.filter(s => s.selectedAfterLOS).length })) }, null, 1));
