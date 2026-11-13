/** Hand-physics bench (Phase 0 of the hands plan, docs/reviews/hands-plan.md).
 * Two matched linemen joined by a real World hand joint; feet and hand
 * requests are scripted, so only the World decides what happens. Five drills a
 * football hand must be able to express, each with a no-hands or relaxed
 * control, mirrored, in both hand-contact modes ('center', 'patch'):
 *   turn      blocker tries to move a planted man sideways with his hands
 *   drag      blocker helps a flowing defender go further (or restrains him)
 *   slingshot blocker redirects a penetrator along his own path
 *   punch     pass-pro punch on an oncoming rusher
 *   snatch    defender pulls a leaning blocker forward and across
 * Hand requests use optional joint fields `drive` (wanted relative tangential
 * velocity of b past a, yd/s) and `shove` (wanted arm extension speed, yd/s);
 * the current World ignores them, so today's numbers are the baseline.
 * Audits: work residual, arm impulse vs limit, and linear momentum vs ground
 * impulse for the pair. Observation only.
 * node --import tsx scripts/diag/hands/bench.ts [--patch-only|--center-only]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { supportParams } from '../../../src/physics/support.js';
import type { HandJoint, Intent } from '../../../src/physics/world.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { withRecoveryExperiment } from '../tackle/grip-refinement.js';
import { sourceVersion } from '../../source-version.js';

const continued = process.argv.includes('--continued-recovery');
const outAt = process.argv.indexOf('--out');
const output = outAt < 0 ? undefined : process.argv[outAt + 1];
const source = sourceVersion();

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
type Mode = 'center' | 'patch';
type HandReq = { push: number; hold: number; steer: number; drive?: number; shove?: number };

/** Matched blocker B (facing +x) and defender D (facing B) with one hand joint
 * owned by `owner`. `side` mirrors every lateral quantity. */
