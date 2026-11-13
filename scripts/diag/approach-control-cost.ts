/** Isolated matched chase-call cost, not a full-game performance estimate.
 * node --expose-gc --import tsx scripts/diag/approach-control-cost.ts [output.json]
 * Run unchanged against each source, sequentially without other heavy work.
 * World observation runs outside timed blocks and counts only scratch calls.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { World } from '../../src/physics/world.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/approach-control-review/controller-cost.json';
if (process.argv.length > 3) throw new Error('Usage: approach-control-cost.ts [output.json]');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scriptHash = () => createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const sourceBefore = sourceVersion(), scriptBefore = scriptHash();
const collectGarbage = (globalThis as unknown as { gc?: () => void }).gc;
const callsPerBlock = 1000, warmBlocks = 3, measuredBlocks = 7;
const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * q)];
const cases = [
  { id: 'ordinary-live-crossing', seed: 19, strength: null, x: 3, y: 6, vx: 6, vy: -6, carrierSpeed: 6 },
  { id: 'ordinary-live-crossing-mirror', seed: 19, strength: null, x: 3, y: -6, vx: 6, vy: 6, carrierSpeed: 6 },
  { id: 'official-crossing', seed: 7, strength: .55, x: 5, y: 6, vx: 0, vy: -7, carrierSpeed: 6 },
  { id: 'near-strike', seed: 19, strength: null, x: 0, y: 1.4, vx: 7, vy: 0, carrierSpeed: 6 },
  { id: 'head-on', seed: 19, strength: null, x: 8, y: 1, vx: -3, vy: 0, carrierSpeed: 6 },
  { id: 'open-far', seed: 19, strength: null, x: 20, y: 15, vx: 0, vy: -4, carrierSpeed: 6 },
  { id: 'faster-carrier-escape', seed: 19, strength: null, x: -3, y: 1, vx: 4, vy: 0, carrierSpeed: 8 },
  { id: 'moving-away-redirect', seed: 7, strength: .55, x: 5, y: 6, vx: 6, vy: 6, carrierSpeed: 6 },
] as const;

function make(input: typeof cases[number]) {
  const options = input.strength === null ? {} : { strength: input.strength };
  const offense = generateTeam(new Rng(input.seed), 'O', 'OFF', options);
  const defense = generateTeam(new Rng(input.seed + 1), 'D', 'DEF', options);
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: input.seed });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: input.carrierSpeed, y: 0 }; carrier.body.facing = 0;
  defender.body.pos = { x: 50 + input.x, y: CENTER_Y + input.y };
  defender.body.vel = { x: input.vx, y: input.vy }; defender.body.facing = Math.atan2(input.vy, input.vx);
  sim.ball = { kind: 'held', carrier }; sim.catchAt = 0;
  // Ordinary two-body initialization supplies the same complete support state.
  const world = new World([carrier.body, defender.body], { substeps: 12 });
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, carrier, defender, world, rosterSha256: hash([offense, defense]) };
}

function snapshot(f: ReturnType<typeof make>) {
  return { bodies: hash(f.sim.agents.map(a => a.body)), perception: hash(f.sim.perception),
    rng: hash(f.sim.rng), minds: hash(f.sim.agents.map(a => a.mind)) };
}

const sourceStep = World.prototype.step, sourceRandom = Rng.prototype.nextU32;
const counters = { observing: false, oneBodySteps: 0, physicalWorldSteps: 0, otherWorldSteps: 0, randomDraws: 0,
  candidateRequestHashes: [] as string[] };
function observedCall(f: ReturnType<typeof make>) {
  counters.oneBodySteps = counters.physicalWorldSteps = counters.otherWorldSteps = counters.randomDraws = 0;
  counters.candidateRequestHashes = [];
  counters.observing = true;
  World.prototype.step = function (intents, dt) {
    if (counters.observing) {
      if (this.bodies.length === 1) {
        if (counters.oneBodySteps % 12 === 0) counters.candidateRequestHashes.push(hash(intents[0]));
        counters.oneBodySteps++;
      }
      else if (this.bodies.length === 22) counters.physicalWorldSteps++;
      else counters.otherWorldSteps++;
    }
    return sourceStep.call(this, intents, dt);
  };
  Rng.prototype.nextU32 = function () {
    if (counters.observing) counters.randomDraws++;
    return sourceRandom.call(this);
  };
  try {
    const command = chase(f.sim, f.defender, f.carrier);
    const index = counters.candidateRequestHashes.indexOf(hash(command));
    return { command, oneBodySteps: counters.oneBodySteps, physicalWorldSteps: counters.physicalWorldSteps,
      otherWorldSteps: counters.otherWorldSteps, randomDraws: counters.randomDraws,
      candidateRequestHashes: [...counters.candidateRequestHashes],
      selectedPreviewCandidateIndex: index < 0 ? null : index };
  } finally {
    counters.observing = false; World.prototype.step = sourceStep; Rng.prototype.nextU32 = sourceRandom;
  }
}

const fixtures = cases.map(input => {
  const f = make(input);
  const firstCommand = chase(f.sim, f.defender, f.carrier); // Exclude named bias initialization and cache construction.
  const inputState = snapshot(f), observed = observedCall(f), afterObserved = snapshot(f);
  const plainCommand = chase(f.sim, f.defender, f.carrier), afterPlain = snapshot(f);
  const checks = { bodiesUnchanged: inputState.bodies === afterObserved.bodies && inputState.bodies === afterPlain.bodies,
    perceptionUnchanged: inputState.perception === afterObserved.perception && inputState.perception === afterPlain.perception,
    rngUnchanged: inputState.rng === afterObserved.rng && inputState.rng === afterPlain.rng && observed.randomDraws === 0,
    mindsUnchanged: inputState.minds === afterObserved.minds && inputState.minds === afterPlain.minds,
    observerCommandMatches: hash(observed.command) === hash(plainCommand),
    repeatCommandMatches: hash(firstCommand) === hash(plainCommand),
    noPhysicalWorldTicks: observed.physicalWorldSteps === 0 && observed.otherWorldSteps === 0 };
  if (Object.values(checks).some(ok => !ok)) throw new Error(`Mutation/observer check failed: ${input.id}: ${JSON.stringify(checks)}`);
  return { input, f, inputState, command: plainCommand, checks,
    previewStepsPerCall: observed.oneBodySteps, previewsActivatedPerCall: observed.oneBodySteps > 0 ? 1 : 0,
    inferredCandidatesPerCall: observed.oneBodySteps / 12,
    selectedPreviewCandidateIndex: observed.selectedPreviewCandidateIndex,
    candidateRequestHashes: observed.candidateRequestHashes };
});

const rows = fixtures.map(({ input, f, inputState, command, checks, previewStepsPerCall, previewsActivatedPerCall,
  inferredCandidatesPerCall, selectedPreviewCandidateIndex, candidateRequestHashes }) => {
  const blocks: Array<{ cpuMs: number; wallMs: number }> = [];
  let checksum = 0;
  for (let block = 0; block < warmBlocks + measuredBlocks; block++) {
    collectGarbage?.();
    const cpuStart = process.cpuUsage(), wallStart = performance.now();
    for (let k = 0; k < callsPerBlock; k++) {
      const request = chase(f.sim, f.defender, f.carrier);
      checksum += request.vel.x * .31 + request.vel.y * .17 + (request.cutSkill ?? 1);
    }
    const cpuElapsed = process.cpuUsage(cpuStart);
    const measurement = { cpuMs: (cpuElapsed.user + cpuElapsed.system) / 1000, wallMs: performance.now() - wallStart };
    if (block >= warmBlocks) blocks.push(measurement);
  }
  const stateAfter = snapshot(f);
  if (hash(stateAfter) !== hash(inputState)) throw new Error(`Timed calls mutated input state: ${input.id}`);
  return { input, rosterSha256: f.rosterSha256, inputState,
    profiles: { carrier: f.carrier.profile, defender: f.defender.profile },
    originalBodyState: { carrier: f.carrier.body, defender: f.defender.body }, command, checks, previewStepsPerCall,
    previewsActivatedPerCall, inferredCandidatesPerCall, selectedPreviewCandidateIndex, candidateRequestHashes,
    candidateCountInference: 'one-body World step count / 12; no production selection instrumentation',
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
  note: 'Warmed repeated controller calls on unchanged observed/body state. Isolated scenario cost, not full-game overhead. No movement is advanced on the real players. Counts collected outside timing; timing runs without monkey patches.',
  warmBlocksExcluded: warmBlocks, measuredBlocks, callsPerBlock, collectGarbageBeforeBlock: !!collectGarbage,
  command: 'node --expose-gc --import tsx scripts/diag/approach-control-cost.ts OUTPUT.json', rows }, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: sourceBefore, scriptSha256: scriptBefore,
  rows: rows.map(r => ({ id: r.input.id, cpuMsPerCall: r.medianCpuMsPerCall,
    wallMsPerCall: r.medianWallMsPerCall, previewStepsPerCall: r.previewStepsPerCall })) }));
