/** How in-game holds start and end (development aid).
 *   node --import tsx scripts/diag/grasp-audit.ts [games] [seed] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { GraspJoint } from '../../src/physics/world.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
type Row = { origin: string; legs: number; dist: number; reach: number; rel: number; relN: number; relT: number; cap: number; outcome: string; life: number; maxForce: number;
  cState: string; dState: string; geo: string; cSpeed: number; dSpeed: number; touched: boolean; peak: number; assists: number; maxDist: number };
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
        const cs = Math.hypot(b.vel.x, b.vel.y);
        // +1 carrier running at the tackler, -1 tackler behind him.
        const cosA = cs > 0.5 ? -(b.vel.x * dx + b.vel.y * dy) / (cs * (d || 1)) : 0;
        const geo = cosA > 0.5 ? 'head-on' : cosA < -0.5 ? 'behind' : 'side';
        live.set(j, { origin: (j.origin ?? '?').replace(/\+assist|\+behind/g, ''), legs: j.legs, dist: d, reach: j.reach, rel: Math.hypot(rvx, rvy),
          relN: (rvx * dx + rvy * dy) / (d || 1), relT: Math.abs(rvx * dy - rvy * dx) / (d || 1), cap: j.capacity, outcome: 'open', life: 0, maxForce: 0, t0: sim.t,
          cState: '', dState: '', geo, cSpeed: cs, dSpeed: Math.hypot(a.vel.x, a.vel.y), touched: false, peak: 0, assists: (sim.bond?.tacklers.length ?? 1) - 1, maxDist: d });
      }
      const touching = new Set((sim.lastStep?.contacts ?? []).map((c) => `${Math.min(c.i, c.j)}-${Math.max(c.i, c.j)}`));
      for (const [j, r] of live) {
        if (r.outcome !== 'open') continue;
        r.maxForce = Math.max(r.maxForce, j.force ?? 0);
        const ia = sim.world.indexOf(j.a), ib = sim.world.indexOf(j.b);
        if (touching.has(`${Math.min(ia, ib)}-${Math.max(ia, ib)}`)) r.touched = true;
        r.maxDist = Math.max(r.maxDist, Math.hypot(j.b.pos.x - j.a.pos.x, j.b.pos.y - j.a.pos.y));
        const sb = j.b.support;
        if (sb) r.peak = Math.max(r.peak, sb.peak);
        if (j.broken || !sim.world.joints.includes(j)) { r.outcome = j.broken ? 'broken' : 'released'; r.life = sim.t - r.t0; r.cState = j.b.support?.state ?? ''; r.dState = j.a.support?.state ?? ''; rows.push(r); }
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    for (const [j, r] of live) if (r.outcome === 'open') { r.outcome = sim.outcome ?? 'end'; r.life = sim.t - r.t0; r.cState = j.b.support?.state ?? ''; r.dState = j.a.support?.state ?? ''; rows.push(r); }
    live.clear();
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
const by = (f: (r: Row) => boolean) => rows.filter(f);
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
const pct = (g: Row[], f: (r: Row) => boolean) => `${(100 * g.filter(f).length / Math.max(1, g.length)).toFixed(0)}%`;
console.log('holds', rows.length, 'broken', by((r) => r.outcome === 'broken').length, 'released', by((r) => r.outcome === 'released').length);
for (const o of ['broken', 'released', 'tackle', 'oob', 'touchdown']) {
  const g = by((r) => r.outcome === o);
  if (!g.length) continue;
  console.log(o.padEnd(9), 'n', String(g.length).padStart(4), 'cap', avg(g.map((r) => r.cap)).toFixed(0), 'legs', avg(g.map((r) => r.legs)).toFixed(2), 'dist', avg(g.map((r) => r.dist)).toFixed(2), 'reach', avg(g.map((r) => r.reach)).toFixed(2), 'rel', avg(g.map((r) => r.rel)).toFixed(2), 'relN', avg(g.map((r) => r.relN)).toFixed(2), 'relT', avg(g.map((r) => r.relT)).toFixed(2), 'life', avg(g.map((r) => r.life)).toFixed(2), 'maxF', avg(g.map((r) => r.maxForce)).toFixed(0), 'touched', pct(g, (r) => r.touched), 'peakXi', avg(g.map((r) => r.peak)).toFixed(2));
}
for (const o of [...new Set(rows.map((r) => r.origin))]) {
  const g = by((r) => r.origin === o);
  console.log(`origin ${o.padEnd(6)} n ${String(g.length).padStart(4)} broken ${pct(g, (r) => r.outcome === 'broken')} cap ${avg(g.map((r) => r.cap)).toFixed(0)} dist ${avg(g.map((r) => r.dist)).toFixed(2)} rel ${avg(g.map((r) => r.rel)).toFixed(2)} relN ${avg(g.map((r) => r.relN)).toFixed(2)} touched ${pct(g, (r) => r.touched)}`);
}
for (const geo of ['head-on', 'side', 'behind']) {
  const g = by((r) => r.geo === geo);
  console.log(`geo ${geo.padEnd(7)} n ${String(g.length).padStart(4)} broken ${pct(g, (r) => r.outcome === 'broken')} carrier speed ${avg(g.map((r) => r.cSpeed)).toFixed(1)} tackler ${avg(g.map((r) => r.dSpeed)).toFixed(1)} dist ${avg(g.map((r) => r.dist)).toFixed(2)} relT ${avg(g.map((r) => r.relT)).toFixed(2)} relN ${avg(g.map((r) => r.relN)).toFixed(2)} touched ${pct(g, (r) => r.touched)} assists ${avg(g.map((r) => r.assists)).toFixed(2)}`);
}
console.log('sample broken:');
for (const r of by((r) => r.outcome === 'broken').slice(0, 14)) console.log(` ${r.origin} ${r.geo} d${r.dist.toFixed(2)}/${r.reach.toFixed(2)} max${r.maxDist.toFixed(2)} cap${r.cap.toFixed(0)} legs${r.legs.toFixed(2)} cv${r.cSpeed.toFixed(1)} dv${r.dSpeed.toFixed(1)} relN${r.relN.toFixed(1)} relT${r.relT.toFixed(1)} life${r.life.toFixed(2)} touched ${r.touched} c:${r.cState} d:${r.dState} peak${r.peak.toFixed(2)}`);
