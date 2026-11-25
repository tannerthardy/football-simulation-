// QB_V2 plan coverage in whole games (QB lane, 2026-11-24; Integration's patch-note ask): what share of called pass
// plays run on V2 (a staged concept whose read plan fits the call), the rest staying on the old controller.
//   QB_V2=1 QB_QUICK_DRIFT=3 node --import tsx scripts/diag/qbv2/coverage-share.ts 1-4
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { simulateGame } from '../../../src/game/game.js';
import { V2Drive } from '../../../src/sim/qbv2/drive.js';
const [a, b] = (process.argv[2] ?? '1-2').split('-').map(Number);
let v2 = 0; const orig = V2Drive.prototype.decidePreSnap;
V2Drive.prototype.decidePreSnap = function (...args: any[]) { v2++; return (orig as any).apply(this, args); };
const byConcept: Record<string, number> = {}; let pass = 0;
for (let seed = a; seed <= b; seed++) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const g = simulateGame(home, away, { seed });
  for (const p of g.log as any[]) if (p.kind === 'pass') { pass++; const call = String(p.call ?? ''); const c = ['quick_outs', 'slant_flat', 'stick', 'Quick Outs', 'Speed Outs', 'Slant-Flat', 'Slant Flat', 'Stick'].find((k) => call.includes(k)) ?? 'other'; byConcept[c] = (byConcept[c] ?? 0) + 1; if (pass <= 3) console.error(call); }
}
console.log(JSON.stringify({ games: b - a + 1, passPlays: pass, v2Plays: v2, share: Math.round((v2 / Math.max(pass, 1)) * 1000) / 1000, byConcept }));
