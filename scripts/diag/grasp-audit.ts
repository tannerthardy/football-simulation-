/** How in-game holds start and end (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { GraspJoint } from '../../src/physics/world.js';
const rng = new Rng(21);
type Row = { origin: string; q: number; legs: number; dist: number; reach: number; rel: number; relN: number; cap: number; outcome: string; life: number; maxForce: number; cState: string };
const rows: Row[] = [];
const live = new Map<GraspJoint, Row & { t0: number }>();
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    sim.event('snap', sim.qb);
    while (sim.phase === 'live' && sim.t < 25) {
      tick.tick();
      for (const j of sim.world.joints) {
        if (j.kind !== 'grasp' || live.has(j)) continue;
        const a = j.a, b = j.b;
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, d = Math.hypot(dx, dy);
        const rvx = b.vel.x - a.vel.x, rvy = b.vel.y - a.vel.y;
        live.set(j, { origin: (j.origin ?? '?').replace(/\+assist|\+behind/g, ''), q: j.capacity, legs: j.legs, dist: d, reach: j.reach, rel: Math.hypot(rvx, rvy), relN: (rvx * dx + rvy * dy) / (d || 1), cap: j.capacity, outcome: 'open', life: 0, maxForce: 0, t0: sim.t, cState: '' });
      }
      for (const [j, r] of live) {
        if (r.outcome !== 'open') continue;
        r.maxForce = Math.max(r.maxForce, j.force ?? 0);
        if (j.broken || !sim.world.joints.includes(j)) { r.outcome = j.broken ? 'broken' : 'released'; r.life = sim.t - r.t0; r.cState = j.b.support?.state ?? ''; rows.push(r); }
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    for (const [j, r] of live) if (r.outcome === 'open') { r.outcome = sim.outcome ?? 'end'; r.life = sim.t - r.t0; r.cState = j.b.support?.state ?? ''; rows.push(r); }
    live.clear();
    return sim.buildResult();
  },
};
for (let g = 0; g < 1; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
const by = (f: (r: Row) => boolean) => rows.filter(f);
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
console.log('holds', rows.length, 'broken', by((r) => r.outcome === 'broken').length, 'released', by((r) => r.outcome === 'released').length);
for (const o of ['broken', 'released', 'tackle', 'oob', 'touchdown']) {
  const g = by((r) => r.outcome === o);
  if (!g.length) continue;
  console.log(o.padEnd(9), 'n', String(g.length).padStart(4), 'cap', avg(g.map((r) => r.cap)).toFixed(0), 'legs', avg(g.map((r) => r.legs)).toFixed(2), 'dist', avg(g.map((r) => r.dist)).toFixed(2), 'reach', avg(g.map((r) => r.reach)).toFixed(2), 'rel', avg(g.map((r) => r.rel)).toFixed(2), 'relN', avg(g.map((r) => r.relN)).toFixed(2), 'life', avg(g.map((r) => r.life)).toFixed(2), 'maxF', avg(g.map((r) => r.maxForce)).toFixed(0));
}
const origins = [...new Set(rows.map((r) => r.origin))];
for (const o of origins) {
  const g = by((r) => r.origin === o);
  console.log(`origin ${o.padEnd(6)} n ${String(g.length).padStart(4)} broken ${(100 * g.filter((r) => r.outcome === 'broken').length / g.length).toFixed(0)}% cap ${avg(g.map((r) => r.cap)).toFixed(0)} dist ${avg(g.map((r) => r.dist)).toFixed(2)} rel ${avg(g.map((r) => r.rel)).toFixed(2)} relN ${avg(g.map((r) => r.relN)).toFixed(2)}`);
}
