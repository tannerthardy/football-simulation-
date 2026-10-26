/**
 * COV-7 matched plays: where the stalk squeeze fires in ordinary football,
 * and what it changes on the same snap state.
 *
 *   node --import tsx scripts/diag/cov7-squeeze-matched.ts games out/cov7-matched 7 8
 *   node --import tsx scripts/diag/cov7-squeeze-matched.ts grid out/cov7-matched
 *
 * `games` plays each seed's ordinary game with STALK_SQUEEZE=0 (the old arm
 * drives the game, so play numbering is the old film's), and replays every
 * scrimmage snap from its constructor in both arms. The switch is read per
 * call, so both arms run in this process.
 * `grid` runs the paired-play grid (scripts/diag/paired-plays.ts: ordinary
 * non-PA passes, every coverage) once per arm and counts activations, which
 * should be none: those calls carry no run look.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGES } from '../../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { ManCoverage } from '../../src/sim/behaviors/defense.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { Agent } from '../../src/sim/agent.js';
import { captureSetup, restoreSetup } from './saved-play.js';

// Count real entries into the squeeze and into the fit it hands off to.
interface Use { squeeze: Map<string, number>; fit: Set<string> }
const uses = new WeakMap<PlaySim, Use>();
const proto = ManCoverage.prototype as any;
const squeeze = proto.squeezeStalk, support = proto.blockingSupport;
const use = (sim: PlaySim) => { let u = uses.get(sim); if (!u) uses.set(sim, u = { squeeze: new Map(), fit: new Set() }); return u; };
proto.squeezeStalk = function (a: Agent, sim: PlaySim, ...rest: unknown[]) {
  const u = use(sim); u.squeeze.set(a.slot, (u.squeeze.get(a.slot) ?? 0) + 1);
  return squeeze.call(this, a, sim, ...rest);
};
proto.blockingSupport = function (a: Agent, sim: PlaySim, ...rest: unknown[]) {
  const u = use(sim); if (u.squeeze.has(a.slot)) u.fit.add(a.slot);
  return support.call(this, a, sim, ...rest);
};

function arm(setup: PlaySetup, on: boolean) {
  const previous = process.env.STALK_SQUEEZE;
  if (on) delete process.env.STALK_SQUEEZE; else process.env.STALK_SQUEEZE = '0';
  try {
    const sim = new PlaySim(setup), r = sim.run(), u = use(sim);
    return { outcome: r.outcome, yards: +r.yards.toFixed(2), completed: !!r.stats.completed,
      squeezers: Object.fromEntries(u.squeeze), fit: [...u.fit] };
  } finally {
    if (previous === undefined) delete process.env.STALK_SQUEEZE; else process.env.STALK_SQUEEZE = previous;
  }
}

function games(dir: string, seeds: number[]) {
  const all: any[] = [];
  for (const seed of seeds) {
    const rng = new Rng(seed);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
    let n = 0, setup: PlaySetup | null = null;
    process.env.STALK_SQUEEZE = '0';
    simulateGame(home, away, { seed, hooks: {
      playSetup: s => { setup = s; },
      playResult: (sim, kind) => {
        n++;
        if (kind !== 'scrimmage' || !setup) return undefined;
        const bytes = captureSetup(setup);
        const pa = sim.offCall.pass?.family === 'playaction';
        const kindLabel = sim.isPass ? pa ? 'pa' : 'pass' : 'run';
        all.push({ seed, play: n, kind: kindLabel, call: sim.offCall.label, defense: sim.defCall.label,
          off: arm(restoreSetup(bytes), false), on: arm(restoreSetup(bytes), true) });
        process.env.STALK_SQUEEZE = '0';
        return undefined;
      },
    } });
    delete process.env.STALK_SQUEEZE;
  }
  writeFileSync(`${dir}/games.json`, JSON.stringify(all));
  const by = (k: string) => all.filter(p => p.kind === k);
  const summary = Object.fromEntries(['run', 'pa', 'pass'].map(k => {
    const plays = by(k), fired = plays.filter(p => Object.keys(p.on.squeezers).length);
    const mean = (xs: any[], a: 'off' | 'on') => xs.length ? +(xs.reduce((s, p) => s + p[a].yards, 0) / xs.length).toFixed(2) : null;
    return [k, { plays: plays.length, fired: fired.length, toFit: fired.filter(p => p.on.fit.length).length,
      offArmFired: plays.filter(p => Object.keys(p.off.squeezers).length).length,
      changed: plays.filter(p => p.on.yards !== p.off.yards || p.on.outcome !== p.off.outcome).length,
      changedWithoutFiring: plays.filter(p => !Object.keys(p.on.squeezers).length
        && (p.on.yards !== p.off.yards || p.on.outcome !== p.off.outcome)).length,
      firedYards: { off: mean(fired, 'off'), on: mean(fired, 'on') },
      firedCompletions: { off: fired.filter(p => p.off.completed).length, on: fired.filter(p => p.on.completed).length },
      allYards: { off: mean(plays, 'off'), on: mean(plays, 'on') } }];
  }));
  writeFileSync(`${dir}/games-summary.json`, JSON.stringify({ seeds, summary }, null, 1));
  console.log(JSON.stringify({ seeds, summary }, null, 1));
}

function grid(dir: string) {
  const forms = ['gun_doubles_11', 'gun_trips_11'], concepts = PASS_CONCEPTS.filter(c => c.family !== 'playaction');
  const counts = { plays: 0, fired: { off: 0, on: 0 }, changed: 0 };
  for (const cov of COVERAGES) for (const roster of [7, 19, 31]) {
    const lr = new Rng(roster);
    const off = generateTeam(lr.fork('offense'), 'Offense', 'OFF', { strength: 0.55 }), def = generateTeam(lr.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
    for (const form of forms) for (const concept of concepts) for (const flip of [false, true]) {
      const formation = FORMATION_BY_ID[form];
      const setup: PlaySetup = { offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
        offCall: { formation, flip, kind: 'pass', pass: concept, label: '' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: cov, pressure: null, zoneStyle: 'match', label: '', checkPick: 0 },
        los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * roster + (flip ? 7 : 0) };
      const bytes = captureSetup(setup);
      let a, b;
      try { a = arm(restoreSetup(bytes), false); b = arm(restoreSetup(bytes), true); } catch { continue; }
      counts.plays++;
      if (Object.keys(a.squeezers).length) counts.fired.off++;
      if (Object.keys(b.squeezers).length) counts.fired.on++;
      if (a.yards !== b.yards || a.outcome !== b.outcome) counts.changed++;
    }
  }
  writeFileSync(`${dir}/grid.json`, JSON.stringify(counts));
  console.log(JSON.stringify(counts));
}

const [mode, dir = 'out/cov7-matched', ...rest] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
if (mode === 'games') games(dir, rest.length ? rest.map(Number) : [7, 8]);
else if (mode === 'grid') grid(dir);
else { console.error('usage: games <dir> [seeds...] | grid <dir>'); process.exit(1); }
