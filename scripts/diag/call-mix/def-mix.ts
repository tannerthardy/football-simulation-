// Defensive call mix over league-sampled coordinators (report only). For N generated defences (each with its own
// coach: coverage tree, man rate, blitz rate), call DefensiveCoordinator.call on the situations of real passes from
// sim-export review files (down, distance, yardline, quarter, clock, offence personnel and formation), with a fresh
// coordinator per team (no in-game learning). Prints the called coverage family by down-and-distance bucket and
// by coverage tree. Calls are drawn from the coordinator's own rng; the engine is not run.
//   node --import tsx scripts/diag/call-mix/def-mix.ts <review.json>[,...] [--teams 200] [--per 150]
import { readFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { DefensiveCoordinator } from '../../../src/game/playcaller.js';
import { generateTeam, pickOffense } from '../../../src/league/team.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const files = process.argv[2].split(',');
const nTeams = Number(arg('--teams', '200')), per = Number(arg('--per', '150'));
const sits: any[] = [];
for (const f of files) for (const p of JSON.parse(readFileSync(f, 'utf8')).plays) {
  if (p.kind !== 'pass' || p.nullified || !p.plan) continue;
  sits.push({ s: { down: p.down, distance: p.distance, yardline: p.yardline, quarter: p.quarter, clock: p.clock, scoreDiff: 0, ballY: 26.65, hurry: false },
    personnel: p.plan.personnel, formation: p.plan.formation });
}
const bucket = (d: number, t: number) => d <= 1 ? '1st' : `${d === 2 ? '2nd' : '3rd'}_${t <= 3 ? 'short' : t <= 7 ? 'med' : 'long'}`;
const tally = new Map<string, Map<string, number>>();
const add = (k: string, fam: string) => { const m = tally.get(k) ?? new Map(); m.set(fam, (m.get(fam) ?? 0) + 1); tally.set(k, m); };
const offense = generateTeam(new Rng(77), 'Off', 'OFF', { strength: 0.55 });
const pick = new Rng(4242);
for (let i = 0; i < nTeams; i++) {
  const def = generateTeam(new Rng(20000 + i), 'Def', `D${i}`, { strength: 0.55 });
  const dc = new DefensiveCoordinator(def, new Rng(30000 + i));
  for (let j = 0; j < per; j++) {
    const x = sits[Math.floor(pick.next() * sits.length)];
    const formation = FORMATION_BY_ID[x.formation];
    if (!formation) continue;
    const { call } = dc.call(x.s, x.personnel, offense, pickOffense(offense, x.personnel), formation);
    const fam = call.coverage.family ?? call.coverage.id;
    add('all', fam); add(bucket(x.s.down, x.s.distance), fam); add(`tree:${(def.coach as any).coverageSystem}`, fam);
  }
}
const FAMS = ['cover0', 'cover1', 'cover2', 'tampa2', 'cover3', 'cover4', 'cover6', 'cover2man'];
for (const [k, m] of [...tally.entries()].sort()) {
  const n = [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`${k.padEnd(20)} n${String(n).padStart(6)} ` + FAMS.map((f) => `${f.replace('cover', 'C')} ${(100 * (m.get(f) ?? 0) / n).toFixed(1).padStart(5)}`).join(' '));
}
