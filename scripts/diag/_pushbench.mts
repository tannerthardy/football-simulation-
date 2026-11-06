/** Push bench (World only, no controllers). A run blocker and a defender in latched hands, head-up, each
 * requesting a fixed velocity into the other with push 1 for 1.0 s. Variants: matched bodies (the
 * defender takes the blocker's profile), the blocker's lateral demand, posture (pad height), a stronger
 * blocker, and a second blocker pressing the same man (a double team). Reports each body's ground gained
 * along the drive line (+ = toward the other man's side) and the hand load.
 * usage: node --import tsx scripts/diag/_pushbench.mts */
import { contactFixture } from './run-contact-technique.js';
import { derivePhysical } from '../../src/players/physical.js';
const CENTER_Y = 26.65;
type Case = { name: string; off?: number; v?: number; lat?: number; postureB?: number; postureD?: number; strongB?: number; double?: boolean; dReq?: number };
function run(c: Case) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, blocker: b, defender: d, engagement: e } = f;
  // Matched bodies: the defender gets the blocker's derived profile (mass, strength, reach).
  Object.assign(d.profile, structuredClone(b.profile));
  if (c.strongB) { const p = derivePhysical({ ...b.player, ratings: { ...b.player.ratings, strength: c.strongB } } as any); Object.assign(b.profile, p); }
  b.body.pos = { x: 40, y: CENTER_Y }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  { const R = b.profile.radius + d.profile.radius + 0.1, o = c.off ?? 0; d.body.pos = { x: 40 + Math.sqrt(R * R - o * o), y: CENTER_Y + o }; } d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  const j = e.hands!;
  // Neutral hands (control 0): same law as setContactHands at c = 0, frozen for the bench.
  e.control = 0;
  const helper = c.double ? sim.slot('RG')! : null;
  if (helper) {
    helper.body.pos = { x: 40 - 0.1, y: CENTER_Y - (helper.profile.radius + d.profile.radius) * 0.95 }; helper.body.vel = { x: 0, y: 0 }; helper.body.facing = 0.6;
    sim.world.joints.push({ kind: 'hands', a: helper.body, b: d.body, extension: helper.profile.radius + d.profile.radius + 0.1, push: j.push, hold: 0, steer: j.steer } as any);
  }
  const x0 = { b: b.pos.x, d: d.pos.x, h: helper?.pos.x ?? 0 };
  let nSum = 0, n = 0;
  const v = c.v ?? 1;
  for (let k = 0; k < Math.round(1.0 / sim.dt); k++) {
    const intents: any[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    const nb = c.off ? (() => { const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, L = Math.hypot(dx, dy); return { x: dx / L * v, y: dy / L * v }; })() : { x: v, y: c.lat ?? 0 };
    intents[b.idx] = { vel: nb, facing: 0, push: 1, posture: c.postureB ?? 0.85 };
    intents[d.idx] = { vel: { x: -(c.dReq ?? v), y: 0 }, facing: Math.PI, push: 1, posture: c.postureD ?? 0.85 };
    if (helper) intents[helper.idx] = { vel: { x: v, y: 0.6 }, facing: 0.6, push: 1, posture: c.postureB ?? 0.85 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
    nSum += (j.normalForce ?? 0) / (b.profile.massKg * 10.7); n++;
  }
  const db = b.pos.x - x0.b, dd = -(d.pos.x - x0.d);
  console.log(`${c.name.padEnd(46)} | blocker gains ${db.toFixed(2)} yd, defender gains ${dd.toFixed(2)} yd, pair moves ${((db - dd) / 2).toFixed(2)} toward D | hand normal ${(nSum / n).toFixed(2)} bw | blocker lateral ${(b.pos.y - CENTER_Y).toFixed(2)} | support ${b.body.support?.state}/${d.body.support?.state}`);
}
console.log('mass/strength: matched unless noted; requests into each other along x, push 1, 1.0 s');
for (const c of [
  { name: 'matched, both 1 yd/s, no lateral' },
  { name: 'matched, both 1 yd/s, blocker lateral 3.0', lat: 3.0 },
  { name: 'matched, both 1 yd/s, blocker lateral 4.2', lat: 4.2 },
  { name: 'matched, blocker 2 yd/s, defender 1', v: 2, dReq: 1 },
  { name: 'matched, blocker lower pads (0.6 vs 0.85)', postureB: 1, postureD: 0.6 },
  { name: 'matched, blocker higher pads', postureB: 0.6, postureD: 1 },
  { name: 'blocker strength 40 (matched is 97)', strongB: 40 },
  { name: 'blocker strength 40, defender requests 0 (anchors)', strongB: 40, dReq: 0 },
  { name: 'matched, defender requests 0 (anchors)', dReq: 0 },
  { name: 'blocker on the shoulder (0.4 yd), drives along the normal', off: 0.4 },
  { name: 'shoulder, defender presses 1.5 yd/s', off: 0.4, dReq: 1.5 },
  { name: 'head-up, defender presses 1.5 yd/s', dReq: 1.5 },
  { name: 'double team: second blocker on his hip', double: true },
  { name: 'double team, blocker lateral 3.0', double: true, lat: 3.0 },
] as Case[]) run(c);
