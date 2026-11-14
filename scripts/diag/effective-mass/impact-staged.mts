// The opening impact of two engaged men (Integration, 2026-11-14, the second half of the yaw note). Two bodies from
// contactFixture, the heavy one driving the light one from a small gap, both requesting into each other; PAIR_HANDS or not.
// Per tick for the first 0.4 s: the relative velocity along the line (+ = closing), the hands joints' and the torso
// contact's normal impulse this tick, each man's velocity along the line, the light man's support (state, capture-point
// deviation over his base), and the separation. Then: the closing momentum before contact, the impulse delivered in the
// first contact ticks, the restitution it implies (separating speed after over closing speed before), and how much of
// the separation over 0.6 s is a bounce (the light man moving away faster than the heavy man) against the heavy man
// driving him (both moving the same way together).
// usage: [PAIR_HANDS=1] node --import tsx scripts/diag/effective-mass/impact-staged.mts [heavy kg] [light kg] [gap yd] [closing yd/s]
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { syncJoints } = await import('../../../src/sim/engagement.js');
const { supportParams, baseRadiusAt } = await import('../../../src/physics/support.js');
const heavy = Number(process.argv[2] ?? 150), light = Number(process.argv[3] ?? 90), gap0 = Number(process.argv[4] ?? 0.05), v0 = Number(process.argv[5] ?? 3);
const { sim, blocker: b, defender: d, engagement: e0 } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
const e: any = e0;
Object.assign(d.profile, structuredClone(b.profile));
d.profile.massKg = heavy; b.profile.massKg = light;
const R = b.profile.radius + d.profile.radius + gap0;
b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { x: -v0, y: 0 }; d.body.facing = Math.PI;
e.hands = undefined; e.defHands = undefined; syncJoints(sim, e);
const p0 = heavy * -v0;
console.log(`heavy ${heavy} kg at ${v0} yd/s into light ${light} kg from a ${gap0} yd gap; closing momentum ${(-p0).toFixed(0)} kg.yd/s; PAIR_HANDS ${process.env.PAIR_HANDS ?? '0'}`);
let first = -1, impulseFirst = 0, relBefore = v0, relAfter = 0;
for (let k = 0; k < 12; k++) {
  syncJoints(sim, e);
  const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  intents[b.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.75 };
  intents[d.idx] = { vel: { x: -v0, y: 0 }, facing: Math.PI, push: 1, posture: 0.75 };
  const before = d.body.vel.x - b.body.vel.x;
  sim.world.step(intents, sim.dt); sim.t += sim.dt;
  const rep: any = (sim.world as any).report;
  const c = (rep?.contacts ?? []).find((c: any) => (c.i === b.idx && c.j === d.idx) || (c.i === d.idx && c.j === b.idx));
  const hJ = (Math.max(0, e.hands?.normalForce ?? 0) + Math.max(0, e.defHands?.normalForce ?? 0)) * sim.dt, tJ = c ? c.impulse : 0;
  const rel = -(d.body.vel.x - b.body.vel.x);
  if (first < 0 && hJ + tJ > 1) { first = k; relBefore = -before; }
  if (first >= 0 && k - first <= 1) impulseFirst += hJ + tJ;
  if (first >= 0 && k - first === 1) relAfter = rel;
  const sup = b.body.support, rb = baseRadiusAt(supportParams(b.profile), sup?.posture ?? 0.5);
  const dev = sup ? Math.hypot(sup.xi.x, sup.xi.y) / rb : 0;
  const sep = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - b.profile.radius - d.profile.radius;
  console.log(`t ${((k + 1) * sim.dt).toFixed(2)} closing ${rel.toFixed(2)} yd/s | hands J ${hJ.toFixed(1)} torso J ${tJ.toFixed(1)} kg.yd/s | heavy v ${(-d.body.vel.x).toFixed(2)} light v ${(-b.body.vel.x).toFixed(2)} yd/s (toward his goal) | light: ${sup?.state} deviation ${dev.toFixed(2)} x base | gap ${sep.toFixed(2)} yd`);
}
const red = (heavy * light) / (heavy + light);
console.log(`first contact impulse ${impulseFirst.toFixed(1)} kg.yd/s against the perfectly inelastic one ${(red * relBefore).toFixed(1)}; restitution (separating speed after / closing before) ${(-relAfter / Math.max(1e-6, relBefore)).toFixed(2)}`);
