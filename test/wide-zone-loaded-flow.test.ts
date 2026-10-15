import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { World, type Intent, type Joint, type StepReport } from '../src/physics/world.js';
import { planStretchFeet, projectStretchFeet, type StretchFootOptions } from '../src/sim/stretch-footwork.js';
import type { Perceived } from '../src/sim/perception.js';

type SavedFrame = {
  t: number;
  dt: number;
  beforeBodies: Body[];
  afterBodies: Body[];
  final: Intent[];
  jointInputs: Record<string, any>[];
  jointOutputs: Record<string, any>[];
  pending: Record<string, any>[];
  report: unknown;
};
interface LoadedCase {
  id: string;
  frame: SavedFrame;
  cue: { t: number; picture: Perceived };
  movement: { axis: Vec2; mirror: number };
}

/** These four frames are controller/World fixtures, not late native restarts.
 * Keep the published all-22 state, including every other player's request.
 * The selected hands-only frames have no unrecorded grasp attachment state. */
const saved = (() => {
  const packet = JSON.parse(gunzipSync(readFileSync(new URL(
    '../docs/reviews/wide-zone-help-read/candidate.json.gz', import.meta.url))).toString());
  return { settings: packet.worldDefaults, source: packet.sourceSha256,
    cases: packet.panel.slice(0, 2).flatMap((panel: any) => [.55, .60].map(at => ({
      id: `${panel.input.id}@${at}`, frame: panel.frames.find((frame: SavedFrame) => frame.t === at) as SavedFrame,
      cue: panel.cues.filter((cue: any) => cue.kind === 'legacy-see' && cue.observer === 4
        && cue.target === 14 && cue.t <= at + 1e-9).at(-1),
      movement: panel.phases.find((phase: any) => phase.phase === 'movement' && phase.t === at
        && phase.rep.blocker.agent === 4).data,
    }))) as LoadedCase[] };
})();

const recorded = (value: unknown) => JSON.parse(JSON.stringify(value));

function reconstruct(frame: SavedFrame) {
  const bodies = structuredClone(frame.beforeBodies);
  for (const body of bodies) if (body.support?.since === null) body.support.since = -Infinity;
  const { substeps: _adaptive, ...settings } = saved.settings;
  const world = new World(bodies, settings);
  world.time = frame.t;
  const hydrate = (input: Record<string, any>) => {
    const joint = structuredClone(input);
    for (const key of ['a', 'b', 'actor', 'holder'])
      if (typeof joint[key] === 'number') joint[key] = bodies[joint[key]];
    return joint;
  };
  world.joints = frame.jointInputs.map(hydrate) as Joint[];
  Reflect.set(world, 'pending', frame.pending.map(hydrate));
  return { world, bodies, intents: structuredClone(frame.final) };
}

function joints(world: World) {
  return world.joints.map(joint => {
    const { a, b, ...rest } = joint;
    const output: Record<string, any> = { ...rest, a: world.indexOf(a), b: world.indexOf(b) };
    for (const key of ['actor', 'holder']) {
      const member = Reflect.get(joint, key);
      if (member !== undefined) output[key] = world.indexOf(member);
    }
    return recorded(output);
  });
}

function budgets(report: StepReport, bodies: Body[], dt: number) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const [i, b] of bodies.entries()) {
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(supportParams(b.profile).traction * dt + 1e-8);
  }
}

function options(b: Body, d: Body, half: number, side = -1): StretchFootOptions {
  // Declared exact-body counterfactual with no placement-error perturbation.
  // The archive does not claim to restore the player's private SnapMind.
  return { side, half, bodyContact: b.profile.radius + d.profile.radius,
    tempo: b.profile.vmax * .45, placementError: 0 };
}

describe('the published loaded combination has a reproducible physical counterfactual', () => {
  it.each(saved.cases)('$id reproduces the complete saved World step before changing any feet', ({ frame }) => {
    expect(saved.source).toBe('df7dae5752038a5b4b73651cf06eecee6fd1a02aa13d0e4f2fa9f12fe6d56e96');
    expect(frame.beforeBodies).toHaveLength(22);
    expect(frame.jointInputs.every(joint => joint.kind === 'hands')).toBe(true);
    expect(frame.pending).toHaveLength(0);
    const state = reconstruct(frame), input = recorded(state.bodies);
    expect(input).toEqual(frame.beforeBodies);
    const report = state.world.step(state.intents, frame.dt);
    expect(recorded(state.bodies)).toEqual(frame.afterBodies);
    expect(recorded(report)).toEqual(frame.report);
    expect(joints(state.world)).toEqual(frame.jointOutputs);
    expect(frame.beforeBodies).toEqual(input);
  });

  it.each(saved.cases)('$id changes only working feet from the last genuinely acquired cue', ({ frame, cue, movement }) => {
    const state = reconstruct(frame), b = state.bodies[4], d = state.bodies[14];
    const input = recorded({ bodies: state.bodies, joints: joints(state.world), pending: frame.pending,
      intents: state.intents, cue });
    // LG's .60 entry has no fresh query. Preserve the .55 query-time picture;
    // sim.see already predicted it once. Neither current truth nor a second
    // extrapolation is substituted for the missing acquisition.
    expect(cue.t).toBe(.55);
    expect(cue.picture.age).toBe(.25);
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const plan = planStretchFeet(b, cue.picture, options(b, d, .55));
      expect(plan.phase).toBe('collect');
      expect(plan.remaining).toBeLessThan(0);
      const velocity = projectStretchFeet(plan.vel, movement.axis, 2.4, movement.mirror);
      expect(recorded({ bodies: state.bodies, joints: joints(state.world), pending: frame.pending,
        intents: state.intents, cue })).toEqual(input);
      state.intents[4] = { ...state.intents[4], vel: velocity };
      const expected = structuredClone(frame.final); expected[4].vel = velocity;
      expect(state.intents).toEqual(expected);
      expect(joints(state.world)).toEqual(frame.jointInputs);
      const report = state.world.step(state.intents, frame.dt);
      budgets(report, state.bodies, frame.dt);
      expect(b.support!.state).toBe('up');
      expect(state.world.joints.some(joint => joint.kind === 'hands' && joint.a === b && joint.b === d)).toBe(true);
      expect(draws).not.toHaveBeenCalled();
      console.info('saved loaded feet', JSON.stringify({ t: frame.t, phase: plan.phase, remaining: plan.remaining,
        baselineRequest: frame.final[4].vel, candidateRequest: velocity,
        baselineDy: frame.afterBodies[4].pos.y - frame.beforeBodies[4].pos.y,
        candidateDy: b.pos.y - frame.beforeBodies[4].pos.y,
        hands: joints(state.world).filter(j => j.a === 4 && j.b === 14) }));
    } finally { draws.mockRestore(); }
    expect(frame.beforeBodies).toEqual(input.bodies);
  });
});

