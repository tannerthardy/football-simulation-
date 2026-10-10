/**
 * Event-complete handoff runs and completed receptions tackled in the field,
 * without nullified plays, scrambles, turnovers or fumble/possession chains.
 * First actual contact is canonical carrier_contact on the acquired carrier.
 * Physical body displacement and official forward-progress spot are separate.
 * Prints the NFL football-event reference with explicit comparison caveats.
 *   npx tsx scripts/contact-anatomy.ts [games] [seed] [leagues] [nfl-contact.json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';
import { measureContactAnatomy } from './contact-anatomy-measures.js';

const [gamesStr = '8', seedStr = '7', leaguesStr = '2', nflPath = 'data/reviews/error-budget/nfl-contact.json'] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Number(leaguesStr);
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
const run: Record<string, number[]> = {};
const catches: Record<string, number[]> = {};
const endpoints = { designedRuns: {} as Record<string, number[]>, completions: {} as Record<string, number[]> };
const add = (m: Record<string, number[]>, k: string, v: number) => (m[k] ??= []).push(v);
let considered = 0, measured = 0;
let teams: Team[] = [];

for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map((n) => {
      const tr = lr.fork(n);
      return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
    });
  }
  const i = rng.int(0, 7);
  let j = rng.int(0, 6);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    if (p.kind !== 'run' && p.kind !== 'pass') continue;
    considered++;
    const sample = measureContactAnatomy(p);
    if (!sample) continue;
    measured++;
    const bucket = sample.cohort === 'designedRuns' ? run : catches;
    for (const [metric, value] of Object.entries(sample.metrics)) add(bucket, metric, value);
    for (const [metric, value] of Object.entries(sample.endpoints)) add(endpoints[sample.cohort], metric, value);
  }
}

type Summ = { n: number; mean: number; median: number };
const nfl = existsSync(nflPath) ? (JSON.parse(readFileSync(nflPath, 'utf8')) as { source: string; designedRuns: Record<string, Summ>; completions: Record<string, Summ> }) : null;
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * v.length)];
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
function show(title: string, m: Record<string, number[]>, ref?: Record<string, Summ>): void {
  console.log(title);
  for (const [k, v] of Object.entries(m)) {
    const r = ref?.[k];
    console.log(`  ${k.padEnd(20)} n ${String(v.length).padStart(4)}  mean ${mean(v).toFixed(2).padStart(5)}  p50 ${q(v, 0.5).toFixed(2).padStart(5)}` + (r ? `   [NFL mean ${r.mean}, p50 ${r.median}]` : ''));
  }
}
console.log(`${games} games; ${measured}/${considered} scrimmage plays enter the event-complete contact cohorts`);
console.log('Cohort: offensive handoff runs / completed receptions ending in a tackle; no scrambles, nullified plays, interceptions or fumble/possession chains. Tosses and old replays without carrier_contact are excluded.');
console.log('Endpoints: actual carrier_contact to the same carrier at tackle, not missed attempts or the official forward-progress spot. Carrier event coordinates are rounded to 0.01 yd; frame coordinates to 0.1 yd, linearly interpolated at event time. Event timestamps are rounded to 0.01 s on the 20 Hz simulation clock; frame spacing depends on recording.');
if (nfl) console.log(`NFL comparison: ${nfl.source}; football first_contact/tackle events at 10 Hz. Event labels, ball-versus-body positions and strict engine chain exclusions differ; compare distributions, not exact calibration targets.`);
show('designed handoff runs tackled in the field (physical displacement)', run, nfl?.designedRuns);
show('completed receptions tackled in the field (physical displacement)', catches, nfl?.completions);
show('run official spot versus recorded carrier terminal displacement (no NFL target)', endpoints.designedRuns);
show('reception official spot versus recorded carrier terminal displacement (no NFL target)', endpoints.completions);
