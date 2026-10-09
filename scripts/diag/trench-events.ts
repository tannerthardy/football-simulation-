/** Why block reps end and who falls (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const rng = new Rng(Number(process.argv[3] ?? 21));
const notes: Record<string, number> = {};
const falls: Record<string, number> = {};
let plays = 0;
for (let g = 0; g < Number(process.argv[2] ?? 1); g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    if (!p.replay) continue;
    plays++;
    for (const e of p.replay.events) {
      if (e.type === 'shed') notes[e.note ?? ''] = (notes[e.note ?? ''] ?? 0) + 1;
      if (e.type === 'fall') { const pos: string = String((p.replay.players[e.a!] as { pos?: string } | undefined)?.pos ?? '?'); const k = `${pos}:${e.note}`; falls[k] = (falls[k] ?? 0) + 1; }
    }
  }
}
console.log('plays', plays);
console.log('sheds', Object.entries(notes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
console.log('falls', Object.entries(falls).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