function fixture(mode: Mode, side: number, owner: 'B' | 'D', gap = .82, dy = 0) {
  const sim = new PlaySim({ offense: pickOffense(offense, FORMATION_BY_ID.ace_11.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'bench' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11, handContact: mode } as any);
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  sim.t = 1; sim.world.time = 1;
  const B = sim.slot('RG')!, D = sim.slot('DT_W')!;
  Object.assign(D.profile, structuredClone(B.profile)); // matched bodies
  B.body.pos = { x: 40, y: CENTER_Y }; B.body.facing = 0;
  D.body.pos = { x: 40 + gap, y: CENTER_Y + side * dy }; D.body.facing = Math.PI;
  const a = owner === 'B' ? B : D, b = owner === 'B' ? D : B;
  const joint: HandJoint = { kind: 'hands', a: a.body, b: b.body, extension: a.profile.radius + b.profile.radius + .25, push: 0, hold: 0, steer: 0 };
  sim.world.joints.push(joint);
  return { sim, B, D, joint, arm: supportParams(a.profile).armForce };
}

type Drill = {
  name: string; owner: 'B' | 'D'; gap?: number; dy?: number; seconds: number;
  init?: (B: any, D: any, side: number) => void;
  feet: (B: any, D: any, side: number, t: number) => { b: Intent; d: Intent };
  hands: (arm: number, side: number, t: number) => HandReq | null;
  measure: (r: Run, side: number) => Record<string, number>;
};
type Run = { B0: any; D0: any; B: any; D: any; peakXiB: number; peakXiD: number; fellB: boolean; fellD: boolean;
  dVelD02: number; dVelB02: number; maxResidual: number; armExcess: number; armWorkExcess: number;
  supportWorkExcess: number; momentumGap: number };

function run(drill: Drill, mode: Mode, side: number): Run {
  const { sim, B, D, joint, arm } = fixture(mode, side, drill.owner, drill.gap, drill.dy);
  drill.init?.(B, D, side);
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const snap = (a: any) => ({ x: a.pos.x, y: a.pos.y, vx: a.vel.x, vy: a.vel.y, f: a.facing });
  const B0 = snap(B), D0 = snap(D);
  let peakXiB = 0, peakXiD = 0, maxResidual = 0, armExcess = 0, armWorkExcess = 0,
    supportWorkExcess = 0, momentumGap = 0, dVelD02 = 0, dVelB02 = 0, contactAt = -1;
  const steps = Math.round(drill.seconds / sim.dt);
  for (let k = 0; k < steps; k++) {
    const t = k * sim.dt;
    const h = drill.hands(arm, side, t);
    if (h) Object.assign(joint, h, { broken: false });
    else Object.assign(joint, { push: 0, hold: 0, steer: 0, drive: undefined, shove: undefined });
    if (!sim.world.joints.includes(joint) && h) sim.world.joints.push(joint);
    const intents: Intent[] = sim.agents.map((a) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    const f = drill.feet(B, D, side, t);
    intents[B.idx] = f.b; intents[D.idx] = f.d;
    const p0 = { x: B.profile.massKg * B.vel.x + D.profile.massKg * D.vel.x, y: B.profile.massKg * B.vel.y + D.profile.massKg * D.vel.y };
    const execute = () => sim.world.step(intents, sim.dt);
    const report = continued ? withRecoveryExperiment(sim.world, 'continued-recovery', execute).result : execute();
    sim.t += sim.dt; sim.world.time = sim.t; sim.perception.record(sim.agents);
    const p1 = { x: B.profile.massKg * B.vel.x + D.profile.massKg * D.vel.x, y: B.profile.massKg * B.vel.y + D.profile.massKg * D.vel.y };
    const g = { x: report.groundImpulse[B.idx].x + report.groundImpulse[D.idx].x, y: report.groundImpulse[B.idx].y + report.groundImpulse[D.idx].y };
    momentumGap = Math.max(momentumGap, Math.hypot(p1.x - p0.x - g.x, p1.y - p0.y - g.y));
    maxResidual = Math.max(maxResidual, Math.abs(report.work.residual));
    for (const a of [B, D]) {
      armExcess = Math.max(armExcess, report.armImpulse[a.idx] - report.armImpulseLimit[a.idx]);
      armWorkExcess = Math.max(armWorkExcess, report.armWork[a.idx] - report.armWorkLimit[a.idx]);
      supportWorkExcess = Math.max(supportWorkExcess, report.supportMotorWork[a.idx] - report.supportMotorWorkLimit[a.idx]);
    }
    const xi = (a: any) => { const s = a.body.support; return s?.state === 'up' ? Math.hypot(s.xi.x, s.xi.y) : 9; };
    peakXiB = Math.max(peakXiB, xi(B)); peakXiD = Math.max(peakXiD, xi(D));
    if (contactAt < 0 && Math.hypot(B.pos.x - D.pos.x, B.pos.y - D.pos.y) <= joint.extension + 1e-6) contactAt = sim.t;
    if (contactAt >= 0 && Math.abs(sim.t - contactAt - .2) < sim.dt / 2) {
      dVelD02 = Math.hypot(D.vel.x - D0.vx, D.vel.y - D0.vy); dVelB02 = Math.hypot(B.vel.x - B0.vx, B.vel.y - B0.vy);
    }
  }
  return { B0, D0, B: snap(B), D: snap(D), peakXiB, peakXiD, fellB: B.body.support?.state !== 'up', fellD: D.body.support?.state !== 'up',
    dVelD02, dVelB02, maxResidual, armExcess, armWorkExcess, supportWorkExcess, momentumGap };
}

const stand = (facing: number, push = 1): Intent => ({ vel: { x: 0, y: 0 }, facing, push, posture: .85 });
const toward = (from: any, to: any) => Math.atan2(to.pos.y - from.pos.y, to.pos.x - from.pos.x);
const lat = (r: Run, side: number, who: 'B' | 'D') => (r[who].y - r[`${who}0` as 'B0' | 'D0'].y) * side;
const yaw = (r: Run, who: 'B' | 'D') => Math.atan2(Math.sin(r[who].f - r[`${who}0` as 'B0' | 'D0'].f), Math.cos(r[who].f - r[`${who}0` as 'B0' | 'D0'].f)) * 57.3;

const DRILLS: Drill[] = [
  { name: 'turn: B moves a planted D sideways (hands drive +1.5)', owner: 'B', seconds: 1,
    feet: (B, D, s) => ({ b: { ...stand(toward(B, D)), vel: { x: 0, y: s * 1.5 } }, d: stand(toward(D, B)) }),
    hands: (arm, s) => ({ push: arm, hold: arm * .5, steer: arm, drive: s * 1.5 }),
    measure: (r, s) => ({ 'D lat': lat(r, s, 'D'), 'D yaw': yaw(r, 'D') * s, 'B lat': lat(r, s, 'B') }) },
  { name: 'turn control: relaxed D (no lean)', owner: 'B', seconds: 1,
    feet: (B, D, s) => ({ b: { ...stand(toward(B, D)), vel: { x: 0, y: s * 1.5 } }, d: { ...stand(toward(D, B), 0) } }),
    hands: (arm, s) => ({ push: arm, hold: arm * .5, steer: arm, drive: s * 1.5 }),
    measure: (r, s) => ({ 'D lat': lat(r, s, 'D'), 'D yaw': yaw(r, 'D') * s, 'B lat': lat(r, s, 'B') }) },
  { name: 'drag: D flows +3, B helps (drive +1)', owner: 'B', seconds: 1,
    feet: (B, D, s) => ({ b: { ...stand(toward(B, D)), vel: { x: 0, y: s * 3.5 } }, d: { ...stand(toward(D, B)), vel: { x: 0, y: s * 3 } } }),
    hands: (arm, s) => ({ push: arm, hold: arm * .5, steer: arm, drive: s * 1 }),
    measure: (r, s) => ({ 'D lat': lat(r, s, 'D'), 'B lat': lat(r, s, 'B') }) },
  { name: 'drag control: D flows +3, B restrains (B stands, steer brake)', owner: 'B', seconds: 1,
    feet: (B, D, s) => ({ b: stand(toward(B, D)), d: { ...stand(toward(D, B)), vel: { x: 0, y: s * 3 } } }),
    hands: (arm) => ({ push: arm, hold: arm * .5, steer: arm }),
    measure: (r, s) => ({ 'D lat': lat(r, s, 'D'), 'B lat': lat(r, s, 'B') }) },
  { name: 'drag control: D flows +3 alone (no hands)', owner: 'B', seconds: 1, gap: 3,
    feet: (B, D, s) => ({ b: stand(0), d: { ...stand(Math.PI), vel: { x: 0, y: s * 3 } } }),
    hands: () => null,
    measure: (r, s) => ({ 'D lat': lat(r, s, 'D') }) },
  { name: 'slingshot: D penetrates inside, B redirects (drive -2 along his path)', owner: 'B', seconds: 1, dy: -.35,
    init: (B, D) => { D.body.vel = { x: -2, y: 0 }; },
    feet: (B, D, s) => ({ b: stand(toward(B, D)), d: { ...stand(toward(D, B)), vel: { x: -4, y: 0 } } }),
    hands: (arm, s) => ({ push: arm, hold: 0, steer: arm, drive: -s * 2 }),
    measure: (r, s) => ({ 'D pen': -(r.D.x - r.D0.x), 'D lat': lat(r, s, 'D'), 'B pushed back': -(r.B.x - r.B0.x) }) },
  { name: 'slingshot control: no hands', owner: 'B', seconds: 1, dy: -.35,
    init: (B, D) => { D.body.vel = { x: -2, y: 0 }; },
    feet: (B, D, s) => ({ b: stand(toward(B, D)), d: { ...stand(toward(D, B)), vel: { x: -4, y: 0 } } }),
    hands: () => null,
    measure: (r, s) => ({ 'D pen': -(r.D.x - r.D0.x), 'D lat': lat(r, s, 'D'), 'B pushed back': -(r.B.x - r.B0.x) }) },
  { name: 'punch: rusher at 3 yd/s, B punches (shove 1.5)', owner: 'B', seconds: .5, gap: 1.3,
    init: (B, D) => { D.body.vel = { x: -3, y: 0 }; },
    feet: (B, D) => ({ b: stand(toward(B, D)), d: { ...stand(toward(D, B)), vel: { x: -3, y: 0 } } }),
    hands: (arm) => ({ push: arm, hold: 0, steer: arm * .5, shove: 1.5 }),
    measure: (r) => ({ 'D dv 0.2s': r.dVelD02, 'B dv 0.2s': r.dVelB02, 'B pushed back': -(r.B.x - r.B0.x), 'D xi': r.peakXiD }) },
  { name: 'punch control: hands up, no shove', owner: 'B', seconds: .5, gap: 1.3,
    init: (B, D) => { D.body.vel = { x: -3, y: 0 }; },
    feet: (B, D) => ({ b: stand(toward(B, D)), d: { ...stand(toward(D, B)), vel: { x: -3, y: 0 } } }),
    hands: (arm) => ({ push: arm, hold: 0, steer: arm * .5 }),
    measure: (r) => ({ 'D dv 0.2s': r.dVelD02, 'B dv 0.2s': r.dVelB02, 'B pushed back': -(r.B.x - r.B0.x), 'D xi': r.peakXiD }) },
  { name: 'snatch: B leans in, D pulls him across (hold, drive +2)', owner: 'D', seconds: .8,
    feet: (B, D, s) => ({ b: { ...stand(toward(B, D)), vel: { x: 1, y: 0 } }, d: stand(toward(D, B)) }),
    hands: (arm, s) => ({ push: 0, hold: arm, steer: arm, drive: -s * 2 }),
    measure: (r, s) => ({ 'B lat': lat(r, s, 'B'), 'B xi peak': r.peakXiB, 'B fell': r.fellB ? 1 : 0 }) },
  { name: 'snatch control: D only holds', owner: 'D', seconds: .8,
    feet: (B, D, s) => ({ b: { ...stand(toward(B, D)), vel: { x: 1, y: 0 } }, d: stand(toward(D, B)) }),
    hands: (arm) => ({ push: 0, hold: arm, steer: arm }),
    measure: (r, s) => ({ 'B lat': lat(r, s, 'B'), 'B xi peak': r.peakXiB, 'B fell': r.fellB ? 1 : 0 }) },
];

const modes: Mode[] = process.argv.includes('--patch-only') ? ['patch'] : process.argv.includes('--center-only') ? ['center'] : ['center', 'patch'];
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const rows = [];
for (const mode of modes) {
  console.log(`\n== hand contact: ${mode}`);
  for (const drill of DRILLS) {
    const a = run(drill, mode, 1), b = run(drill, mode, -1);
    const ma = drill.measure(a, 1), mb = drill.measure(b, -1);
    const mirror = Math.max(...Object.keys(ma).map((k) => Math.abs(ma[k] - mb[k])));
    for (const r of [a, b]) {
      assert(r.maxResidual < 1e-8 && r.armExcess < 1e-8 && r.armWorkExcess < 1e-8
        && r.supportWorkExcess < 1e-8 && r.momentumGap < 1e-7);
    }
    rows.push({ mode, drill: drill.name, mirror, positive: a, negative: b, measurements: [ma, mb] });
    console.log(`  ${drill.name.padEnd(68)} ${Object.entries(ma).map(([k, v]) => `${k} ${f(v)}`).join(' | ')}`
      + ` || mirror ${mirror < 1e-6 ? 'exact' : mirror.toExponential(1)} audit: work ${Math.max(a.maxResidual, b.maxResidual).toExponential(0)} arm ${Math.max(a.armExcess, b.armExcess) > 1e-6 ? 'OVER' : 'ok'} momentum ${Math.max(a.momentumGap, b.momentumGap).toExponential(0)}`);
  }
}
assert(sourceVersion() === source);
if (output) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ source, collector: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
    recoveryExperiment: continued ? 'continued-recovery' : null,
    recoverySourcesSha256: continued ? Object.fromEntries(['grip-refinement.ts', 'continued-recovery.ts', 'continued-recovery-world.ts']
      .map(p => [p, createHash('sha256').update(readFileSync(`scripts/diag/tackle/${p}`)).digest('hex')])) : null,
    flags: Object.fromEntries(['HAND_MOTOR', 'GAIT_STEP', 'LEG_BRACE'].map(k => [k, process.env[k] ?? '0'])), rows }));
}
