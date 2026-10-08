import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const rng = new Rng(5);
const who: Record<string, number> = {};
const tbuck: Record<string, number> = {};
let n = 0;
for (let g = 0; g < 4; g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), generateTeam(rng, 'A', 'AWY', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp || p.kind !== 'pass' || p.stats?.scramble) continue;
    const qbI = rp.players.findIndex((x) => x.slot === 'QB');
    const end = rp.events.find((e) => e.type === 'throw' || e.type === 'throwaway' || e.type === 'sack')?.t ?? 99;
    for (const f of rp.frames) {
      if (f.t > end) break;
      const qx = f.agents[qbI * 3], qy = f.agents[qbI * 3 + 1];
      let hit = -1;
      for (let i = 0; i < rp.players.length; i++) if (rp.players[i].team === 'D' && Math.hypot(f.agents[i * 3] - qx, f.agents[i * 3 + 1] - qy) < 2) hit = i;
      if (hit >= 0) {
        n++;
        const call = p.call.includes('PA') ? 'PA' : 'dropback';
        const k = `${rp.players[hit].slot} ${p.defense.includes('+') ? 'blitz' : 'rush4'} ${call}`;
        who[k] = (who[k] ?? 0) + 1;
        const tb = f.t < 1 ? '<1.0' : f.t < 1.5 ? '1.0-1.5' : f.t < 2 ? '1.5-2.0' : f.t < 2.5 ? '2.0-2.5' : '2.5+';
        tbuck[tb] = (tbuck[tb] ?? 0) + 1;
        if (n <= 6) console.log(`t=${f.t.toFixed(2)} ${rp.players[hit].slot} qb=(${(qx - rp.los).toFixed(1)}) d=(${(f.agents[hit * 3] - rp.los).toFixed(1)}) ${p.call} | ${p.defense} | ${p.text.slice(0, 60)}`);
        break;
      }
    }
  }
}
console.log(n, tbuck);
console.log(Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 15));
