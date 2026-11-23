// Replay keys (log index, quarter, clock) for chosen wide-census rows: re-runs the census games (seed, leagueSample
// salts as wide-census.mts) with record 'light' and matches each pick to its log entry by coverage, concept and yards.
//   node --import tsx scripts/diag/coverage/wide-census-keys.mts <picks.json> [seed]
// picks.json: [{ game, call, concept, yards, slot, label }]
import { readFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
const picks = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const seed = Number(process.argv[3] ?? 11);
const only = process.env.GAME !== undefined ? Number(process.env.GAME) : null;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const games = [...new Set(picks.map((p: any) => p.game))].sort() as number[];
for (let g = 0; g <= Math.max(...games); g++) {
  if (!games.includes(g) || (only !== null && g !== only)) continue;
  const res: any = simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, recordLevel: 'light' });
  for (const pk of picks.filter((p: any) => p.game === g)) {
    const hits = res.log.filter((e: any) => e.plan?.coverage === pk.call && Math.abs((e.yards ?? 0) - pk.yards) < 0.05
      && String(e.text ?? '').length >= 0 && (e.plan?.concept ?? '').replace(/_/g, ' ').replace(/\+pa/, '').length > 0);
    const named = hits.filter((e: any) => (pk.concept as string).toLowerCase().replace(/^pa /, '').replace(/[^a-z]/g, '').startsWith(String(e.plan?.concept ?? '').replace(/\+pa/, '').replace(/[^a-z]/g, '').slice(0, 5)));
    const h = named.length ? named : hits;
    console.log(JSON.stringify({ ...pk, gameSeed: seed + g, matches: h.map((e: any) => ({ index: e.index, q: e.quarter, clk: e.clock, down: e.down, dist: e.distance, concept: e.plan?.concept, formation: e.plan?.formation, front: e.plan?.front, text: e.text })) }));
  }
}
