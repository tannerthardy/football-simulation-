import { describe, expect, it, vi } from 'vitest';
import { redirect } from '../src/lab/scenarios.js';
import { World, type HandJoint, type Intent, type Joint, type StepReport } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';
import { PlaySim } from '../src/sim/playsim.js';

type InputGraph = { bodies: Body[]; intents: ReadonlyArray<Intent | null | undefined>; joints: Joint[] };
type WorldOptions = NonNullable<ConstructorParameters<typeof World>[1]>;
type Sample = {
  controllerT: number; endpointT: number; primaryActive: boolean;
  normal: number; tangent: number; outwardImpulse: number;
  separation: number; appliedRequest: { x: number; y: number };
  decisionInterval: number;
};

/** Observe the existing native scenario. Shadow Worlds run only AFTER the
 * native rep finishes. This is a first-interval physical ablation, not a
 * reacting alternate play or a general live-World continuation serializer. */
function observeRedirect(side: 1 | -1) {
  let sim: PlaySim | undefined, primary: HandJoint | undefined;
  let first: { graph: InputGraph; options: WorldOptions; joint: number; time: number; dt: number;
    defender: number; qb: number; outside: number; after: Body[]; report: StepReport } | undefined;
  const samples: Sample[] = [];
  const nativeTick = PlaySim.prototype.tick, nativeStep = World.prototype.step;
  const tick = vi.spyOn(PlaySim.prototype, 'tick').mockImplementation(function (this: PlaySim) {
    sim = this;
    primary ??= this.slot('DE_S')!.engagement?.hands;
    nativeTick.call(this);
  });
  const step = vi.spyOn(World.prototype, 'step').mockImplementation(function (this: World, intents, dt) {
    if (this !== sim?.world) return nativeStep.call(this, intents, dt);
    const d = sim.slot('DE_S')!, qb = sim.qb;
    const controllerT = sim.t, active = !!primary && this.joints.includes(primary);
    const outside = Math.sign(d.pos.y - qb.pos.y);
    // Clone the physical input graph together: requests may alias body vectors,
    // and hands may share a body/profile. Do not silently lose those aliases.
    const before = !first && active ? {
      graph: structuredClone({ bodies: this.bodies, intents, joints: this.joints }),
      options: { substeps: this.substeps, supportModel: this.supportModel, handContact: this.handContact,
        handIntegration: this.handIntegration, constraintWork: this.constraintWork,
        impactTiming: this.impactTiming, supportIntegration: this.supportIntegration,
        boundedAttachment: this.boundedAttachment },
      joint: this.joints.indexOf(primary!), time: this.time, dt, defender: d.idx, qb: qb.idx, outside,
    } : undefined;
    const report = nativeStep.call(this, intents, dt);
    const forceY = active ? (primary!.normalForceOnB?.y ?? 0) + (primary!.tangentForceOnB?.y ?? 0) : 0;
    const onDefender = primary?.b === d.body ? 1 : -1;
    samples.push({ controllerT, endpointT: controllerT + dt, primaryActive: active,
      normal: active ? primary!.normalForce ?? 0 : 0, tangent: active ? primary!.tangentForce ?? 0 : 0,
      outwardImpulse: outside * onDefender * forceY * dt,
      separation: Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y),
      appliedRequest: { ...(intents[d.idx]?.vel ?? { x: 0, y: 0 }) }, decisionInterval: d.mind.decisionInterval });
    if (before) first = { ...before, after: structuredClone(this.bodies), report: structuredClone(report) };
    return report;
  });
  let result: ReturnType<typeof redirect>;
  try { result = redirect({ side }); }
  finally { step.mockRestore(); tick.mockRestore(); }
  if (!first) throw new Error('Native redirect never supplied an active hand interval');
  const input = first;
  const replay = (withHand: boolean) => {
    const graph = structuredClone(input.graph);
    const world = new World(graph.bodies, input.options); world.time = input.time;
    world.joints = graph.joints.filter((_, i) => withHand || i !== input.joint);
    const report = world.step(graph.intents, input.dt);
    return { bodies: graph.bodies, report };
  };
  return { result, samples, first: input, held: replay(true), free: replay(false) };
}

describe('redirect: actual loaded protection and the later free rush are separate contracts', () => {
  it.each([1, -1] as const)('the native hand really deflects the rusher outside and protects QB space, side %s', side => {
    const plain = redirect({ side });
    const r = observeRedirect(side);
    expect(r.result).toEqual(plain); // recording and deferred shadows cannot change the rep
    const loaded = r.samples.filter(s => s.primaryActive && s.normal > 0);
    expect(loaded.length).toBeGreaterThan(1); // sustained load, not one staged touch
    expect(loaded.some(s => Math.abs(s.tangent) > 0)).toBe(true);
    expect(loaded.reduce((sum, s) => sum + s.outwardImpulse, 0)).toBeGreaterThan(0);
    expect(r.result.peakNormal).toBeGreaterThan(0);
    expect(r.result.peakTangent).toBeGreaterThan(0);
    expect(r.result.finite).toBe(true);
    expect(r.result.maxPenetration).toBeLessThan(.2);
    expect(r.result.momentumError).toBeLessThan(1e-6);

    // This native World has not stepped yet. No unrepresented queued strike
    // may be omitted by the ablation. Full with-hand reproduction is required.
    expect(r.first.report.strikes).toHaveLength(0);
    expect(r.held.bodies).toEqual(r.first.after);
    const held = r.held.bodies[r.first.defender].pos, free = r.free.bodies[r.first.defender].pos;
    const qb = r.first.after[r.first.qb].pos;
    expect(r.first.outside * (held.y - free.y)).toBeGreaterThan(0);
    expect(Math.hypot(held.x - qb.x, held.y - qb.y)).toBeGreaterThan(Math.hypot(free.x - qb.x, free.y - qb.y));
    for (const arm of [r.held, r.free]) {
      expect(Math.abs(arm.report.work.residual)).toBeLessThan(1e-8);
      expect(arm.report.maxPenetration).toBeLessThan(.2); // torso contacts remain on in BOTH arms
    }
  });

  it.each([1, -1] as const)('a legally freed rusher can resume closing without fictitious hand load, side %s', side => {
    const r = observeRedirect(side);
    expect(r.result.cornerTurned).toBe(true);
    const release = r.samples.find(s => !s.primaryActive);
    expect(release).toBeDefined();
    // Techniques remove the hand after that tick's controller has requested
    // stand. The next ordinary update, not an instantaneous second reaction,
    // supplies the free World request. Its finite movement must close on QB.
    const next = r.samples.find(s => s.controllerT > release!.controllerT)!;
    expect(Math.hypot(next.appliedRequest.x, next.appliedRequest.y)).toBeGreaterThan(0);
    const end = r.samples.find(s => s.controllerT >= next.controllerT + next.decisionInterval)!;
    expect(end.separation).toBeLessThan(release!.separation);
    for (const s of r.samples.filter(s => s.controllerT >= next.controllerT && s.controllerT <= end.controllerT)) {
      expect(s.primaryActive).toBe(false);
      expect(s.normal).toBe(0);
      expect(s.tangent).toBe(0);
    }
    // carriedPast remains a reported whole-rep outcome; free steering after
    // release cannot retroactively be attributed to the tackle's hand work.
    expect(Number.isFinite(r.result.carriedPast)).toBe(true);
  });
});
