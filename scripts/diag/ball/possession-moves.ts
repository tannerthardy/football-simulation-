/** After a pass catch, how often does the ball move to another player on the same team, and by which path (a fumble the teammate recovers, a pitch, a handoff)? From each play's carrier segments.
 *   node --import tsx scripts/diag/ball/possession-moves.ts OUT.json SEED [SEED ...] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const out = process.argv[2], seeds = process.argv.slice(3).map(Number);
const rng = new Rng(7);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const rows: any[] = []; let catches = 0, plays = 0;
for (const seed of seeds) {
  const g: any = simulateGame(home, away, { seed } as any);
  for (const p of g.log) {
    plays++; const segs = p.segments as any[] | undefined; if (!segs?.length) continue;
    const ci = segs.findIndex((s) => s.how === 'catch'); if (ci < 0) continue; catches++;
    for (let i = ci + 1; i < segs.length; i++) {
      const prev = segs[i - 1], s = segs[i];
      rows.push({ seed, index: p.index, call: p.call, def: p.defense, from: prev.carrier, to: s.carrier, sameTeam: s.team === prev.team, how: s.how, prevEnd: prev.end, change: s.team !== prev.team, yards: p.yards, fumbleLost: !!p.stats?.fumbleLost, text: p.text });
    }
  }
}
writeFileSync(out, JSON.stringify({ seeds, plays, catches, rows })); console.log(seeds, plays, 'plays', catches, 'catches', rows.length, 'later segments');
