/**
 * Film weirdness detectors on the film room's own games, so play ids match
 * `npm run replay` for the same seed.
 *   npm run weird -- [seed] [--games 1] [--out out/weird/film-seed7.json] [--top 3] [--all] [--expect truth.json] [--window 0.5] [--run-only]
 * Games are built exactly as scripts/export-replay.ts builds them (one pair of
 * teams, game i on seed + i) and are played without recording, which the engine
 * guarantees does not change them. Ids are `G{game}-P{n}` with n the game-wide
 * play index plus one, three digits. Event times are seconds from the snap.
 *
 * --expect names a JSON file of plays someone flagged by eye:
 *   { "turned": [{ "play": "G1-P003", "t": 2.26 }, "G1-P005"], "slide": [...] }
 * Each entry hits when that detector has an event in that play (and, if t is
 * given, within --window seconds of it). Misses and the count of other events
 * are printed; nothing is tuned to the list.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { DETECTORS } from './scorecard/weird/detectors.js';
import { weirdObserver } from './scorecard/weird/observe.js';
import { watchLine } from './scorecard/weird/report.js';
import type { DetectorId, WeirdEvent } from './scorecard/weird/types.js';
import { sourceVersion } from './source-version.js';

const args = process.argv.slice(2);
const flag = (name: string, dflt?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const seedArg = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const seed = Number(seedArg ?? 7);
const games = Number(flag('games', '1'));
const top = Number(flag('top', '3'));
const window = Number(flag('window', '0.5'));
const runOnly = args.includes('--run-only');
const out = flag('out', `out/weird/film-seed${seed}.json`)!;
if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('Seed must be a non-negative integer');
if (!Number.isInteger(games) || games < 1 || games > 50) throw new Error('--games must be an integer from 1 to 50');

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const all: WeirdEvent[] = [];
const counts: Record<string, number> = {};
for (let i = 0; i < games; i++) {
  const obs = weirdObserver({ idPrefix: '', game: i + 1, cap: Infinity });
  const g = simulateGame(home, away, { seed: seed + i, record: false, hooks: obs.hooks, runOnly });
  const { events, sums, ms } = obs.finish(g);
  all.push(...events);
  for (const [k, v] of Object.entries(sums)) counts[k] = (counts[k] ?? 0) + v;
  console.log(`Game ${i + 1} · seed ${seed + i}: ${home.name} ${g.score.home} — ${away.name} ${g.score.away} · ${events.length} events · detectors ${ms.toFixed(0)} ms`);
}

console.log('');
for (const d of DETECTORS) {
  const mine = all.filter((e) => e.detector === d.id);
  const plays = new Set(mine.map((e) => e.id)).size;
  console.log(`${d.label}${d.candidate ? ' (candidate)' : ''}: ${mine.length} events in ${plays} plays`);
  const list = flag('all') !== undefined ? [...mine].sort((a, b) => a.play - b.play || a.t0 - b.t0) : [...mine].sort((a, b) => b.severity - a.severity).slice(0, top);
  for (const e of list) console.log(`  ${watchLine(e)}`);
}

const expectPath = flag('expect');
const summary: Record<string, unknown> = {};
if (expectPath) {
  type Entry = string | { play: string; t?: number };
  const truth = JSON.parse(readFileSync(expectPath, 'utf8')) as Partial<Record<DetectorId, Entry[]>>;
  console.log('\nAgainst the list:');
  let flagged = 0, hits = 0;
  const matched = new Set<WeirdEvent>();
  for (const d of DETECTORS) {
    for (const entry of truth[d.id] ?? []) {
      const play = typeof entry === 'string' ? entry : entry.play;
      const t = typeof entry === 'string' ? undefined : entry.t;
      const found = all.filter((e) => e.detector === d.id && e.id === play && (t === undefined || (t >= e.t0 - window && t <= e.t1 + window)));
      flagged++;
      if (found.length) { hits++; for (const e of found) matched.add(e); }
      const here = all.filter((e) => e.detector === d.id && e.id === play);
      console.log(`  ${found.length ? 'HIT ' : 'MISS'} ${d.id.padEnd(9)} ${play}${t === undefined ? '' : ` @ ${t}`}`
        + (found.length ? `: ${found[0].text}` : here.length ? ` (events in the play, not near that time: ${here.map((e) => `${e.t0}-${e.t1}`).join(', ')})` : ' (no event in the play)'));
    }
  }
  const others = all.filter((e) => !matched.has(e) && DETECTORS.some((d) => d.id === e.detector && (truth[d.id] ?? []).length)).length;
  console.log(`  ${hits} of ${flagged} flagged plays hit; ${others} further events from those detectors in the same games (nobody flagged them yet).`);
  Object.assign(summary, { expect: { file: expectPath, window, flagged, hits, others } });
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ meta: { seed, games, sourceSha256: sourceVersion(), ...summary }, counts, events: all }));
console.log(`\nEvents -> ${out}`);
