/** Where a runner's speed goes in the first moments of a tackle. One carrier,
 * one tackler (production chase/tackle code, the panel's setup). From first
 * contact, every tick splits the carrier's change of momentum along his
 * travel into his own legs (ground impulse), torso contact, strikes and the
 * remainder (grasp/hand joints). Also his support state and the hold.
 * node --import tsx scripts/diag/physics/tackle-ledger.ts [angle=0] [speed=6] [seed=3000] [tacklerSpeed=4]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import { chase } from '../../../src/sim/behaviors/common.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const [angle = 0, speed = 6, seed = 3000, dSpeed = 4, horizon = 1.2, every = 1, cut = 0] = process.argv.slice(2).map(Number);
const offense = generateTeam(new Rng(61), 'Panel O', 'PO', { strength: .55 });
const defense = generateTeam(new Rng(62), 'Panel D', 'PD', { strength: .55 });
const sim = new PlaySim({
  offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'ledger' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'ledger' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
});
const c = sim.slot('RB')!, d = sim.defense.find((a) => a.slot.startsWith('LB'))!;
for (const a of sim.agents) {
  a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
  a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
}
c.downUntil = d.downUntil = -1;
sim.t = sim.world.time = 2;
sim.ball = { kind: 'held', carrier: c } as never;
const th = angle * Math.PI / 180;
c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
d.body.pos = { x: 50 + 4 * Math.cos(th) + speed * .4, y: CENTER_Y + 4 * Math.sin(th) };
d.body.facing = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
d.body.vel = { x: Math.cos(d.body.facing) * dSpeed, y: Math.sin(d.body.facing) * dSpeed };
let cutAt: number | null = null;
// As the tackle panel: an optional late cut away from the tackler at 2.2 yd.
c.behavior = { kind: 'idle', update: () => {
  const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
  if (cut && cutAt === null && dd < 2.2) cutAt = sim.t;
  if (cutAt !== null) { const away = -Math.sign(d.pos.y - c.pos.y) || -1; return { vel: { x: speed * .7, y: away * speed * .7 } }; }
  return { vel: { x: speed, y: 0 } };
} } as never;
d.behavior = { kind: 'idle', update: () => chase(sim, d, c) } as never;
for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);

const m = c.profile.massKg;
console.log(`carrier ${c.slot} ${m.toFixed(0)} kg, tackler ${d.slot} ${d.profile.massKg.toFixed(0)} kg; angle ${angle}, carrier ${speed} yd/s; dv along travel per tick (yd/s)`);
console.log('   t   speed |  legs  torso strike  joints | support  lean  | grasp: legs share, force, reach-hold | events');
let t0: number | null = null, seen = 0;
const tick = sim as unknown as { tick(): void };
while (sim.phase === 'live' && sim.t < 5) {
  const v0 = { ...c.vel }, sp0 = Math.hypot(v0.x, v0.y) || 1, ux = v0.x / sp0, uy = v0.y / sp0;
  tick.tick();
  const rep = sim.lastStep!;
  const evs = sim.events.slice(seen); seen = sim.events.length;
  const touched = evs.some((e) => ['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle'].includes(e.type))
    || (rep.contacts ?? []).some((h) => h.i === c.idx || h.j === c.idx);
  if (t0 === null && touched) t0 = sim.t - sim.dt;
  if (t0 === null) continue;
  const along = (v: { x: number; y: number }) => v.x * ux + v.y * uy;
  const total = along({ x: c.vel.x - v0.x, y: c.vel.y - v0.y });
  const legs = along(rep.groundImpulse[c.idx]) / m;
  let torso = 0;
  for (const h of rep.contacts ?? []) if (h.i === c.idx || h.j === c.idx) {
    const o = sim.agents[h.i === c.idx ? h.j : h.i];
    const nx = c.pos.x - o.pos.x, ny = c.pos.y - o.pos.y, L = Math.hypot(nx, ny) || 1;
    torso += h.impulse * along({ x: nx / L, y: ny / L }) / m;
  }
  let strike = 0;
  for (const s of rep.strikes ?? []) {
    if (s.j === c.idx) strike += along(s.impulse) / m;
    else if (s.i === c.idx) strike -= along(s.impulse) / m;
  }
  const joints = total - legs - torso - strike;
  const g = sim.world.joints.find((j) => j.kind === 'grasp' && j.b === c.body) as GraspJoint | undefined;
  const sup = c.body.support!;
  const cz = sup.causes ?? { contact: 0, legs: 0, overspeed: 0 };
  const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
  const ri = sim.intents[d.idx]?.vel;
  const tackler = ` | T ${d.body.support!.state} d ${dd.toFixed(2)} v (${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)}) req (${(ri?.x ?? 0).toFixed(1)},${(ri?.y ?? 0).toFixed(1)}) c (${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)}) in-bond ${sim.bond?.tacklers.includes(d) ? 'y' : 'n'}${g?.slipping ? ' slip' : ''}${g?.broken ? ' BROKE' : ''}`;
  const balance = ` xi ${Math.hypot(sup.xi.x, sup.xi.y).toFixed(2)} peak ${(sup.peak ?? 0).toFixed(2)} causes c/l ${cz.contact.toFixed(2)}/${cz.legs.toFixed(2)}`;
  if (Math.round((sim.t - t0) / sim.dt) % every === 0 || evs.length) console.log(`${(sim.t - t0).toFixed(2).padStart(5)} ${Math.hypot(c.vel.x, c.vel.y).toFixed(2).padStart(6)} | ${legs.toFixed(2).padStart(5)} ${torso.toFixed(2).padStart(6)} ${strike.toFixed(2).padStart(6)} ${joints.toFixed(2).padStart(7)} | ${sup.state.padEnd(6)} ${Math.hypot(sup.lean.x, sup.lean.y).toFixed(0).padStart(5)} | `
    + (g ? `${(g.legs ?? 0).toFixed(2)}/${(g.recoveryCoupling ?? g.legs ?? 0).toFixed(2)}, ${(g.force ?? 0).toFixed(0)}/${(g.capacity ?? 0).toFixed(0)}, ${(g.reach ?? 0).toFixed(2)}-${(g.hold ?? 0).toFixed(2)}${g.slipping ? ' slip' : ''}` : '-'.padEnd(20))
    + balance + tackler + ` | ${evs.map((e) => `${e.type}${e.note ? '(' + e.note + ')' : ''}`).join(' ')}`);
  if (sim.t - t0 > horizon) break;
}
console.log(`ended: ${sim.phase}, ${sim.outcome ?? ''}`);
