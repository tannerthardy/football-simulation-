/** One engaged run pair, tick by tick: lateral (play side +) requests, the
 * gait's planned lateral accel, achieved velocity, ground force and hand
 * joint forces. Observation only.
 * node --import tsx scripts/diag/stretch/pairtrace.ts oz strong over3 pair11 77 Y DE_S */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
import { locomotionAccel, fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { G } from '../../../src/core/units.js';

const [concept, dir, look, roster, seedS, bs, ds] = process.argv.slice(2);
const sim = makeSim({ concept, dir: dir as any, look, roster, seed: +seedS, formation: process.argv[9] ?? 'ace_12' }, rosters());
const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
const B = sim.agents.find(a => a.team === 'O' && a.slot === bs)!, D = sim.agents.find(a => a.team === 'D' && a.slot === ds)!;
const step = sim.world.step.bind(sim.world);
let pre: any = null;
(sim.world as any).step = (intents: any[], dt: number) => {
  const plan = (a: any) => {
    const it = intents[a.idx]; if (!it) return null;
    const av = availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy));
    return { req: it.vel, acc: locomotionAccel(a.body, it, dt, av), av, push: it.push ?? 0, facing: it.facing };
  };
  pre = { b: plan(B), d: plan(D) };
  return step(intents, dt);
};
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log('t     | B req(x,lat) planAcc lat  vel(x,lat) ground/bw lat | D req(x,lat) planAcc lat vel(x,lat) ground/bw lat | hands N T (bw) | sep');
while (sim.phase === 'live' && sim.t < 3) {
  sim.tick();
  if (!pre?.b || !pre?.d) continue;
  const e = sim.engagements.find(e => e.blocker === B && e.defender === D);
  const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === B.body && j.b === D.body) || (j.a === D.body && j.b === B.body))) as any;
  const gB = sim.lastStep!.groundImpulse[B.idx], gD = sim.lastStep!.groundImpulse[D.idx];
  const up = sim.attackDir('O');
  const line = (a: any, p: any, g: any) => `${f(p.req.x * up)},${f(p.req.y * ps)} ${f(p.acc.y * ps)} ${f(a.vel.x * up)},${f(a.vel.y * ps)} ${f(g.y * ps / (sim.dt * a.profile.massKg * G))}`;
  const sep = Math.hypot(B.pos.x - D.pos.x, B.pos.y - D.pos.y);
  console.log(`${sim.t.toFixed(2)} ${e ? 'E' : ' '} | ${line(B, pre.b, gB)} | ${line(D, pre.d, gD)} | ${j ? `${f((j.normalForce ?? 0) / (B.profile.massKg * G))} ${f((j.tangentForce ?? 0) / (B.profile.massKg * G))}` : '-'} | ${sep.toFixed(2)} Dlat ${f((D.pos.y - sim.ballY) * ps)} Blat ${f((B.pos.y - sim.ballY) * ps)} Ddepth ${f((D.pos.x - sim.los) * up)}`);
}
