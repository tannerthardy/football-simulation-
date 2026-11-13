/** After-catch / after-handoff contact event mix across games (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const rng = new Rng(Number(process.argv[3] ?? 21));
const counts: Record<string, number> = {};
let carries = 0, downs = 0, stalls = 0, longYac = 0;
const notes: Record<string, number> = {};
for (let g = 0; g < Number(process.argv[2] ?? 2); g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    if (!p.replay) continue;
    carries++;
    for (const e of p.replay.events) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
      if (e.type === 'fall' || e.type === 'broken_tackle' || e.type === 'missed_tackle') notes[`${e.type}:${e.note ?? ''}`] = (notes[`${e.type}:${e.note ?? ''}`] ?? 0) + 1;
    }
    if ((p.stats?.yac ?? 0) >= 15) longYac++;
  }
}
console.log('plays', carries, 'long YAC', longYac);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
console.log(Object.entries(notes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
