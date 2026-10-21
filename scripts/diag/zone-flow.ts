/** Paired zone/contact investigation, with ordinary non-zone controls.
 * node --import tsx scripts/diag/zone-flow.ts [out/zone-flow/summary.json]
 * Writes a small summary and a gzipped command/impulse trace. No controller,
 * perception or RNG instrumentation changes. Native ends are respected.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { effectiveVmax } from '../../src/physics/kinematics.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { playSideSign, RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/zone-flow/summary.json';
if (process.argv.length > 3) throw new Error('Usage: zone-flow.ts [output.json]');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const runs = ['oz_strong', 'wz_strong', 'iz_strong', 'power', 'counter'];
const rosterSeeds = [[31, 32], [41, 42]], fronts = ['over', 'under'];
const seed = 3, times = [.25, .5, 1, 1.5, 2];
const ol = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const dl = new Set(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT']);
const group = (slot: string) => ol.has(slot) ? 'OL' : dl.has(slot) ? 'DL' : slot === 'RB' ? 'RB' : null;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const rosters = rosterSeeds.map(([o, d]) => ({
  offense: generateTeam(new Rng(o), 'O', `O${o}`, { strength: .55 }),
  defense: generateTeam(new Rng(d), 'D', `D${d}`, { strength: .55 }),
}));
function make(roster: number, run: string, front: string, flip: boolean, handContact: 'center' | 'patch') {
  return new PlaySim({
    offense: pickOffense(rosters[roster].offense, '11'), defense: pickDefense(rosters[roster].defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed, handContact,
  });
}
function signature(sim: PlaySim) {
  return hash({ t: sim.t, phase: sim.phase, events: sim.events, bodies: sim.agents.map(a => a.body),
    rngNext: sim.rng.nextU32() });
}
function collect(roster: number, run: string, front: string, flip: boolean, handContact: 'center' | 'patch') {
  const sim = make(roster, run, front, flip, handContact), side = playSideSign(sim, RUN_BY_ID[run]);
  const initial = sim.agents.map(a => ({ ...a.pos }));
  const inputsHash = hash({ bodies: sim.agents.map(a => a.body), call: sim.offCall, defCall: sim.defCall });
  const samples: Array<{ t: number; agents: Array<{
    slot: string; group: string | null; primary: boolean; zone: string | null; dy: number;
    requestY: number; achievedY: number; speedClamped: boolean; groundAy: number; internalAy: number;
    state: string | undefined; spin: number; facing: number; armImpulse: number;
  }> }> = [];
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    const commands = sim.agents.map(a => {
      const command = intents[a.idx];
      assert(command, 'Missing native movement intent');
      return command;
    });
    const before = sim.agents.map(a => ({ vy: a.vel.y,
      primary: a.engagement?.blocker === a,
      zone: a.behavior instanceof RunBlocker ? a.behavior.zoneRead?.phase ?? null : null,
      cap: effectiveVmax(a.body, Math.atan2(commands[a.idx].vel.y, commands[a.idx].vel.x), commands[a.idx].effort ?? 1),
    }));
    const report = step(intents, dt);
    assert(Math.abs(report.work.residual) < 1e-6, 'Unexplained kinetic work');
    const t = Number((sim.t + dt).toFixed(6));
    samples.push({ t, agents: sim.agents.filter(a => group(a.slot)).map(a => ({
      slot: a.slot, group: group(a.slot), primary: before[a.idx].primary, zone: before[a.idx].zone,
      dy: (a.pos.y - initial[a.idx].y) * side,
      requestY: commands[a.idx].vel.y * side, achievedY: a.vel.y * side,
      speedClamped: Math.hypot(commands[a.idx].vel.x, commands[a.idx].vel.y) > before[a.idx].cap + 1e-6,
      groundAy: report.groundImpulse[a.idx].y / a.profile.massKg / dt * side,
      internalAy: ((a.vel.y - before[a.idx].vy) / dt - report.groundImpulse[a.idx].y / a.profile.massKg / dt) * side,
      state: a.body.support?.state, spin: a.body.spin ?? 0, facing: a.facing, armImpulse: report.armImpulse[a.idx],
    })) });
    return report;
  };
  while (sim.phase === 'live' && sim.t < 2.01) sim.tick();
  const endSignature = signature(sim);
  // The observer must leave the actual execution and next random draw intact.
  if (roster === 0 && run === 'oz_strong' && front === 'over' && !flip) {
    const control = make(roster, run, front, flip, handContact);
    while (control.phase === 'live' && control.t < 2.01) control.tick();
    assert.equal(signature(control), endSignature, 'Instrumentation changed execution');
  }
  return { rosterSeeds: rosterSeeds[roster], run, front, flip, handContact, side, seed,
    inputsHash, endSignature, endTime: sim.t, handoffAt: sim.handoffAt, samples };
}
const plays: ReturnType<typeof collect>[] = [];
for (let roster = 0; roster < rosters.length; roster++) for (const front of fronts)
for (const flip of [false, true]) for (const run of runs) {
  const base = collect(roster, run, front, flip, 'center'), patch = collect(roster, run, front, flip, 'patch');
  assert.equal(base.inputsHash, patch.inputsHash, 'Unmatched initial state or physical profiles');
  plays.push(base, patch);
}
const sourceAfter = sourceVersion();
assert.equal(sourceAfter, sourceBefore, 'Source changed during collection');
const summaries = runs.map(run => ({ run, modes: (['center', 'patch'] as const).map(handContact => {
  const selected = plays.filter(p => p.run === run && p.handContact === handContact);
  return { handContact, inputs: selected.length, handoffTimes: selected.map(p => p.handoffAt),
    displacement: times.map(t => {
      const rows = selected.flatMap(p => p.samples.filter(s => Math.abs(s.t - t) < 1e-8).flatMap(s => s.agents));
      return { t, survivingPlays: selected.filter(p => p.endTime >= t).length,
        groups: ['OL', 'DL', 'RB'].map(g => ({ group: g, n: rows.filter(a => a.group === g).length,
          medianYd: median(rows.filter(a => a.group === g).map(a => a.dy)) })) };
    }) };
}) }));
mkdirSync(dirname(output), { recursive: true });
const tracePath = `${output}.traces.json.gz`;
writeFileSync(tracePath, gzipSync(JSON.stringify({ sourceBefore, plays })));
writeFileSync(output, JSON.stringify({ sourceBefore, sourceAfter, node: process.version, startedAt,
  cohort: { rosterSeeds, fronts, flips: [false, true], runs, seed, timeLimit: 2.01, inputCount: plays.length },
  scope: 'Designed paired inputs, not native-game frequency estimates. Called-play-side displacement from actual snap position. DL means all four base43 line slots, not only engaged DL. Natural ends are never carried forward. Common patch is experimental, not production.',
  tracePath, summaries }, null, 2) + '\n');
console.log(`Collected ${plays.length} paired inputs -> ${output}`);
