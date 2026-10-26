/**
 * PHY-1 reproducer: can a slightly stronger blocker carry a square, resisting
 * end sideways? Two bodies on the shared World, hands on, nothing else.
 *
 *   node --import tsx scripts/diag/lateral-carry.ts [--json out/phy1/lateral-carry.json]
 *
 * The blocker (Y) faces the end square along +y and asks to travel +y; the
 * end faces him and asks to go -y (inside) with full lean, as on seed 10 P46.
 * Each tick records what the feet delivered (ground impulse / dt), the
 * committed lean, the gait share, availability, support state and the hand
 * load, and the budgets the feet law applies: strength (pushForce, times the
 * directional factor and availability) and traction (mu * m * g). The World,
 * support model and profiles are used as they are; only mass and the
 * functional strength rating are set, with the derivation physical.ts uses.
 */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { generatePlayer } from '../../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../../src/players/physical.js';
import type { Body } from '../../src/physics/kinematics.js';
import { G } from '../../src/core/units.js';
import { supportParams, TURF_MU } from '../../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../../src/physics/world.js';

const YD = 0.9144, DT = 0.05;

/** A real generated profile at this mass and functional strength (physical.ts: power = m(0.55 + 0.75 s)). */
function profile(position: 'TE' | 'EDGE', massKg: number, strength: number, seed: number): PhysicalProfile {
  const p = derivePhysical(generatePlayer(new Rng(seed), position));
  const lb = massKg / 0.45359237;
  return { ...p, massKg, power: massKg * (0.55 + 0.75 * strength), radius: Math.min(0.42, Math.max(0.22, 0.24 + (lb - 180) / 1100)) };
}

interface Case { name: string; y: { m: number; s: number }; d: { m: number; s: number }; resist: boolean; yWant: number; seconds?: number }

