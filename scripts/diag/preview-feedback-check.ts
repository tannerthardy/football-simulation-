/** Independent check of the feedback form of previewFreeMovement (the "movement preview" in #284).
 *   node scripts/diag/preview-probe.mjs apply            # scratch worktree only; `revert` undoes it
 *   node --import tsx scripts/diag/preview-feedback-check.ts <set.bin> <out.json> [--contract <samples.bin>] [--write-samples <samples.bin>] [--reps 3]
 * <set.bin> is Run Game's declared ordinary zone set (scripts/diag/zone-climb-ordinary.ts capture): identical setup bytes on any checkout.
 *
 * plays:    every setup is played with the probe off (timing, result hash) and with the probe plus RNG/perception spies (counts).
 *           The two results must be identical (the probe is neutral). Counts: preview calls, candidates per decision, World steps,
 *           and RNG / sim.see / perceive calls made while a preview was running.
 * contract: (only where the feedback overload exists) on bodies sampled from those plays, in both movement models:
 *           constant callback == held Intent == an independent fresh World; the source body is unchanged; the callback gets a
 *           scratch body, never the source; a callback that vandalizes its body leaves nothing behind; interleaved candidates
 *           each equal an independent run; a body-and-time feedback law equals an independent World stepped with the same law.
 * timing:   microseconds per preview call, Intent vs constant callback vs feedback law (12 steps, 'center').
 */
import { createHash } from 'node:crypto';
import { deepStrictEqual } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import type { Body } from '../../src/physics/kinematics.js';
import { previewFreeMovement as typedPreview } from '../../src/physics/movement-preview.js';
import { PerceptionBuffer } from '../../src/sim/perception.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { World, type Intent } from '../../src/physics/world.js';
import { executionIdentity, restoreSetup } from './saved-play.js';

type Law = Intent | ((b: Readonly<Body>, t: number) => Intent);
/** The feedback form exists only on some checkouts; one loose signature lets this file compile on all of them. */
const previewFreeMovement = typedPreview as unknown as (source: Body, request: Law, now: number, steps?: number, mode?: 'center' | 'patch') => Array<{ t: number; pos: unknown; vel: unknown; support: unknown }>;
const { values: v, positionals } = parseArgs({ allowPositionals: true, options: { contract: { type: 'string' }, 'write-samples': { type: 'string' }, reps: { type: 'string', default: '3' } } });
const [setPath, outPath] = positionals;
const sets = deserialize(readFileSync(setPath)) as Array<{ id: string; concept: string; front: string; setup: Buffer }>;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

// ---------------------------------------------------------------- probe
interface Counts { calls: number; feedbackCalls: number; steps: number; rngInside: number; seeInside: number; perceiveInside: number;
  decisions: Map<string, number>; callers: Map<string, number>; feedbackCallers: Map<string, number> }
const fresh = (): Counts => ({ calls: 0, feedbackCalls: 0, steps: 0, rngInside: 0, seeInside: 0, perceiveInside: 0, decisions: new Map(), callers: new Map(), feedbackCallers: new Map() });
let counts = fresh(), inside = false, ids = new WeakMap<object, number>(), nextId = 0;
(globalThis as any).__previewProbe = {
  begin(source: Body, now: number, _steps: number, feedback: boolean) {
    inside = true; counts.calls++; if (feedback) counts.feedbackCalls++;
    if (!ids.has(source)) ids.set(source, nextId++);
    const key = `${ids.get(source)}@${now.toFixed(4)}`;
    counts.decisions.set(key, (counts.decisions.get(key) ?? 0) + 1);
    const frame = (new Error().stack ?? '').split('\n').slice(3).find(l => !l.includes('movement-preview')) ?? '';
    const where = /([\w-]+)\.ts/.exec(frame)?.[1] ?? 'unknown';
    counts.callers.set(where, (counts.callers.get(where) ?? 0) + 1);
    if (feedback) counts.feedbackCallers.set(where, (counts.feedbackCallers.get(where) ?? 0) + 1);
  },
  step() { counts.steps++; },
  end() { inside = false; },
};
function spy(proto: any, names: string[], field: 'rngInside' | 'seeInside' | 'perceiveInside') {
  for (const n of names) {
    const original = proto[n];
    if (typeof original !== 'function') continue;
    proto[n] = function (...args: unknown[]) { if (inside) counts[field]++; return original.apply(this, args); };
  }
}
const spied = { on: false };
function spiesOn() {
  if (spied.on) return; spied.on = true;
  spy(Rng.prototype, Object.getOwnPropertyNames(Rng.prototype).filter(n => n !== 'constructor'), 'rngInside');
  spy(PlaySim.prototype, ['see'], 'seeInside');
  spy(PerceptionBuffer.prototype, ['perceive'], 'perceiveInside');
}

