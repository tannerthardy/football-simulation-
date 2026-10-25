/** When defensive linemen show their largest tracking-style accelerations on
 * run plays, and what was happening then (development aid).
 *   node --import tsx scripts/diag/line-peaks.ts [games] [seed] [max] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
const max = Number(process.argv[4] ?? 12);
const DL = new Set(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT', 'LT', 'LG', 'C', 'RG', 'RT']);
let shown = 0;
const bins: Record<string, number> = {};
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const watch = sim.agents.filter((a) => DL.has(a.slot));
    const rows = new Map(watch.map((a) => [a, [] as Array<{ t: number; v: number; vx: number; vy: number; state: string; eng: string; touch: number; xi: number }>]));
    while (sim.phase === 'live' && sim.t < 25) {
      tick.tick();
      if (sim.isPass) continue;
      const r = sim.lastStep!;
      for (const a of watch) {
        const e = a.engagement;
        const touch = r.contacts.filter((c) => c.i === a.idx || c.j === a.idx).reduce((s, c) => s + c.impulse, 0) / a.profile.massKg;
        rows.get(a)!.push({ t: sim.t, v: a.speed, vx: a.vel.x, vy: a.vel.y, state: a.body.support!.state, eng: e ? `${e.type}${e.blocker === a ? 'B' : 'D'} phi${e.phi.toFixed(2)}` : '-', touch,
          xi: Math.hypot(a.body.support!.xi.x, a.body.support!.xi.y) });
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    if (!sim.isPass) for (const [a, rs] of rows) {
      const s = rs.map((_, k) => { const w = rs.slice(Math.max(0, k - 2), k + 3); return w.reduce((x, y) => x + y.v, 0) / w.length; });
      let best = 0, at = -1;
      for (let k = 2; k < s.length - 2; k++) { const v = (s[k + 2] - s[k - 2]) / (4 * sim.dt); if (v > best) { best = v; at = k; } }
      if (at < 0) continue;
      const w = rs.slice(Math.max(0, at - 4), at + 5);
      const kind = w.some((x) => x.state !== 'up') ? 'fall/rise' : w.some((x) => x.touch > 0.3) ? 'body contact' : w.some((x) => x.eng !== '-') ? 'engaged' : 'free';
      const key = `${['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : 'DL'} ${best > 5 ? '>5' : best > 3.5 ? '3.5-5' : '<3.5'} ${kind}`;
      bins[key] = (bins[key] ?? 0) + 1;
      if (best > 6 && shown < max && !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)) {
        shown++;
        console.log(`--- ${a.slot} peak ${best.toFixed(1)} at t=${rs[at].t.toFixed(2)} (${kind})`);
        for (const x of w) console.log(`  ${x.t.toFixed(2)} v${x.v.toFixed(2)} (${x.vx.toFixed(1)},${x.vy.toFixed(1)}) ${x.state} xi${x.xi.toFixed(2)} touch${x.touch.toFixed(2)} ${x.eng}`);
      }
    }
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
console.log(Object.entries(bins).sort().map(([k, v]) => `${k}: ${v}`).join('\n'));
