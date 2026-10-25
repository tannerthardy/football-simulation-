import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const rng = new Rng(Number(process.argv[3] ?? 21));
const c: Record<string, number> = {};
let plays = 0, tackles = 0, hits = 0;
for (let g = 0; g < Number(process.argv[2] ?? 6); g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    if (!p.replay) continue;
    plays++;
    const roster = p.replay.players;
    for (const e of p.replay.events) {
      if (e.type === 'missed_tackle' || e.type === 'broken_tackle') {
        const carrierIdx = e.type === 'missed_tackle' ? e.b : e.a;
        const carrier = carrierIdx !== undefined ? roster[carrierIdx] : undefined;
        const role = carrier?.slot === 'QB' && p.kind === 'pass' && !p.stats?.completed ? 'qb' : p.kind === 'run' ? 'run' : 'rec';
        const k = `${e.type}:${e.note ?? ''}:${role}`;
        c[k] = (c[k] ?? 0) + 1;
      }
      if (e.type === 'tackle') tackles++;
    }
  }
}
console.log('plays', plays, 'tackles', tackles);
for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(36), v, (v / plays).toFixed(3));
