// Raw physics: two bodies joined by one hand row (no engagement layer), fixed requests.
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
function run(defSlot: string, bReq: number, dReq: number, bPush: number, dPush: number) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) { a.body.pos = { x: 90 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) }; a.snapReadyAt = 0; }
  const c = sim.slot('C'), d = sim.slot(defSlot), rb = sim.slot('RB');
  const gap = c.profile.radius + d.profile.radius;
  c.body.pos = { x: LOS + 2, y: CENTER_Y }; c.body.facing = 0; d.body.pos = { x: LOS + 2 + gap, y: CENTER_Y }; d.body.facing = Math.PI;
  rb.body.pos = { x: LOS - 6, y: CENTER_Y - 10 };
  c.behavior = { kind: 'b', update: () => ({ vel: { x: bReq, y: 0 }, facing: 0, push: bPush }) };
  d.behavior = { kind: 'd', update: () => ({ vel: { x: -dReq, y: 0 }, facing: Math.PI, push: dPush }) };
  const dW = d.profile.massKg * G;
  sim.world.joints.push({ kind: 'hands', a: c.body, b: d.body, actor: c.body, extension: gap + .1, push: 2 * dW, hold: 0, steer: .41 * dW });
  sim.ball = { kind: 'held', carrier: rb }; sim.phase = 'live';
  const x0 = c.pos.x; for (let k = 0; k < 20; k++) sim.tick();
  return { fwd: c.pos.x - x0, v: c.vel.x, mB: c.profile.massKg, mD: d.profile.massKg, sB: c.r('strength'), sD: d.r('strength') };
}
for (const slot of ['CB_W', 'LB_M', 'DT_S', 'DE_S']) for (const [bq, dq, bp, dp, nm] of [[2.4, 1.5, 1, 1, 'both push'], [2.4, 0, 1, 1, 'def braces'], [0, 1.5, 1, 1, 'blk braces']] as const) {
  const r = run(slot, bq, dq, bp, dp);
  console.log(`C vs ${slot.padEnd(5)} ${nm.padEnd(11)} kg ${r.mB.toFixed(0)}/${r.mD.toFixed(0)} str ${r.sB.toFixed(2)}/${r.sD.toFixed(2)} | pair fwd in 1 s ${(r.fwd >= 0 ? '+' : '') + r.fwd.toFixed(2)} yd, speed ${r.v.toFixed(2)}`);
}
