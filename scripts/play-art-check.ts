/** The play-art tap changes nothing: one game simulated without and with the tap gives the same plays, results and replay frames,
 * and the same next random draw.  node --import tsx scripts/play-art-check.ts [seed] */
import { createHash } from 'node:crypto';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { installPlayArtTap, matchSheets, takeSheets } from './play-art.js';
const seed = Number(process.argv[2] ?? 21);
const run = (tap: boolean) => {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  if (tap) { installPlayArtTap(); takeSheets(); }
  const g = simulateGame(home, away, { seed, record: true, recordLevel: 'light' });
  const h = createHash('sha256').update(JSON.stringify(g.log)).update(JSON.stringify(g.score)).update(String(rng.nextU32())).digest('hex').slice(0, 16);
  const sheets = tap ? takeSheets() : [];
  const matched = tap ? matchSheets(g.log, sheets).size : 0;
  const filmedScrimmage = g.log.filter((p) => p.replay && p.plan).length;
  return { h, plays: g.log.length, sheets: sheets.length, matched, filmedScrimmage };
};
const a = run(false), b = run(true);
console.log('without tap', JSON.stringify(a)); console.log('with tap   ', JSON.stringify(b));
console.log(a.h === b.h ? 'IDENTICAL (log, score, next draw)' : 'DIFFERENT');
console.log(`sheets matched to ${b.matched} of ${b.filmedScrimmage} filmed scrimmage plays`);
