/**
 * Does a set blocker's forward drive share one traction budget with holding
 * his ground sideways? (Defense / Run Game, engaged OZ box LB follow-up.)
 *
 * A blocker (C) and a backer (LB_M) square in torso contact, joined by one hand
 * row the blocker owns: steer (tangential) limit 0.41 LB body weights, the
 * native W3 median. No engagement exists, so no controller rewrites anyone.
 * The LB asks for 2.0 yd/s across the blocker's face, push 1 (native median
 * final). The blocker asks for no lateral motion in every arm; arms differ in
 * his forward request:
 *   stand       vel 0, push 0
 *   brace       vel 0, push 1
 *   drive       2.0 yd/s into the LB, push 1
 *   drive-hard  4.0 yd/s into the LB, push 1
 * plus "no pull" controls (LB requests nothing). Output over 1 s: blocker and
 * LB lateral displacement, mean hand tangential and normal force (per LB
 * weight), and the blocker's forward displacement.
 *
 * Usage: tsx scripts/diag/set-blocker-traction-scene.mts
 */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { stand } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';

const LOS = 40, formation = FORMATION_BY_ID.ace_11, G = 10.7;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });

function run(blockerFwd: number, blockerPush: number, lbLat: number, steerBW = .41) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) } as any; a.snapReadyAt = 0;
  }
  const c = sim.slot('C')!, lb = sim.slot('LB_M')!, rb = sim.slot('RB')!;
  const gap = c.profile.radius + lb.profile.radius;
  c.body.pos = { x: LOS + 2, y: CENTER_Y }; c.body.facing = 0;
  lb.body.pos = { x: LOS + 2 + gap, y: CENTER_Y }; lb.body.facing = Math.PI;
  rb.body.pos = { x: LOS - 6, y: CENTER_Y - 10 };
  c.behavior = { kind: 'set', update: () => ({ vel: { x: blockerFwd, y: 0 }, facing: 0, push: blockerPush }) } as any;
  lb.behavior = { kind: 'across', update: () => ({ vel: { x: 0, y: lbLat }, facing: Math.PI, push: 1 }) } as any;
  const lbW = lb.profile.massKg * G;
  const joint: any = { kind: 'hands', a: c.body, b: lb.body, actor: c.body, extension: gap + .1, push: 2 * lbW, hold: 0, steer: steerBW * lbW };
  sim.world.joints.push(joint);
  sim.ball = { kind: 'held', carrier: rb } as typeof sim.ball;
  sim.phase = 'live' as any;
  const c0 = { ...c.pos }, l0 = { ...lb.pos }; let tan = 0, nor = 0, k = 0;
  for (; k < 20; k++) { sim.tick(); tan += Math.abs(joint.tangentForce ?? 0); nor += joint.normalForce ?? 0; }
  return { cLat: c.pos.y - c0.y, lLat: lb.pos.y - l0.y, cFwd: c.pos.x - c0.x, tan: tan / k / lbW, nor: nor / k / lbW, T: k * sim.dt,
    joined: sim.world.joints.includes(joint), cMass: c.profile.massKg, lMass: lb.profile.massKg };
}

const f = (x: number) => (x >= 0 ? ' ' : '') + x.toFixed(2);
const arms: [string, number, number][] = [['stand', 0, 0], ['brace', 0, 1], ['drive', 2, 1], ['drive-hard', 4, 1]];
for (const steer of [.41, 0]) for (const lbLat of [2, 0]) for (const [name, fwd, push] of arms) {
  if (!steer && !lbLat) continue;
  const r = run(fwd, push, lbLat, steer);
  console.log(`steer ${steer.toFixed(2)} ${lbLat ? 'LB pulls' : 'no pull '} blocker ${name.padEnd(10)} | ${r.T.toFixed(1)} s: blocker lat ${f(r.cLat)}  LB lat ${f(r.lLat)}  LB-blocker ${f(r.lLat - r.cLat)} | blocker fwd ${f(r.cFwd)} | hand tangent ${f(r.tan)} normal ${f(r.nor)} LB-wt | joined ${r.joined} | kg C ${r.cMass.toFixed(0)} LB ${r.lMass.toFixed(0)}`);
}
