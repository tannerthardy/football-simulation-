import { describe, expect, it } from 'vitest';
import { supportParams } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { contactControl, updateEngagements } from '../src/sim/engagement.js';
import { spanFixture } from './fixtures/run-contact-span.js';

type Fixture = ReturnType<typeof spanFixture>;
const distance = (f: Fixture) => Math.hypot(f.blocker.pos.x-f.defender.pos.x, f.blocker.pos.y-f.defender.pos.y);

function freeStep(f: Fixture, commands: Intent[]) {
  const report = f.sim.world.step(commands.map(c => ({ ...c, free: true })), f.sim.dt);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
    expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
  }
  return report;
}

describe('run contact ends when neither body can still reach', () => {
  it('ends an acquired isolated rep beyond full arms, without a phantom contact, RNG draw or body edit', () => {
    const f = spanFixture();
    f.place(f.fullSpan + .05); // Outside full arms, inside the old extra .35 yd.
    const bodies = structuredClone(f.sim.agents.map(a => a.body));
    const rng = structuredClone(f.sim.rng), commands = f.commands(), original = structuredClone(commands);
    updateEngagements(f.sim, commands);
    expect(f.blocker.engagement).toBeNull();
    expect(f.defender.engagement).toBeNull();
    expect(f.sim.engagements).not.toContain(f.engagement);
    expect(f.sim.world.joints).not.toContain(f.engagement.hands);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(structuredClone(f.sim.rng)).toEqual(rng);
    expect(commands).toEqual(original);
    const report = freeStep(f, commands);
    expect(report.armImpulse.every(value => value === 0)).toBe(true);
    expect(report.work.hands).toBe(0);
  });

  it('retains full-extension reachable steering beyond the shorter working extension', () => {
    const f = spanFixture();
    f.place(f.fullSpan - .02);
    const commands = f.commands();
    updateEngagements(f.sim, commands);
    expect(f.blocker.engagement).toBe(f.engagement);
    expect(distance(f)).toBeGreaterThan(f.engagement.hands!.extension + .06);
    expect(f.engagement.hands!.actor).toBe(f.defender.body);
    freeStep(f, commands);
    expect(Math.abs(f.engagement.hands!.tangentForce!)).toBeGreaterThan(0);
    expect(f.engagement.hands!.normalForce).toBe(0);
  });

  it('retains a reachable acquired cloth hold and its actual tensile load', () => {
    const f = spanFixture();
    const holderSpan = f.radii + f.blocker.player.measurables.armIn / 36;
    f.place(Math.min(f.fullSpan, holderSpan) - .1);
    f.engagement.control = .8;
    f.engagement.holding = true;
    f.blocker.body.vel = { x: -.5, y: 0 };
    f.defender.body.vel = { x: .5, y: .8 };
    const commands = f.commands();
    updateEngagements(f.sim, commands);
    expect(f.blocker.engagement).toBe(f.engagement);
    expect(f.engagement.holding).toBe(true);
    expect(f.engagement.hands!.hold).toBe(supportParams(f.blocker.profile).armForce * 1.2);
    freeStep(f, commands);
    expect(f.engagement.hands!.normalForce).toBeLessThan(0);
  });

  it('retains a valid helper contact when the original primary has separated', () => {
    const f = spanFixture();
    const helper = f.sim.slot('LG')!;
    helper.body.pos = { x: f.defender.pos.x - .45, y: f.defender.pos.y + .3 };
    helper.body.facing = 0;
    expect(f.sim.engage(helper, f.defender, 'run', f.engagement.drive)).toBe(f.engagement);
    expect(contactControl(f.engagement, helper)).not.toBeNull();
    // Move only the primary away. The helper still owns the acquired joint.
    f.blocker.body.pos = { x: f.defender.pos.x - f.fullSpan - .05, y: f.defender.pos.y };
    const acquired = f.engagement.helperHands!.get(helper)!;
    const commands = f.commands();
    updateEngagements(f.sim, commands);
    expect(f.blocker.engagement).toBe(f.engagement);
    expect(helper.engagement).toBe(f.engagement);
    expect(f.sim.world.joints).toContain(acquired);
    expect(contactControl(f.engagement, helper)).not.toBeNull();
    freeStep(f, commands);
    expect(Math.hypot(acquired.normalForce!, acquired.tangentForce!)).toBeGreaterThan(0);
  });

  it('keeps the existing pass-contact grace beyond full arms', () => {
    const f = spanFixture('pass');
    f.place(f.fullSpan + .05);
    updateEngagements(f.sim, f.commands());
    expect(f.engagement.type).toBe('pass');
    expect(f.blocker.engagement).toBe(f.engagement);
    expect(f.defender.engagement).toBe(f.engagement);
    expect(f.sim.world.joints).toContain(f.engagement.hands);
  });

  it('still ends a pass rep beyond its existing separation grace', () => {
    const f = spanFixture('pass');
    f.place(f.fullSpan + .4);
    updateEngagements(f.sim, f.commands());
    expect(f.blocker.engagement).toBeNull();
    expect(f.defender.engagement).toBeNull();
    expect(f.sim.world.joints).not.toContain(f.engagement.hands);
  });
});
