/**
 * Matched restage on run-only film: the same saved run snaps, replayed under
 * each arm with k dice shifts, so a change is judged play by play instead of
 * on whole games. Ids match the film room (`npm run replay -- <seed> --run-only`).
 *
 *   node --import tsx scripts/diag/run-restage.ts capture <seed> [--games 2]
 *   <ARM ENV> node --import tsx scripts/diag/run-restage.ts replay <arm> <seed>... [--shifts 4] [--trace]
 *   node --import tsx scripts/diag/run-restage.ts compare <baseArm> <arm> <seed>... [--shifts 4]
 *
 * capture: plays the run-only games (teams built as run-film-trace.ts builds
 * them) and saves every scrimmage run's setup bytes. Capture on the base
 * checkout: a game is a chain, so an engine that plays differently reaches
 * other snaps.
 * replay: shift 0 is the saved dice; shift k > 0 replaces the play's random
 * stream with a fork of it labeled k, identical in every arm. With --trace it
 * also writes run-film-trace.ts frames per shift for run_film_reference.py.
 * Settings are read once at load, so each arm runs in its own process.
 * Output goes to out/run/restage/.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { deserialize, serialize } from 'node:v8';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

const { values: v, positionals } = parseArgs({ allowPositionals: true, options: {
  games: { type: 'string', default: '2' }, shifts: { type: 'string', default: '4' }, trace: { type: 'boolean', default: false } } });
const [mode, ...rest] = positionals;
const dir = 'out/run/restage';
mkdirSync(dir, { recursive: true });
const r2 = (x: number) => Math.round(x * 100) / 100;
type Saved = { id: string; setup: Buffer };
type Row = { id: string; k: number; y: number; o: string; events: string };

/** Same compact frames as run-film-trace.ts, so run_film_reference.py reads both. */
function traced(sim: PlaySim) {
  const s = sim as unknown as { offCall: any; defCall: any; los: number; ballY: number; events: any[] };
  const plan = (a: Agent) => (a.behavior as unknown as { plan?: { kind?: string; pullRole?: string; target?: Agent | null; climbTo?: Agent | null } }).plan;
  const setup = {
    concept: s.offCall.run?.id, scheme: s.offCall.run?.scheme, formation: s.offCall.formation.id, flip: s.offCall.flip,
    front: s.defCall.front?.id, coverage: s.defCall.coverage?.id, pressure: s.defCall.pressure?.id ?? null, los: s.los, ballY: s.ballY,
    agents: sim.agents.map((a) => ({ i: a.idx, team: a.team, slot: a.slot, pos: a.player.position, job: a.behavior.kind,
      plan: plan(a)?.kind ?? null, role: plan(a)?.pullRole ?? null, tgt: plan(a)?.target?.slot ?? null, climb: plan(a)?.climbTo?.slot ?? null })),
  };
  const frames: unknown[] = [];
  const tick = sim.tick.bind(sim);
  let n = 0;
  sim.tick = () => {
    tick();
    if (n++ % 2) return;
    const c = sim.carrier;
    frames.push({ t: r2(sim.t), c: c ? c.idx : -1, ph: sim.phase,
      a: sim.agents.map((a) => {
        const e = a.engagement;
        const beh = a.behavior as unknown as { target?: Agent | null };
        let tg = -1;
        if (a.team === 'O') { try { tg = beh.target?.idx ?? -1; } catch { tg = -1; } }
        return [r2(a.body.pos.x), r2(a.body.pos.y), r2(a.body.vel.x), r2(a.body.vel.y), r2(a.body.facing),
          e ? (e.blocker === a || e.helpers.includes(a) ? e.defender.idx : e.blocker.idx) : -1, tg, a.isDown(sim.t) ? 1 : 0,
          a.team === 'O' ? (plan(a)?.kind ?? a.behavior.kind) : a.behavior.kind];
      }) });
  };
  return () => ({ setup, frames, events: s.events.map((e) => ({ t: r2(e.t), type: e.type, a: e.a ?? null, b: e.b ?? null, note: e.note ?? null })) });
}

