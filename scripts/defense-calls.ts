/**
 * Defensive call mix in simulated games, measured like
 * scripts/data/bdb2025_defense_calls.py on dropbacks: coverage families
 * (after formation checks), man share, rushers per dropback, blitz rate
 * (5+ rushers) overall and by down/distance, and 5+ rushers by family.
 *   npx tsx scripts/defense-calls.ts [games] [seed] [leagues] [nfl-defense-calls.json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

const [gamesStr = '24', seedStr = '7', leaguesStr = '3', nflPath = 'data/reviews/playbook-depth/nfl-defense-calls.json'] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Number(leaguesStr);
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
/** Our families → PFF family labels. */
const PFF: Record<string, string> = { cover3: 'Cover-3', cover1: 'Cover-1', cover2: 'Cover-2', tampa2: 'Cover-2', cover4: 'Quarters', cover6: 'Cover-6', cover0: 'Cover-0', cover2man: '2-Man' };
const MAN = new Set(['Cover-1', 'Cover-0', '2-Man']);
const distBucket = (d: number) => (d <= 2 ? '1-2' : d <= 6 ? '3-6' : d <= 10 ? '7-10' : '11+');

const fam: Record<string, number> = {};
const variant: Record<string, number> = {};
const byDD: Record<string, { n: number; blitz: number; fam: Record<string, number> }> = {};
const blitzByFam: Record<string, { n: number; blitz: number }> = {};
const rush: Record<string, number> = {};
let n = 0;
let blitz = 0;
let man = 0;
let checked = 0;
let disguised = 0;
let teams: Team[] = [];

for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map((nm) => {
      const tr = lr.fork(nm);
      return generateTeam(tr, nm, nm.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
    });
  }
  const i = rng.int(0, 7);
  let j = rng.int(0, 6);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
  for (const p of res.log) {
    if (p.kind !== 'pass' || p.nullified || !p.plan) continue;
    const plan = p.plan;
    const f = PFF[plan.family ?? plan.coverage] ?? plan.family ?? plan.coverage;
    const r = plan.rushers ?? 4;
    n++;
    fam[f] = (fam[f] ?? 0) + 1;
    variant[plan.coverage] = (variant[plan.coverage] ?? 0) + 1;
    if (MAN.has(f)) man++;
    if (r >= 5) blitz++;
    if (plan.called && plan.called !== plan.coverage) checked++;
    if (plan.shown) disguised++;
    const rb = r <= 3 ? '<=3' : r >= 6 ? '6+' : String(r);
    rush[rb] = (rush[rb] ?? 0) + 1;
    const key = `${['1st', '2nd', '3rd', '4th'][Math.min(p.down, 4) - 1]} & ${distBucket(p.distance)}`;
    const dd = (byDD[key] ??= { n: 0, blitz: 0, fam: {} });
    dd.n++;
    if (r >= 5) dd.blitz++;
    dd.fam[f] = (dd.fam[f] ?? 0) + 1;
    const bf = (blitzByFam[f] ??= { n: 0, blitz: 0 });
    bf.n++;
    if (r >= 5) bf.blitz++;
  }
}

type NflCalls = {
  coverageCalls: { overall: { families: Record<string, number> }; byDownDistance?: Record<string, { families?: Record<string, number> }> };
  pressure: { overall: { blitzRate: number; rushBuckets: Record<string, number>; meanRushers: number }; byDownDistance?: Record<string, { blitzRate?: number; n?: number }>; rushByCoverageFamily?: Record<string, { fivePlus?: number; blitzRate?: number }> };
};
const nfl = existsSync(nflPath) ? (JSON.parse(readFileSync(nflPath, 'utf8')) as NflCalls) : null;
const pct = (x: number, d: number) => `${((100 * x) / Math.max(1, d)).toFixed(1)}%`;
const nflPct = (v?: number) => (v === undefined ? '—' : `${(100 * v).toFixed(1)}%`);

console.log(`${games} games, ${n} dropbacks; formation checks on ${pct(checked, n)}, disguised shells ${pct(disguised, n)}`);
console.log('coverage family (played)          sim     NFL');
for (const [k, v] of Object.entries(fam).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(30)} ${pct(v, n).padStart(6)}  ${nflPct(nfl?.coverageCalls.overall.families[k]).padStart(6)}`);
console.log(`  man share                      ${pct(man, n).padStart(6)}   26.6%`);
console.log('variants: ' + Object.entries(variant).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, n)}`).join(', '));
console.log(`rushers: ${['<=3', '4', '5', '6+'].map((k) => `${k} ${pct(rush[k] ?? 0, n)} [NFL ${nflPct(nfl?.pressure.overall.rushBuckets[k])}]`).join('  ')}`);
console.log(`blitz (5+) ${pct(blitz, n)} [NFL ${nflPct(nfl?.pressure.overall.blitzRate)}]`);
console.log('blitz by down|distance (sim [NFL])');
for (const key of Object.keys(byDD).sort()) {
  const d = byDD[key];
  if (d.n < 25) continue;
  console.log(`  ${key.padEnd(11)} n ${String(d.n).padStart(4)}  ${pct(d.blitz, d.n).padStart(6)} [${nflPct(nfl?.pressure.byDownDistance?.[key]?.blitzRate)}]`);
}
console.log('5+ rushers by family (sim [NFL])');
for (const [k, v] of Object.entries(blitzByFam).sort((a, b) => b[1].n - a[1].n)) {
  const ref = nfl?.pressure.rushByCoverageFamily?.[k];
  console.log(`  ${k.padEnd(10)} ${pct(v.blitz, v.n).padStart(6)} [${nflPct(ref?.fivePlus ?? ref?.blitzRate)}]`);
}
