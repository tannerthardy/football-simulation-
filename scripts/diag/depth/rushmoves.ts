/** Interior pass reps in the lab (observation only; flags from the
 * environment). For each move window (0.3 s from a decision), landed or
 * not: the rusher's displacement relative to his blocker over the window,
 * across (toward his working side) and toward the quarterback; the
 * blocker's and the rusher's lateral speeds, the rusher's requested lateral
 * speed, each one's ground force across, the hand joint's forces; and the
 * move counts. Pairs with
 * depth/interiorrush.py (tracking and sim exports alike).
 * node --import tsx scripts/diag/depth/rushmoves.ts [--seed 101] [--games 2] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Engagement } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '2'));
const INTERIOR = /^(DT|NT)/;
type Win = { move: string; ok: boolean; across: number; toward: number; dLat: number; bLat: number; end: number; dG: number; bG: number; ask: number; tan: number; nor: number };
const wins: Win[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    if (!sim.isPass) return sim.run();
    const open = new Map<Engagement, { w: Win; until: number; rel0: { x: number; y: number }; lat: { x: number; y: number }; ax: { x: number; y: number }; side: number; n: number }>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = new Map(sim.engagements.filter(e => e.type === 'pass' && INTERIOR.test(e.defender.slot)).map(e => [e, e.moveUntil]));
      tick();
      for (const [e, until0] of before) {
        const d = e.defender, b = e.blocker, rel = { x: d.pos.x - b.pos.x, y: d.pos.y - b.pos.y };
        const q = { x: sim.qb.pos.x - b.pos.x, y: sim.qb.pos.y - b.pos.y }, L = Math.hypot(q.x, q.y) || 1, ax = { x: q.x / L, y: q.y / L }, lat = { x: -ax.y, y: ax.x };
        const cur = open.get(e);
        if (cur) {
          cur.w.dLat += (d.vel.x * cur.lat.x + d.vel.y * cur.lat.y) * cur.side; cur.w.bLat += (b.vel.x * cur.lat.x + b.vel.y * cur.lat.y) * cur.side; cur.n++;
          const g = sim.lastStep?.groundImpulse, ask = sim.intents[d.idx]?.vel;
          if (g) { cur.w.dG += (g[d.idx].x * cur.lat.x + g[d.idx].y * cur.lat.y) * cur.side / sim.dt; cur.w.bG += (g[b.idx].x * cur.lat.x + g[b.idx].y * cur.lat.y) * cur.side / sim.dt; }
          if (ask) cur.w.ask += (ask.x * cur.lat.x + ask.y * cur.lat.y) * cur.side;
          cur.w.tan += Math.abs(e.hands?.tangentForce ?? 0); cur.w.nor += e.hands?.normalForce ?? 0;
          if (sim.t >= cur.until || !sim.engagements.includes(e)) {
            const dx = rel.x - cur.rel0.x, dy = rel.y - cur.rel0.y;
            cur.w.across = (dx * cur.lat.x + dy * cur.lat.y) * cur.side; cur.w.toward = dx * cur.ax.x + dy * cur.ax.y;
            for (const k of ['dLat', 'bLat', 'dG', 'bG', 'ask', 'tan', 'nor'] as const) cur.w[k] /= Math.max(1, cur.n); cur.w.end = sim.engagements.includes(e) ? 0 : 1;
            wins.push(cur.w); open.delete(e);
          }
        }
        if (e.moveUntil !== until0 && !open.has(e) && sim.engagements.includes(e))
          open.set(e, { w: { move: e.move, ok: e.moveOk, across: 0, toward: 0, dLat: 0, bLat: 0, end: 0, dG: 0, bG: 0, ask: 0, tan: 0, nor: 0 }, until: e.moveUntil, rel0: rel, lat, ax, side: e.side, n: 0 });
      }
    };
    return sim.run();
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
const p75 = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length * .75)].toFixed(2) : '-'; };
console.log(`interior move windows ${wins.length}, landed ${(100 * wins.filter(w => w.ok).length / Math.max(1, wins.length)).toFixed(1)}%`);
for (const ok of [true, false]) for (const m of [...new Set(wins.map(w => w.move))].sort()) {
  const W = wins.filter(w => w.ok === ok && w.move === m);
  if (W.length < 5) continue;
  console.log(`  ${ok ? 'landed' : 'failed'} ${m.padEnd(8)} n ${String(W.length).padStart(4)} | over 0.3 s: across (working side) p50 ${med(W.map(w => w.across))} p75 ${p75(W.map(w => w.across))}, toward QB p50 ${med(W.map(w => w.toward))} | lateral speed rusher ${med(W.map(w => w.dLat))} blocker ${med(W.map(w => w.bLat))} | rep ended ${(100 * W.filter(w => w.end).length / W.length).toFixed(0)}%`);
  console.log(`      asks across ${med(W.map(w => w.ask))} yd/s | ground force across: rusher ${med(W.map(w => w.dG))} blocker ${med(W.map(w => w.bG))} | hands tangential ${med(W.map(w => w.tan))} normal ${med(W.map(w => w.nor))}`);
}
