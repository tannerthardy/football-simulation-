/**
 * Game clock per snap, measured like scripts/data/bdb2025_clock.py: seconds
 * of game clock between consecutive scrimmage snaps of the same drive, by how
 * the earlier play ended, outside the last 2:00 of the 2nd quarter and 5:00 of
 * the 4th, and the live time of the earlier play. Also scrimmage snaps per
 * team-game.
 *   npx tsx scripts/clock-anatomy.ts [games] [seed] [leagues] [nfl-clock.json]
 * The NFL reference defaults to data/reviews/error-budget/nfl-clock.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame, type PlayLog } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

const [gamesStr = '24', seedStr = '7', leaguesStr = '3', nflPath = 'data/reviews/error-budget/nfl-clock.json'] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Number(leaguesStr);
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
let teams: Team[] = [];

const gap: Record<string, number[]> = {};
const live: Record<string, number[]> = {};
let snaps = 0;

function kind(p: PlayLog): string | null {
  if (p.kind === 'penalty' || p.nullified) return 'penalty';
  if (p.kind === 'kneel') return 'kneel';
  const st = p.stats;
  if (!st || p.outcome === 'touchdown' || p.outcome === 'safety' || st.interceptedBy || st.fumbleLost) return null;
  if (p.outcome === 'incomplete') return 'incomplete';
  if (st.sacked) return 'sack';
  if (p.outcome === 'oob') return 'out of bounds';
  return 'in bounds';
}

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
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
  const plays = res.log.filter((p) => p.kind === 'run' || p.kind === 'pass' || p.kind === 'kneel' || p.kind === 'penalty');
  snaps += plays.filter((p) => p.kind !== 'penalty').length;
  for (let k = 0; k + 1 < plays.length; k++) {
    const a = plays[k];
    const b = plays[k + 1];
    if (a.quarter !== b.quarter || a.offense !== b.offense || b.kind === 'penalty') continue;
    if ((b.quarter === 2 && b.clock < 120) || (b.quarter >= 4 && b.clock < 300) || b.quarter > 4) continue;
    const c = kind(a);
    if (!c) continue;
    if (a.duration !== undefined) (live[c] ??= []).push(a.duration);
    const dt = a.clock - b.clock;
    if (dt < 0 || dt > 80) continue;
    (gap[c] ??= []).push(dt);
  }
}

// Snap to the whistle in NFL tracking (BDB 2025, weeks 1-2): first tackle, out-of-bounds, incompletion or sack event.
const NFL_LIVE: Record<string, number> = { 'in bounds': 5.0, 'out of bounds': 5.9, incomplete: 4.5, sack: 4.45 };
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const nfl = existsSync(nflPath) ? (JSON.parse(readFileSync(nflPath, 'utf8')) as { scrimmagePlaysPerTeamGame: number; secondsBetweenSnaps: Record<string, { n: number; mean: number; median: number }> }) : null;
console.log(`${games} games: scrimmage snaps/team-game ${(snaps / games / 2).toFixed(1)}${nfl ? `   [NFL ${nfl.scrimmagePlaysPerTeamGame}]` : ''}`);
console.log('seconds between snaps of a drive, by how the earlier play ended (share, mean, p25/p50/p75)');
const all = Object.values(gap).flat();
for (const [k, v] of Object.entries(gap).sort((x, y) => y[1].length - x[1].length)) {
  const r = nfl?.secondsBetweenSnaps[k];
  const nflAll = nfl ? Object.entries(nfl.secondsBetweenSnaps).filter(([n]) => n !== 'all').reduce((s, [, x]) => s + x.n, 0) : 0;
  const lv = live[k] ?? [];
  console.log(`  ${k.padEnd(14)} ${((100 * v.length) / all.length).toFixed(1).padStart(5)}%  mean ${mean(v).toFixed(1).padStart(5)}  ${q(v, 0.25)}/${q(v, 0.5)}/${q(v, 0.75)}` + (r ? `   [NFL ${((100 * r.n) / nflAll).toFixed(1)}%, mean ${r.mean}, p50 ${r.median}]` : '') + (lv.length ? `   live mean ${mean(lv).toFixed(1)} [NFL ${NFL_LIVE[k] ?? '—'}]` : ''));
}
console.log(`  all            mean ${mean(all).toFixed(1)}${nfl ? `   [NFL ${nfl.secondsBetweenSnaps.all.mean}]` : ''}`);
