/**
 * Restage every designated run of a game on the same snap state with and
 * without SEAL_HOLD, and report blocker-carried defenders plus the controls.
 *
 *   SEAL_HOLD=0 node --import tsx scripts/diag/seal-hold-restage.ts capture 10 out/seal-hold
 *   node --import tsx scripts/diag/seal-hold-restage.ts replay 10 out/seal-hold
 *
 * `capture` plays the ordinary game with the switch off, saving each run's
 * constructor and its off-arm result; `replay` restores the same
 * constructors in a process with the switch on (flags are read at load).
 *
 * Per run rep (blocker, defender) it records:
 * - carried: blocker and defender both moved 4+ yd the same way laterally
 *   (an edge: toward his outside; "away" when the runner finished 3+ yd
 *   inside him);
 * - reach: on a stretch rep where the blocker reached the defender's play
 *   side at any loaded moment, whether he is still play side of him at the end;
 * - wide: an edge whose runner finished 1+ yd outside him (the end widening
 *   for contain, a drive block that should still run him out), with his
 *   outward travel.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

interface Rep { b: string; d: string; edge: boolean; side: number; toPlay: number; by0: number; dy0: number; by1: number; dy1: number;
  playSide: boolean; endPlaySide: boolean; runnerIn?: number }

function watch(sim: PlaySim) {
  const reps = new Map<object, Rep>(), tick = sim.tick.bind(sim);
  const run = sim.offCall.run;
  const stretch = run?.scheme === 'outsideZone' || run?.scheme === 'wideZone';
  const toPlay = !run ? 0 : run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) {
      if (e.type !== 'run') continue;
      const d = e.defender, b = e.blocker;
      let r = reps.get(e);
      if (!r) reps.set(e, r = { b: b.slot, d: d.slot, edge: d.runFit?.kind === 'edge', side: d.runFit?.side ?? 0, toPlay,
        by0: b.pos.y, dy0: d.pos.y, by1: b.pos.y, dy1: d.pos.y, playSide: false, endPlaySide: false });
      r.by1 = b.pos.y; r.dy1 = d.pos.y;
      const loaded = !!(e.hands?.normalForce || e.hands?.tangentForce);
      r.endPlaySide = stretch && (b.pos.y - d.pos.y) * toPlay > 0;
      if (loaded && r.endPlaySide) r.playSide = true;
      const c = sim.carrier;
      if (c && r.side) r.runnerIn = -(c.pos.y - d.pos.y) * r.side;
    }
  };
  return () => [...reps.values()].map(r => {
    const dMove = r.dy1 - r.dy0, bMove = r.by1 - r.by0;
    const carried = Math.sign(dMove) === Math.sign(bMove) && Math.abs(dMove) > 4 && Math.abs(bMove) > 4;
    const out = r.side ? dMove * r.side : 0;
    return { b: r.b, d: r.d, carried, edgeAway: r.edge && carried && out > 0 && (r.runnerIn ?? 0) > 3,
      reach: r.playSide ? r.endPlaySide : null, wide: r.edge && (r.runnerIn ?? 0) < -1 ? +out.toFixed(2) : null };
  });
}

function play(setup: PlaySetup) {
  const sim = new PlaySim(setup), reps = watch(sim), r = sim.run();
  return { yards: +r.yards.toFixed(2), reps: reps() };
}

const [mode, seedArg, dir = 'out/seal-hold'] = process.argv.slice(2);
const seed = Number(seedArg);
if ((mode !== 'capture' && mode !== 'replay') || !Number.isSafeInteger(seed)) {
  console.error('usage: capture|replay <seed> [dir]');
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const file = `${dir}/seed${seed}.json`;
if (mode === 'capture') {
  if (process.env.SEAL_HOLD !== '0') throw new Error('capture runs the old arm: set SEAL_HOLD=0');
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: unknown[] = [];
  let n = 0, setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: {
    playSetup: s => { setup = s; },
    playResult: (sim, kind) => {
      n++;
      if (kind !== 'scrimmage' || sim.isPass || !setup) return undefined;
      const bytes = captureSetup(setup);
      plays.push({ play: n, call: sim.offCall.label, defense: sim.defCall.label, setup: bytes.toString('base64'), off: play(restoreSetup(bytes)) });
      return undefined;
    },
  } });
  writeFileSync(file, JSON.stringify(plays));
  console.log(`captured ${plays.length} runs to ${file}`);
} else {
  if (process.env.SEAL_HOLD === '0') throw new Error('replay runs the new arm: unset SEAL_HOLD');
  const plays = JSON.parse(readFileSync(file, 'utf8')) as { play: number; call: string; defense: string; setup: string; off: ReturnType<typeof play> }[];
  const rows = plays.map(p => ({ play: p.play, call: p.call, defense: p.defense, off: p.off, on: play(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/seed${seed}-paired.json`, JSON.stringify(rows));
  const reps = (arm: 'off' | 'on') => rows.flatMap(r => r[arm].reps);
  const arm = (a: 'off' | 'on') => {
    const all = reps(a), reach = all.filter(x => x.reach !== null), wide = all.filter(x => x.wide !== null);
    return { carried: all.filter(x => x.carried).length, edgeAway: all.filter(x => x.edgeAway).length,
      reachWon: `${reach.filter(x => x.reach).length}/${reach.length}`,
      wideOut: wide.length ? +(wide.reduce((s, x) => s + x.wide!, 0) / wide.length).toFixed(2) : null, wideN: wide.length,
      meanYards: +(rows.reduce((s, r) => s + r[a].yards, 0) / rows.length).toFixed(2) };
  };
  console.log(JSON.stringify({ seed, runs: rows.length, changed: rows.filter(r => r.on.yards !== r.off.yards).length, off: arm('off'), on: arm('on') }));
}
