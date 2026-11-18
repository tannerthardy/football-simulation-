// Interceptions and breakups in whole games (2026-11-18, DEF_CATCH's gate): per game, pass attempts (a throw), completions,
// interceptions and breakups (pbu events), overall and on throws of 15+ air yards (stats.airYards).
// usage: [DEF_CATCH=1] node --import tsx scripts/diag/pass-operators/game-ints.mts --seed 101 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = arg('--out', 'gi.json');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const result: any = simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
const rows: any[] = [];
for (const p of result.log) {
  const rp = p.replay; if (!rp || p.nullified || p.kind !== 'pass') continue;
  const thr = rp.events.find((e: any) => e.type === 'throw'); if (!thr) continue;
  const ev = rp.events.filter((e: any) => e.t >= thr.t);
  rows.push({ air: p.stats?.airYards ?? null, comp: !!p.stats?.completed, int: ev.some((e: any) => e.type === 'interception'), pbu: ev.some((e: any) => e.type === 'pbu') });
}
writeFileSync(out, JSON.stringify(rows)); console.log('rows', rows.length);
