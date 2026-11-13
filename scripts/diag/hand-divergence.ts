/** Locate a retained sustained-hand numerical divergence without changing the law.
 * node --import tsx scripts/diag/hand-divergence.ts [out-directory] [--freeze-controller]
 *   [--hand-integration=end|centered] [--controller-input=recorded-native.json.gz]
 * node --import tsx scripts/diag/hand-divergence.ts <existing-out-directory> --compact-only
 * Instrumentation wraps existing World methods and only copies their values.
 * The 192-step run is a numerical reference, not an NFL benchmark.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { redirect } from '../../src/lab/scenarios.js';
import { World } from '../../src/physics/world.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

type RecordValue = Record<string, any>;
const directory = process.argv[2] ?? 'out/hand-divergence';
const controllerInput = process.argv.find(arg => arg.startsWith('--controller-input='))?.slice('--controller-input='.length);
const freezeController = process.argv.includes('--freeze-controller') || controllerInput !== undefined;
const integrationOption = process.argv.find(arg => arg.startsWith('--hand-integration='))?.split('=')[1];
if (integrationOption !== undefined && !['end', 'centered'].includes(integrationOption))
  throw new RangeError('Expected --hand-integration=end|centered');
const configured = new WeakSet<World>();
mkdirSync(directory, { recursive: true });
if (process.argv.includes('--compact-only')) {
  for (const name of readdirSync(directory).filter(name => /^redirect-\d+\.json\.gz$/.test(name))) {
    const raw = readFileSync(join(directory, name));
    const report = JSON.parse(gunzipSync(raw).toString());
    const stride = report.substeps / 12;
    const keep = new Set<number>();
    const signature = (value: RecordValue) => JSON.stringify({
      rows: value.rows.map((r: RecordValue) => [r.i, r.j, r.mode,
        r.mode > 0 ? r.ln >= .98 * r.pushLim : r.mode < 0 ? -r.ln >= .98 * r.holdLim : false,
        r.steerLim > 0 && Math.abs(r.lt) >= .98 * r.steerLim]),
      contacts: value.contacts.map((c: RecordValue) => [c.i, c.j, c.guard]),
      support: value.after.map((a: RecordValue) => [a.slot, a.support.state]),
    });
    for (let i = 0; i < report.intervals.length; i++) {
      if (report.intervals[i].tick === 0 || (i + 1) % stride === 0) keep.add(i);
      if (i > 0 && signature(report.intervals[i]) !== signature(report.intervals[i - 1]))
        for (let k = Math.max(0, i - 2); k <= Math.min(report.intervals.length - 1, i + 2); k++) keep.add(k);
    }
    const originalCount = report.intervals.length;
    report.intervals = [...keep].sort((a, b) => a - b).map(index => ({ originalIntervalIndex: index,
      ...report.intervals[index] }));
    report.retention = { originalFullFile: name, originalFullFileSha256: createHash('sha256').update(raw).digest('hex'),
      compactingScriptSha256: createHash('sha256').update(readFileSync('scripts/diag/hand-divergence.ts')).digest('hex'),
      originalIntervalCount: originalCount, retainedIntervalCount: report.intervals.length,
      rule: 'Every controller tick remains complete; all first-tick physics intervals, each shared native12 endpoint, and two intervals either side of row mode/cap state, contact-pair/guard or support-state transitions. No resimulation or gain/outcome selection.',
      observerControlScope: 'Exact checks were performed on the original full trace, before excerpting.' };
    const path = join(directory, name.replace('.json.gz', '.compact.json.gz'));
    writeFileSync(path, gzipSync(JSON.stringify(report)));
    console.log(`${path}: ${originalCount} -> ${report.intervals.length} intervals`);
  }
  process.exit(0);
}
const copy = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));
const initialSourceSha256 = sourceVersion();
const coreFiles = ['src/physics/world.ts', 'src/physics/support.ts', 'src/physics/kinematics.ts',
  'src/physics/actuation.ts', 'src/sim/engagement.ts', 'src/lab/scenarios.ts'];
const coreHashes = Object.fromEntries(coreFiles.map(path => [path,
  createHash('sha256').update(readFileSync(path)).digest('hex')]));
const wp = World.prototype as any, pp = PlaySim.prototype as any;
const originals = Object.fromEntries(['step', 'integrateSubstep', 'feet', 'jointRows', 'detect']
  .map(name => [name, wp[name]]));
const originalTick = pp.tick;
let active: PlaySim | undefined;
let detail = false;
let ticks: RecordValue[] = [], intervals: RecordValue[] = [];
let interval: RecordValue | undefined;
let rowReferences: any[] = [];
let frozenTicks: RecordValue[] | undefined;
const selected = (world: World) => active!.agents
  .filter(a => ['RT', 'DE_S', 'QB'].includes(a.slot))
  .map(a => ({ slot: a.slot, idx: a.idx, pos: copy(a.pos), vel: copy(a.vel),
    facing: a.body.facing, spin: a.body.spin, energy: a.body.energy,
    support: copy(a.body.support) }));
const engagements = (sim: PlaySim) => sim.engagements.map(e => ({
  blocker: e.blocker.slot, defender: e.defender.slot, type: e.type,
  control: e.control, phi: e.phi, side: e.side, baseB: e.baseB, baseD: e.baseD,
  move: e.move, moveOk: e.moveOk, moveUntil: e.moveUntil, nextMoveAt: String(e.nextMoveAt),
  holding: e.holding, win: e.win, pushBoost: e.pushBoost,
}));
const hands = (world: World) => world.joints.filter(j => j.kind === 'hands').map(j => {
  if (j.kind !== 'hands') throw new Error('unreachable');
  return { a: world.indexOf(j.a), b: world.indexOf(j.b), actor: world.indexOf(j.actor ?? j.a),
    holder: world.indexOf(j.holder ?? j.a), extension: j.extension, push: j.push,
    hold: j.hold, steer: j.steer, height: j.height,
    normalForce: j.normalForce, tangentForce: j.tangentForce };
});
const rows = () => rowReferences.map(r => ({ i: r.i, j: r.j, nx: r.nx, ny: r.ny,
  mn: r.mn, mode: r.mode, c: r.c, ln: r.ln, lt: r.lt, pushLim: r.pushLim,
  holdLim: r.holdLim, steerLim: r.steerLim, actor: r.actor, steerActor: r.steerActor,
  normalWork: copy(r.normalWork), tangentWork: copy(r.tangentWork) }));

pp.tick = function(this: PlaySim, ...args: any[]) {
  active = this;
  return originalTick.apply(this, args);
};
wp.step = function(this: World, intents: any[], dt: number) {
  const sim = active!;
  if (integrationOption && !configured.has(this)) {
    if (!('handIntegration' in this)) throw new Error('World does not expose handIntegration');
    // Explicit diagnostic selection before the first advance, matching the
    // constructor option. Never switch a mode during an existing interaction.
    Object.defineProperty(this, 'handIntegration', { value: integrationOption, writable: true });
    configured.add(this);
  }
  if (frozenTicks) {
    const frozen = frozenTicks[ticks.length];
    if (!frozen || frozen.hands.length !== this.joints.filter(j => j.kind === 'hands').length)
      throw new Error('Frozen fixture no longer has matching hand topology');
    for (const value of frozen.intents) {
      const a = sim.slot(value.slot)!;
      intents[a.idx] = copy(value.intent);
    }
    for (const joint of this.joints) if (joint.kind === 'hands') {
      const value = frozen.hands.find((j: any) => j.a === this.indexOf(joint.a) && j.b === this.indexOf(joint.b));
      if (!value) throw new Error('Frozen fixture hand pair changed');
      joint.actor = this.bodies[value.actor]; joint.holder = this.bodies[value.holder];
      joint.extension = value.extension; joint.push = value.push; joint.hold = value.hold;
      joint.steer = value.steer; joint.height = value.height;
    }
  }
  const tick: RecordValue = { ordinal: ticks.length, time: this.time, simTime: sim.t, dt,
    handIntegration: (this as any).handIntegration ?? 'end',
    rng: copy(sim.rng),
    before: selected(this), engagements: engagements(sim), hands: hands(this),
    intents: sim.agents.filter(a => ['RT', 'DE_S', 'QB'].includes(a.slot))
      .map(a => ({ slot: a.slot, intent: copy(intents[a.idx]) })) };
  const report = originals.step.call(this, intents, dt);
  tick.after = selected(this); tick.report = copy(report); tick.afterHands = hands(this);
  tick.afterRng = copy(sim.rng);
  tick.events = copy(sim.events);
  ticks.push(tick);
  return report;
};
wp.integrateSubstep = function(this: World, ids: number[], intents: any[], plans: any[], h: number,
  remaining: number, report: any, pairs: any, contact: boolean, swept?: boolean) {
  if (!detail || !contact) return originals.integrateSubstep.call(this, ids, intents, plans,
    h, remaining, report, pairs, contact, swept);
  rowReferences = [];
  interval = { tick: ticks.length, time: this.time, h, remaining,
    before: selected(this), hands: hands(this), feet: [], contacts: [] };
  const value = originals.integrateSubstep.call(this, ids, intents, plans, h, remaining,
    report, pairs, contact, swept);
  interval.rows = rows(); interval.after = selected(this);
  interval.scratch = selected(this).map(a => ({ slot: a.slot,
    imp: { x: (this as any).impX[a.idx], y: (this as any).impY[a.idx] },
    tip: { x: (this as any).tipX[a.idx], y: (this as any).tipY[a.idx] },
    brace: { x: (this as any).braceX[a.idx], y: (this as any).braceY[a.idx] } }));
  intervals.push(interval); interval = undefined;
  return value;
};
wp.feet = function(this: World, i: number, intent: any, plan: any, h: number, remaining: number, report: any) {
  const value = originals.feet.call(this, i, intent, plan, h, remaining, report);
  if (interval) {
    const agent = active!.agents[i];
    if (['RT', 'DE_S', 'QB'].includes(agent.slot)) interval.feet.push({ slot: agent.slot,
      plan: copy(plan), intent: copy(intent), alpha: (this as any).alpha[i], cut: (this as any).cut[i],
      acceleration: { x: (this as any).amx[i], y: (this as any).amy[i] },
      armScale: (this as any).armScale[i], armCap: (this as any).armCap[i],
      recovery: (this as any).recovery[i], body: selected(this).find(a => a.idx === i) });
  }
  return value;
};
wp.jointRows = function(this: World, h: number) {
  const value = originals.jointRows.call(this, h);
  if (interval) { rowReferences = value; interval.initialRows = rows(); }
  return value;
};
wp.detect = function(this: World, ...args: any[]) {
  const value = originals.detect.apply(this, args);
  if (interval) interval.contacts = copy(value);
  return value;
};

const physicalTicks = (values: RecordValue[]) => values.map(t => ({
  before: t.before, after: t.after, engagements: t.engagements, hands: t.hands,
  rng: t.rng, afterRng: t.afterRng,
  intents: t.intents, report: t.report, afterHands: t.afterHands, events: t.events }));
const runs: RecordValue[] = [];
if (freezeController) {
  if (controllerInput) {
    const raw = readFileSync(controllerInput);
    frozenTicks = JSON.parse((controllerInput.endsWith('.gz') ? gunzipSync(raw) : raw).toString()).ticks;
    if (!Array.isArray(frozenTicks) || frozenTicks.length !== 50) throw new Error('Expected the retained 50-tick redirect input');
  } else {
    ticks = []; intervals = []; detail = false;
    redirect({ seed: 7, rusherPower: 1.4, substeps: 12 });
    frozenTicks = ticks;
  }
}
for (const substeps of freezeController ? [12, 192] : [12, 24, 48, 96, 192]) {
  ticks = []; intervals = []; detail = false;
  const controlResult = redirect({ seed: 7, rusherPower: 1.4, substeps });
  const controlTicks = ticks;
  ticks = []; intervals = []; detail = true;
  const result = redirect({ seed: 7, rusherPower: 1.4, substeps });
  const neutral = JSON.stringify(controlResult) === JSON.stringify(result)
    && JSON.stringify(physicalTicks(controlTicks)) === JSON.stringify(physicalTicks(ticks));
  if (!neutral) throw new Error(`Observing substeps changed ${substeps}-step physical state`);
  const report = { sourceSha256: initialSourceSha256, coreHashes, scriptSha256: createHash('sha256')
    .update(readFileSync('scripts/diag/hand-divergence.ts')).digest('hex'),
    node: process.version, argv: process.argv, substeps, seed: 7, rusherPower: 1.4,
    handIntegration: ticks[0].handIntegration,
    freezeController, frozenInputSubsteps: frozenTicks ? 12 : undefined,
    controllerInput: controllerInput ? { path: controllerInput,
      sha256: createHash('sha256').update(readFileSync(controllerInput)).digest('hex') } : undefined,
    observerNeutrality: { exactResultAndEveryControllerTickState: neutral },
    result, ticks, intervals };
  writeFileSync(join(directory, `redirect-${substeps}.json.gz`), gzipSync(JSON.stringify(report)));
  runs.push(report);
}
pp.tick = originalTick;
for (const name of Object.keys(originals)) wp[name] = originals[name];

const reference = runs.at(-1)!;
const comparison = runs.slice(0, -1).map(run => {
  const comparedTicks = run.ticks.map((tick: RecordValue, i: number) => {
    const ref = reference.ticks[i];
    if (!ref) return { ordinal: i, unavailableReference: true };
    const differences = tick.after.map((a: RecordValue) => {
      const b = ref.after.find((v: RecordValue) => v.slot === a.slot)!;
      return { slot: a.slot, positionYd: Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y),
        velocityYdPerS: Math.hypot(a.vel.x - b.vel.x, a.vel.y - b.vel.y),
        xiYd: Math.hypot(a.support.xi.x - b.support.xi.x, a.support.xi.y - b.support.xi.y),
        leanForce: Math.hypot(a.support.lean.x - b.support.lean.x, a.support.lean.y - b.support.lean.y),
        feltForce: Math.hypot(a.support.felt.x - b.support.felt.x, a.support.felt.y - b.support.felt.y) };
    });
    return { ordinal: i, time: tick.simTime + tick.dt, differences,
      controllerEngagements: tick.engagements, referenceEngagements: ref.engagements,
      hands: tick.afterHands, referenceHands: ref.afterHands };
  });
  const atThreshold = (threshold: number) => comparedTicks.find((v: any) =>
    v.differences?.some((a: any) => a.positionYd >= threshold));
  return { substeps: run.substeps, result: run.result, observerNeutrality: run.observerNeutrality,
    firstPositionError1e6Yd: atThreshold(1e-6), firstPositionError01Yd: atThreshold(.01),
    firstPositionErrorPoint1Yd: atThreshold(.1), comparedTicks };
});
for (const path of coreFiles) if (coreHashes[path] !== createHash('sha256').update(readFileSync(path)).digest('hex'))
  throw new Error(`Fixture source changed while measuring: ${path}`);
const summary = { sourceSha256: initialSourceSha256, coreHashes, note: 'Reference is numerical, not NFL data. Observer control copies identical end-of-tick physical/controller states without substep hooks.',
  freezeController, frozenInputSubsteps: frozenTicks ? 12 : undefined,
  referenceResult: reference.result, comparison };
writeFileSync(join(directory, 'comparison.json'), JSON.stringify(summary, null, 2) + '\n');
console.table(runs.map(run => ({ substeps: run.substeps, closest: run.result.closest,
  carriedPast: run.result.carriedPast, cornerTurned: run.result.cornerTurned,
  falls: run.result.falls.join(', '), intervals: run.intervals.length })));
console.log(`Saved ${directory}`);
