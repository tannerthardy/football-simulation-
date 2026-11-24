/** QB_BODY_SEEN (agent.ts arm/head, perception.ts): the passer's throwing motion and head are states of his body,
 * sampled with every perception record, so a defender learns of them only with his own delay. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('QB_BODY_SEEN: the arm and head are seen, not published', () => {
  it('a defender sees the passer start his motion and turn his head one observation delay late', async () => {
    // HEAD_FOLLOW=0 (engine-93, Coverage C14): this fixture turns the passer's head once by hand with every body idle; with
    // HEAD_FOLLOW an undriven head relaxes to the body, so the hand-set head would not hold. The test is about when a
    // defender sees the head, not who turns it. Owner QB: drive the head through the controller and drop the pin.
    vi.stubEnv('HEAD_FOLLOW', '0');
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { sim, defender: d } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const qb = sim.qb;
    for (const x of sim.agents) x.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
    for (let k = 0; k < 10; k++) sim.tick();
    expect(sim.see(d, qb).arm).toBe('set');
    // He starts his throwing motion and turns his head: from the next record on, his body shows it.
    sim.windupAt = sim.t; sim.deliveryAt = sim.t + 0.3;
    qb.head = 1.0;
    sim.tick();
    expect(qb.arm).toBe('load');
    const delay = d.mind.observationDelay(d.profile.reactionTime);
    const seenAt: number[] = [];
    for (let k = 0; k < 12; k++) { sim.tick(); if (sim.see(d, qb).arm !== 'set' && !seenAt.length) seenAt.push(k * sim.dt); }
    expect(seenAt.length).toBe(1);
    // Seen no earlier than his delay allows (within a tick), not at once.
    expect(seenAt[0]).toBeGreaterThanOrEqual(delay - 2 * sim.dt);
    expect(sim.see(d, qb).head).toBeCloseTo(1.0);
    expect(sim.see(d, qb, 0).head).toBeCloseTo(1.0);
  });
});
