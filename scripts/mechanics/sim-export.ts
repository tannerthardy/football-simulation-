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
import { generateTeam, leagueSample } from '../../src/league/team.js';
import { sourceVersion } from '../source-version.js';

const WIDTH = 160 / 3;
const GROUP: Record<string, string> = {
  QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL',
  EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB',
};
const CARRIER_CONTACT = new Set(['carrier_contact', 'hit', 'tackle_wrap', 'missed_tackle', 'broken_tackle']);
const END = new Set(['tackle', 'out_of_bounds', 'touchdown', 'sack', 'incomplete', 'interception', 'safety', 'slide']);
// 'miss': the ball reached a receiver who could not catch it (catching.ts) -- the arrival, as NFL pass_arrived is.
// 'secure': CATCH_SECURE's securing window opens when the ball reaches his hands; its 'catch' comes up to 0.45 s later.
const ARRIVE = new Set(['secure', 'catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss']);
const LABEL_BALL = ARRIVE;
// The sim's own ball-security calls. They happen with or without a throw (a strip-sack has none), so they are
// read from the whole play, not from the throw onward.
const SECURITY = new Set(['fumble', 'recovery', 'interception']);

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
  // bxy: the ball's (x, y) on the same grid and frame (nfl_bdb2025_ball.py writes the NFL's to a side file).
  const bxy: number[][] = [];
  // o (opt-in, EXPORT_FACING=1, so the default export is unchanged): each body's facing in degrees in the common
  // frame, atan2 convention as the NFL operators read 'o' (0 = +x downfield); the earlier recorded frame, no blend.
  const facingOn = process.env.EXPORT_FACING === '1';
  const o: number[][] = [];
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
    if (facingOn) {
      const fr = w < 0.5 ? a : b, orow: number[] = [];
      for (let i = 0; i < n; i++) {
        const deg = fr.agents[i * 3 + 2] * 180 / Math.PI + (dir > 0 ? 0 : 180);
        orow.push(r2(((deg + 180) % 360 + 360) % 360 - 180));
      }
      o.push(orow);
    }
    bxy.push([r2(X(a.ball[0] + w * (b.ball[0] - a.ball[0]))), r2(Y(a.ball[1] + w * (b.ball[1] - a.ball[1])))]);
  }
  const ev = rp.events;
  const firstOf = (pred: (e: (typeof ev)[number]) => boolean) => ev.find(pred)?.t;
  const handoff = ev.find(e => e.type === 'handoff' || e.type === 'pitch_catch');
  const carrier = handoff ? (handoff.type === 'handoff' ? handoff.b : handoff.a) ?? null : null;
  // A throwaway is a forward pass (the NFL tags pass_forward on it too); labels.throwaway keeps the sim's own call.
  const throwEv = ev.find(e => e.type === 'throw' || e.type === 'throwaway');
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
  const holder = receiver ?? carrier ?? null;
  const holderT = caught ? caught.t : handoff?.t ?? 0;
  const pairs = new Map<string, [number, number]>();
  for (const e of ev) {
    if (e.type === 'block_contact' && e.a !== undefined && e.b !== undefined) pairs.set(`${e.a}:${e.b}`, [e.a, e.b]);
  }
  events.end = r2(firstOf(e => END.has(e.type)) ?? lastT);
  // Fumbles and changes of possession, in play order. The ball starts with the offense; a recovery or interception
  // by the other side is a change. `events.end` still marks the first ending call (a sack, say): operators that
  // follow a carrier should stop there, or at `possession_change`, instead of following him through a return.
  const ballSecurity: { t: number; type: string; a: number | null; side: 'O' | 'D' | null }[] = [];
  const possessionChanges: { t: number; to: 'O' | 'D'; by: number }[] = [];
  let holderSide: 'O' | 'D' = 'O';
  for (const e of ev) {
    if (!SECURITY.has(e.type)) continue;
    const a = e.a ?? null, side = a === null ? null : rp.players[a]?.team ?? null;
    ballSecurity.push({ t: r2(e.t), type: e.type, a, side });
    if (e.type === 'fumble') events.fumble ??= r2(e.t);
    if (e.type !== 'fumble' && a !== null && side !== null && side !== holderSide) {
      holderSide = side;
      possessionChanges.push({ t: r2(e.t), to: side, by: a });
      events.possession_change ??= r2(e.t);
    }
  }
  const ball = rp.frames[0].ball;
  return {
    id, source: 'sim', kind: p.kind, yards: r2(p.yards),
    // slot: the play's job (FS, SS, NB, ...), not the roster position; operators choose deep defenders by it.
    players: rp.players.map((a, i) => ({ side: a.team, group: GROUP[a.pos] ?? 'OTHER', slot: a.slot, route: p.routes?.[i] ?? null })),
    dt: 0.1, xy, bxy, ...(facingOn ? { o } : {}), ball_y: r2(Y(ball[1])), events, carrier,
    target: throwEv?.b ?? null,
    receiver,
    blocks: [...pairs.values()],
    // The sim's own calls, for cross-checking geometric operators (as nfl_bdb2025_ball.py does with the NFL's labels).
    labels: { throwaway: throwEv?.type === 'throwaway', grounding: ev.some(e => e.type === 'intentional_grounding'),
      interception: ev.some(e => e.type === 'interception'),
      ballSecurity, possessionChanges,
      ballEvents: throwEv ? ev.filter(e => e.t >= throwEv.t && LABEL_BALL.has(e.type)).map(e => e.type) : [],
      // After the ball carrier gets the ball (catch, else handoff/pitch): the sim's own contact calls on him (defender
      // index first), so an operator can name how the play ended after first contact (tackled, broke, missed, second
      // defender). Sim-only; the NFL has no such calls.
      carrierContacts: holder === null ? [] : ev.filter(e => e.t >= holderT && CARRIER_CONTACT.has(e.type)
        && (e.a === holder || e.b === holder)).map(e => ({ t: r2(e.t), type: e.type, d: e.a === holder ? e.b ?? null : e.a ?? null })) },
    cell: { concept: p.plan?.concept ?? null, coverage: p.plan?.coverage ?? null, front: p.plan?.front ?? null,
      defPersonnel: p.plan?.defPersonnel ?? null, formation: p.plan?.formation ?? null, down: p.down, toGo: p.distance },
  };
}

async function main() {
  const seed = Number(arg('--seed', '101'));
  const games = Number(arg('--games', '8'));
  const handContact = process.argv.includes('--common-patch') ? 'patch' : 'center';
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
    // Per-game league sample: alignment habits and coordinators drawn afresh (rosters unchanged).
    const result = simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact });
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
      cohort: { seed, games, strength: .55, rosterSha256, handContact },
      rosters: [home, away].map(t => ({ abbr: t.abbr, players: t.roster.map(p => ({ id: p.id,
        position: p.position, ratings: p.ratings, measurables: p.measurables })) })),
      games: reviewGames, plays: reviewPlays,
      limitations: 'Native generated rosters and adaptive calls. Events/pressure flags describe association, not causal attribution. Includes nullified plays explicitly. Distance-based pressure is measured separately from the unchanged common plays by metrics.py. No additional player observation, decision or RNG call.' }));
  }
  console.error(`${count} scrimmage plays -> ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
