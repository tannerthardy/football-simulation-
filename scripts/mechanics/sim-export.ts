/**
 * Record simulated games and write their scrimmage plays in the common play
 * format read by scripts/mechanics/metrics.py (see that file for the format).
 *
 *   node --import tsx scripts/mechanics/sim-export.ts [--seed 101] [--games 8] [--out out/mechanics/sim-plays.jsonl.gz]
 * Add --review-out out/mechanics/outcomes.json for native stats/events and
 * situation labels without copying replay frames or changing simulation.
 *
 * Teams are generated once (equal strength) and play consecutive seeds, so a
 * fixed seed and game count is a reproducible sample of the current engine.
 */
import { createHash } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { Rng } from '../../src/core/rng.js';
import { simulateGame, type PlayLog } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { sourceVersion } from '../source-version.js';

const WIDTH = 160 / 3;
const GROUP: Record<string, string> = {
  QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL',
  EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB',
};
const END = new Set(['tackle', 'out_of_bounds', 'touchdown', 'sack', 'incomplete', 'interception', 'safety', 'slide']);
const ARRIVE = new Set(['catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection']);

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function commonPlay(p: PlayLog, id: string) {
  const rp = p.replay;
  if (!rp || rp.frames.length < 2 || p.nullified || (p.kind !== 'run' && p.kind !== 'pass')) return null;
  const n = rp.players.length;
  const first = rp.frames[0].agents;
  const offenseX = rp.players.reduce((s, a, i) => s + (a.team === 'O' ? first[i * 3] : 0), 0) / rp.players.filter(a => a.team === 'O').length;
  const dir = offenseX < rp.los ? 1 : -1;
  const X = (x: number) => (x - rp.los) * dir;
  const Y = (y: number) => (dir > 0 ? y : WIDTH - y);
  const lastT = rp.frames[rp.frames.length - 1].t;
  // Resample to a 0.1 s grid (linear between recorded frames).
  const xy: number[][] = [];
  let j = 0;
  for (let k = 0; k * 0.1 <= lastT + 1e-9; k++) {
    const t = k * 0.1;
    while (j < rp.frames.length - 2 && rp.frames[j + 1].t < t - 1e-9) j++;
    const a = rp.frames[j], b = rp.frames[Math.min(j + 1, rp.frames.length - 1)];
    const w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = a.agents[i * 3] + w * (b.agents[i * 3] - a.agents[i * 3]);
      const y = a.agents[i * 3 + 1] + w * (b.agents[i * 3 + 1] - a.agents[i * 3 + 1]);
      row.push(r2(X(x)), r2(Y(y)));
    }
    xy.push(row);
  }
  const ev = rp.events;
  const firstOf = (pred: (e: (typeof ev)[number]) => boolean) => ev.find(pred)?.t;
  const handoff = ev.find(e => e.type === 'handoff' || e.type === 'pitch_catch');
  const carrier = handoff ? (handoff.type === 'handoff' ? handoff.b : handoff.a) ?? null : null;
  const throwEv = ev.find(e => e.type === 'throw');
  const events: Record<string, number> = {};
  if (handoff) events.handoff = r2(handoff.t);
  if (throwEv) {
    events.pass_forward = r2(throwEv.t);
    const arrived = firstOf(e => ARRIVE.has(e.type) && e.t >= throwEv.t);
    if (arrived !== undefined) events.pass_arrived = r2(arrived);
  }
  const caught = ev.find(e => e.type === 'catch');
  if (caught) events.catch = r2(caught.t);
  if (carrier !== null) {
    const contact = firstOf(e => (e.type === 'carrier_contact' && (e.a === carrier || e.b === carrier))
      || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === carrier));
    if (contact !== undefined) events.first_contact = r2(contact);
  }
  const receiver = caught?.a ?? null;
  if (receiver !== null && receiver !== undefined) {
    const contact = firstOf(e => e.t >= caught!.t && ((e.type === 'carrier_contact' && (e.a === receiver || e.b === receiver))
      || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === receiver)));
    if (contact !== undefined) events.first_contact = r2(contact);
  }
  const pairs = new Map<string, [number, number]>();
  for (const e of ev) {
    if (e.type === 'block_contact' && e.a !== undefined && e.b !== undefined) pairs.set(`${e.a}:${e.b}`, [e.a, e.b]);
  }
  events.end = r2(firstOf(e => END.has(e.type)) ?? lastT);
  const ball = rp.frames[0].ball;
  return {
    id, source: 'sim', kind: p.kind, yards: r2(p.yards),
    players: rp.players.map(a => ({ side: a.team, group: GROUP[a.pos] ?? 'OTHER' })),
    dt: 0.1, xy, ball_y: r2(Y(ball[1])), events, carrier,
    target: throwEv?.b ?? null,
    blocks: [...pairs.values()],
    cell: { concept: p.plan?.concept ?? null, coverage: p.plan?.coverage ?? null },
  };
}

