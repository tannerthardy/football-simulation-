/** Matched mechanical approach panel using the real Pursuit controller and World.
 * node --import tsx scripts/diag/approach-control-review.ts [output.json]
 * No tackle rolls, evasion, assignments or target outcome overrides. These are
 * body-contact probes, not NFL tackle rates. Commands are sampled at 20 Hz.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import type { Vec2 } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { fatigueFactor, followAccel } from '../../src/physics/kinematics.js';
import { availability, baseRadiusAt, supportParams } from '../../src/physics/support.js';
import { World, type Intent } from '../../src/physics/world.js';
import type { Agent } from '../../src/sim/agent.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { Pursuit } from '../../src/sim/behaviors/defense.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/approach-control-review/baseline.json';
if (process.argv.length > 3) throw new Error('Usage: approach-control-review.ts [output.json]');
const sourceBefore = sourceVersion(), scriptBefore = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const startedAt = new Date().toISOString();
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dt = .05, ticks = 100;
const rosterSeeds = [7, 19, 31];
const geometries = {
  crossing: { x: 5, y: 6, headingX: 0, headingY: -1 },
  nearCrossing: { x: 3, y: 3.5, headingX: -2 / Math.sqrt(53), headingY: -7 / Math.sqrt(53) },
  frontal: { x: 8, y: 1, headingX: -1, headingY: 0 },
  trailing: { x: -2, y: 1, headingX: 1, headingY: 0 },
  fasterCarrierEscape: { x: -3, y: 1, headingX: 1, headingY: 0 },
};
type Geometry = keyof typeof geometries;
interface Input { roster: number; seed: number; side: number; geometry: Geometry; initialSpeed: number; substeps: number; witness?: 'ordinary-live-crossing' }
const inputs: Input[] = [];
for (let roster = 0; roster < rosterSeeds.length; roster++) for (const geometry of Object.keys(geometries) as Geometry[])
  for (const side of [-1, 1]) for (const initialSpeed of [4, 7]) for (const substeps of [12, 48])
    inputs.push({ roster, seed: rosterSeeds[roster], side, geometry, initialSpeed, substeps });
// Kept separate from the unchanged120-row panel. This geometry was selected
// after diagnosing a baseline miss with an ordinary live pursuit command.
const witnessInputs: Input[] = [];
for (const side of [-1, 1]) for (const substeps of [12, 48]) witnessInputs.push({ roster: 0, seed: 19, side,
  geometry: 'crossing', initialSpeed: Math.sqrt(72), substeps, witness: 'ordinary-live-crossing' });

function build(input: Input) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(input.seed), input.witness ? 'O' : 'Panel offense', 'OFF', input.witness ? {} : { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(input.seed + 1), input.witness ? 'D' : 'Panel defense', 'DEF', input.witness ? {} : { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: input.witness ? 'lab' : 'Approach probe' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: input.witness ? 'lab' : 'Approach probe' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.seed });
  const carrierSlot = input.roster === 1 && input.geometry !== 'fasterCarrierEscape' ? 'RB' : 'Z';
  const defenderSlot = input.geometry === 'fasterCarrierEscape' ? 'DT_S' : ['FS', 'LB_M', 'CB_W'][input.roster];
  const c = sim.slot(carrierSlot)!, d = sim.slot(defenderSlot)!;
  const speed = input.geometry === 'fasterCarrierEscape' ? Math.min(c.profile.vmax * .94, d.profile.vmax + 1.5) : 6;
  if (input.geometry === 'fasterCarrierEscape' && speed <= d.profile.vmax)
    throw new Error('Negative-control roster is not faster than its pursuer');
  const g = input.witness ? { x: 3, y: 6, headingX: 1 / Math.sqrt(2), headingY: -1 / Math.sqrt(2) } : geometries[input.geometry];
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 50 + g.x, y: CENTER_Y + input.side * g.y };
  d.body.vel = input.witness ? { x: 6, y: -input.side * 6 }
    : { x: g.headingX * input.initialSpeed, y: input.side * g.headingY * input.initialSpeed };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x); d.behavior = new Pursuit();
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  // Stationary preceding history is avoided: warm the ordinary perception
  // buffer with a constant-velocity path ending at the actual initial state.
  // It is the same observed approach for both mirrors and both resolutions.
  const startC = { ...c.pos }, startD = { ...d.pos };
  if (input.witness) {
    // Exact original witness construction: default-strength teams and24
    // repeated initial snapshots, rather than the panel's moving history.
    for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  } else for (let k = 23; k >= 0; k--) {
      c.body.pos = { x: startC.x - c.vel.x * k * dt, y: startC.y - c.vel.y * k * dt };
      d.body.pos = { x: startD.x - d.vel.x * k * dt, y: startD.y - d.vel.y * k * dt };
      sim.perception.record(sim.agents);
    }
  c.body.pos = startC; d.body.pos = startD;
  const world = new World([c.body, d.body], { substeps: input.substeps });
  return { sim, c, d, world, speed };
}
const v = (x: Vec2) => ({ x: x.x, y: x.y });
function body(a: Agent) {
  const s = a.body.support!, p = supportParams(a.profile);
  return { pos: v(a.pos), vel: v(a.vel), facing: a.facing, energy: a.body.energy, spin: a.body.spin ?? 0,
    support: { state: s.state, cause: s.cause ?? null, xi: v(s.xi), out: s.out, posture: s.posture,
      base: baseRadiusAt(p, s.posture), load: v(s.load), felt: v(s.felt), lean: v(s.lean),
      causes: s.causes ? { ...s.causes } : null } };
}
function geometry(c: Agent, d: Agent, seen: Perceived, cmd: Intent) {
  const dx = seen.pos.x - d.pos.x, dy = seen.pos.y - d.pos.y, dist = Math.hypot(dx, dy), ux = dx / Math.max(1e-12, dist), uy = dy / Math.max(1e-12, dist);
  const contact = c.profile.radius + d.profile.radius + d.profile.reach * .65;
  const cutSkill = cmd.cutSkill ?? 1;
  const capacity = availability(d.body.support!, supportParams(d.profile), fatigueFactor(d.body.energy));
  const brake = followAccel(d.body, { x: -ux * 1e3, y: -uy * 1e3 }, cutSkill, capacity);
  const decel = Math.max(.1, -brake.x * ux - brake.y * uy), through = 2.5 + 2 * (1 - d.r('tackling'));
  const relative = { x: d.vel.x - seen.vel.x, y: d.vel.y - seen.vel.y };
  const closing = relative.x * ux + relative.y * uy;
  const requested = { x: cmd.vel.x - seen.vel.x, y: cmd.vel.y - seen.vel.y };
  const stopping = Math.max(0, (closing * closing - through * through) / (2 * decel));
  return { perceivedDistance: dist, contactControllerRadius: contact, bodyRadius: c.profile.radius + d.profile.radius,
    actualDistance: Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y), closing, across: -relative.x * uy + relative.y * ux,
    requestedClosing: requested.x * ux + requested.y * uy, requestedAcross: -requested.x * uy + requested.y * ux,
    availableBrakeEstimate: decel, throughDemand: through, stoppingDistanceEstimate: stopping,
    brakingMarginEstimate: dist - contact - stopping, capacity };
}

function trial(input: Input, observe: boolean) {
  const { sim, c, d, world, speed } = build(input), frames: any[] = [];
  let observations: Perceived[] = [];
  const plainSee = sim.see;
  if (observe) sim.see = function (observer, target, delayScale) {
    const seen = plainSee.call(this, observer, target, delayScale);
    if (observer === d && target === c) observations.push({ ...seen, pos: v(seen.pos), vel: v(seen.vel) });
    return seen;
  };
  const p = () => ({ x: c.profile.massKg * c.vel.x + d.profile.massKg * d.vel.x, y: c.profile.massKg * c.vel.y + d.profile.massKg * d.vel.y });
  let closest = Infinity, firstContact: any = null, lastContactAt: number | null = null;
  let maxMomentumResidual = 0, maxWorkResidual = 0, maxPenetration = 0, maxMotorWorkExcess = 0;
  const falls: any[] = [], commandSteps: number[] = [];
  let previousCommand: Vec2 | null = null;
  const trialTicks = input.witness ? 60 : ticks;
  for (let k = 0; k < trialTicks; k++) {
    const t = k * dt;
    sim.t = t; sim.perception.record(sim.agents); observations = [];
    const command = (input.witness ? chase(sim, d, c) : d.behavior.update(d, sim)) as Intent;
    const before = observe ? { carrier: body(c), defender: body(d) } : null;
    const approach = observe && observations.length ? geometry(c, d, observations[0], command) : null;
    const commandStep = previousCommand ? Math.hypot(command.vel.x - previousCommand.x, command.vel.y - previousCommand.y) : 0;
    commandSteps.push(commandStep); previousCommand = { ...command.vel };
    const p0 = p(), report = world.step([{ vel: { x: speed, y: 0 }, facing: 0 }, command], dt), p1 = p();
    const ground = { x: report.groundImpulse[0].x + report.groundImpulse[1].x, y: report.groundImpulse[0].y + report.groundImpulse[1].y };
    maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual)); maxPenetration = Math.max(maxPenetration, report.maxPenetration);
    maxMotorWorkExcess = Math.max(maxMotorWorkExcess, ...report.supportMotorWork.map((work, i) => work - report.supportMotorWorkLimit[i]));
    const distance = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); closest = Math.min(closest, distance);
    if (report.contacts.length) {
      lastContactAt = t + dt;
      if (!firstContact) firstContact = { interval: [t, t + dt], contactClosing: Math.max(...report.contacts.map(co => co.closing)),
        impulse: report.contacts.reduce((s, co) => s + co.impulse, 0), before, command, approach,
        after: observe ? { carrier: body(c), defender: body(d) } : null };
    }
    for (const idx of report.falls) falls.push({ t: t + dt, body: idx === 0 ? 'carrier' : 'defender', cause: world.bodies[idx].support?.cause ?? null });
    if (observe) frames.push({ t, end: t + dt, before, perceivedTarget: observations, intent: command, approach, commandStep,
      after: { carrier: body(c), defender: body(d) }, distance, contacts: report.contacts, falls: report.falls,
      groundImpulse: report.groundImpulse, groundYawImpulse: report.groundYawImpulse, groundWork: report.groundWork,
      groundYawWork: report.groundYawWork, work: report.work, supportMotorWork: report.supportMotorWork,
      supportMotorWorkLimit: report.supportMotorWorkLimit, substeps: report.substeps });
  }
  if (observe) sim.see = plainSee;
  const signature = hash({ carrier: c.body, defender: d.body, command: previousCommand, rngNext: sim.rng.nextU32() });
  const contactEnd = firstContact?.interval[1] ?? null;
  const early = contactEnd === null ? [] : frames.filter(f => f.t >= contactEnd - dt - 1e-9 && f.t <= contactEnd + .5 + 1e-9);
  const precontact = frames.filter(f => contactEnd === null || f.end <= contactEnd + 1e-9);
  const firstNegativeMargin = precontact.find(f => f.approach && f.approach.closing > f.approach.throughDemand && f.approach.brakingMarginEstimate < 0);
  return { input, id: input.witness ? `AC-W-liveCrossing-${input.side < 0 ? 'L' : 'R'}-P${input.substeps}`
    : `AC-R${input.roster + 1}-${input.geometry}-${input.side < 0 ? 'L' : 'R'}-V${input.initialSpeed}-P${input.substeps}`,
    selection: input.witness ? 'diagnostic-selected-after-baseline-miss' : 'fixed-before-outcomes', durationSeconds: trialTicks * dt,
    profile: { carrierSlot: c.slot, defenderSlot: d.slot, carrier: c.profile, defender: d.profile,
      defenderRatings: { tackling: d.r('tackling'), pursuit: d.r('pursuit'), awareness: d.r('awareness'), anticipation: d.r('anticipation') } },
    intendedCarrierSpeed: speed, negativeControl: input.geometry === 'fasterCarrierEscape', closest, firstContact, lastContactAt,
    falls, firstOvercommittedApproach: firstNegativeMargin ?? null,
    maxPrecontactCommandStep: Math.max(0, ...precontact.map(f => f.commandStep)),
    maxPrecontactSupportDisplacement: Math.max(0, ...precontact.map(f => Math.hypot(f.after.defender.support.xi.x, f.after.defender.support.xi.y))),
    earlyContactWindow: early, final: { carrier: body(c), defender: body(d), separation: Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) },
    maxMomentumResidual, maxWorkResidual, maxMotorWorkExcess, maxPenetration, signature, frames };
}
const trials: ReturnType<typeof trial>[] = [], observerChecks: unknown[] = [];
const cpu0 = process.cpuUsage(), wall0 = performance.now();
for (const input of inputs) {
  const row = trial(input, true); trials.push(row);
  // Six fixed inputs: first roster, one mirror and speed, crossing/frontal/
  // faster escape, at both resolutions. No selection by measured outcome.
  if (input.roster === 0 && input.side === -1 && input.initialSpeed === 4 && ['crossing', 'frontal', 'fasterCarrierEscape'].includes(input.geometry)) {
    const control = trial(input, false), passed = row.signature === control.signature;
    observerChecks.push({ id: row.id, passed, observed: row.signature, plain: control.signature });
    if (!passed) throw new Error(`Observer changed physical state or RNG: ${row.id}`);
  }
}
const witnesses: ReturnType<typeof trial>[] = [], witnessObserverChecks: unknown[] = [];
for (const input of witnessInputs) {
  const row = trial(input, true), plain = trial(input, false), passed = row.signature === plain.signature;
  if (!passed) throw new Error(`Observer changed witness state/RNG: ${row.id}`);
  witnessObserverChecks.push({ id: row.id, passed, observed: row.signature, plain: plain.signature }); witnesses.push(row);
}
const sourceAfter = sourceVersion(), scriptAfter = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Source or script changed during the approach panel');
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
function summary(rows: typeof trials) {
  const contacts = rows.filter(r => r.firstContact !== null);
  return { rows: rows.length, bodyTouches: contacts.length, meanClosest: mean(rows.map(r => r.closest)),
    meanFirstContactClosing: mean(contacts.map(r => r.firstContact.contactClosing)),
    carrierFallsInFirstHalfSecond: rows.filter(r => r.firstContact && r.falls.some(f => f.body === 'carrier' && f.t <= r.firstContact.interval[1] + .5)).length,
    defenderFallsInFirstHalfSecond: rows.filter(r => r.firstContact && r.falls.some(f => f.body === 'defender' && f.t <= r.firstContact.interval[1] + .5)).length,
    precontactNegativeBrakingMargin: rows.filter(r => r.firstOvercommittedApproach !== null).length,
    maxMomentumResidual: Math.max(...rows.map(r => r.maxMomentumResidual)), maxWorkResidual: Math.max(...rows.map(r => r.maxWorkResidual)),
    maxMotorWorkExcess: Math.max(...rows.map(r => r.maxMotorWorkExcess)) };
}
const summaries = Object.keys(geometries).map(name => ({ geometry: name, ...summary(trials.filter(r => r.input.geometry === name && r.input.substeps === 12)) }));
const mirrors = inputs.filter(i => i.side === 1).map(i => {
  const a = trials.find(r => r.input.roster === i.roster && r.input.geometry === i.geometry && r.input.initialSpeed === i.initialSpeed && r.input.substeps === i.substeps && r.input.side === 1)!;
  const b = trials.find(r => r.input.roster === i.roster && r.input.geometry === i.geometry && r.input.initialSpeed === i.initialSpeed && r.input.substeps === i.substeps && r.input.side === -1)!;
  return { a: a.id, b: b.id, closestError: Math.abs(a.closest - b.closest), contactStateDisagreement: !!a.firstContact !== !!b.firstContact,
    finalPositionError: Math.max(Math.hypot(a.final.carrier.pos.x - b.final.carrier.pos.x, a.final.carrier.pos.y + b.final.carrier.pos.y - 2 * CENTER_Y),
      Math.hypot(a.final.defender.pos.x - b.final.defender.pos.x, a.final.defender.pos.y + b.final.defender.pos.y - 2 * CENTER_Y)) };
});
const resolutions = inputs.filter(i => i.substeps === 12).map(i => {
  const a = trials.find(r => JSON.stringify(r.input) === JSON.stringify(i))!;
  const b = trials.find(r => r.input.roster === i.roster && r.input.geometry === i.geometry && r.input.initialSpeed === i.initialSpeed && r.input.side === i.side && r.input.substeps === 48)!;
  return { a: a.id, b: b.id, closestError: Math.abs(a.closest - b.closest), contactStateDisagreement: !!a.firstContact !== !!b.firstContact,
    firstContactClosingDifference: a.firstContact && b.firstContact ? Math.abs(a.firstContact.contactClosing - b.firstContact.contactClosing) : null,
    firstContactTimeDifference: a.firstContact && b.firstContact ? Math.abs(a.firstContact.interval[1] - b.firstContact.interval[1]) : null,
    earlyFallDisagreement: !!a.firstContact && !!b.firstContact && a.falls.some(f => f.t <= a.firstContact.interval[1] + .5) !== b.falls.some(f => f.t <= b.firstContact.interval[1] + .5) };
});
const cpu = process.cpuUsage(cpu0);
const report = { schema: 'approach-control-review-v1', sourceBefore, sourceAfter, scriptBefore, scriptAfter,
  cohortHash: hash(inputs), inputs, decisionDt: dt, durationSeconds: ticks * dt, startedAt,
  definitions: { scope: 'Mechanical approach commands from ordinary Pursuit, perception and two-body World; no tackle rolls, grips, carrier evasion, assignments or play outcomes. Body-touch frequency is not an NFL tackle rate.',
    firstContact: 'The first 20 Hz interval containing actual World body-contact impulse; closing is the maximum normal closing speed at touch within that interval, not the end-of-tick relative velocity.',
    earlyContactWindow: 'The first collision interval and subsequent0.5 seconds; distinct from continued five-second pursuit.',
    fasterCarrierEscape: 'A behind-and-offset pursuer whose generated maximum speed is below the straight carrier command; excluded from positive approach summaries. No speed/profile overrides.',
    firstOvercommittedApproach: 'First precontact command interval with positive relative closing above controller through demand and negative braking margin under the existing followAccel envelope. A diagnostic estimate, not a guarantee of missed tackle or an error verdict.',
    perception: 'The exact target observations requested by the ordinary controller; instrumentation never makes extra see calls or RNG draws.',
    warmHistory: '1.15 seconds of constant-velocity preceding history ending at the staged positions. Physics begins at time zero.',
    diagnosticWitness: 'Four separate mirrored/resolution versions of one baseline miss selected after diagnosis. Seed19/20, default team strength, Z/FS, FS position(+3,±6), velocity(6,∓6),24 repeated initial snapshots, direct ordinary chase, three seconds. Excluded from the120-panel metrics and cohortHash.',
    filmSelection: 'First roster at12 physics steps, all geometries and both mirrors, initial defender speed7; selected before outcomes.' },
  observerChecks, summaries, positivePrimarySummary: summary(trials.filter(r => !r.negativeControl && r.input.substeps === 12)),
  witnessInputs, witnessCohortHash: hash(witnessInputs), witnesses, witnessObserverChecks,
  mirrorChecks: mirrors, resolutionChecks: resolutions, cost: { cpuMs: (cpu.user + cpu.system) / 1000, wallMs: performance.now() - wall0 }, trials };
function finite(x: unknown, path = 'report'): void {
  if (typeof x === 'number' && !Number.isFinite(x)) throw new Error(`Nonfinite ${path}`);
  if (Array.isArray(x)) x.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) finite(v, `${path}.${k}`);
}
finite(report); mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report) + '\n');
const fixedFilm = trials.filter(r => r.input.roster === 0 && r.input.substeps === 12 && r.input.initialSpeed === 7);
const compact = { ...report, trials: trials.map(r => ({ ...r, frames: undefined })),
  fixedFilm: fixedFilm.map(r => ({ id: r.id, input: r.input, profile: r.profile, frames: r.frames })) };
writeFileSync(output.replace(/\.json$/, '-compact.json.gz'), gzipSync(JSON.stringify(compact) + '\n', { level: 9 }));
console.table(summaries);
console.log(JSON.stringify({ sourceBefore, scriptBefore, cohortHash: report.cohortHash, observerChecks: observerChecks.length,
  mirrorWorst: Math.max(...mirrors.map(r => r.finalPositionError)), contactResolutionDisagreements: resolutions.filter(r => r.contactStateDisagreement).length,
  earlyFallResolutionDisagreements: resolutions.filter(r => r.earlyFallDisagreement).length,
  witnessObserverChecks: witnessObserverChecks.length, witnesses: witnesses.map(r => ({ id: r.id, closest: r.closest,
    firstContact: r.firstContact?.interval ?? null, firstCommand: r.frames[0].intent })), output }));
