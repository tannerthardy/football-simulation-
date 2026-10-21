/** Source-pinned two-game guard and warmed, matched-input World benchmark.
 * node --import tsx scripts/diag/held-recovery-football.ts [output.json] [seed=9] [--benchmark-only | --games-only]
 * Run unchanged against each source in separate processes; no model preload.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame, type GameResult } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Body } from '../../src/physics/kinematics.js';
import { newSupport, supportParams } from '../../src/physics/support.js';
import { World, type Intent } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/held-recovery-football.json';
const benchmarkOnly = process.argv.includes('--benchmark-only');
const gamesOnly = process.argv.includes('--games-only');
if (benchmarkOnly && gamesOnly) throw new Error('Choose either --benchmark-only or --games-only');
const collectGarbage = (globalThis as unknown as { gc?: () => void }).gc;
const seed = Number(process.argv[3] ?? 9), sourceBefore = sourceVersion();
if (!Number.isInteger(seed)) throw new Error('Seed must be an integer');
const quantile = (xs: number[], q: number): number | null => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(q * (sorted.length - 1))] : null;
};
const mean = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const updateMax = (old: number | null, value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(old ?? -Infinity, value) : old;
const cpuMs = (start: NodeJS.CpuUsage) => { const elapsed = process.cpuUsage(start); return (elapsed.user + elapsed.system) / 1000; };
const worldTimes: number[] = [];
const physics = { ticks: 0, lowerJointTicks: 0, maxHeldRecoveryExcursionYd: null as number | null,
  lowerHoldReleases: null as number | null, maxMomentumResidualKgYdS: 0,
  maxWorkResidualKgYd2S2: null as number | null, maxMotorWorkExcessKgYd2S2: null as number | null,
  maxPassiveGripPositiveWorkKgYd2S2: null as number | null };
let observing = false;
const original = World.prototype.step;
World.prototype.step = function (intents, dt) {
  // Controller free-movement previews use one-body scratch worlds. They count
  // toward game CPU/wall time, but are not extra physical game ticks/contacts.
  if (!observing || this.bodies.length !== 22) return original.call(this, intents, dt);
  const momentum = () => this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x,
    y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
  const hasLower = () => this.joints.some(j => j.kind === 'grasp' && !j.broken && j.legs > 0 && j.capacity > 0);
  const before = momentum(), lowerBefore = hasLower(), start = performance.now();
  const report = original.call(this, intents, dt);
  worldTimes.push(performance.now() - start); physics.ticks++;
  if (lowerBefore || hasLower()) physics.lowerJointTicks++;
  const after = momentum(), ground = report.groundImpulse.reduce((p, f) => ({ x: p.x + f.x, y: p.y + f.y }), { x: 0, y: 0 });
  physics.maxMomentumResidualKgYdS = Math.max(physics.maxMomentumResidualKgYdS,
    Math.hypot(after.x - before.x - ground.x, after.y - before.y - ground.y));
  // Optional fields remain null for an older source, never an invented zero.
  const r = report as unknown as { maxHeldRecoveryExcursion?: number; lowerHoldReleases?: number;
    work?: { residual: number }; supportMotorWork?: number[]; supportMotorWorkLimit?: number[]; passiveGraspWork?: number };
  physics.maxHeldRecoveryExcursionYd = updateMax(physics.maxHeldRecoveryExcursionYd, r.maxHeldRecoveryExcursion);
  if (typeof r.lowerHoldReleases === 'number') physics.lowerHoldReleases = (physics.lowerHoldReleases ?? 0) + r.lowerHoldReleases;
  physics.maxWorkResidualKgYd2S2 = updateMax(physics.maxWorkResidualKgYd2S2, r.work && Math.abs(r.work.residual));
  physics.maxPassiveGripPositiveWorkKgYd2S2 = updateMax(physics.maxPassiveGripPositiveWorkKgYd2S2,
    r.passiveGraspWork === undefined ? undefined : Math.max(0, r.passiveGraspWork));
  if (r.supportMotorWork && r.supportMotorWorkLimit) for (let i = 0; i < r.supportMotorWork.length; i++)
    physics.maxMotorWorkExcessKgYd2S2 = updateMax(physics.maxMotorWorkExcessKgYd2S2,
      Math.max(0, r.supportMotorWork[i] - r.supportMotorWorkLimit[i]));
  return report;
};

const rosterRng = new Rng(seed).fork('held-recovery-rosters');
const teams = [generateTeam(rosterRng.fork('home'), 'Guard Home', 'HOM', { strength: .55 }),
  generateTeam(rosterRng.fork('away'), 'Guard Away', 'AWY', { strength: .55 })];
const rosterSha256 = createHash('sha256').update(JSON.stringify(teams)).digest('hex');
const gameRng = new Rng(seed).fork('held-recovery-games');
const gameSeeds = Array.from({ length: 3 }, () => gameRng.nextU32());
const playGame = (gameSeed: number) => simulateGame(structuredClone(teams[0]), structuredClone(teams[1]), { seed: gameSeed });
if (!benchmarkOnly) playGame(gameSeeds[0]); // Warm game excluded from measurements.
function summarizeGame(game: GameResult) {
  const plays = game.log.filter(p => (p.kind === 'run' || p.kind === 'pass') && !p.nullified && p.stats);
  const runs = plays.filter(p => p.kind === 'run'), passes = plays.filter(p => p.kind === 'pass');
  const completions = passes.filter(p => p.stats!.completed && !p.stats!.interceptedBy);
  const afterContact = runs.flatMap(p => p.stats!.yardsBeforeContact === undefined ? [] : [p.yards - p.stats!.yardsBeforeContact]);
  const total = (items: typeof plays, value: (p: typeof plays[number]) => number) => items.reduce((s, p) => s + value(p), 0);
  return { score: game.score, box: { home: game.box.team('HOM'), away: game.box.team('AWY') },
    officialScrimmagePlays: plays.length, physicalTimeoutsIncludingNullified: game.log.filter(p => p.outcome === 'timeout').length,
    missedTackles: total(plays, p => p.stats!.missedTackles), brokenTackles: total(plays, p => p.stats!.brokenTackles),
    rushes: runs.length, rushYards: total(runs, p => p.yards), rushYardsPerAttempt: mean(runs.map(p => p.yards)),
    rushStuffs: runs.filter(p => p.yards <= 0).length, rushExplosives10: runs.filter(p => p.yards >= 10).length,
    runContactSamples: afterContact.length, meanRunYardsAfterFirstContact: mean(afterContact),
    dropbacks: passes.length, passAttempts: passes.filter(p => p.stats!.attempted).length, completions: completions.length,
    completionYards: total(completions, p => p.yards), sacks: passes.filter(p => p.stats!.sacked).length,
    interceptions: passes.filter(p => p.stats!.interceptedBy).length, completionExplosives20: completions.filter(p => p.yards >= 20).length,
    meanReceiverYardsAfterCatch: mean(completions.flatMap(p => p.stats!.yac === undefined ? [] : [p.stats!.yac])) };
}
observing = true;
const games = (benchmarkOnly ? [] : gameSeeds.slice(1)).map(gameSeed => {
  const cpu = process.cpuUsage(), start = performance.now(), game = playGame(gameSeed);
  return { seed: gameSeed, wallMs: performance.now() - start, cpuMs: cpuMs(cpu), ...summarizeGame(game) };
});
observing = false;

const profile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6,
  lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: .25, power: 100, balance: .5, bend: .5, stepSpeed: 3.4 };
function fixture(kind: 'free' | 'trench' | 'multi-grip') {
  const bodies: Body[] = Array.from({ length: 22 }, (_, i) => ({ pos: { x: 20 + i % 2 * 10, y: i * 3 },
    vel: { x: 2, y: 0 }, facing: 0, profile: { ...profile }, energy: 1, support: newSupport() }));
  const intents: Intent[] = bodies.map(() => ({ vel: { x: 4, y: 0 }, posture: .6, push: 1 }));
  if (kind === 'trench') for (let i = 0; i < 10; i += 2) {
    bodies[i].pos = { x: 0, y: i * 2 }; bodies[i + 1].pos = { x: .9, y: i * 2 + .1 };
    bodies[i].vel = { x: 0, y: 0 }; bodies[i + 1].vel = { x: 0, y: 0 }; bodies[i + 1].facing = Math.PI;
    intents[i].vel = { x: 2, y: 0 }; intents[i + 1].vel = { x: -2, y: 0 };
  }
  if (kind === 'multi-grip') for (let i = 0; i < 12; i += 3) {
    bodies[i].pos = { x: 0, y: i * 2 }; bodies[i + 1].pos = { x: -1, y: i * 2 }; bodies[i + 2].pos = { x: 1, y: i * 2 };
    for (let j = i; j < i + 3; j++) { bodies[j].vel = { x: 0, y: 0 }; intents[j].vel = { x: 0, y: 0 }; }
    bodies[i].support!.xi = { x: .45, y: 0 }; bodies[i].support!.out = .12;
  }
  const world = new World(bodies); // Construction and fixture allocation outside timed block.
  if (kind === 'trench') for (let i = 0; i < 10; i += 2) world.joints.push({ kind: 'hands', a: bodies[i], b: bodies[i + 1],
    extension: .95, push: supportParams(profile).armForce, hold: 0, steer: .4 * supportParams(profile).armForce });
  if (kind === 'multi-grip') for (let i = 0; i < 12; i += 3) for (const j of [i + 1, i + 2])
    world.joints.push({ kind: 'grasp', a: bodies[j], b: bodies[i], reach: 1.5, hold: 1, capacity: 600, legs: 1 });
  return { world, intents };
}
const benchmark = (gamesOnly ? [] : ['free', 'trench', 'multi-grip'] as const).map(kind => {
  const blocks: Array<{ cpuMs: number; wallMs: number; worldTickMedianMs: number | null; worldTickP95Ms: number | null }> = [];
  for (let block = 0; block < 10; block++) {
    const reps = Array.from({ length: 400 }, () => fixture(kind)), tickTimes: number[] = [];
    // When --expose-gc is supplied, finish fixture-allocation collection
    // before timing. This avoids assigning concurrent graph promotion to
    // World.step. Both revisions retain the same fresh fixture population.
    if (collectGarbage) collectGarbage();
    const cpu = process.cpuUsage(), start = performance.now();
    for (const { world, intents } of reps) {
      const tickStart = performance.now(); world.step(intents, .05);
      tickTimes.push(performance.now() - tickStart);
    }
    const wallMs = performance.now() - start, elapsedCpuMs = cpuMs(cpu);
    if (block >= 3) blocks.push({ cpuMs: elapsedCpuMs, wallMs, worldTickMedianMs: quantile(tickTimes, .5), worldTickP95Ms: quantile(tickTimes, .95) });
  }
  return { fixture: kind, bodies: 22, warmBlocksExcluded: 3, measuredBlocks: 7, repsPerBlock: 400, ticksPerRep: 1, dt: .05,
    medianBlockCpuMs: quantile(blocks.map(b => b.cpuMs), .5), medianBlockWallMs: quantile(blocks.map(b => b.wallMs), .5),
    medianWorldTickMs: quantile(blocks.flatMap(b => b.worldTickMedianMs === null ? [] : [b.worldTickMedianMs]), .5),
    medianBlockWorldTickP95Ms: quantile(blocks.flatMap(b => b.worldTickP95Ms === null ? [] : [b.worldTickP95Ms]), .5), blocks };
});
World.prototype.step = original;
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Source changed during guard; refusing unpinned result');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ schema: 'held-recovery-football-v1', node: process.version, executable: process.execPath,
  command: [process.execPath, '--import', 'tsx', 'scripts/diag/held-recovery-football.ts', output, String(seed),
    ...(benchmarkOnly ? ['--benchmark-only'] : []), ...(gamesOnly ? ['--games-only'] : [])], seed, benchmarkOnly, gamesOnly,
  allocationGcBeforeBenchmark: !!collectGarbage,
  sourceBefore, sourceAfter, scriptSha256: createHash('sha256').update(readFileSync('scripts/diag/held-recovery-football.ts')).digest('hex'),
  rosterSha256, excludedWarmGameSeed: gameSeeds[0], games, physics: { ...physics,
    sampledLowerJointTickFraction: physics.ticks ? physics.lowerJointTicks / physics.ticks : null,
    nativeWorldTickMedianMs: quantile(worldTimes, .5), nativeWorldTickP95Ms: quantile(worldTimes, .95) }, benchmark,
  limitations: ['Two games and one fixed roster pair are regression guards, not league estimates or NFL calibration.',
    'Game World timing excludes observer accounting; game wall/CPU includes it. Benchmark observer is disabled.',
    'One-body controller previews contribute to game CPU/wall time, but are excluded from physical game tick/contact accounting.',
    'Lower-grip occurrence samples pre/post ticks and can miss a hold acquired and released within one tick.',
    'Run after-contact yards are final gain minus engine first-carrier-contact gain; pass YAC is a separate statistic.',
    'Native tick timings include changing contact islands; matched benchmark uses one tick per fresh World, with identical initial bodies/commands/constraints across revisions.',
    'Benchmark excludes fixture construction; with --expose-gc it collects before timed blocks. GC can still interrupt a step.',
    'Sequential separate-process comparisons remain sensitive to CPU load; repeat with reversed order before claiming speedup.'] }, null, 2) + '\n');
console.log(`Wrote ${output}; sources ${sourceBefore.slice(0, 12)} / ${sourceAfter.slice(0, 12)}`);
