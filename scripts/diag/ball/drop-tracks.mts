/** Every 'drop' event in the given game seeds with the ball's track from 0.2 s before to 1.2 s after and what happened next.
 *   node --import tsx scripts/diag/ball/drop-tracks.mts 7 8 ...   (writes out/drops-<seeds>.json) */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { writeFileSync } from 'node:fs';
const seeds = process.argv.slice(2).map(Number);
const rng = new Rng(7);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const out: any[] = [];
for (const seed of seeds) {
  const g = simulateGame(home, away, { seed, record: true, recordLevel: 'light' } as any);
  for (const p of g.log as any[]) {
    const rp = p.replay; if (!rp?.events) continue;
    const drops = rp.events.filter((e: any) => e.type === 'drop');
    for (const d of drops) {
      const later = rp.events.filter((e: any) => ['catch', 'interception', 'recovery', 'fumble_recovery'].includes(e.type) && e.t > d.t + 0.02);
      // ball track from drop to +1.2 s
      const tr = rp.frames.filter((f: any) => f.t >= d.t - 0.2 && f.t <= d.t + 1.2).map((f: any) => [Math.round(f.t * 100) / 100, ...f.ball.map((v: number) => Math.round(v * 100) / 100)]);
      out.push({ seed, index: p.index, concept: p.plan?.concept, coverage: p.plan?.coverage, drop: { t: d.t, a: d.a, who: rp.players[d.a]?.slot, pos: d.pos }, later: later.map((e: any) => ({ type: e.type, t: e.t, who: rp.players[e.a]?.slot, team: rp.players[e.a]?.team, dt: Math.round((e.t - d.t) * 100) / 100 })), track: tr, outcome: p.outcome, text: p.text });
    }
  }
}
writeFileSync(`out/drops-${seeds.join('_')}.json`, JSON.stringify(out));
console.log(seeds, out.length, 'drops');
