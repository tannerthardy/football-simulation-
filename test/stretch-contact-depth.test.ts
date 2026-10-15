import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Body } from '../src/physics/kinematics.js';
import { World, type Intent } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import type { Perceived } from '../src/sim/perception.js';
import { planStretchFeet, type StretchFootOptions } from '../src/sim/stretch-footwork.js';

interface State {
  slot: string;
  now: number;
  body: Body;
  seen: Perceived;
  options: StretchFootOptions;
  oldChoice: { phase: string; vel: { x: number; y: number }; aim: { x: number; y: number } };
  oldCommand: Intent;
}
const saved = JSON.parse(readFileSync(new URL('./fixtures/stretch-contact-depth-state.json', import.meta.url), 'utf8'));
const states = saved.states as State[];

function fixture(input: State, mirror = false): State {
  const state = structuredClone(input), body = state.body;
  if (body.support?.since === null) body.support.since = -Infinity;
  if (mirror) {
    body.pos.y = 2 * CENTER_Y - body.pos.y; body.vel.y *= -1; body.facing *= -1;
    if (body.spin !== undefined) body.spin *= -1;
    if (body.squeezeHeading !== undefined) body.squeezeHeading *= -1;
    if (body.support) for (const key of ['xi', 'lean', 'load', 'felt', 'feetVel', 'fall', 'feltTip', 'accel', 'tipAccel'] as const) {
      const vector = body.support[key];
      if (vector) vector.y *= -1;
    }
    state.seen.pos.y = 2 * CENTER_Y - state.seen.pos.y; state.seen.vel.y *= -1; state.seen.facing *= -1;
    state.options.side *= -1; state.options.half *= -1;
    if (state.options.placementError !== undefined) state.options.placementError *= -1;
    state.oldCommand.vel.y *= -1;
    if (state.oldCommand.facing !== undefined) state.oldCommand.facing *= -1;
  }
  return state;
}

/** Unloaded first-beat control from the exact same pre-contact body. The
 * World supplies the movement and budgets; this cannot establish native
 * contact, a useful helper surface or a successful second-level fit. */
function step(state: State, intent: Intent) {
  const body = structuredClone(state.body), world = new World([body], { handContact: saved.worldDefaults.handContact });
  world.time = state.now;
  const report = world.step([intent], .05);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  expect(report.armImpulse).toEqual([0]);
  expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
    .toBeLessThanOrEqual(supportParams(body.profile).traction * .05 + 1e-8);
  expect(report.supportMotorWork[0]).toBeLessThanOrEqual(report.supportMotorWorkLimit[0] + 1e-8);
  expect(body.support!.state).toBe('up');
  return body;
}

describe('a shared half-man fit retains normal contact depth', () => {
  it('pins actual acquired fresh-front states without a hidden continuation', () => {
    expect(saved.provenance.revision).toBe('9518ce99a0936d0c71ce0b0ab5da394fdba786b2');
    expect(saved.provenance.sourceSha256).toBe('934a3637bf481fbcaea997de28339d81d0f6aa4a5be1bf9d4f553c614d82b443');
    expect(states.map(state => [state.slot, state.now])).toEqual([['C', .75], ['RT', .8]]);
    for (const state of states) {
      expect(state.seen.age).toBe(.25);
      expect(state.oldCommand.vel).toEqual(state.oldChoice.vel);
      const x=state.oldChoice.aim.x-state.seen.pos.x;
      const y=state.oldChoice.aim.y-state.seen.pos.y-(state.options.placementError??0);
      expect(x).toBeCloseTo(-state.options.bodyContact, 12);
      expect(y).toBeCloseTo(state.options.half, 12);
      expect(Math.hypot(x,y)).toBeGreaterThan(state.options.bodyContact);
    }
  });

  for (const input of states) it.each([false, true])(`${input.slot} requests the actual circle from the same state, mirrored=%s`, mirror => {
    const state=fixture(input, mirror), before=structuredClone(state);
    const draw=vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const choice=planStretchFeet(state.body, state.seen, state.options);
      expect(choice.phase).toBe('stretch');
      const x=choice.aim.x-state.seen.pos.x;
      const y=choice.aim.y-state.seen.pos.y-(state.options.placementError??0);
      expect(Math.hypot(x,y)).toBeCloseTo(state.options.bodyContact, 12);
      expect(y).toBeCloseTo(state.options.half, 12);
      expect(choice.vel.x).toBeGreaterThan(state.oldCommand.vel.x);
      const candidate={...state.oldCommand,vel:choice.vel,facing:choice.facing};
      const oldBody=step(state,state.oldCommand), newBody=step(state,candidate);
      expect(newBody.pos.x).toBeGreaterThan(oldBody.pos.x);
      expect(newBody.vel.x).toBeGreaterThan(oldBody.vel.x);
      expect(state).toEqual(before);
      expect(draw).not.toHaveBeenCalled();
      console.info('same-body stretch contact depth', JSON.stringify({slot:state.slot,mirror,
        oldRequest:state.oldCommand.vel,newRequest:choice.vel,oldX:oldBody.pos.x,newX:newBody.pos.x,
        oldVx:oldBody.vel.x,newVx:newBody.vel.x,phase:choice.phase}));
    } finally {draw.mockRestore();}
  });

  it.each([-1,1])('retains a real recovery arc when the defender obstructs the circle, side=%s', side => {
    const state=fixture(states[0]);
    state.body.pos={x:40.3,y:26};state.body.vel={x:.5,y:0};state.body.facing=Math.PI;
    state.seen.pos={x:40,y:26};state.seen.vel={x:0,y:0};
    state.options.side=side;state.options.half=side*.55;state.options.placementError=0;
    const before=structuredClone(state), choice=planStretchFeet(state.body,state.seen,state.options);
    expect(choice.phase).toBe('recover');
    expect(Math.hypot(choice.aim.x-state.seen.pos.x,choice.aim.y-state.seen.pos.y))
      .toBeGreaterThanOrEqual(state.options.bodyContact+.15-1e-12);
    expect(choice.aim.x).toBeGreaterThan(state.seen.pos.x);
    expect(state).toEqual(before);
  });
});