async function main() {
  const seed = Number(arg('--seed', '101'));
  const games = Number(arg('--games', '8'));
  const out = arg('--out', 'out/mechanics/sim-plays.jsonl.gz');
  const reviewOut = arg('--review-out', '');
  if (process.argv.includes('--review-out') && !reviewOut) throw new Error('--review-out requires a path');
  if (reviewOut && resolve(reviewOut) === resolve(out)) throw new Error('Review and tracking outputs must differ');
  const sourceBefore = sourceVersion();
  mkdirSync(dirname(out), { recursive: true });
  const gz = createGzip();
  const done = new Promise<void>(resolve => gz.pipe(createWriteStream(out)).on('finish', () => resolve()));
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const reviewGames: unknown[] = [], reviewPlays: unknown[] = [];
  const rosterSha256 = createHash('sha256').update(JSON.stringify([home, away])).digest('hex');
  let count = 0;
  for (let g = 0; g < games; g++) {
    const result = simulateGame(home, away, { seed: seed + g, record: true });
    if (reviewOut) reviewGames.push({ seed: seed + g, score: result.score,
      home: home.abbr, away: away.abbr, plays: result.log.length });
    for (const p of result.log) {
      const id = `S${seed + g}-P${p.index + 1}`;
      if (reviewOut && (p.kind === 'run' || p.kind === 'pass')) {
        const { replay, ...native } = p;
        const touchdown = replay?.events.find(e => e.type === 'touchdown');
        reviewPlays.push({ id, gameSeed: seed + g, ...native,
          events: replay?.events ?? [],
          touchdownTeam: touchdown?.a !== undefined ? replay!.players[touchdown.a]?.team ?? null : null });
      }
      const play = commonPlay(p, id);
      if (!play) continue;
      gz.write(JSON.stringify(play) + '\n');
      count++;
    }
    console.error(`game ${g + 1}/${games} (seed ${seed + g}): ${result.score.home}-${result.score.away}`);
  }
  gz.end();
  await done;
  const sourceAfter = sourceVersion();
  if (sourceAfter !== sourceBefore) throw new Error('Engine changed during game collection');
  if (reviewOut) {
    mkdirSync(dirname(reviewOut), { recursive: true });
    writeFileSync(reviewOut, JSON.stringify({ schema: 'native-game-outcome-review-v1', sourceBefore, sourceAfter,
      collectorSha256: createHash('sha256').update(readFileSync('scripts/mechanics/sim-export.ts')).digest('hex'),
      cohort: { seed, games, strength: .55, rosterSha256 },
      rosters: [home, away].map(t => ({ abbr: t.abbr, players: t.roster.map(p => ({ id: p.id,
        position: p.position, ratings: p.ratings, measurables: p.measurables })) })),
      games: reviewGames, plays: reviewPlays,
      limitations: 'Native generated rosters and adaptive calls. Events/pressure flags describe association, not causal attribution. Includes nullified plays explicitly. Distance-based pressure is measured separately from the unchanged common plays by metrics.py. No additional player observation, decision or RNG call.' }));
  }
  console.error(`${count} scrimmage plays -> ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
