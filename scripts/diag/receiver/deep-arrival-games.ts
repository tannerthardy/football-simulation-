/** Ordinary-game deep throws on Rules's operator (scripts/diag/coverage/nfl_deep_place.py): throws to a named target with air yards >= MIN, no play action; the arrival is the first
 * secure / catch / drop / miss / pbu / interception / incomplete event after the throw; ball-to-target is 2D at the nearest replay frame (0.1 s), with the series from -0.5 to +0.5 s.
 *   node --import tsx scripts/diag/receiver/deep-arrival-games.ts OUT.jsonl SEED [SEED ...] [--min 15] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const args = process.argv.slice(2); const out = args[0]; const mi = args.indexOf('--min'); const MIN = mi >= 0 ? Number(args[mi + 1]) : 15;
const seeds = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--min').map(Number);
const rng = new Rng(7);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const ARR = new Set(['secure', 'catch', 'drop', 'miss', 'pbu', 'interception', 'incomplete']);
const r2 = (v: number) => Math.round(v * 100) / 100; const lines: string[] = [];
for (const seed of seeds) {
  const g: any = simulateGame(home, away, { seed, record: true, recordLevel: 'light' } as any);
  for (const p of g.log as any[]) {
    const rp = p.replay; if (p.kind !== 'pass' || !rp || p.nullified || p.plan?.playAction) continue;
    const th = rp.events.find((e: any) => e.type === 'throw' && e.b !== undefined && e.b !== null); if (!th) continue;
    if (!(p.stats?.airYards >= MIN)) continue;
    const ar = rp.events.find((e: any) => ARR.has(e.type) && e.t >= th.t + 0.2); if (!ar) continue;
    const n = rp.players.length, F = rp.frames; const k0 = F.findIndex((f: any) => f.t >= ar.t - 1e-6); if (k0 < 5 || k0 + 5 >= F.length) continue;
    const d = (k: number) => Math.hypot(F[k].ball[0] - F[k].agents[th.b * 3], F[k].ball[1] - F[k].agents[th.b * 3 + 1]);
    const series: number[] = []; for (let o = -5; o <= 5; o++) series.push(r2(d(k0 + o)));
    lines.push(JSON.stringify({ seed, index: p.index, concept: p.plan?.concept, coverage: p.plan?.coverage, air: r2(p.stats.airYards), result: ar.type, comp: !!p.stats.completed, int: !!p.stats.interceptedBy, ball: r2(F[k0].ball[0] - rp.los), d0: series[5], series, flight: r2(ar.t - th.t) }));
  }
}
writeFileSync(out, lines.join('\n') + '\n'); console.log(seeds, lines.length, 'throws');
