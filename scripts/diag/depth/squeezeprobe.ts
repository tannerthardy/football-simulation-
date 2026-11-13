/** Runs where a lineman squeezed (DL_SQUEEZE's 'squeeze' tag; observation
 * only, flags from the environment). At the tick the carrier crosses the
 * line: the nearest squeezer, whether the carrier is on the side he left
 * (behind his squeeze) or the side he is working to, how far; and the run's
 * yards. Also who is nearest that vacated side (a backer?).
 * node --import tsx scripts/diag/depth/squeezeprobe.ts [--seed 101] [--games 2] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '2'));
type Row = { side: string; gap: number; yards: number; fill: string; fillDist: number };
const rows: Row[] = []; let runs = 0, squeezed = 0;
const hooks = {
  playResult: (sim: PlaySim) => {
    if (sim.isPass) return sim.run();
    const dir = new Map<Agent, number>(); let row: Row | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const d of sim.defense) if (d.tags.has('squeeze') && d.engagement) dir.set(d, Math.sign(d.vel.y) || dir.get(d) || 0);
      const c = sim.carrier;
      if (row || !c || c.team !== 'O' || c === sim.qb || (c.pos.x - sim.los) * sim.attackDir('O') < 0) return;
      const sq = [...dir].filter(([, s]) => s);
      if (!sq.length) { row = { side: 'none', gap: NaN, yards: 0, fill: '', fillDist: NaN }; return; }
      const [d, s] = sq.reduce((p, q) => Math.abs(q[0].pos.y - c.pos.y) < Math.abs(p[0].pos.y - c.pos.y) ? q : p);
      const rel = (c.pos.y - d.pos.y) * s;
      const others = sim.defense.filter(x => x !== d && !x.engagement);
      const f = others.reduce((p, q) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) < Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) ? q : p, others[0]);
      row = { side: rel < 0 ? 'behind' : 'ahead', gap: Math.abs(rel), yards: 0, fill: f ? f.slot.replace(/_.*/, '') : '-', fillDist: f ? Math.hypot(f.pos.x - c.pos.x, f.pos.y - c.pos.y) : NaN };
    };
    const r = sim.run();
    runs++;
    const got = row as Row | null;
    if (got && got.side !== 'none') { got.yards = r.yards; rows.push(got); squeezed++; }
    return r;
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`runs ${runs}, with a squeezer at the crossing ${squeezed}`);
for (const side of ['behind', 'ahead']) {
  const R = rows.filter(r => r.side === side);
  if (!R.length) continue;
  const fills = [...R.reduce((m, r) => m.set(r.fill, (m.get(r.fill) ?? 0) + 1), new Map<string, number>())].map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`  carrier ${side} the squeezer: n ${R.length}, ${med(R.map(r => r.gap))} yd from him | yards p50 ${med(R.map(r => r.yards))}, 10+ ${(100 * R.filter(r => r.yards >= 10).length / R.length).toFixed(0)}% | nearest free defender ${fills}, ${med(R.map(r => r.fillDist))} yd`);
}
