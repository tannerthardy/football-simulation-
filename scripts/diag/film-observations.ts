/** Trace the owner's film reports without changing decisions or random draws.
 * node --import tsx scripts/diag/film-observations.ts out/film-trace.json
 * --reps file: replay the captured, fixed personnel/call/energy setups; these
 * deliberately exclude game scouting/audibles, so compare them only as pairs.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { Frame } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const wanted = new Set(['G1-P135', 'G3-P015', 'G5-P083', 'G5-P172', 'G6-P111']);
const sourceSha256 = sourceVersion();
const out = process.argv[2] ?? 'out/film-trace.json';
const repsFile = process.argv.indexOf('--reps');
type SavedSetup = Omit<PlaySetup, 'energy' | 'seed'> & { seed: number; energy: [string, number][] };

function trace(sim: PlaySim) {
  const rows: unknown[] = [];
  const setup: SavedSetup = {
    offense: Object.fromEntries(sim.offense.map(a => [a.slot, a.player])),
    defense: Object.fromEntries(sim.defense.map(a => [a.slot, a.player])),
    offCall: sim.offCall, defCall: sim.defCall, los: sim.los, ballY: sim.ballY,
    firstDownX: sim.firstDownX, seed: sim.rng.key, record: true, recordEvery: 1,
    energy: sim.agents.map(a => [a.player.id, a.body.energy]),
  };
  const agents = sim.agents.map(a => ({ slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`, jersey: a.player.jersey,
    profile: { ...a.profile }, snapDelay: a.mind.snapDelay, behavior: a.behavior.kind,
    plan: a.behavior instanceof RunBlocker ? { kind: a.behavior.plan.kind, drive: a.behavior.plan.drive,
      target: a.behavior.target?.slot, pullRole: a.behavior.plan.pullRole, pullPath: a.behavior.plan.pullPath?.map(p => ({ ...p })) } : undefined }));
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const t = sim.t;
    const before = sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing }));
    const prevEvents = sim.events.length;
    tick();
    rows.push({ t, carrier: sim.carrier?.slot, handoff: sim.events.slice(prevEvents).some(e => e.type === 'handoff')
      ? Math.hypot(before[sim.qb.idx].pos.x - before[sim.slot('RB')!.idx].pos.x,
        before[sim.qb.idx].pos.y - before[sim.slot('RB')!.idx].pos.y) : undefined,
      agents: sim.agents.map((a, i) => ({ ...before[i], after: { ...a.pos }, intent: sim.intents[i],
        accel: { x: (a.vel.x - before[i].vel.x) / sim.dt, y: (a.vel.y - before[i].vel.y) / sim.dt },
        state: a.body.support?.state, target: a.behavior instanceof RunBlocker ? a.behavior.target?.slot : undefined,
        engagement: a.engagement?.defender.slot, read: a.recog?.read,
        ground: sim.lastStep?.groundImpulse[i],
        grasp: sim.bond?.holds?.get(a) ? { capacity: sim.bond.holds.get(a)!.capacity,
          force: sim.bond.holds.get(a)!.force, hold: sim.bond.holds.get(a)!.hold,
          legs: sim.bond.holds.get(a)!.legs, grip: sim.bond.grip?.get(a) } : undefined })),
      events: sim.events.slice(prevEvents) });
  };
  const result = sim.run();
  return { setup, agents, rows, events: result.events, result: { outcome: result.outcome, yards: result.yards } };
}

const clips: Record<string, ReturnType<typeof trace>> = {};
if (repsFile >= 0) {
  const saved = JSON.parse(readFileSync(process.argv[repsFile + 1], 'utf8'));
  for (const [id, clip] of Object.entries(saved.clips) as [string, { setup: SavedSetup }][]) {
    const setup = clip.setup;
    clips[id] = trace(new PlaySim({ ...setup, energy: new Map(setup.energy) }));
  }
} else {
  const rng = new Rng(7);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  for (let game = 0; game < 6; game++) {
    const traces = new Map<Frame[], ReturnType<typeof trace>>();
    const result = simulateGame(home, away, { seed: 7 + game, record: true,
      hooks: { playResult(sim) {
        if (sim.offCall.kind !== 'run') return undefined;
        const traced = trace(sim);
        traces.set(sim.frames, traced);
        return sim.buildResult();
      } } });
    for (const play of result.log) {
      const id = `G${game + 1}-P${String(play.index + 1).padStart(3, '0')}`;
      if (wanted.has(id) && play.replay) {
        const traced = traces.get(play.replay.frames);
        if (!traced) throw new Error(`Missing run trace for ${id}`);
        clips[id] = traced;
      }
    }
    console.log(`Traced game ${game + 1}`);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceSha256, mode: repsFile >= 0 ? 'fixed isolated setups' : 'original film games', clips }, null, 2) + '\n');
console.log(`Wrote ${Object.keys(clips).length} clips to ${out}`);
