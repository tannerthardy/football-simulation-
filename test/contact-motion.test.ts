import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactMotion } from '../src/sim/contact-motion.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { norm, type Vec2 } from '../src/core/vec.js';
import { supportParams } from '../src/physics/support.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('drive and acquired shoulder work have one contact-frame meaning', () => {
  it.each([-1, 1])('does not add the diagonal drive to an already complete shoulder speed, side=%s', side => {
    const tangent = { x: 0, y: side }, drive = norm({ x: 1, y: side * 1.8 });
    const v = contactMotion(drive, tangent, 2.4, 1.2);
    expect(v.y * side).toBeCloseTo(1.2, 12);
    expect(v.x).toBeCloseTo(drive.x * 2.4, 12);
    expect(Math.hypot(v.x, v.y)).toBeLessThan(Math.hypot(drive.x * 2.4, drive.y * 2.4 + side * 1.2));
  });

  it.each([0, .4, 1.2, Math.PI / 2 - 1e-10])('preserves the normal request without an angle-dependent multiplier, angle=%s', angle => {
    const tangent = { x: Math.sin(angle), y: Math.cos(angle) };
    const normal = { x: tangent.y, y: -tangent.x };
    const drive = { x: 1, y: 0 }, v = contactMotion(drive, tangent, 2.4, -1);
    expect(v.x * tangent.x + v.y * tangent.y).toBeCloseTo(-1, 12);
    expect(v.x * normal.x + v.y * normal.y).toBeCloseTo(2.4 * normal.x, 12);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(Math.hypot(2.4, 1) + 1e-12);
  });

  it('is invariant under rotation of the whole contact', () => {
    const rotate = (v: { x: number; y: number }) => ({ x: v.x * .6 - v.y * .8, y: v.x * .8 + v.y * .6 });
    const drive = norm({ x: 1, y: .7 }), tangent = norm({ x: -.4, y: 1 });
    const a = rotate(contactMotion(drive, tangent, 2, .3));
    const b = contactMotion(rotate(drive), rotate(tangent), 2, .3);
    expect(a.x).toBeCloseTo(b.x, 12); expect(a.y).toBeCloseTo(b.y, 12);
  });

  it('retains the ordinary orthogonal drive exactly', () => {
    expect(contactMotion({ x: 1, y: 0 }, { x: 0, y: -1 }, 2.4, .7)).toEqual({ x: 2.4, y: -.7 });
  });

  it.each([-1, 1])('publishes the complete shoulder component to the real stretch contact, side=%s', async side => {
    vi.stubEnv('RUN_CONTACT_COMPONENTS', '1'); vi.stubEnv('RUN_HANDS', '0'); vi.stubEnv('DL_HANDS', '0');
    vi.resetModules();
    const { updateEngagements } = await import('../src/sim/engagement.js');
    const { runContactObservers: observers } = await import('../src/sim/run-contact-observer.js');
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side });
    f.sim.offCall.run = RUN_BY_ID.wz_strong;
    f.engagement.surfaceAxis = { x: -.8, y: side * .6 };
    f.engagement.drive = norm({ x: 1, y: side * 1.8 });
    f.engagement.nextMoveAt = Infinity;
    const before = structuredClone(f.sim.agents.map(a => a.body));
    let movement: { anchored: boolean; lateral: number; lat: Vec2 } | undefined;
    observers.set(f.sim, (_e, phase, data) => { if (phase === 'movement') movement = data as typeof movement; });
    const commands = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    updateEngagements(f.sim, commands);
    expect(movement).toBeDefined(); expect(movement!.anchored).toBe(false);
    const v = commands[f.blocker.idx].vel, lat = movement!.lat;
    expect(v.x * lat.x + v.y * lat.y).toBeCloseTo(movement!.lateral, 12);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
    const report = f.sim.world.step(commands, f.sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of f.sim.agents) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
      expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
    }
  });

  it.each(['inside-zone', 'backdrive', 'pass'] as const)('preserves the existing %s request', async mode => {
    async function command(enabled: boolean) {
      vi.stubEnv('RUN_CONTACT_COMPONENTS', enabled ? '1' : '0'); vi.resetModules();
      const { updateEngagements } = await import('../src/sim/engagement.js');
      const f = contactFixture({ type: mode === 'pass' ? 'pass' : 'run', runBlock: 60, passBlock: 60 });
      f.engagement.nextMoveAt = Infinity;
      f.engagement.drive = norm({ x: 1, y: 1.8 });
      f.engagement.surfaceAxis = { x: -.8, y: .6 };
      if (mode === 'backdrive') {
        f.sim.offCall.run = RUN_BY_ID.wz_strong;
        f.blocker.body.vel.x = -.4;
        f.blocker.body.support!.felt = { x: -1000, y: 0 };
      }
      const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      updateEngagements(f.sim, intents);
      return { intent: intents[f.blocker.idx], rng: structuredClone(f.sim.rng),
        hands: { extension: f.engagement.hands!.extension, push: f.engagement.hands!.push,
          steer: f.engagement.hands!.steer, hold: f.engagement.hands!.hold } };
    }
    expect(await command(true)).toEqual(await command(false));
  });

  it('retains the same acquired hands and force limits while changing stretch feet', async () => {
    async function command(enabled: boolean) {
      vi.stubEnv('RUN_CONTACT_COMPONENTS', enabled ? '1' : '0'); vi.resetModules();
      const { updateEngagements } = await import('../src/sim/engagement.js');
      const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60 });
      f.sim.offCall.run = RUN_BY_ID.wz_strong;
      f.engagement.drive = norm({ x: 1, y: 1.8 }); f.engagement.surfaceAxis = { x: -1, y: 0 };
      f.engagement.nextMoveAt = Infinity;
      const hands = f.engagement.hands!;
      const before = structuredClone(f.sim.agents.map(a => a.body));
      const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      updateEngagements(f.sim, intents);
      expect(f.engagement.hands).toBe(hands);
      expect(f.sim.agents.map(a => a.body)).toEqual(before);
      return { vel: intents[f.blocker.idx].vel,
        hands: { extension: hands.extension, push: hands.push, hold: hands.hold, steer: hands.steer },
        profile: f.blocker.profile, axis: f.engagement.surfaceAxis, rng: structuredClone(f.sim.rng) };
    }
    const old = await command(false), next = await command(true);
    expect(next.vel).not.toEqual(old.vel);
    expect({ ...next, vel: old.vel }).toEqual(old);
  });
});
