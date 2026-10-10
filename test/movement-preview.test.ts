import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { previewFreeMovement, type MovementSample } from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World, type Intent } from '../src/physics/world.js';

function body(): Body {
  return { pos: { x: 50, y: 6 }, vel: { x: 6, y: -5 }, facing: -.7, energy: 1,
    profile: { massKg: 95, radius: .29, reach: 1, heightYd: 2.05, vmax: 9.5, tau: 1.6,
      brake: 6.5, lateral: 7, turnRate: 8, backpedal: .68, shuffle: .6,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100,
      balance: .6, bend: .5, stepSpeed: 3.4, getUp: .9 }, support: newSupport(.35) };
}

const COMMAND: Intent = { vel: { x: 3, y: 5 }, facing: 1.2, effort: .85, cutSkill: 1.1, posture: .55 };

// Independent ordinary World construction deliberately avoids the preview's
// cache/reset path. The same held command is used, with no contacts or future
// controller decisions, so this is a movement-law contract rather than a
// promise that an opponent can be intercepted.
function independent(source: Body, intent: Intent, now: number, steps = 8): MovementSample[] {
  const predicted = structuredClone(source), world = new World([predicted]);
  world.time = now;
  const samples: MovementSample[] = [];
  for (let k = 0; k < steps; k++) {
    world.step([intent], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...predicted.pos }, vel: { ...predicted.vel },
      support: predicted.support!.state });
  }
  return samples;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function reflected(source: Body): Body {
  const mirror = structuredClone(source);
  mirror.pos.y *= -1; mirror.vel.y *= -1; mirror.facing *= -1;
  if (mirror.spin !== undefined) mirror.spin *= -1;
  if (mirror.squeezeHeading !== undefined) mirror.squeezeHeading *= -1;
  if (mirror.support) {
    for (const key of ['xi', 'lean', 'load', 'felt', 'feetVel', 'fall', 'tipAccel', 'feltTip', 'accel', 'strike'] as const) {
      const v = mirror.support[key];
      if (v) v.y *= -1;
    }
    if (mirror.support.yaw !== undefined) mirror.support.yaw *= -1;
  }
  return mirror;
}

describe('free-movement controller previews', () => {
  it.each(['fresh', 'tired and recovering', 'rising'] as const)('uses the production movement law for %s bodies', (kind) => {
    const source = body();
    source.spin = .8;
    if (kind === 'tired and recovering') {
      source.energy = .2; source.sprintLoad = 6;
      source.support!.xi = { x: .2, y: -.09 }; source.support!.out = .07;
      source.support!.accel = { x: -.7, y: .5 };
    } else if (kind === 'rising') {
      source.support!.state = 'rising'; source.support!.since = 8.5;
      source.vel = { x: .1, y: -.05 };
    }
    expect(previewFreeMovement(source, COMMAND, 9.2)).toEqual(independent(source, COMMAND, 9.2));
  });

  it('resets every candidate to the original body and time regardless of evaluation order', () => {
    const source = body();
    source.energy = .45; source.support!.xi = { x: .18, y: -.04 };
    const brake: Intent = { vel: { x: 0, y: 0 }, facing: -.7, posture: .7 };
    const first = previewFreeMovement(source, COMMAND, 3.7);
    const braking = previewFreeMovement(source, brake, 3.7);
    const repeated = previewFreeMovement(source, COMMAND, 3.7);
    expect(repeated).toEqual(first);
    expect(first).toEqual(independent(source, COMMAND, 3.7));
    expect(braking).toEqual(independent(source, brake, 3.7));
    expect(braking).not.toEqual(first);
    expect(previewFreeMovement(source, COMMAND, 12.4, 3)).toEqual(independent(source, COMMAND, 12.4, 3));
  });

  it('restores the start time before predicting a support transition', () => {
    const source = body();
    source.vel = { x: .1, y: -.05 };
    source.support!.state = 'rising'; source.support!.since = 8.5;
    const alreadyRecovered = previewFreeMovement(source, COMMAND, 12);
    const notYetRecovered = previewFreeMovement(source, COMMAND, 9.2);
    expect(alreadyRecovered).toEqual(independent(source, COMMAND, 12));
    expect(notYetRecovered).toEqual(independent(source, COMMAND, 9.2));
    expect(alreadyRecovered[0].support).toBe('up');
    expect(notYetRecovered[0].support).toBe('rising');
    expect(notYetRecovered.some((s) => s.support === 'up')).toBe(true);
  });

  it('does not mutate or alias the source, command, profile, or returned samples', () => {
    const source = freeze(body()), before = structuredClone(source), command = freeze(structuredClone(COMMAND));
    const samples = previewFreeMovement(source, command, 5);
    const expected = structuredClone(samples);
    expect(source).toEqual(before); expect(command).toEqual(COMMAND);
    expect(samples[0].pos).not.toBe(source.pos); expect(samples[0].vel).not.toBe(source.vel);
    expect(samples[0].pos).not.toBe(samples[1].pos); expect(samples[0].vel).not.toBe(samples[1].vel);
    samples[0].pos.x += 100; samples[0].vel.y -= 100;
    expect(source).toEqual(before);
    expect(samples[1]).toEqual(expected[1]);
    expect(previewFreeMovement(source, command, 5)).toEqual(expected);
  });

  it('clears optional gait and support fields when the real body no longer contains them', () => {
    const source = body();
    source.spin = 2; source.sprintLoad = 8; source.squeeze = .8; source.squeezeHeading = 1.8;
    source.support!.tipAccel = { x: 1, y: 2 }; source.support!.feltTip = { x: -.5, y: .4 };
    source.support!.accel = { x: -2, y: 1 }; source.support!.strike = { x: .2, y: -.1 };
    source.support!.foot = newVirtualFoot(source.pos);
    previewFreeMovement(source, COMMAND, 4);
    delete source.spin; delete source.sprintLoad; delete source.squeeze; delete source.squeezeHeading;
    source.support = newSupport();
    expect(previewFreeMovement(source, COMMAND, 4)).toEqual(independent(source, COMMAND, 4));
    delete source.support;
    expect(previewFreeMovement(source, COMMAND, 4)).toEqual(independent(source, COMMAND, 4));
    expect(source.support).toBeUndefined();
  });

  it('reflects turns, yaw, and balance recovery without a preferred side', () => {
    const source = body();
    source.spin = .7; source.squeeze = .2; source.squeezeHeading = -.4;
    source.support!.xi = { x: .18, y: -.1 }; source.support!.out = .06;
    source.support!.accel = { x: .6, y: -.7 }; source.support!.yaw = .3;
    const mirror = reflected(source);
    const a = previewFreeMovement(source, COMMAND, 7);
    const b = previewFreeMovement(mirror, { ...COMMAND, vel: { x: COMMAND.vel.x, y: -COMMAND.vel.y },
      facing: -COMMAND.facing! }, 7);
    for (let k = 0; k < a.length; k++) {
      expect(b[k].pos.x).toBeCloseTo(a[k].pos.x, 10); expect(b[k].pos.y).toBeCloseTo(-a[k].pos.y, 10);
      expect(b[k].vel.x).toBeCloseTo(a[k].vel.x, 10); expect(b[k].vel.y).toBeCloseTo(-a[k].vel.y, 10);
      expect(b[k].support).toBe(a[k].support); expect(b[k].t).toBe(a[k].t);
    }
  });
});
