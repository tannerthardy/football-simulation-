// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/<this file> SEED GAMES
// Breakups / interceptions on thrown passes by whether the defender keyed the passer's arm this play (tag 'readArm').
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, e0 = P.event;
const c: any = { pbuArm: 0, pbuOther: 0, intArm: 0, intOther: 0 };
P.event = function (type: string, a: any, ...r: any[]) {
  if (a?.team === 'D' && (type === 'pbu' || type === 'deflection' || type === 'interception')) {
    const arm = a.tags?.has('readArm'); const k = type === 'interception' ? 'int' : 'pbu'; c[k + (arm ? 'Arm' : 'Other')]++;
  }
  return e0.call(this, type, a, ...r);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
console.log('PBU', JSON.stringify(c));
