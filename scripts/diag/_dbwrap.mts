/** DB-on-back wrap bench (full PlaySim tick, real dice). A run carrier (H) runs straight upfield at a set speed; a
 * DB (SS) starts just outside reach at a set angle to the carrier's travel (90 = side-on, 135 = slightly behind)
 * and moves with the carrier plus a closing speed toward him. Everyone else is parked. Per case over N seeds:
 * wrap made, wrap broken (broken_tackle), tackled within 3 s, yards gained from the first wrap.
 * usage: node --import tsx scripts/diag/_dbwrap.mts [N] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 40);
function one(seed: number, v: number, angDeg: number, closing: number, slot: string) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'bench' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'bench' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed } as any);
  const c = sim.slot('H')!, d = sim.slot(slot)!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
  c.downUntil = d.downUntil = -1; sim.t = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.handoffAt = 0;
  const a = angDeg * Math.PI / 180, r = c.profile.radius + d.profile.radius + 0.6;
  // defender offset from the carrier: angle measured from the carrier's travel (+x), on his left
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: v, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 50 + Math.cos(a) * r, y: CENTER_Y + Math.sin(a) * r };
  const tow = { x: -Math.cos(a), y: -Math.sin(a) };
  d.body.vel = { x: v + tow.x * closing, y: tow.y * closing }; d.body.facing = Math.atan2(tow.y, tow.x);
  c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 9, y: 0 }, facing: 0 }) };
  d.behavior = { kind: 'chase', update: () => { const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, L = Math.hypot(dx, dy) || 1;
    return { vel: { x: c.vel.x + dx / L * (closing + 1), y: c.vel.y + dy / L * (closing + 1) }, facing: Math.atan2(dy, dx), lunge: L < r ? { x: dx / L, y: dy / L } : undefined }; } };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const t0 = sim.t; let wrapX: number | null = null, wrapT = 0, broke = 0;
  while (sim.phase === 'live' && sim.t < t0 + 3) {
    sim.tick();
    if (wrapX === null && sim.bond?.tacklers?.includes(d)) { wrapX = c.pos.x; wrapT = sim.t; }
  }
  broke = sim.events.filter((e: any) => e.type === 'broken_tackle').length;
  return { wrap: wrapX !== null, broke: broke > 0, down: sim.phase === 'dead', after: wrapX === null ? NaN : (sim.phase === 'dead' ? sim.endSpot.x : c.pos.x) - wrapX, hold: wrapX === null ? NaN : sim.t - wrapT,
    mc: c.profile.massKg, md: d.profile.massKg };
}
const med = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[z.length >> 1] : NaN; };
let printed = false;
for (const slot of ['SS', 'CB_S']) for (const v of [6, 8]) for (const ang of [90, 135]) for (const closing of [0, 2]) {
  const R = Array.from({ length: N }, (_, i) => one(100 + i, v, ang, closing, slot));
  if (!printed) { console.log(`carrier ${R[0].mc.toFixed(0)} kg; SS ${one(1, 6, 90, 0, 'SS').md.toFixed(0)} kg, CB ${one(1, 6, 90, 0, 'CB_S').md.toFixed(0)} kg; ${N} seeds per row`); printed = true; }
  const W = R.filter(r => r.wrap);
  console.log(`${slot.padEnd(4)} v ${v} angle ${String(ang).padStart(3)} closing ${closing} | wrap ${W.length}/${N} | broken ${W.filter(r => r.broke).length} | tackled in 3 s ${R.filter(r => r.down).length} | yards after wrap p50 ${med(W.map(r => r.after)).toFixed(1)} | wrap-to-end p50 ${med(W.filter(r => r.down).map(r => r.hold)).toFixed(2)} s`);
}