// ---------------------------------------------------------------- plays
function play(setup: Buffer, sample?: { bodies: Array<{ body: Body; intent: Intent; now: number; who: string }> }) {
  const sim = new PlaySim(restoreSetup(Buffer.from(setup)));
  if (sample) {
    const tick = sim.tick.bind(sim);
    let n = 0;
    sim.tick = () => {
      tick(); n++;
      if (n % 12 === 0 && sim.phase === 'live' && sample.bodies.length < 100000)
        for (const a of sim.agents) if (!a.isDown(sim.t)) sample.bodies.push({ body: structuredClone(a.body), intent: structuredClone(sim.intents[a.idx]), now: sim.t, who: `${a.team}:${a.slot}` });
    };
  }
  const t0 = performance.now(), r = sim.run(), ms = performance.now() - t0;
  return { ms, result: hash({ o: r.outcome, y: r.yards, d: r.duration, e: r.events.length, s: r.stats }) };
}

const reps = Number(v.reps);
const plays = sets.map(p => ({ id: p.id, concept: p.concept, front: p.front, ms: [] as number[], result: '', neutral: true, ...({} as Partial<Counts>) }));
const rows: any[] = [];
// timing, probe off (no spies, no probe object installed during timing)
const probe = (globalThis as any).__previewProbe;
for (let rep = 0; rep < reps; rep++) {
  delete (globalThis as any).__previewProbe;
  sets.forEach((p, i) => { const r = play(p.setup); plays[i].ms.push(r.ms); plays[i].result = r.result; });
}
(globalThis as any).__previewProbe = probe;
spiesOn();
const sampleBodies = { bodies: [] as Array<{ body: Body; intent: Intent; now: number; who: string }> };
let allCounts = fresh();
sets.forEach((p, i) => {
  counts = fresh();
  const r = play(p.setup, i % 4 === 0 ? sampleBodies : undefined);
  const neutral = r.result === plays[i].result;
  const dec = [...counts.decisions.values()];
  rows.push({ id: p.id, concept: p.concept, front: p.front, medianMs: +median(plays[i].ms).toFixed(1), result: r.result, probeNeutral: neutral,
    previewCalls: counts.calls, feedbackCalls: counts.feedbackCalls, worldSteps: counts.steps, decisions: dec.length,
    candidatesPerDecision: dec.length ? +(counts.calls / dec.length).toFixed(2) : 0, maxCandidates: dec.length ? Math.max(...dec) : 0,
    rngInsidePreview: counts.rngInside, seeInsidePreview: counts.seeInside, perceiveInsidePreview: counts.perceiveInside, callers: Object.fromEntries(counts.callers), feedbackCallers: Object.fromEntries(counts.feedbackCallers) });
  for (const k of ['calls', 'feedbackCalls', 'steps', 'rngInside', 'seeInside', 'perceiveInside'] as const) allCounts[k] += counts[k];
  for (const [k, c] of counts.decisions) allCounts.decisions.set(`${i}:${k}`, c);
  for (const [k, c] of counts.callers) allCounts.callers.set(k, (allCounts.callers.get(k) ?? 0) + c);
  for (const [k, c] of counts.feedbackCallers) allCounts.feedbackCallers.set(k, (allCounts.feedbackCallers.get(k) ?? 0) + c);
});

// ---------------------------------------------------------------- contract
const hasFeedback = (() => { try { return previewFreeMovement(structuredClone(sampleBodies.bodies[0].body), () => ({ vel: { x: 0, y: 0 } }), 0, 1).length === 1; } catch { return false; } })();
const inputs = v.contract ? (deserialize(readFileSync(v.contract)) as typeof sampleBodies).bodies : sampleBodies.bodies;
if (v['write-samples']) writeFileSync(v['write-samples'], serialize({ bodies: sampleBodies.bodies }));
type Sample = { t: number; pos: unknown; vel: unknown; support: unknown };
function independent(source: Body, law: Law, now: number, steps: number, mode: 'center' | 'patch'): Sample[] {
  const predicted = structuredClone(source), world = new World([predicted], { handContact: mode });
  world.time = now;
  const out: Sample[] = [];
  for (let k = 0; k < steps; k++) {
    world.step([typeof law === 'function' ? law(predicted, k * .05) : law], .05);
    out.push({ t: (k + 1) * .05, pos: { ...predicted.pos }, vel: { ...predicted.vel }, support: predicted.support!.state });
  }
  return out;
}
const same = (a: unknown, b: unknown) => { try { deepStrictEqual(a, b); return true; } catch { return false; } };
const law = (target: { x: number; y: number }) => (b: Readonly<Body>, t: number): Intent =>
  ({ vel: { x: 2 * (target.x + .5 * t - b.pos.x), y: 2 * (target.y - b.pos.y) }, facing: Math.atan2(target.y - b.pos.y, target.x - b.pos.x) });
