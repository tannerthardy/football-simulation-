import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { DT } from '../src/core/units.js';
import { derivePhysical, solveSprint, sprintDistance } from '../src/players/physical.js';
import { generatePlayer } from '../src/players/generator.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { sprintTime, timeToReach } from '../src/physics/reach.js';
import { DRAG_SPIRAL, minFlightTime, qbArmSpeed, simulateTo, solveLaunch } from '../src/physics/ball.js';
import type { Player } from '../src/players/types.js';

function bodyFor(p: Player): Body {
  return { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: derivePhysical(p) };
}

describe('sprint model', () => {
  it('solves V and tau that reproduce the 10 split and 40 time', () => {
    const { vmax, tau } = solveSprint(1.5, 4.4);
    expect(sprintDistance(1.5, vmax, tau)).toBeCloseTo(10, 3);
    expect(sprintDistance(4.4, vmax, tau)).toBeCloseTo(40, 3);
    expect(vmax).toBeGreaterThan(10.2);
    expect(vmax).toBeLessThan(10.9);
    expect(tau).toBeGreaterThan(0.5);
    expect(tau).toBeLessThan(0.7);
  });

  it('sprintTime inverts sprintDistance, including a flying start', () => {
    const { vmax, tau } = solveSprint(1.62, 4.75);
    for (const d of [5, 10, 25, 40]) {
      const t = sprintTime(d, 0, vmax, tau);
      expect(sprintDistance(t, vmax, tau)).toBeCloseTo(d, 2);
    }
    expect(sprintTime(20, vmax, vmax, tau)).toBeCloseTo(20 / vmax, 3);
  });
});

describe('integrator', () => {
  const rng = new Rng(42);
  const wr = generatePlayer(rng, 'WR', { quality: 0.6 });

  function sprint40(): number {
    const b = bodyFor(wr);
    let t = 0;
    while (b.pos.x < 40 && t < 10) {
      stepBody(b, { vel: { x: 20, y: 0 } }, DT);
      t += DT;
    }
    return t;
  }

  it('a straight sprint in pads runs the 40 a little slower than the combine time', () => {
    const extra = sprint40() - wr.measurables.forty;
    // In-game top speed and burst are below combine levels: in pads, from a
    // football stance, with the gentler bursts 2022-23 tracking shows.
    expect(extra).toBeGreaterThan(0.1);
    expect(extra).toBeLessThan(0.9);
  });

  it('a runner who has been sprinting for a while has a lower top speed', () => {
    const fresh = bodyFor(wr);
    const loaded = bodyFor(wr);
    for (const b of [fresh, loaded]) b.vel = { x: b.profile.vmax, y: 0 };
    loaded.sprintLoad = 9;
    for (let i = 0; i < 20; i++) {
      fresh.sprintLoad = 0;
      stepBody(fresh, { vel: { x: 20, y: 0 } }, DT);
      stepBody(loaded, { vel: { x: 20, y: 0 } }, DT);
    }
    expect(loaded.vel.x).toBeLessThan(fresh.vel.x * 0.95);
  });

  it('cannot cut 90 degrees at full speed without bleeding speed', () => {
    const b = bodyFor(wr);
    b.vel = { x: b.profile.vmax, y: 0 };
    for (let i = 0; i < 6; i++) stepBody(b, { vel: { x: 0, y: b.profile.vmax } }, DT);
    // After 0.3 s the player is still carrying most of his downfield velocity.
    expect(b.vel.x).toBeGreaterThan(2);
  });

  it('backpedal is slower than running forward', () => {
    const fwd = bodyFor(wr);
    const back = bodyFor(wr);
    back.facing = Math.PI; // facing the QB, moving downfield
    for (let i = 0; i < 60; i++) {
      stepBody(fwd, { vel: { x: 20, y: 0 } }, DT);
      stepBody(back, { vel: { x: 20, y: 0 }, facing: Math.PI }, DT);
    }
    expect(back.pos.x).toBeLessThan(fwd.pos.x * 0.85);
  });

  it('timeToReach from rest approximates a straight sprint', () => {
    const b = bodyFor(wr);
    const t = timeToReach({ pos: b.pos, vel: b.vel, profile: b.profile }, { x: 40, y: 0 });
    expect(Math.abs(t - sprint40())).toBeLessThan(0.1);
    // Running the wrong way costs extra time.
    const tBack = timeToReach({ pos: b.pos, vel: { x: -8, y: 0 }, profile: b.profile }, { x: 40, y: 0 });
    expect(tBack).toBeGreaterThan(t + 0.5);
  });
});

describe('ball flight', () => {
  it('solveLaunch hits the target under drag', () => {
    const from = { x: 0, y: 0, z: 2.2 };
    const to = { x: 35, y: 8, z: 1.3 };
    const v = solveLaunch(from, to, 1.5, DRAG_SPIRAL);
    const land = simulateTo(from, v, 1.5, DRAG_SPIRAL);
    expect(Math.hypot(land.x - to.x, land.y - to.y, land.z - to.z)).toBeLessThan(0.06);
  });

  it('a strong arm gets a 40-yard throw there faster than a weak arm', () => {
    const from = { x: 0, y: 0, z: 2.2 };
    const to = { x: 40, y: 0, z: 1.3 };
    const strong = minFlightTime(from, to, qbArmSpeed(95));
    const weak = minFlightTime(from, to, qbArmSpeed(50));
    expect(strong).toBeLessThan(weak);
    expect(strong).toBeGreaterThan(1.1);
    expect(weak).toBeLessThan(2.4);
  });
});

describe('generator', () => {
  it('produces position-plausible athletes', () => {
    const rng = new Rng(7);
    const speeds: Record<string, number> = {};
    for (const pos of ['WR', 'OT', 'CB', 'DT'] as const) {
      let s = 0;
      for (let i = 0; i < 50; i++) s += derivePhysical(generatePlayer(rng, pos)).vmax;
      speeds[pos] = s / 50;
    }
    expect(speeds.WR).toBeGreaterThan(speeds.OT + 1);
    expect(speeds.CB).toBeGreaterThan(speeds.DT + 0.8);
  });
});
