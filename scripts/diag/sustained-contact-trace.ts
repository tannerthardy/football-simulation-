/** Per-integration-segment first-divergence trace for seed-19 frontal contact.
 * Run with Node 22 and tsx, e.g.:
 *   IMPACT_TIMING=local-sweep TRACE_STEM=out/plant-transfer/trace-local-sweep \
 *     node --import tsx scripts/diag/sustained-contact-trace.ts
 * `TRACE_EXPECT_SOURCE_SHA256` optionally enforces a caller-provided source pin.
 * Runtime wrappers only observe private solver calls; see `observerCheck` output.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { World, type Intent } from '../../src/physics/world.js';
import { baseRadiusAt, omega0, recoverySpeed, supportParams } from '../../src/physics/support.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

type ImpactTiming = 'speculative' | 'local-sweep';
type TraceRow = Record<string, any>;
type TickState = { time: number; actors: Array<{ pos: { x: number; y: number }; vel: { x: number; y: number }; xi: { x: number; y: number }; state: string }> };
type Run = { row: TraceRow; commands: Intent[]; tickStates: TickState[] };

const sourceSha256 = sourceVersion();
const expectedHash = process.env.TRACE_EXPECT_SOURCE_SHA256;
if (expectedHash && sourceSha256 !== expectedHash) throw new Error(`Source hash mismatch: expected ${expectedHash}, got ${sourceSha256}`);
const impactTiming = (process.env.IMPACT_TIMING ?? 'local-sweep') as ImpactTiming;
if (impactTiming !== 'speculative' && impactTiming !== 'local-sweep') throw new Error(`Invalid IMPACT_TIMING=${impactTiming}`);
const sourceSnapshot = process.env.TRACE_SOURCE_SNAPSHOT ?? 'working tree';
const supportIntegration = (process.env.SUPPORT_INTEGRATION ?? 'mean') as 'mean' | 'integrated';
if (supportIntegration !== 'mean' && supportIntegration !== 'integrated') throw new Error(`Invalid SUPPORT_INTEGRATION=${supportIntegration}`);

function setup(substeps: number) {
  const seed = 19;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 1), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 }; carrier.body.facing = 0;
  defender.body.pos = { x: 58, y: CENTER_Y + 1 }; defender.body.vel = { x: -3, y: 0 }; defender.body.facing = Math.PI;
  const world: any = new World([carrier.body, defender.body], { substeps, impactTiming,
    supportModel: 'legacy', constraintWork: 'per-solve', supportIntegration });
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, carrier, defender, world };
}

function tracedRun(substeps: number, mode: 'closed-loop' | 'matched-coarse', coarseCommands?: Intent[], observe = true): Run {
  const { sim, carrier, defender, world } = setup(substeps);
  const rows: TraceRow[] = [], commands: Intent[] = [], tickStates: TickState[] = [];
  let active: TraceRow | undefined;
  if (observe) {
    const internals: any = world;
    const integrationName = typeof internals.integrateSubstep === 'function' ? 'integrateSubstep' : 'substep';
    const nativeIntegration = internals[integrationName];
    const nativeDetect = internals.detect;
    const nativeUpdate = internals.updateSupport;
    const nativeStartFall = internals.startFall;

    internals[integrationName] = function(...args: any[]) {
      const [ids, _intents, _plans, h, remaining, report, _pairs, contact, swept = true] = args;
      active = { tick: Math.round(sim.t * 20), time: this.time, h, remaining, ids: [...ids], contactIsland: contact,
        swept, groundImpulseBefore: report.groundImpulse.map((v: any) => ({ ...v })),
        before: [carrier.body, defender.body].map(b => ({ pos: { ...b.pos }, vel: { ...b.vel }, state: b.support?.state,
          xi: b.support ? { ...b.support.xi } : null, feetLock: b.support?.feetLock ?? null })),
        contacts: [], supports: [], falls: [] };
      rows.push(active);
      const result = nativeIntegration.apply(this, args);
      for (const event of active.contacts) {
        event.solvedImpulse = event.contact.ln;
        event.solvedTangent = event.contact.lt;
        event.solvedImpulseVector = { x: event.contact.nx * event.contact.ln - event.contact.ny * event.contact.lt,
          y: event.contact.ny * event.contact.ln + event.contact.nx * event.contact.lt };
        delete event.contact;
      }
      active.after = [carrier.body, defender.body].map(b => ({ pos: { ...b.pos }, vel: { ...b.vel }, state: b.support?.state,
        xi: b.support ? { ...b.support.xi } : null, peak: b.support?.peak ?? null }));
      active.groundImpulseDelta = report.groundImpulse.map((v: any, i: number) => ({ x: v.x - active!.groundImpulseBefore[i].x,
        y: v.y - active!.groundImpulseBefore[i].y }));
      delete active.groundImpulseBefore;
      active = undefined;
      return result;
    };

    // Preserve every original detect argument, including the optional swept flag.
    internals.detect = function(...args: any[]) {
      const contacts: any[] = nativeDetect.apply(this, args);
      if (active) {
        const [ids, h, _soft, _report, swept = true] = args;
        const a = this.bodies[ids[0]], b = this.bodies[ids[1]];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const rvx = b.vel.x - a.vel.x, rvy = b.vel.y - a.vel.y;
        active.detectSwept = swept;
        active.contacts.push(...contacts.map(c => {
          const d = Math.hypot(dx, dy), gap = d - c.R;
          const qa = rvx * rvx + rvy * rvy, qb = dx * rvx + dy * rvy, qc = d * d - c.R * c.R;
          const disc = qb * qb - qa * qc;
          const toi = swept && qa > 1e-12 && qb < 0 && disc >= 0 ? (-qb - Math.sqrt(disc)) / qa : null;
          return { detectedAtGap: gap, preTouch: gap > 1e-9, toi, h, swept, normal: { x: c.nx, y: c.ny },
            closing: c.closing, R: c.R, initialLn: c.ln, contact: c };
        }));
      }
      return contacts;
    };

    internals.updateSupport = function(i: number, h: number, report: any) {
      const body = this.bodies[i], support = body.support!;
      const p = supportParams(body.profile), w0 = omega0(p, support.posture);
      const lock = support.foot ? 0 : support.feetLock;
      const critBefore = baseRadiusAt(p, support.posture) + recoverySpeed(p, lock, this.fat[i]) / w0;
      const before = { state: support.state, xi: { ...support.xi }, magnitude: Math.hypot(support.xi.x, support.xi.y), crit: critBefore,
        feetLock: support.feetLock, felt: { ...support.felt }, load: { ...support.load } };
      const result = nativeUpdate.call(this, i, h, report);
      const critAfter = baseRadiusAt(p, support.posture) + recoverySpeed(p, support.foot ? 0 : support.feetLock, this.fat[i]) / omega0(p, support.posture);
      active?.supports.push({ body: i, before, after: { state: support.state, xi: { ...support.xi },
        magnitude: Math.hypot(support.xi.x, support.xi.y), crit: critAfter, peak: support.peak, cause: support.cause } });
      return result;
    };
    internals.startFall = function(support: any, dir: any, cause: any, report: any, i: number) {
      active?.falls.push({ body: i, time: this.time, cause, dir: { ...dir }, xi: { ...support.xi } });
      return nativeStartFall.call(this, support, dir, cause, report, i);
    };
  }

  for (let k = 0; k < 100; k++) {
    sim.perception.record(sim.agents);
    const command = mode === 'matched-coarse' ? structuredClone(coarseCommands![k]) : chase(sim, defender, carrier);
    if (mode === 'closed-loop') commands.push(structuredClone(command));
    const report = world.step([{ vel: { x: 6, y: 0 }, facing: 0 }, command], .05);
    sim.t += .05;
    tickStates.push({ time: sim.t, actors: [carrier.body, defender.body].map(b => ({ pos: { ...b.pos }, vel: { ...b.vel },
      xi: { ...b.support!.xi }, state: b.support!.state })) });
    if (observe && rows.length) rows[rows.length - 1].stepReport = { impactSplits: report.impactSplits,
      impactSplitLimitHits: report.impactSplitLimitHits, substeps: report.substeps };
  }
  const contacts = rows.flatMap(r => r.contacts.map((c: any) => ({ intervalStart: r.time, intervalEnd: r.time + r.h,
    estimatedTouchTime: c.toi === null ? null : r.time + c.toi, ...c })));
  return { commands, tickStates, row: { seed: 19, nsteps: substeps, mode, impactTiming, jointCount: world.joints.length,
    ticks: 100, firstContact: contacts[0] ?? null, firstPreTouchContact: contacts.find(c => c.preTouch) ?? null,
    firstFall: rows.flatMap(r => r.falls.map((f: any) => ({ tick: r.tick, substepTime: r.time, ...f })))[0] ?? null,
    substeps: rows } };
}

function firstDifferent(a: TraceRow, b: TraceRow, tol = 1e-9, metric: 'all' | 'support' = 'all') {
  const bByEnd = new Map<number, { row: TraceRow; index: number }>(b.substeps.map((r: TraceRow, i: number) =>
    [Number((r.time + r.h).toFixed(12)), { row: r, index: i }]));
  for (let k = 0; k < a.substeps.length; k++) {
    const x = a.substeps[k], match = bByEnd.get(Number((x.time + x.h).toFixed(12)));
    if (!match) continue;
    const y = match.row;
    const dx = Math.hypot(x.after[0].pos.x - y.after[0].pos.x, x.after[0].pos.y - y.after[0].pos.y,
      x.after[1].pos.x - y.after[1].pos.x, x.after[1].pos.y - y.after[1].pos.y);
    const dv = Math.hypot(x.after[0].vel.x - y.after[0].vel.x, x.after[0].vel.y - y.after[0].vel.y,
      x.after[1].vel.x - y.after[1].vel.x, x.after[1].vel.y - y.after[1].vel.y);
    const dxi = Math.hypot(x.after[0].xi.x - y.after[0].xi.x, x.after[0].xi.y - y.after[0].xi.y,
      x.after[1].xi.x - y.after[1].xi.x, x.after[1].xi.y - y.after[1].xi.y);
    const supportChanged = dxi > tol || x.after.some((s: any, i: number) => s.state !== y.after[i].state);
    if (metric === 'support' ? supportChanged : dx > tol || dv > tol || supportChanged || x.contacts.length !== y.contacts.length)
      return { sharedTime: x.time + x.h, coarseIndex: k, refinedIndex: match.index,
        coarse: { tick: x.tick, time: x.time, h: x.h, swept: x.swept, detectSwept: x.detectSwept,
          after: x.after, contacts: x.contacts, supports: x.supports, falls: x.falls },
        refined: { tick: y.tick, time: y.time, h: y.h, swept: y.swept, detectSwept: y.detectSwept,
          after: y.after, contacts: y.contacts, supports: y.supports, falls: y.falls },
        delta: { position: dx, velocity: dv, xi: dxi } };
  }
  return null;
}

const coarse = tracedRun(12, 'closed-loop');
const refined = tracedRun(48, 'matched-coarse', coarse.commands);
const refinedClosed = tracedRun(48, 'closed-loop');
const runs = [coarse.row, refined.row, refinedClosed.row];
const comparisons = [coarse, refined, refinedClosed].map(run => {
  const plain = tracedRun(run.row.nsteps, run.row.mode, run.row.mode === 'matched-coarse' ? coarse.commands : undefined, false);
  let maxPosition = 0, maxVelocity = 0, maxXi = 0, stateMismatches = 0;
  for (let i = 0; i < run.tickStates.length; i++) for (let j = 0; j < 2; j++) {
    const a = run.tickStates[i].actors[j], b = plain.tickStates[i].actors[j];
    maxPosition = Math.max(maxPosition, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y));
    maxVelocity = Math.max(maxVelocity, Math.hypot(a.vel.x - b.vel.x, a.vel.y - b.vel.y));
    maxXi = Math.max(maxXi, Math.hypot(a.xi.x - b.xi.x, a.xi.y - b.xi.y));
    if (a.state !== b.state) stateMismatches++;
  }
  return { nsteps: run.row.nsteps, mode: run.row.mode, maxPosition, maxVelocity, maxXi, stateMismatches };
});

const worldPolicy = { impactTiming, supportIntegration, supportModel: 'legacy', constraintWork: 'per-solve' } as const;
const output = { sourceSha256, sourceSnapshot, worldPolicy, note: 'Per-integration-segment monkeypatch telemetry only. matched-coarse reuses each 12-step chase intent at the same 20 Hz controller tick. detect forwards every argument including swept. observerCheck compares instrumented and uninstrumented reruns.',
  summaries: runs.map(r => {
    const firstTick = r.firstContact ? Math.round(r.firstContact.intervalStart * 20) : null;
    const impactRows = firstTick === null ? [] : r.substeps.filter((s: TraceRow) => s.tick === firstTick && s.contacts.length);
    const groundImpulse = impactRows.reduce((out: any[], s: TraceRow) => s.groundImpulseDelta.map((v: any, i: number) => {
      out[i] ??= { x: 0, y: 0 }; out[i].x += v.x; out[i].y += v.y; return out[i];
    }), []);
    const contactVector = impactRows.reduce((out: any, s: TraceRow) => {
      for (const c of s.contacts) { out.x += c.solvedImpulseVector.x; out.y += c.solvedImpulseVector.y; }
      return out;
    }, { x: 0, y: 0 });
    const impactSegments = firstTick === null ? [] : r.substeps.filter((s: TraceRow) => s.tick === firstTick).map((s: TraceRow) =>
      ({ time: s.time, h: s.h, swept: s.swept, detectSwept: s.detectSwept, contacts: s.contacts.length }));
    return { nsteps: r.nsteps, mode: r.mode, impactTiming, joints: r.jointCount, firstContact: r.firstContact,
      firstPreTouchContact: r.firstPreTouchContact, firstContactTick: firstTick,
      firstContactTickSegments: impactSegments,
      firstTickSubstepsWithContact: impactRows.length,
      firstTickContactImpulse: impactRows.reduce((sum: number, s: TraceRow) => sum + s.contacts.reduce((a: number, c: any) => a + c.solvedImpulse, 0), 0),
      firstTickTangentImpulse: impactRows.reduce((sum: number, s: TraceRow) => sum + s.contacts.reduce((a: number, c: any) => a + c.solvedTangent, 0), 0),
      firstTickContactImpulseVector: contactVector, firstTickGroundImpulse: groundImpulse, firstFall: r.firstFall };
  }),
  observerCheck: comparisons,
  firstDivergence: {
    coarse12Vs48Matched: firstDifferent(coarse.row, refined.row),
    coarse12Vs48MatchedMechanical1e4: firstDifferent(coarse.row, refined.row, 1e-4),
    coarse12Vs48MatchedSupport1e4: firstDifferent(coarse.row, refined.row, 1e-4, 'support'),
    coarse12Vs48Closed: firstDifferent(coarse.row, refinedClosed.row),
    coarse12Vs48ClosedMechanical1e4: firstDifferent(coarse.row, refinedClosed.row, 1e-4),
    coarse12Vs48ClosedSupport1e4: firstDifferent(coarse.row, refinedClosed.row, 1e-4, 'support'),
  } };

const stem = process.env.TRACE_STEM ?? process.argv[2] ?? 'out/plant-transfer/trace-local-sweep';
for (const row of runs) {
  const suffix = row.nsteps === 12 ? '12-closed' : row.mode === 'matched-coarse' ? '48-matched-coarse' : '48-closed';
  const path = `${stem}-${suffix}.json`; mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ sourceSha256, sourceSnapshot, worldPolicy, ...row }, null, 2) + '\n');
}
const summaryPath = `${stem}-summary.json`; mkdirSync(dirname(summaryPath), { recursive: true });
writeFileSync(summaryPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ sourceSha256, sourceSnapshot, worldPolicy,
  summaries: output.summaries.map(s => ({ nsteps: s.nsteps, mode: s.mode, touch: s.firstContact?.estimatedTouchTime,
    firstContactSegment: { start: s.firstContact?.intervalStart, h: s.firstContact?.h, swept: s.firstContact?.swept },
    contactsInFirstTick: s.firstTickSubstepsWithContact, firstTickNormalImpulse: s.firstTickContactImpulse,
    fall: s.firstFall && { time: s.firstFall.time, cause: s.firstFall.cause } })), observerCheck: comparisons,
  firstDivergence: Object.fromEntries(Object.entries(output.firstDivergence).map(([key, v]: [string, any]) => [key,
    v && { time: v.sharedTime, delta: v.delta, coarse: { h: v.coarse.h, swept: v.coarse.swept,
      detectSwept: v.coarse.detectSwept, contacts: v.coarse.contacts }, refined: { h: v.refined.h,
      swept: v.refined.swept, detectSwept: v.refined.detectSwept, contacts: v.refined.contacts } }])) }, null, 2));
