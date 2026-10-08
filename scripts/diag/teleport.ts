/** Find frames where someone moves faster than physically possible. */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const rng = new Rng(5);
const hits: Record<string, number> = {};
let shown = 0;
for (let g = 0; g < 3; g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), generateTeam(rng, 'A', 'AWY', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp) continue;
    const F = rp.frames;
    for (let k = 1; k < F.length; k++) {
      const dt = F[k].t - F[k - 1].t;
      if (dt <= 0) continue;
      for (let i = 0; i < rp.players.length; i++) {
        const v = Math.hypot(F[k].agents[i * 3] - F[k - 1].agents[i * 3], F[k].agents[i * 3 + 1] - F[k - 1].agents[i * 3 + 1]) / dt;
        if (v > 11.5) {
          const near = rp.events.filter((e) => Math.abs(e.t - F[k].t) < 0.25).map((e) => e.type).join(',');
          const key = `${rp.players[i].slot}`;
          hits[key] = (hits[key] ?? 0) + 1;
          if (shown++ < 12) console.log(`${p.kind} t=${F[k].t.toFixed(2)} ${rp.players[i].slot} v=${v.toFixed(1)} events: ${near} | ${p.text.slice(0, 70)}`);
        }
      }
    }
  }
}
console.log(hits);
