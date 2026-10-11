/** Interior pass blocks (G/C vs DT): rusher depth gained by 2 s vs blocker/defender mass ratio.
 *   node --import tsx scripts/diag/pass-mass.ts [games] [seed] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 4);
const rng = new Rng(Number(process.argv[3] ?? 21));
const bins = new Map<number, number[]>();
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    if (!sim.isPass) return undefined;
    const start = new Map<number, number>(); const pairs = new Map<number, number>();
    for (const a of sim.agents) start.set(a.idx, a.pos.x);
    while (sim.phase === 'live' && sim.t < 2.0 + 1e-9) {
      tick.tick();
      for (const e of sim.engagements) if (e.type === 'pass' && ['LG', 'C', 'RG'].includes(e.blocker.slot) && e.defender.player.position === 'DT' && !pairs.has(e.defender.idx)) pairs.set(e.defender.idx, e.blocker.idx);
      if (sim.throwAt >= 0 && sim.t >= sim.throwAt) break;
    }
    if (sim.t >= 2.0 - 1e-9 && !(sim.throwAt >= 0 && sim.throwAt < 2.0)) {
      for (const [d, b] of pairs) {
        const D = sim.agents[d], B = sim.agents[b];
        const ratio = Math.round(Math.min(Math.max(B.profile.massKg / D.profile.massKg, 0.85), 1.35) * 20) / 20;
        const depth = (start.get(d)! - D.pos.x) * sim.attackDir(B.team);
        (bins.get(ratio) ?? bins.set(ratio, []).get(ratio)!).push(depth);
      }
    }
    while (sim.phase === 'live' && sim.t < 25) tick.tick();
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
console.log('SIM interior pass blocks: rusher depth gained by 2.0 s (median/p90) by OL/DL mass ratio');
for (const [b, v] of [...bins].sort((a, c) => a[0] - c[0])) {
  v.sort((a, c) => a - c);
  if (v.length >= 15) console.log(`  ${b.toFixed(2)}: ${v[v.length >> 1].toFixed(2)}/${v[Math.floor(0.9 * (v.length - 1))].toFixed(2)} (n=${v.length})`);
}