function run(c: Case) {
  const yP = profile('TE', c.y.m, c.y.s, 11), dP = profile('EDGE', c.d.m, c.d.s, 12);
  // Both at the same reference profile apart from mass and strength, so the
  // comparison is the strength gap, not different sprint or braking traits.
  dP.vmax = yP.vmax; dP.tau = yP.tau; dP.brake = yP.brake; dP.lateral = yP.lateral; dP.shuffle = yP.shuffle; dP.backpedal = yP.backpedal;
  dP.balance = yP.balance; dP.bend = yP.bend; dP.heightYd = yP.heightYd; dP.stepSpeed = yP.stepSpeed;
  const sep = yP.radius + dP.radius + 0.05;
  const Y: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI / 2, energy: 1, profile: yP };
  const D: Body = { pos: { x: 0, y: sep }, vel: { x: 0, y: 0 }, facing: -Math.PI / 2, energy: 1, profile: dP };
  const w = new World([Y, D]);
  Y.support!.posture = 0.6; D.support!.posture = 0.6;
  const spY = supportParams(yP), spD = supportParams(dP);
  // Inside hands for the blocker, as setContactHands gives c = +0.5 in a run rep.
  const hands: HandJoint = { kind: 'hands', a: Y, b: D, actor: Y, extension: sep, push: spY.pressForce * 0.675, hold: 0, steer: spY.armForce * 0.425 };
  w.joints.push(hands);
  const yIntent: Intent = { vel: { x: 0, y: c.yWant }, facing: Math.PI / 2, push: 1, posture: 0.6 };
  const dIntent: Intent = c.resist ? { vel: { x: 0, y: -4.1 }, facing: -Math.PI / 2, push: 1, posture: 0.6 } : { vel: { x: 0, y: 0 }, facing: -Math.PI / 2, posture: 0.6 };
  const internals = w as unknown as { plans: Array<{ ax: number; ay: number }>; alpha: Float64Array | number[]; liftFelt: Float64Array | number[] };
  const rows: Array<Record<string, number | string>> = [];
  const ticks = Math.round((c.seconds ?? 3) / DT);
  for (let k = 0; k < ticks; k++) {
    const r = w.step([yIntent, dIntent], DT);
    const row = { t: +((k + 1) * DT).toFixed(2) } as Record<string, number | string>;
    for (const [i, b, sp, tag] of [[0, Y, spY, 'y'], [1, D, spD, 'd']] as const) {
      const m = b.profile.massKg;
      row[`${tag}Vy`] = +b.vel.y.toFixed(3);
      row[`${tag}Ground`] = +(r.groundImpulse[i].y / DT).toFixed(0);
      row[`${tag}Gait`] = +(internals.plans[i].ay * m).toFixed(0);
      row[`${tag}Lean`] = +b.support!.lean.y.toFixed(0);
      row[`${tag}Avail`] = +internals.alpha[i].toFixed(2);
      row[`${tag}State`] = b.support!.state;
      row[`${tag}Traction`] = +(sp.traction * Math.min(2, Math.max(0, 1 - internals.liftFelt[i] / (m * G)))).toFixed(0);
      row[`${tag}Strength`] = +sp.pushForce.toFixed(0);
    }
    row.handsNormal = +(hands.normalForce ?? 0).toFixed(0);
    row.handsTangent = +(hands.tangentForce ?? 0).toFixed(0);
    rows.push(row);
  }
  const at = (t: number) => rows[Math.min(rows.length - 1, Math.round(t / DT) - 1)];
  const settled = rows.filter(r => (r.t as number) >= 1 && (r.t as number) <= 2);
  const mean = (k: string) => settled.reduce((s, r) => s + (r[k] as number), 0) / settled.length;
  return {
    case: c.name, y: { ...c.y, pushForce: +spY.pushForce.toFixed(0), traction: +spY.traction.toFixed(0), power: +(yP.power * G).toFixed(0), vmax: +yP.vmax.toFixed(2), brake: +yP.brake.toFixed(2) },
    d: { ...c.d, pushForce: +spD.pushForce.toFixed(0), traction: +spD.traction.toFixed(0), power: +(dP.power * G).toFixed(0) },
    // The end's lateral speed (+ = carried outward), mean over 1-2 s and at 3 s, yd/s; travel in 3 s, yd.
    endSpeed1to2s: +mean('dVy').toFixed(2), endSpeedAt3s: at(3).dVy, carried3s: +(D.pos.y - sep).toFixed(2),
    yGround: +mean('yGround').toFixed(0), dGround: +mean('dGround').toFixed(0), yGait: +mean('yGait').toFixed(0), dGait: +mean('dGait').toFixed(0),
    yLean: +mean('yLean').toFixed(0), dLean: +mean('dLean').toFixed(0), dAvail: +mean('dAvail').toFixed(2), yAvail: +mean('yAvail').toFixed(2),
    handsNormal: +mean('handsNormal').toFixed(0), dTraction: +mean('dTraction').toFixed(0), states: `${at(3).yState}/${at(3).dState}`,
    rows,
  };
}

const base = { y: { m: 113, s: 0.77 }, d: { m: 111, s: 0.62 }, yWant: 4 };
const cases: Case[] = [
  { name: 'P46: Y 113 kg s.77 vs end 111 kg s.62, end resisting', ...base, resist: true },
  { name: 'equal: both 112 kg s.62, end resisting', y: { m: 112, s: 0.62 }, d: { m: 112, s: 0.62 }, resist: true, yWant: 4 },
  { name: 'equal strong: both 112 kg s.77, end resisting', y: { m: 112, s: 0.77 }, d: { m: 112, s: 0.77 }, resist: true, yWant: 4 },
  { name: 'P46 pair, end not resisting', ...base, resist: false },
  { name: 'reversed: end s.77 resisting Y s.62', y: { m: 113, s: 0.62 }, d: { m: 111, s: 0.77 }, resist: true, yWant: 4 },
];
const out = cases.map(run);
for (const r of out) {
  const { rows: _rows, ...summary } = r;
  console.log(JSON.stringify(summary));
}
const jsonAt = process.argv.indexOf('--json');
if (jsonAt >= 0) writeFileSync(process.argv[jsonAt + 1], JSON.stringify(out, null, 1));
console.log(`units: forces kg·yd/s² (x${YD} = N); mu ${TURF_MU}; speeds yd/s`);
