/** Observe the directional bracing correction on the existing three native
 * inputs. Actual post-bracing response is compared with the former scalar
 * subtraction; no alternative World is stepped and no requests are changed. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { G } from '../../../src/core/units.js';
import { clamp, type Vec2 } from '../../../src/core/vec.js';
import { baseRadiusAt } from '../../../src/physics/support.js';
import { World } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const tool = 'scripts/diag/physics/bracing-native.ts';
const output = process.argv[2] ?? 'out/block-protection/result.json.gz';
const summaryPath = join(dirname(output), 'bracing-summary.json');
const tracePath = join(dirname(output), 'bracing-events.json.gz');
const sha = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
const hash = (x: unknown) => sha(JSON.stringify(x));
const threshold = 1e-8; // Equivalent reduced moment, kg·yd²/s²; reporting only.
const started = performance.now(), source = sourceVersion();
const proto: any = World.prototype;
const original = { feet: proto.feet, addLoad: proto.addLoad, updateSupport: proto.updateSupport };
interface Before { oldTip: Vec2; oldFelt: Vec2; rawTip: Vec2; free: boolean; h: number }
interface BodyStats { idx: number; substeps: number; significantSubsteps: number;
  first: any | null; maximum: any | null; maximumRestoredMoment: number;
  integralRestoredMomentMagnitude: number; integralRestoredMoment: Vec2 }
interface Observed { world: any; id: number; profileHash: string; before: Map<number, Before>;
  bodies: Map<number, BodyStats>; significant: any[] }
const observations: Observed[] = [], byWorld = new WeakMap<World, Observed>();
const previewWorlds = new WeakSet<World>();
let previews = 0;
function observation(world: any): Observed | null {
  // The native collector supplies complete plays. Single-body movement
  // forecasts are separate World instances and are not physical play contact.
  if (world.bodies.length === 1) {
    if (!previewWorlds.has(world)) { previewWorlds.add(world); previews++; }
    return null;
  }
  let value = byWorld.get(world);
  if (!value) {
    value = { world, id: observations.length, profileHash: hash(world.bodies.map((b: any) => b.profile)),
      before: new Map(), bodies: new Map(), significant: [] };
    byWorld.set(world, value); observations.push(value);
  }
  return value;
}
proto.feet = function (i: number, intent: any, plan: any, h: number, ...args: any[]) {
  const observed = observation(this);
  if (observed) {
    const support = this.bodies[i].support;
    observed.before.set(i, { oldTip: { ...(support.feltTip ?? { x: 0, y: 0 }) },
      oldFelt: { ...support.felt }, rawTip: { x: 0, y: 0 }, free: !!plan.free, h });
  }
  return original.feet.call(this, i, intent, plan, h, ...args);
};
proto.addLoad = function (i: number, j: number, ...args: any[]) {
  const observed = byWorld.get(this);
  if (!observed) return original.addLoad.call(this, i, j, ...args);
  const before = [i, j].map(k => ({ k, x: this.tipX[k], y: this.tipY[k] }));
  const result = original.addLoad.call(this, i, j, ...args);
  for (const b of before) {
    const state = observed.before.get(b.k);
    assert(state, 'Delivered contact has no observed substep');
    state.rawTip.x += this.tipX[b.k] - b.x;
    state.rawTip.y += this.tipY[b.k] - b.y;
  }
  return result;
};
proto.updateSupport = function (i: number, h: number, ...args: any[]) {
  const observed = byWorld.get(this), before = observed?.before.get(i);
  if (observed && before) {
    assert.equal(h, before.h, 'Bracing observation crossed substeps');
    const b = this.bodies[i], sup = b.support, sp = this.sp[i];
    const oldTip = before.oldTip, oldFelt = before.oldFelt;
    const achievedBrace = { x: this.braceX[i], y: this.braceY[i] };
    const load2 = oldFelt.x ** 2 + oldFelt.y ** 2;
    const leanFraction = load2 > 1e-9 ? clamp(-(achievedBrace.x * oldFelt.x + achievedBrace.y * oldFelt.y) / load2, 0, 1) : 0;
    const scale = this.mass[i] * sp.pitchRadiusSq / this.comHeight[i];
    const feltMoment = Math.hypot(oldTip.x, oldTip.y) * scale;
    const ankleMomentBudget = before.free || sup.state !== 'up' ? 0
      : this.mass[i] * G * baseRadiusAt(sp, sup.posture) * this.alpha[i];
    const ankleFraction = feltMoment > 1e-9 ? Math.min(1, ankleMomentBudget / feltMoment) : 0;
    const legacyFraction = Math.max(leanFraction, ankleFraction);
    const raw = { x: before.rawTip.x / h, y: before.rawTip.y / h };
    const legacy = { x: raw.x - legacyFraction * oldTip.x, y: raw.y - legacyFraction * oldTip.y };
    const actual = { x: this.tipX[i] / h, y: this.tipY[i] / h };
    const restored = { x: (actual.x - legacy.x) * scale, y: (actual.y - legacy.y) * scale };
    const magnitude = Math.hypot(restored.x, restored.y);
    let stats = observed.bodies.get(i);
    if (!stats) {
      stats = { idx: i, substeps: 0, significantSubsteps: 0, first: null, maximum: null,
        maximumRestoredMoment: 0, integralRestoredMomentMagnitude: 0, integralRestoredMoment: { x: 0, y: 0 } };
      observed.bodies.set(i, stats);
    }
    stats.substeps++;
    stats.integralRestoredMomentMagnitude += magnitude * h;
    stats.integralRestoredMoment.x += restored.x * h;
    stats.integralRestoredMoment.y += restored.y * h;
    if (magnitude > threshold) {
      const event = { world: observed.id, idx: i, time: this.time, h, oldTip, oldFelt, achievedBrace,
        leanFraction, ankleFraction, legacyFraction, ankleMomentBudget, equivalentMomentScale: scale,
        incomingRawMoment: { x: raw.x * scale, y: raw.y * scale },
        storedFeltMoment: { x: oldTip.x * scale, y: oldTip.y * scale },
        legacyResidualMoment: { x: legacy.x * scale, y: legacy.y * scale },
        actualResidualMoment: { x: actual.x * scale, y: actual.y * scale },
        restoredMoment: restored, restoredMomentMagnitude: magnitude,
        support: { state: sup.state, posture: sup.posture, xi: { ...sup.xi }, availability: this.alpha[i] } };
      observed.significant.push(event); stats.significantSubsteps++;
      stats.first ??= event;
      if (magnitude > stats.maximumRestoredMoment) { stats.maximumRestoredMoment = magnitude; stats.maximum = event; }
    }
  }
  return original.updateSupport.call(this, i, h, ...args);
};

let error: unknown;
try { await import('./block-protection.js'); }
catch (e) { error = e; }
finally {
  proto.feet = original.feet; proto.addLoad = original.addLoad; proto.updateSupport = original.updateSupport;
}
const native = error === undefined && existsSync(output) ? JSON.parse(gunzipSync(readFileSync(output)).toString()) : null;
const used = new Set<number>();
const worlds = observations.map(o => {
  const rowIndex = native?.rows.findIndex((r: any, i: number) => !used.has(i)
    && hash(r.initial.map((a: any) => a.profile)) === o.profileHash) ?? -1;
  if (rowIndex >= 0) used.add(rowIndex);
  const row = rowIndex >= 0 ? native.rows[rowIndex] : null;
  const bodies = [...o.bodies.values()].map(b => ({ ...b,
    actor: row?.initial.find((a: any) => a.idx === b.idx) ? (({ idx, slot, team, player }: any) => ({ idx, slot, team, player }))(row.initial.find((a: any) => a.idx === b.idx)) : null }));
  return { world: o.id, case: row?.id ?? null, profileHash: o.profileHash,
    significantSubsteps: bodies.reduce((s, b) => s + b.significantSubsteps, 0),
    integralRestoredMomentMagnitude: bodies.reduce((s, b) => s + b.integralRestoredMomentMagnitude, 0),
    first: o.significant[0] ?? null,
    maximum: bodies.reduce<any>((max, b) => b.maximum && (!max || b.maximumRestoredMoment > max.restoredMomentMagnitude) ? b.maximum : max, null), bodies };
});
const summary = { protocol: 'bracing-native-v1', source,
  testedRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  node: process.version, tool, toolSha256: sha(readFileSync(tool)),
  collectorToolSha256: sha(readFileSync('scripts/diag/physics/block-protection.ts')),
  inputSha256: sha(readFileSync('config/block-protection.json')), nativeOutput: output,
  nativeOutputSha256: existsSync(output) ? sha(readFileSync(output)) : null,
  threshold, units: { moment: 'kg yd²/s²', integral: 'kg yd²/s', oldTip: 'yd/s²', braceAndFelt: 'kg yd/s²' },
  scope: 'Actual native responses minus the former scalar bracing subtraction at identical current states. This identifies correction invocation; it is not a paired-history counterfactual or a football-benefit attribution. Only upright updateSupport calls are included. Integrated magnitude is summed across bodies/substeps, not a conserved net angular impulse. Instrumented cost is not a native runtime benchmark.',
  ignoredSingleBodyPreviewWorlds: previews, elapsedSeconds: (performance.now() - started) / 1000,
  error: error instanceof Error ? error.stack ?? error.message : error === undefined ? null : String(error),
  worlds };
mkdirSync(dirname(summaryPath), { recursive: true });
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
writeFileSync(tracePath, gzipSync(JSON.stringify({ source, threshold, worlds: observations.map(o => ({ world: o.id, significant: o.significant })) })));
console.log(JSON.stringify({ bracingSummary: summaryPath, events: tracePath,
  worlds: worlds.map(({ bodies, ...w }) => w), elapsedSeconds: summary.elapsedSeconds }));
if (error) throw error;
