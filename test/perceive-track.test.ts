/** PERCEIVE_TRACK (playsim.ts `track`; experimental, off): the tracking channel's entry point
 * (docs/reviews/2026-11-13-perception-proposal.md, step 0). Off, `track()` is exactly `see()`, so no consumer can move
 * when it switches to `track()` with the flag off. On, an attended opponent is seen through the short tracking loop
 * (TRACK_LATENCY), fresher than the choice-reaction picture, and teammates are seen as before. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(on: boolean) {
  vi.stubEnv('PERCEIVE_TRACK', on ? '1' : '0'); vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, defender: d } = f;
  sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
  d.engagement = null as any; sim.engagements.length = 0;
  const man = sim.slot('RB')!, mate = sim.defense.find((x: any) => x !== d)!;
  d.body.pos = { x: 50, y: 20 }; d.body.vel = { x: 0, y: 0 };
  man.body.pos = { x: 56, y: 20 }; man.body.vel = { x: 0, y: 0 };
  d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as any;
  // He breaks from rest across the defender's face at 6 yd/s.
  man.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 6 } }) } as any;
  const out: { track: any; see: any; mateTrack: any; mateSee: any; truthY: number }[] = [];
  for (let k = 0; k < 12; k++) {
    sim.tick();
    out.push({ track: sim.track(d, man), see: sim.see(d, man), mateTrack: sim.track(d, mate), mateSee: sim.see(d, mate), truthY: man.pos.y });
  }
  return out;
}

describe('PERCEIVE_TRACK step 0: the tracking entry point', () => {
  it('off: track() is see(), picture for picture', async () => {
    for (const r of await scene(false)) {
      expect(r.track).toEqual(r.see);
      expect(r.mateTrack).toEqual(r.mateSee);
    }
  });

  it('on: an attended opponent is seen fresher than the choice-reaction picture; teammates unchanged', async () => {
    const rows = await scene(true);
    for (const r of rows) {
      expect(r.track.age).toBeLessThanOrEqual(0.12 + 1e-9);
      expect(r.track.age).toBeLessThan(r.see.age);
      expect(r.mateTrack).toEqual(r.mateSee);
    }
    // 0.6 s into his break the tracked picture has his speed; the choice-reaction picture is still short of it.
    const late = rows[rows.length - 1];
    expect(late.track.vel.y).toBeGreaterThan(late.see.vel.y);
    expect(Math.abs(late.track.pos.y - late.truthY)).toBeLessThan(Math.abs(late.see.pos.y - late.truthY));
  });
});
