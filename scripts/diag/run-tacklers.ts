import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const rng = new Rng(5);
const G = (s: string) => (s.startsWith('DE') || s.startsWith('DT') || s === 'NT' ? 'DL' : s.startsWith('LB') ? 'LB' : s.startsWith('CB') || s === 'NB' || s === 'DB' ? 'CB' : s === 'FS' || s === 'SS' ? 'S' : 'other');
const c: Record<string, number> = {};
const st: Record<string, number> = {};
for (let g = 0; g < 6; g++) {
  const r = simulateGame(generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), generateTeam(rng, 'A', 'AWY', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of r.log) {
    if (p.kind !== 'run' || !p.replay) continue;
    for (const e of p.replay.events) {
      if (e.type !== 'tackle' && e.type !== 'hit') continue;
      if (e.a === undefined) continue;
      const k = G(p.replay.players[e.a].slot);
      c[k] = (c[k] ?? 0) + 1;
      if (p.yards <= 0) st[k] = (st[k] ?? 0) + 1;
      break;
    }
  }
}
const tot = Object.values(c).reduce((a, b) => a + b, 0);
const ts = Object.values(st).reduce((a, b) => a + b, 0);
console.log('sim tacklers on runs:', Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +((100 * v) / tot).toFixed(1)])));
console.log('sim tacklers on stuffs:', Object.fromEntries(Object.entries(st).map(([k, v]) => [k, +((100 * v) / ts).toFixed(1)])));
