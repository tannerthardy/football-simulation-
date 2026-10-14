import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import { World } from '../src/physics/world.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { TeammatePicture } from '../src/sim/teammate-information.js';
import { brakingTeammateForecast } from '../src/sim/traffic-forecast.js';

const PROFILE: PhysicalProfile = {
  massKg: 112, radius: .30, reach: 1, heightYd: 2.05, vmax: 9.5, tau: 1.4,
  brake: 6.5, lateral: 7, turnRate: 8, backpedal: .68, shuffle: .6,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 110,
  balance: .6, bend: .5, stepSpeed: 3.4, getUp: .9,
};
function picture(age = .3): Exclude<TeammatePicture, { source: 'unavailable' }> {
  return { source: 'observed', pos: { x: 40 + 2 * age, y: 20 }, vel: { x: 2, y: 0 },
    sampledAt: 1, availableAt: 1.3, age, predictedFor: Math.min(.3, age) };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('braking uncertainty from acquired teammate motion', () => {
  it('includes the unobserved braking interval before delivery using the unchanged World', () => {
    const seen = picture(), route = brakingTeammateForecast(seen, PROFILE, 1.3, .45)!;
    const body: Body = { pos: { x: 40, y: 20 }, vel: { x: 2, y: 0 },
      facing: 0, energy: 1, profile: { ...PROFILE }, support: newSupport() };
    const world = new World([body]); world.time = 1;
    for (let step = 1; step <= 15; step++) {
      world.step([{ vel: { x: 0, y: 0 } }], .05);
      if (step === 6) {
        expect(route.samples[0].pos).toEqual(body.pos);
        expect(route.samples[0].vel.x).toBeCloseTo(body.vel.x, 12);
        expect(route.samples[0].vel.y).toBeCloseTo(body.vel.y, 12);
      }
    }
    expect(route.samples.at(-1)!.pos).toEqual(body.pos);
    expect(route.samples.at(-1)!.vel).toEqual(body.vel);
    expect(route.samples[0].pos.x).toBeGreaterThan(40);
    expect(route.samples[0].pos.x).toBeLessThan(seen.pos.x);
    expect(route.samples.at(-1)!.vel).toEqual({ x: 0, y: 0 });
    expect(route.samples[0].t).toBe(0);
    expect(route.samples.at(-1)!.t).toBe(.45);
  });

  it('keeps coasting evidence intact and owns its returned samples without randomness', () => {
    const seen = freeze(picture()), profile = freeze({ ...PROFILE });
    const before = structuredClone(seen), draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const route = brakingTeammateForecast(seen, profile, 1.3, .4)!;
      const expected = structuredClone(route);
      route.samples[0].pos.x = -999;
      route.samples[1].vel.y = 999;
      expect(seen).toEqual(before);
      expect(profile).toEqual(PROFILE);
      expect(brakingTeammateForecast(seen, profile, 1.3, .4)).toEqual(expected);
      expect(draws).not.toHaveBeenCalled();
    } finally { draws.mockRestore(); }
  });

  it('does not turn tactile own velocity, installed calls or old zeroed memory into target braking', () => {
    for (const source of ['called', 'tactile'] as const)
      expect(brakingTeammateForecast({ ...picture(), source }, PROFILE, 1.3, .4)).toBeUndefined();
    expect(brakingTeammateForecast({ source: 'unavailable' }, PROFILE, 1.3, .4)).toBeUndefined();
    expect(brakingTeammateForecast({ ...picture(.35), source: 'remembered', vel: { x: 0, y: 0 } },
      PROFILE, 1.35, .4)).toBeUndefined();
    expect(brakingTeammateForecast({ ...picture(), vel: { x: 0, y: 0 } }, PROFILE, 1.3, .4)).toBeUndefined();
  });

  it('bounds the forecast by existing memory and samples fractional query times', () => {
    const seen = picture(.275), route = brakingTeammateForecast(seen, PROFILE, 1.275, 2)!;
    expect(route.validFor).toBeCloseTo(.725, 12);
    expect(route.samples[0].t).toBe(0);
    expect(route.samples.at(-1)!.t).toBe(route.validFor);
    expect(route.samples.every((sample, i) => i === 0 || sample.t > route.samples[i - 1].t)).toBe(true);
    expect(brakingTeammateForecast(seen, PROFILE, 1.275, 0)).toBeUndefined();
  });
});
