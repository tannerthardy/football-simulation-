/** Exploratory probes of the physics world (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generatePlayer } from '../../src/players/generator.js';
import { derivePhysical } from '../../src/players/physical.js';
import { stepBody, type Body } from '../../src/physics/kinematics.js';
import { World, type Intent } from '../../src/physics/world.js';

const rng = new Rng(5);
const mk = (pos: string, x: number, y: number, vx = 0, vy = 0, facing = 0): Body => {
  const p = generatePlayer(rng, pos as never);
  return { pos: { x, y }, vel: { x: vx, y: vy }, facing, energy: 1, profile: derivePhysical(p) };
};
const ke = (bs: Body[]) => bs.reduce((s, b) => s + 0.5 * b.profile.massKg * (b.vel.x ** 2 + b.vel.y ** 2), 0);
const mom = (bs: Body[]) => bs.reduce((s, b) => ({ x: s.x + b.profile.massKg * b.vel.x, y: s.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });

// 1. free sprint + cut: world vs stepBody
{
  const a = mk('WR', 0, 0), b: Body = { ...a, pos: { ...a.pos }, vel: { ...a.vel } };
  const w = new World([a]);
  const cmd = (t: number): Intent => ({ vel: t < 1.5 ? { x: 9, y: 0 } : { x: 0, y: 9 } });
  for (let k = 0; k < 50; k++) { const t = k * 0.05; w.step([cmd(t)], 0.05); stepBody(b, cmd(t), 0.05); }
  console.log('free: world', a.pos, a.vel, 'stepBody', b.pos, b.vel, 'diff', Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y).toFixed(3));
}
// 2. crossing at 10.5 each
for (const offset of [0, 0.4, 0.5]) for (const sub of [1, undefined]) {
  const a = mk('WR', 50 - 0.275, 26, 10.5, 0, 0), b = mk('S', 50 + 0.275, 26 + offset, -10.5, 0, Math.PI);
  a.profile.radius = b.profile.radius = 0.25;
  const w = new World([a, b], { substeps: sub });
  const p0 = mom([a, b]), e0 = ke([a, b]);
  const r = w.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], 0.05);
  const p1 = mom([a, b]);
  console.log(`cross offset ${offset} sub ${sub ?? 'adaptive'}(${r.substeps}): contact ${r.contacts.length} order ${a.pos.x < b.pos.x} dist ${Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y).toFixed(3)} dp ${(p1.x-p0.x - r.groundImpulse[0].x - r.groundImpulse[1].x).toExponential(2)} dKE ${(ke([a,b])-e0).toFixed(1)} falls ${r.falls}`);
}
// 3. hit on a stationary receiver
for (const speed of [3, 5, 7, 9]) {
  const a = mk('S', 48, 26, speed, 0, 0), b = mk('WR', 48 + 0.6, 26, 0, 0, Math.PI);
  const w = new World([a, b]);
  let fell = -1; let peak = 0;
  for (let k = 0; k < 40; k++) {
    const r = w.step([{ vel: { x: speed, y: 0 } }, { vel: { x: 0, y: 0 } }], 0.05);
    peak = Math.max(peak, b.support!.peak);
    if (r.falls.includes(1) && fell < 0) fell = k * 0.05;
  }
  console.log(`hit ${speed} yd/s by ${a.profile.massKg.toFixed(0)}kg on ${b.profile.massKg.toFixed(0)}kg: receiver peak ${peak.toFixed(2)} fell ${fell} state ${b.support!.state} hitter ${a.support!.state} peak ${a.support!.peak.toFixed(2)}`);
}
