/** One-tick G1 request intervention on an exact live native prefix.
 * node --import tsx scripts/diag/g1/loaded-exit.ts --out out/g1/loaded-exit.json
 * No World reconstruction, added senses/RNG, capacity or physics edits. The
 * pulse is the existing contact request, before teammate spacing, on one tick;
 * all later football decisions resume normally. Live inspection cutoffs are
 * censored, never converted into whistles or completed outcomes.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { bodyRadius } from '../../../src/physics/bodyshape.js';
import { CONTACT_SCALE, type Intent, type Joint } from '../../../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent, Engagement } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { sourceVersion } from '../../source-version.js';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const out = arg('--out', 'out/g1/loaded-exit.json');
if (!out) throw new Error('--out requires a path');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = <T>(value: T): T => structuredClone(value);
const seedFor = (name: string) => [...name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
const envKeys = [...new Set(files('src').flatMap(f => [...readFileSync(f, 'utf8')
  .matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1])))].sort();
const environment = Object.fromEntries(envKeys.map(k => [k, process.env[k] ?? null]));
const sourceBefore = sourceVersion(), started = performance.now();
const cases = [
  { name: 'matching_blocker', concept: 'iz_strong', form: 'gun_trips_11', i: 0, at: 3.55, defender: 14, peer: 17 },
  { name: 'sealed_control', concept: 'oz_strong', form: 'i_pro_21', i: 1, at: 2.65, defender: 14, peer: 17 },
] as const;
type Case = typeof cases[number];
type Arm = 'native' | 'raw_exit_pulse';
type Raw = { t: number; data: Record<string, unknown> };

function setup(input: Case): PlaySim {
  // Exact #221/G1 roster and named execution recipe, independent per arm.
  const rng = new Rng(7), off = generateTeam(rng, 'O', 'OFF', { strength: .55 }),
    def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
  const formation = FORMATION_BY_ID[input.form];
  const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
  const seedName = `${input.concept}|${input.form}|cover4|${input.i}`;
  return new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip: input.i % 2 === 1, kind: 'run', run: RUN_BY_ID[input.concept], label: input.concept },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: 'cover4' },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: seedFor(seedName), record: true });
}

function run(input: Case, arm: Arm) {
  const sim = setup(input), world = sim.world, d = sim.agents[input.defender], peer = sim.agents[input.peer];
  const cues = createHash('sha256'), bodyHistory = createHash('sha256'), rngHistory = createHash('sha256');
  let raw: Raw | null = null, prefix: Record<string, unknown> | null = null;
  let fixedBlocker: Agent | null = null, fixedRep: Engagement | null = null;
  let intervention: Record<string, unknown> | null = null;
  const rows: Array<Record<string, any>> = [], repEvents: Array<Record<string, unknown>> = [];
  const rngState = () => ({ play: copy(sim.rng), minds: sim.agents.map(a => copy(Reflect.get(a.mind, 'rng'))) });
  const joint = (j: Joint) => {
    const { a, b, ...rest } = j;
    const flat: Record<string, unknown> = { ...rest, a: world.indexOf(a), b: world.indexOf(b) };
    for (const key of ['actor', 'holder']) if (key in flat) flat[key] = world.indexOf(Reflect.get(j, key));
    return copy(flat);
  };
  const worldHistory = () => ({
    // Read-only diagnosis of the persistent history a fresh World would omit.
    liftFelt: [...Reflect.get(world, 'liftFelt') as Float64Array],
    heldBodies: [...Reflect.get(world, 'heldBodies') as Set<Agent['body']>].map(b => world.indexOf(b)),
    attachments: world.joints.filter(j => j.kind === 'grasp').map(j => ({
      joint: world.joints.indexOf(j), value: copy(Reflect.get(world, 'attachments').get(j)) })),
    pending: (Reflect.get(world, 'pending') as any[]).map(p => {
      const { a, b, ...rest } = p;
      return { ...copy(rest), a: world.indexOf(a), b: world.indexOf(b) };
    }),
    reels: [...Reflect.get(world, 'reels') as Map<Joint, number>].map(([j, value]) => ({ joint: world.joints.indexOf(j), value })),
  });
  const snapshot = () => ({ bodies: copy(world.bodies), joints: world.joints.map(joint), history: worldHistory(), rng: rngState() });
  const state = (a: Agent) => ({ actor: a.idx, slot: a.slot, body: copy(a.body) });
  const clearance = (a: Agent, b: Agent) => {
    const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, distance = Math.hypot(dx, dy),
      nx = distance > 1e-12 ? dx / distance : 1, ny = distance > 1e-12 ? dy / distance : 0;
    return { distance, circular: distance - CONTACT_SCALE * (a.profile.radius + b.profile.radius),
      physical: distance - CONTACT_SCALE * (bodyRadius(a.body, nx, ny) + bodyRadius(b.body, nx, ny)) };
  };
  const pair = () => {
    if (!fixedBlocker) throw new Error('No selected blocker');
    const b = fixedBlocker, dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, distance = Math.hypot(dx, dy);
    return { defender: state(d), blocker: state(b), peer: state(peer),
      relativeRadialVelocity: distance > 1e-12 ? ((d.vel.x - b.vel.x) * dx + (d.vel.y - b.vel.y) * dy) / distance : null,
      defenderBlocker: clearance(d, b), defenderPeer: clearance(d, peer),
      originalRepActive: d.engagement === fixedRep,
      originalHandsPresent: !!fixedRep?.hands && world.joints.includes(fixedRep.hands),
      originalHands: fixedRep?.hands ? joint(fixedRep.hands) : null };
  };
  const originalSee = sim.see.bind(sim), originalStep = world.step.bind(world);
  sim.see = (...args) => {
    const seen = originalSee(...args), [observer, target, scale] = args;
    cues.update(JSON.stringify({ t: sim.t, observer: observer.idx, target: target.idx, scale, seen })).update('\n');
    return seen;
  };
  runContactObservers.set(sim, (e, phase, data) => {
    if (e.defender !== d) return;
    if (phase === 'defender-movement') raw = { t: sim.t, data: copy(data) };
    if (phase === 'end') repEvents.push({ t: sim.t, phase, blocker: e.blocker.idx, data: copy(data) });
  });
  world.step = (intents, dt) => {
    const at = Math.abs(sim.t - input.at) < 1e-8;
    if (!prefix) {
      bodyHistory.update(JSON.stringify(world.bodies)).update('\n');
      rngHistory.update(JSON.stringify(rngState())).update('\n');
    }
    if (at) {
      fixedRep = d.engagement ?? null; fixedBlocker = fixedRep?.blocker ?? null;
      if (!fixedRep || !fixedBlocker || !raw || Math.abs(raw.t - sim.t) > 1e-8)
        throw new Error(`Missing same-tick loaded request: ${input.name}`);
      const saved = snapshot(), rawData = (raw as Raw).data, contact = rawData.command as Intent | undefined;
      if (!contact) throw new Error('No raw contact command');
      prefix = { t: sim.t, dt, bodiesSha256: hash(saved.bodies), rngSha256: hash(saved.rng),
        consumedCuePrefixSha256: cues.copy().digest('hex'), bodyHistorySha256: bodyHistory.copy().digest('hex'),
        rngHistorySha256: rngHistory.copy().digest('hex'), jointsSha256: hash(saved.joints),
        worldHistorySha256: hash(saved.history), intentsSha256: hash(intents),
        eventsSha256: hash(sim.events), before: pair(), raw: copy(raw), final: copy(intents[d.idx]) };
      const exit = rawData.exitAim !== undefined && rawData.exitAim !== null;
      const apply = arm === 'raw_exit_pulse' && exit;
      intervention = { t: sim.t, intervalEnd: sim.t + dt, applied: apply,
        reason: apply ? 'one_tick_existing_acquired_exit' : exit ? 'native_unchanged' : 'no_acquired_exit_preserve_seal',
        rawContact: copy(contact), finalBefore: copy(intents[d.idx]) };
      if (apply) {
        // Only this already chosen velocity bypasses the spacing modifier,
        // once. World load and all subsequent decisions are untouched.
        if (intents !== sim.intents || !intents[d.idx]) throw new Error('Pulse must own the actual native movement request');
        sim.intents[d.idx] = { ...sim.intents[d.idx], vel: { ...contact.vel } };
      }
      intervention.executed = copy(intents[d.idx]);
    }
    const collecting = prefix !== null, before = collecting ? pair() : null;
    const executed = collecting ? copy(intents) : null;
    const report = originalStep(intents, dt);
    if (collecting) rows.push({ t: sim.t, intervalEnd: sim.t + dt, before, after: pair(),
      raw: raw && Math.abs((raw as Raw).t - sim.t) < 1e-8 ? copy(raw) : null,
      executed, contacts: copy(report.contacts.filter(c => c.i === d.idx || c.j === d.idx)),
      strikes: copy(report.strikes.filter(s => s.i === d.idx || s.j === d.idx)),
      falls: copy(report.falls), downs: copy(report.downs), rises: copy(report.rises),
      work: copy(report.work), substeps: report.substeps,
      budgets: [d.idx, fixedBlocker!.idx, peer.idx].map(actor => ({ actor,
        armImpulse: report.armImpulse[actor], armImpulseLimit: report.armImpulseLimit[actor],
        armWork: report.armWork[actor], armWorkLimit: report.armWorkLimit[actor],
        supportMotorWork: report.supportMotorWork[actor], supportMotorWorkLimit: report.supportMotorWorkLimit[actor] })) });
    return report;
  };
  const cutoff = input.at + sim.dt + .4;
  try {
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) throw new Error('Native input cannot snap');
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < cutoff - 1e-8) sim.tick();
    const capturedPrefix = prefix as Record<string, unknown> | null;
    const capturedIntervention = intervention as Record<string, unknown> | null;
    if (!capturedPrefix || !capturedIntervention) throw new Error(`Input ended before pulse: ${input.name}`);
    const end = { t: sim.t, analysisCutoff: cutoff, completed: sim.phase === 'dead', censored: sim.phase === 'live',
      outcome: sim.phase === 'dead' ? sim.outcome : null, endSpot: sim.phase === 'dead' ? copy(sim.endSpot) : null };
    return { arm, input: { ...input, seedName: `${input.concept}|${input.form}|cover4|${input.i}`,
      seed: seedFor(`${input.concept}|${input.form}|cover4|${input.i}`) },
      actualCalls: { offense: sim.offCall, defense: sim.defCall },
      actors: sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team, id: a.player.id })),
      prefix: capturedPrefix, intervention: capturedIntervention, rows, repEvents, events: copy(sim.events), end,
      finalSha256: hash({ ...snapshot(), t: sim.t, phase: sim.phase, events: sim.events, intents: sim.intents,
        consumedCueSha256: cues.copy().digest('hex') }) };
  } finally {
    sim.see = originalSee; world.step = originalStep; runContactObservers.delete(sim);
  }
}

const comparisons = cases.map(input => {
  const native = run(input, 'native'), pulse = run(input, 'raw_exit_pulse');
  const prefixEqual = hash(native.prefix) === hash(pulse.prefix);
  if (!prefixEqual) throw new Error(`Unmatched prefix: ${input.name}`);
  const unchangedControl = input.name === 'sealed_control';
  if (unchangedControl && (pulse.intervention.applied || native.finalSha256 !== pulse.finalSha256))
    throw new Error('Sealed opposing control changed');
  const summary = (trial: typeof native) => ({
    ending: trial.end, interventionApplied: trial.intervention.applied,
    finalDefender: trial.rows.at(-1)?.after.defender.body.pos,
    finalSeparation: trial.rows.at(-1)?.after.defenderBlocker.distance,
    minPeerClearance: Math.min(...trial.rows.flatMap(r => [r.before.defenderPeer.physical, r.after.defenderPeer.physical])),
    peerContact: trial.rows.some(r => r.contacts.some((c: any) => c.impulse > 0 && (c.i === input.peer || c.j === input.peer))),
    maxWorkResidual: Math.max(...trial.rows.map(r => Math.abs(r.work.residual))),
    maxArmImpulseExcess: Math.max(...trial.rows.flatMap(r => r.budgets.map((b: any) => b.armImpulse - b.armImpulseLimit))),
    maxArmWorkExcess: Math.max(...trial.rows.flatMap(r => r.budgets.map((b: any) => b.armWork - b.armWorkLimit))),
    maxSupportMotorWorkExcess: Math.max(...trial.rows.flatMap(r => r.budgets.map((b: any) => b.supportMotorWork - b.supportMotorWorkLimit))),
  });
  return { case: input.name, prefixEqual, sealedExecutionIdentical: unchangedControl ? native.finalSha256 === pulse.finalSha256 : null,
    summary: { native: summary(native), pulse: summary(pulse) }, trials: [native, pulse] };
});
if (sourceBefore !== sourceVersion()) throw new Error('Engine changed during collection');
const document = { schema: 'g1-loaded-exit-pulse-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceBefore, sourceAfter: sourceVersion(), node: process.version,
  toolSha256: createHash('sha256').update(readFileSync('scripts/diag/g1/loaded-exit.ts')).digest('hex'),
  settings: { environment, allSourceEnvironmentAbsent: Object.values(environment).every(v => v === null),
    rosterSeed: 7, rosterGeneration: 'one Rng(7), O then D sequentially, reset identically per arm',
    strength: .55, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, front: 'over', pressure: null, record: true },
  limits: ['One already-selected raw velocity overrides spacing for exactly one controller tick; this is a diagnostic intervention, not a production policy.',
    'All actual World history and subsequent football control persist; no free-movement preview or reconstructed World is used.',
    'No new observation or RNG query; consumed-cue and prefix-state hashes establish identical preintervention inputs.',
    'Actual peer clearance/contact is offline evaluation, never supplied to a player as foresight.',
    'A .4s continuation cannot establish population shedding rates or long-horizon path safety. Live cutoffs remain censored.'],
  elapsedSeconds: (performance.now() - started) / 1000, comparisons };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(document));
console.log(JSON.stringify({ out, commit: document.commit, sourceBefore, toolSha256: document.toolSha256,
  elapsedSeconds: document.elapsedSeconds, comparisons: comparisons.map(({ trials: _trials, ...summary }) => summary) }, null, 2));