const contract: Record<string, { checked: number; failed: number }> = {};
const tally = (k: string, ok: boolean) => { const c = (contract[k] ??= { checked: 0, failed: 0 }); c.checked++; if (!ok) c.failed++; };
let intentDigest = createHash('sha256');
for (const [mode, s] of (['center', 'patch'] as const).flatMap(m => inputs.map(s => [m, s] as const))) {
  const { body, intent, now } = s, before = structuredClone(body);
  const held = previewFreeMovement(body, intent, now, 8, mode);
  intentDigest.update(JSON.stringify([mode, held]));
  tally(`intentPath == independent World (${mode})`, same(held, independent(body, intent, now, 8, mode)));
  tally(`source unchanged after Intent preview (${mode})`, same(body, before));
  if (!hasFeedback) continue;
  tally(`constant callback == held Intent (${mode})`, same(previewFreeMovement(body, () => intent, now, 8, mode), held));
  const target = { x: body.pos.x + 3, y: body.pos.y - 2 }, f = law(target);
  const first = previewFreeMovement(body, f, now, 8, mode);
  tally(`feedback law == independent World with the same law (${mode})`, same(first, independent(body, f, now, 8, mode)));
  let received: unknown = null;
  previewFreeMovement(body, (b) => { received ??= b; return intent; }, now, 8, mode);
  tally(`callback receives a scratch body, not the source (${mode})`, received !== null && received !== body);
  previewFreeMovement(body, (b) => { (b as Body).pos.x += 100; (b as Body).vel.x = 0; (b as Body).energy = 0; return intent; }, now, 8, mode);
  tally(`source unchanged after a callback that vandalizes its body (${mode})`, same(body, before));
  tally(`nothing left behind by that callback (${mode})`, same(previewFreeMovement(body, f, now, 8, mode), first));
  const order = [previewFreeMovement(body, intent, now, 12, mode), previewFreeMovement(body, f, now + .05, 5, mode), previewFreeMovement(body, f, now, 8, mode)];
  tally(`interleaved candidates equal independent runs (${mode})`, same(order[0], independent(body, intent, now, 12, mode)) && same(order[1], independent(body, f, now + .05, 5, mode)) && same(order[2], first));
  tally(`source unchanged after all of it (${mode})`, same(body, before));
}

// ---------------------------------------------------------------- timing
const micro: Record<string, number> = {};
function bench(name: string, fn: (s: (typeof inputs)[number]) => void) {
  const pool = inputs.filter((_, i) => i % Math.max(1, Math.floor(inputs.length / 400)) === 0).slice(0, 400), samples: number[] = [];
  delete (globalThis as any).__previewProbe;
  for (let r = 0; r < 7; r++) { const t0 = performance.now(); for (let k = 0; k < 5; k++) for (const s of pool) fn(s); samples.push((performance.now() - t0) * 1000 / (5 * pool.length)); }
  micro[name] = +median(samples).toFixed(1);
}
bench('intent, 12 steps (us/call)', s => previewFreeMovement(s.body, s.intent, s.now, 12));
if (hasFeedback) {
  bench('constant callback, 12 steps (us/call)', s => previewFreeMovement(s.body, () => s.intent, s.now, 12));
  bench('feedback law, 12 steps (us/call)', s => previewFreeMovement(s.body, law({ x: s.body.pos.x + 3, y: s.body.pos.y - 2 }), s.now, 12));
}

const totalMs = (key: 'medianMs') => +rows.reduce((a, r) => a + r[key], 0).toFixed(1);
const summary = { previewCalls: allCounts.calls, feedbackCalls: allCounts.feedbackCalls, worldSteps: allCounts.steps, decisions: allCounts.decisions.size,
  rngInsidePreview: allCounts.rngInside, seeInsidePreview: allCounts.seeInside, perceiveInsidePreview: allCounts.perceiveInside,
  callers: Object.fromEntries(allCounts.callers), feedbackCallers: Object.fromEntries(allCounts.feedbackCallers), totalMedianMsOverPlays: totalMs('medianMs'), allProbeNeutral: rows.every(r => r.probeNeutral) };
const report = { identity: executionIdentity(), hasFeedbackOverload: hasFeedback, reps, setSha256: createHash('sha256').update(readFileSync(setPath)).digest('hex'),
  plays: rows.length, summary, contractInputs: inputs.length, contract, intentPathDigest: intentDigest.digest('hex').slice(0, 16), microbench: micro, rows };
writeFileSync(outPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ hasFeedbackOverload: hasFeedback, summary, contractInputs: inputs.length, contract, intentPathDigest: report.intentPathDigest, microbench: micro }, null, 1));
