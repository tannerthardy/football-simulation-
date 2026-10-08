import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const rng = new Rng(5);
const res: Record<string, number[]> = {};
const GR: Record<string, string> = { LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL', DE_S: 'DL', DE_W: 'DL', DT_S: 'DL', DT_W: 'DL', NT: 'DL', RB: 'RB' };
for (let g = 0; g < 4; g++) {
  const r = simulateGame(generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), generateTeam(rng, 'A', 'AWY', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of r.log) {
    if (p.kind !== 'run' || !p.replay) continue;
    const F = p.replay.frames;
    for (const t of [1.0, 1.5, 2.0]) {
      const f = F.find((x) => x.t >= t - 1e-6);
      if (!f) continue;
      p.replay.players.forEach((pl, i) => {
        const gr = GR[pl.slot];
        if (!gr) return;
        const depth = f.agents[i * 3] - p.replay!.los;
        const k = gr === 'DL' ? `DL past LOS at ${t}s` : gr === 'OL' ? `OL downfield at ${t}s` : `RB depth at ${t}s`;
        (res[k] ??= []).push(gr === 'DL' ? -depth : depth);
      });
    }
  }
}
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * (v.length - 1))];
for (const k of Object.keys(res).sort()) {
  const v = res[k];
  console.log(`${k.padEnd(24)} n${String(v.length).padStart(5)} p10 ${q(v, 0.1).toFixed(2)} p50 ${q(v, 0.5).toFixed(2)} p90 ${q(v, 0.9).toFixed(2)}`);
}
