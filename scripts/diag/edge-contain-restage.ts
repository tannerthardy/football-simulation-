/**
 * Restage every designated run of a game on the same snap state with and
 * without EDGE_CONTAIN, and report blocked-edge lateral drift.
 *
 *   EDGE_CONTAIN=0 node --import tsx scripts/diag/edge-contain-restage.ts capture 7 out/edge-contain
 *   node --import tsx scripts/diag/edge-contain-restage.ts replay 7 out/edge-contain
 *
 * `capture` plays the ordinary game with the switch off (develop's old
 * behavior), saving each run's constructor and its off-arm result. `replay`
 * restores the same constructors in a process with the switch on. The flag is
 * read once at load, so each arm runs in its own process.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

interface Rep { b: string; d: string; side: number; t0: number; t1: number; by0: number; dy0: number; by1: number; dy1: number; runnerIn?: number }

/** Blocked edge episodes: blocker and edge lateral travel, and where the runner ended up. */
function watch(sim: PlaySim) {
  const reps = new Map<object, Rep>(), tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) {
      const d = e.defender, b = e.blocker;
      if (e.type !== 'run' || d.runFit?.kind !== 'edge') continue;
      let r = reps.get(e);
      if (!r) reps.set(e, r = { b: b.slot, d: d.slot, side: d.runFit.side, t0: sim.t, t1: sim.t, by0: b.pos.y, dy0: d.pos.y, by1: b.pos.y, dy1: d.pos.y });
      r.t1 = sim.t; r.by1 = b.pos.y; r.dy1 = d.pos.y;
      const c = sim.carrier;
      if (c) r.runnerIn = -(c.pos.y - d.pos.y) * r.side;
    }
  };
  return () => [...reps.values()].map(r => {
    const out = (r.dy1 - r.dy0) * r.side, blockerOut = (r.by1 - r.by0) * r.side;
    // Both carried 4+ yd toward the edge's outside together; "away" when the
    // runner finished 3+ yd inside the edge.
    const escort = out > 4 && blockerOut > 4;
    return { b: r.b, d: r.d, t0: r.t0, dur: +(r.t1 - r.t0).toFixed(2), out: +out.toFixed(2), blockerOut: +blockerOut.toFixed(2),
      escort, awayFromBall: escort && (r.runnerIn ?? 0) > 3 };
  });
}

function run(setup: PlaySetup) {
  const sim = new PlaySim(setup), reps = watch(sim), r = sim.run();
  return { yards: +r.yards.toFixed(2), outcome: r.outcome, reps: reps() };
}

const [mode, seedArg, dir = 'out/edge-contain'] = process.argv.slice(2);
const seed = Number(seedArg);
if ((mode !== 'capture' && mode !== 'replay') || !Number.isSafeInteger(seed)) {
  console.error('usage: capture|replay <seed> [dir]');
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const file = `${dir}/seed${seed}.json`;
if (mode === 'capture') {
  if (process.env.EDGE_CONTAIN !== '0') throw new Error('capture runs the old arm: set EDGE_CONTAIN=0');
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: unknown[] = [];
  let n = 0, setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: {
    playSetup: s => { setup = s; },
    playResult: (sim, kind) => {
      n++;
      if (kind !== 'scrimmage' || sim.isPass || !setup) return undefined;
      const bytes = captureSetup(setup), off = run(restoreSetup(bytes));
      plays.push({ play: n, call: sim.offCall.label, defense: sim.defCall.label, setup: bytes.toString('base64'), off });
      return undefined;
    },
  } });
  writeFileSync(file, JSON.stringify(plays));
  console.log(`captured ${plays.length} runs to ${file}`);
} else {
  if (process.env.EDGE_CONTAIN === '0') throw new Error('replay runs the new arm: unset EDGE_CONTAIN');
  const plays = JSON.parse(readFileSync(file, 'utf8')) as { play: number; call: string; defense: string; setup: string; off: ReturnType<typeof run> }[];
  const rows = plays.map(p => ({ ...p, setup: undefined, on: run(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/seed${seed}-paired.json`, JSON.stringify(rows));
  const count = (arm: 'off' | 'on', key: 'escort' | 'awayFromBall') => rows.reduce((s, r) => s + r[arm].reps.filter(x => x[key]).length, 0);
  const mean = (arm: 'off' | 'on') => rows.reduce((s, r) => s + r[arm].yards, 0) / rows.length;
  console.log(JSON.stringify({ seed, runs: rows.length, changed: rows.filter(r => r.on.yards !== r.off.yards).length,
    escorts: [count('off', 'escort'), count('on', 'escort')], awayFromBall: [count('off', 'awayFromBall'), count('on', 'awayFromBall')],
    meanYards: [+mean('off').toFixed(2), +mean('on').toFixed(2)] }));
}
