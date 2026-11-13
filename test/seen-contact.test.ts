/** Seen contact (src/sim/seen-contact.ts): a block in progress is a visible state of both bodies, recorded from
 * physics each tick, and a third player learns it only through his own picture, with his delay. */
import { describe, expect, it } from 'vitest';

describe('seen contact', () => {
  it('a block in progress is seen by a third man one observation delay later, with both partners', async () => {
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { seenEngaged, seenEngagedWith, seenTaken, seenPartners } = await import('../src/sim/seen-contact.js');
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const { sim, defender: d } = f;
    const blocker = sim.engagements.find((e: any) => e.defender === d)?.blocker;
    expect(blocker).toBeTruthy();
    // A third man on the blocker's team, and one on the defender's team.
    const mate = sim.offense.find((o: any) => o !== blocker && o !== sim.qb)!;
    const dmate = sim.defense.find((x: any) => x !== d)!;
    sim.tick();
    expect(d.contactWith).toContain(blocker.idx);
    expect(blocker.contactWith).toContain(d.idx);
    for (let k = 0; k < 8; k++) sim.tick();
    expect(seenEngaged(sim, dmate, d)).toBe(true);
    expect(seenEngagedWith(sim, dmate, d)).toBe(blocker);
    expect(seenPartners(sim, dmate, d)).toContain(blocker);
    expect(seenTaken(sim, mate, d, 'my-team')).toBe(true);
    // The engagement ends: the picture still shows it for one delay, then not.
    sim.engagements.length = 0; d.engagement = null as any; blocker.engagement = null as any;
    sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
    sim.tick();
    expect(d.contactWith).toEqual([]);
    expect(seenEngaged(sim, dmate, d)).toBe(true);
    for (let k = 0; k < 8; k++) sim.tick();
    expect(seenEngaged(sim, dmate, d)).toBe(false);
  });
});