if (mode === 'capture') {
  const seed = Number(rest[0]), games = Number(v.games);
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: Saved[] = [];
  for (let g = 0; g < games; g++) {
    simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: { playSetup(setup, context) {
      if (context.kind !== 'scrimmage' || setup.offCall.kind !== 'run') return;
      plays.push({ id: `G${g + 1}-P${String(context.index + 1).padStart(3, '0')}`, setup: captureSetup(setup) });
    } } });
  }
  writeFileSync(`${dir}/seed${seed}.bin`, serialize(plays));
  console.log(`seed ${seed}: captured ${plays.length} runs`);
} else if (mode === 'replay') {
  const [arm, ...seeds] = rest, shifts = Number(v.shifts);
  for (const seed of seeds) {
    const plays = deserialize(readFileSync(`${dir}/seed${seed}.bin`)) as Saved[];
    const rows: Row[] = [];
    for (let k = 0; k < shifts; k++) {
      const traces: unknown[] = [];
      for (const p of plays) {
        const setup = restoreSetup(Buffer.from(p.setup));
        if (k > 0) setup.seed = (typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed).fork(`restage-shift:${k}`);
        const sim = new PlaySim(setup);
        const get = v.trace ? traced(sim) : null;
        const r = sim.run();
        rows.push({ id: p.id, k, y: r2(r.yards), o: r.outcome as string,
          events: createHash('sha256').update(JSON.stringify(r.events)).digest('hex').slice(0, 16) });
        if (get) traces.push({ id: p.id, yards: r.yards, nullified: false, ...get() });
      }
      if (v.trace) writeFileSync(`${dir}/trace-${arm}-seed${seed}-k${k}.json`, JSON.stringify(traces));
    }
    writeFileSync(`${dir}/seed${seed}-${arm}.json`, JSON.stringify(rows));
    console.log(`${arm} seed ${seed}: ${plays.length} runs x ${shifts} shifts`);
  }
} else if (mode === 'compare') {
  const [base, arm, ...seeds] = rest, shifts = Number(v.shifts);
  const load = (a: string) => seeds.flatMap(s => (JSON.parse(readFileSync(`${dir}/seed${s}-${a}.json`, 'utf8')) as Row[])
    .filter(r => r.k < shifts).map(r => ({ ...r, id: `S${s}-${r.id}` })));
  const A = load(base), B = load(arm);
  const mean = (rows: Row[]) => r2(rows.reduce((s, r) => s + r.y, 0) / Math.max(1, rows.length));
  const tail = (rows: Row[], n: number) => r2(100 * rows.filter(r => r.y >= n).length / Math.max(1, rows.length));
  for (let k = 0; k < shifts; k++) {
    const a = A.filter(r => r.k === k), b = B.filter(r => r.k === k);
    const changed = a.filter((r, i) => r.y !== b[i].y || r.o !== b[i].o || r.events !== b[i].events).length;
    console.log(`shift ${k}: ${a.length} runs, ${changed} changed; yd/carry ${mean(a)} -> ${mean(b)}; 10+ ${tail(a, 10)}% -> ${tail(b, 10)}%`);
  }
  const changed = A.map((r, i) => ({ a: r, b: B[i] })).filter(d => d.a.y !== d.b.y || d.a.o !== d.b.o || d.a.events !== d.b.events);
  const moves = changed.map(d => d.b.y - d.a.y);
  console.log(`all: ${A.length} replays, ${changed.length} changed (${moves.filter(m => Math.abs(m) <= .5).length} within 0.5 yd, `
    + `${moves.filter(m => m > .5).length} up, ${moves.filter(m => m < -.5).length} down); yd/carry ${mean(A)} -> ${mean(B)}; 10+ ${tail(A, 10)}% -> ${tail(B, 10)}%`);
  for (const d of changed.sort((p, q) => Math.abs(q.b.y - q.a.y) - Math.abs(p.b.y - p.a.y)).slice(0, 15))
    console.log(`  ${d.a.id} k${d.a.k}: ${d.a.y} ${d.a.o} -> ${d.b.y} ${d.b.o}`);
} else {
  console.error('usage: capture <seed> [--games 2] | replay <arm> <seed>... [--shifts 4] [--trace] | compare <base> <arm> <seed>... [--shifts 4]');
  process.exit(1);
}
