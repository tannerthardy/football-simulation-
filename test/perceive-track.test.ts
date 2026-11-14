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
  // He faces the man: the loop runs only on a target in sight (in view, clear line).
  d.body.pos = { x: 50, y: 20 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = 0;
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

  it('on: behind a body the loop gets no new sample; the picture ages from the last clear one, then re-acquires', async () => {
    vi.stubEnv('PERCEIVE_TRACK', '1'); vi.resetModules();
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const { sim, defender: d } = f;
    sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
    d.engagement = null as any; sim.engagements.length = 0;
    const man = sim.slot('RB')!;
    // Everyone else is parked far away, except one standing body the man passes behind.
    const wall = sim.offense.find((x: any) => x !== man && x !== sim.qb)!;
    for (const o of sim.agents) if (o !== d && o !== man && o !== wall) { o.body.pos = { x: 5, y: 2 + o.idx }; o.body.vel = { x: 0, y: 0 };
      o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
    d.body.pos = { x: 50, y: 20 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = 0;
    wall.body.pos = { x: 53, y: 22.4 }; wall.body.vel = { x: 0, y: 0 };
    wall.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
    man.body.pos = { x: 56, y: 22.4 - 6 * 0.45 }; man.body.vel = { x: 0, y: 6 };
    d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as any;
    man.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 6 } }) } as any;
    const rows: { blocked: boolean; age: number; seeAge: number; x: number; y: number }[] = [];
    for (let k = 0; k < 30; k++) {
      sim.tick();
      const t = sim.track(d, man, 1, true), s = sim.see(d, man);
      rows.push({ blocked: !sim.inSight(d, man), age: t.age ?? 0, seeAge: s.age ?? 0, x: t.pos.x, y: t.pos.y });
    }
    const blocked = rows.map((r, i) => r.blocked ? i : -1).filter(i => i >= 0);
    expect(blocked.length).toBeGreaterThanOrEqual(2);
    const first = blocked[0], lastB = blocked[blocked.length - 1];
    // Before: the loop's own latency (TRACK_LATENCY, whole ticks).
    const loop = rows[0].age;
    expect(loop).toBeLessThanOrEqual(0.12 + 1e-9);
    expect(rows[first - 1].age).toBeCloseTo(loop, 6);
    // The last clear samples are still arriving for one latency; after that the picture ages.
    expect(rows[lastB].age).toBeGreaterThan(loop + 0.1);
    for (let i = first; i <= Math.min(rows.length - 1, lastB + 3); i++) {
      // While blocked and re-acquiring the picture ages tick by tick, never older than the choice-reaction picture.
      expect(rows[i].age).toBeLessThanOrEqual(Math.max(rows[i].seeAge, loop) + 1e-9);
      if (rows[i - 1].age > loop + 1e-9 && rows[i].age < rows[i].seeAge - 1e-9 && i <= lastB)
        expect(rows[i].age).toBeCloseTo(rows[i - 1].age + sim.dt, 6);
      // Continuous: the picture is carried forward on its velocity, so it does not jump (6 yd/s x one tick, with slack).
      expect(Math.hypot(rows[i].x - rows[i - 1].x, rows[i].y - rows[i - 1].y)).toBeLessThan(6 * sim.dt + 0.15);
    }
    // One latency after the line reopens the loop is back on its own latency.
    const back = rows.findIndex((r, i) => i > lastB && r.age <= loop + 1e-9);
    expect(back).toBeGreaterThan(lastB);
    expect(back).toBeLessThanOrEqual(lastB + 1 + Math.round(0.12 / sim.dt) + 1);
  });
});

