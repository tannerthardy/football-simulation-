/** Current tackle-window helper cost on unchanged, delayed-observation inputs.
 * node --expose-gc --import tsx scripts/diag/tackle-window-cost.ts [output.json]
 * Run after source freeze, without concurrent simulations or other heavy work.
 * This is not a before/after comparison or a full-game overhead estimate.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { World, type Intent } from '../../src/physics/world.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { previewTackleWindow } from '../../src/sim/tackle-window.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/tackle-timing-review/helper-cost.json';
if (process.argv.length > 3) throw new Error('Usage: tackle-window-cost.ts [output.json]');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scriptHash = () => createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const sourceBefore = sourceVersion(), scriptBefore = scriptHash();
const collectGarbage = (globalThis as unknown as { gc?: () => void }).gc;
const callsPerBlock = 1000, warmBlocks = 3, measuredBlocks = 7;
const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * q)];
const cases = [
  { id: 'near-crossing', x: .8, y: 1.1, vx: 4, vy: -7, requestX: 6, requestY: -.8, energy: 1, excluded: null },
  { id: 'near-crossing-mirror', x: .8, y: -1.1, vx: 4, vy: 7, requestX: 6, requestY: .8, energy: 1, excluded: null },
  { id: 'head-on', x: 1.4, y: 0, vx: -2, vy: 0, requestX: -1.5, requestY: 0, energy: 1, excluded: null },
  { id: 'fatigued-crossing', x: .8, y: 1.1, vx: 4, vy: -7, requestX: 6, requestY: -.8, energy: .38, excluded: null },
  { id: 'faster-carrier-escape', x: -1.4, y: 0, vx: 4, vy: 0, requestX: 6, requestY: 0, energy: 1, excluded: null },
  { id: 'excluded-missing-command', x: .8, y: 1.1, vx: 4, vy: -7, requestX: 6, requestY: -.8, energy: 1, excluded: 'missing' },
  { id: 'excluded-active-strike', x: .8, y: 1.1, vx: 4, vy: -7, requestX: 6, requestY: -.8, energy: 1, excluded: 'strike' },
] as const;

/** Freeze only the pure data passed to the helper, not the simulation itself. */
function freezeData<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  return value;
}

function make(input: typeof cases[number]) {
  const offense = generateTeam(new Rng(19), 'O', 'OFF');
  const defense = generateTeam(new Rng(20), 'D', 'DEF');
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19 });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 }; carrier.body.facing = 0;
  defender.body.pos = { x: 50.3 + input.x, y: CENTER_Y + input.y };
  defender.body.vel = { x: input.vx, y: input.vy };
  defender.body.facing = Math.atan2(input.vy, input.vx); defender.body.energy = input.energy;
  sim.t = 2; sim.world.time = 2.05;
  // Constant observed motion makes dead reckoning exact, while retaining the
  // actual delayed-buffer API and the post-physics clock offset. No target
  // state or behavior is consulted during the timed helper calls.
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents.map(a => a === carrier
    ? { pos: { x: 50 - (23 - k) * .05 * 6, y: CENTER_Y }, vel: { x: 6, y: 0 }, facing: 0 }
    : a));
  const delayed = sim.perception.perceive(carrier.idx, .15);
  const elapsed = sim.world.time - sim.t;
  const seen: Perceived = { ...delayed,
    pos: { x: delayed.pos.x + delayed.vel.x * elapsed, y: delayed.pos.y + delayed.vel.y * elapsed },
    vel: { ...delayed.vel } };
  const command: Intent | undefined = input.excluded === 'missing' ? undefined
    : { vel: { x: input.requestX, y: input.requestY }, cutSkill: 1, posture: .6 };
  if (input.excluded === 'strike') defender.body.support!.strike = { x: .2, y: -.1 };
  const body = carrier.profile.radius + defender.profile.radius;
  const arms = body + defender.profile.reach;
  freezeData(defender.body); freezeData(seen); freezeData(command);
  return { sim, carrier, defender, seen, command, body, arms, now: sim.world.time,
    rosterSha256: hash([offense, defense]) };
}

function snapshot(f: ReturnType<typeof make>) {
  return { bodies: hash(f.sim.agents.map(a => a.body)), perception: hash(f.sim.perception),
    rng: hash(f.sim.rng), minds: hash(f.sim.agents.map(a => a.mind)),
    observedInput: hash({ seen: f.seen, command: f.command, body: f.body, arms: f.arms, now: f.now }) };
}

const call = (f: ReturnType<typeof make>) => previewTackleWindow(f.defender, f.seen, f.command, f.body, f.arms, f.now);
const sourceStep = World.prototype.step, sourceRandom = Rng.prototype.nextU32;
function observedCall(f: ReturnType<typeof make>) {
  let oneBodySteps = 0, otherWorldSteps = 0, randomDraws = 0;
  World.prototype.step = function (intents, dt) {
    if (this.bodies.length === 1) oneBodySteps++; else otherWorldSteps++;
    return sourceStep.call(this, intents, dt);
  };
  Rng.prototype.nextU32 = function () { randomDraws++; return sourceRandom.call(this); };
  try { return { result: call(f), oneBodySteps, otherWorldSteps, randomDraws }; }
  finally { World.prototype.step = sourceStep; Rng.prototype.nextU32 = sourceRandom; }
}

