/** Held-leg trip bench (full PlaySim tick, real dice). A back runs straight upfield; a DB is directly behind him,
 * either just out of reach and losing ground (dive case) or within lunge range at the same speed (lunge case).
 * Over N seeds, for wraps made: grasp origin, legs share, hold at creation, and what follows: the back off his
 * feet (time from wrap), hold slipped (time), or still up at 3 s; yards from the wrap.
 * usage: node --import tsx scripts/diag/_legtrip.mts [N] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 40);
function one(seed: number, vc: number, gap: number, vd: number) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'bench' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'bench' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed } as any);
  const c = sim.slot('H')!, d = sim.slot('SS')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
  c.downUntil = d.downUntil = -1; sim.t = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.handoffAt = 0;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: vc, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 50 - gap, y: CENTER_Y }; d.body.vel = { x: vd, y: 0 }; d.body.facing = 0;
  c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 9, y: 0 }, facing: 0 }) };
  d.behavior = { kind: 'chase', update: () => ({ vel: { x: c.vel.x + (c.pos.x - d.pos.x) * 2, y: (c.pos.y - d.pos.y) * 2 }, facing: 0 }) };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  let wrap: any = null, fell = NaN, slip = NaN;
  const t0 = sim.t;
  while (sim.phase === 'live' && sim.t < t0 + 3) {
    sim.tick();
    if (!wrap && sim.bond?.tacklers?.includes(d)) { const j = sim.world.joints.find((j: any) => j.kind === 'grasp' && j.a === d.body); wrap = { t: sim.t, x: c.pos.x, origin: j?.origin, legs: j?.legs, hold: j?.hold, reach: j?.reach }; }
    if (wrap && Number.isNaN(fell) && c.body.support?.state !== 'up') fell = sim.t - wrap.t;
    if (wrap && Number.isNaN(slip) && sim.events.some((e: any) => e.type === 'broken_tackle')) slip = sim.t - wrap.t;
  }
  return { wrap, fell, slip, yards: wrap ? (sim.phase === 'dead' ? sim.endSpot.x : c.pos.x) - wrap.x : NaN };
}
const med = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[z.length >> 1] : NaN; };
for (const [label, vc, gap, vd] of [['dive: 1.8 yd behind, losing 2 yd/s', 6, 1.8, 4], ['dive: 1.8 behind, back 5, DB 3', 5, 1.8, 3],
  ['lunge: 1.5 behind, same speed 6', 6, 1.5, 6], ['lunge: 1.2 behind, same speed 6', 6, 1.2, 6], ['form: 0.9 behind, same speed 6', 6, 0.9, 6]] as const) {
  const R = Array.from({ length: N }, (_, i) => one(300 + i, vc, gap, vd)), W = R.filter(r => r.wrap);
  const orig = [...new Set(W.map(r => r.wrap.origin))].join(',');
  console.log(`${label.padEnd(36)} | wraps ${W.length}/${N} (${orig}) legs p50 ${med(W.map(r => r.wrap.legs)).toFixed(2)} hold ${med(W.map(r => r.wrap.hold)).toFixed(2)} | back off his feet ${W.filter(r => Number.isFinite(r.fell)).length} (p50 ${med(W.map(r => r.fell)).toFixed(2)} s) | slipped first ${W.filter(r => Number.isFinite(r.slip) && !(r.fell < r.slip)).length} | yards after wrap p50 ${med(W.map(r => r.yards)).toFixed(1)}`);
}