/** Independent physical response controls. Both foot choices start from the
 * same declared ordinary two-body contact, using saved profiles/hand limits.
 * DL requests are held for .30s; these are not naturally reacting native plays. */
function physicalControl(side: number, mode: 'brace' | 'outward' | 'inward' | 'obstructed') {
  const frame = saved.cases[0].frame;
  const b = structuredClone(frame.beforeBodies[4]), d = structuredClone(frame.beforeBodies[14]);
  for (const actor of [b, d]) if (actor.support?.since === null) actor.support.since = -Infinity;
  b.pos = { x: 40, y: 26 }; b.vel = { x: .5, y: side * .5 }; b.facing = 0;
  d.pos = { x: 40.85, y: mode === 'inward' ? 26 - side * .65 : 26 };
  d.vel = { x: 0, y: mode === 'outward' ? side * 2 : mode === 'inward' ? -side * 2 : 0 };
  d.facing = Math.PI;
  if (mode === 'obstructed') d.pos = { x: 38.95, y: 26 };
  const seen = { pos: { ...d.pos }, vel: { ...d.vel } };
  const axis = { x: -.485642931178632, y: -side * .8741572761215376 };
  const plan = planStretchFeet(b, seen, options(b, d, side * .55, side));
  const velocity = projectStretchFeet(plan.vel, axis, 2.4, saved.cases[0].movement.mirror);
  const joint = frame.jointInputs.find(j => j.a === 4 && j.b === 14)!;
  const world = new World([b, d]); world.time = .55;
  world.joints = [{ ...structuredClone(joint), a: b, b: d, actor: d }] as Joint[];
  const start = recorded([b, d]), reports: StepReport[] = [];
  for (let k = 0; k < 6; k++) {
    const report = world.step([{ ...frame.final[4], vel: velocity },
      { ...frame.final[14], vel: { ...seen.vel } }], .05);
    budgets(report, [b, d], .05);
    reports.push(report);
  }
  return { b, d, seen, axis, plan, velocity, start, reports, joints: joints(world) };
}

describe('the moving contact fit keeps ordinary opposing responses physical', () => {
  it.each([-1, 1])('initiates a reachable lateral request against a bracing DL, side=%s', side => {
    const f = physicalControl(side, 'brace');
    // A direct chord to the contact-circle shoulder clips the torso. The
    // recovery must still initiate real lateral loaded work around it.
    expect(f.plan.phase).toBe('recover');
    expect(f.velocity.y * side).toBeGreaterThan(0);
    expect((f.b.pos.y - f.start[0].pos.y) * side).toBeGreaterThan(0);
    expect(f.b.support!.state).toBe('up');
    expect(f.joints.some(j => Math.abs(j.normalForce ?? 0) + Math.abs(j.tangentForce ?? 0) > 0)).toBe(true);
  });

  it.each([-1, 1])('works with an outward-flowing DL through the same loaded law, side=%s', side => {
    const f = physicalControl(side, 'outward');
    expect(f.plan.phase).toBe('recover');
    expect((f.b.pos.y - f.start[0].pos.y) * side).toBeGreaterThan(0);
    expect((f.d.pos.y - f.start[1].pos.y) * side).toBeGreaterThan(0);
    expect(f.b.support!.state).toBe('up');
    expect(f.reports.reduce((sum, report) => sum + report.armImpulse[0] + report.armImpulse[1], 0))
      .toBeGreaterThan(0);
    expect(f.joints.some(j => Math.abs(j.normalForce ?? 0) + Math.abs(j.tangentForce ?? 0) > 0)).toBe(true);
  });

  it.each([-1, 1])('collects a real inward slant instead of enforcing lateral tempo, side=%s', side => {
    const f = physicalControl(side, 'inward');
    expect(f.plan.remaining).toBeLessThan(0);
    expect(f.plan.phase).not.toBe('stretch');
    expect(f.plan.vel.y * side).toBeLessThanOrEqual(0);
    expect(f.b.support!.state).toBe('up');
  });

  it.each([-1, 1])('uses a recovery arc when the DL torso obstructs the desired half, side=%s', side => {
    const f = physicalControl(side, 'obstructed');
    expect(f.plan.phase).toBe('recover');
    expect(Math.hypot(f.plan.aim.x - f.seen.pos.x, f.plan.aim.y - f.seen.pos.y))
      .toBeGreaterThan(f.b.profile.radius + f.d.profile.radius);
    expect(f.b.pos.x).toBeGreaterThan(f.d.pos.x);
    expect(f.b.support!.state).toBe('up');
  });
});