const fixtures = cases.map(input => {
  const f = make(input), before = snapshot(f);
  const first = call(f); // Exclude scratch construction from measured blocks.
  const observed = observedCall(f), plain = call(f), after = snapshot(f);
  const checks = { bodiesUnchanged: before.bodies === after.bodies,
    perceptionUnchanged: before.perception === after.perception,
    rngUnchanged: before.rng === after.rng && observed.randomDraws === 0,
    mindsUnchanged: before.minds === after.minds,
    observedInputUnchanged: before.observedInput === after.observedInput,
    observerResultMatches: hash(observed.result) === hash(plain), repeatResultMatches: hash(first) === hash(plain),
    onlyScratchTicks: observed.otherWorldSteps === 0,
    expectedPreviewSteps: observed.oneBodySteps === (input.excluded ? 0 : 6),
    expectedExclusion: (plain === null) === (input.excluded !== null) };
  if (Object.values(checks).some(ok => !ok)) throw new Error(`Mutation/observer check failed: ${input.id}: ${JSON.stringify(checks)}`);
  return { input, f, inputState: before, result: plain, checks, previewStepsPerCall: observed.oneBodySteps };
});

const rows = fixtures.map(({ input, f, inputState, result, checks, previewStepsPerCall }) => {
  const blocks: Array<{ cpuMs: number; wallMs: number }> = [];
  let checksum = 0;
  for (let block = 0; block < warmBlocks + measuredBlocks; block++) {
    collectGarbage?.();
    const cpuStart = process.cpuUsage(), wallStart = performance.now();
    for (let k = 0; k < callsPerBlock; k++) {
      const window = call(f);
      checksum += window ? window.currentQuality * .31 + window.futureQuality * .17 + window.closest + window.closestAt : 1;
    }
    const cpuElapsed = process.cpuUsage(cpuStart);
    const measurement = { cpuMs: (cpuElapsed.user + cpuElapsed.system) / 1000, wallMs: performance.now() - wallStart };
    if (block >= warmBlocks) blocks.push(measurement);
  }
  if (hash(snapshot(f)) !== hash(inputState)) throw new Error(`Timed calls mutated input state: ${input.id}`);
  return { input, rosterSha256: f.rosterSha256, inputState,
    profiles: { carrier: f.carrier.profile, defender: f.defender.profile },
    defenderBody: f.defender.body, observation: f.seen, command: f.command ?? null,
    body: f.body, arms: f.arms, now: f.now, result, checks, previewStepsPerCall,
    blocks, medianCpuMsPerCall: quantile(blocks.map(b => b.cpuMs / callsPerBlock), .5),
    medianWallMsPerCall: quantile(blocks.map(b => b.wallMs / callsPerBlock), .5),
    p95WallMsPerCall: quantile(blocks.map(b => b.wallMs / callsPerBlock), .95), checksum };
});

const sourceAfter = sourceVersion(), scriptAfter = scriptHash();
if (sourceAfter !== sourceBefore || scriptAfter !== scriptBefore) throw new Error('Source/script changed during measurement');
if (!rows.every(r => Number.isFinite(r.checksum) && Number.isFinite(r.medianCpuMsPerCall))) throw new Error('Nonfinite result');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceSha256: sourceBefore, scriptSha256: scriptBefore,
  inputSha256: hash(cases), cohortSha256: hash(rows.map(r => ({ input: r.input, rosterSha256: r.rosterSha256,
    profiles: r.profiles, inputState: r.inputState }))), runtime: process.version,
  runtimeDetails: { execPath: process.execPath, versions: process.versions, platform: process.platform,
    arch: process.arch, logicalCpus: cpus().length, cpuModel: cpus()[0]?.model ?? null },
  note: 'Current-helper-only warmed calls on frozen body/command and delayed observed motion. Isolated helper cost, not a legacy analytical comparison, a tackle-success rate, or full-game overhead. Real players do not move. Counts and mutation/RNG checks run outside timing; measured blocks have no observer monkey patches.',
  warmBlocksExcluded: warmBlocks, measuredBlocks, callsPerBlock, collectGarbageBeforeBlock: !!collectGarbage,
  command: 'node --expose-gc --import tsx scripts/diag/tackle-window-cost.ts OUTPUT.json', rows }, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: sourceBefore, scriptSha256: scriptBefore,
  rows: rows.map(r => ({ id: r.input.id, cpuMsPerCall: r.medianCpuMsPerCall,
    wallMsPerCall: r.medianWallMsPerCall, previewStepsPerCall: r.previewStepsPerCall })) }));
