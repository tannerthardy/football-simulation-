/** SIGHT_COVER (playsim.ts `see` / `sighted`; experimental, off): a man or zone defender's picture of a receiver who
 * passes behind a body is the newest moment he had him in sight, ageing; off, see() is unchanged. Occlusion only: no
 * facing bound with GAZE off (his eyes are on his man by coaching). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(on: boolean) {
  vi.stubEnv('SIGHT_COVER', on ? '1' : '0'); vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, defender: d } = f;
  sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
  d.engagement = null as any; sim.engagements.length = 0;
  const man = sim.slot('RB')!, wall = sim.offense.find((x: any) => x !== man && x !== sim.qb)!;
  for (const o of sim.agents) if (o !== d && o !== man && o !== wall) { o.body.pos = { x: 5, y: 1 + o.idx * 0.9 }; o.body.vel = { x: 0, y: 0 };
    o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
  // A defender in man coverage, facing away from his man (no facing bound applies): the man crosses behind a body.
  d.body.pos = { x: 50, y: 20 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  d.behavior = { kind: 'man', update: () => ({ vel: { x: 0, y: 0 }, facing: Math.PI }) } as any;
  wall.body.pos = { x: 52.5, y: 20 }; wall.body.vel = { x: 0, y: 0 }; (wall.body.support as any).posture = 0;
  wall.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
  (wall as any).profile = { ...wall.profile, heightYd: 79 / 36 };
  man.body.pos = { x: 56, y: 20 - 6 * 0.6 }; man.body.vel = { x: 0, y: 6 };
  man.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 6 } }) } as any;
  const rows: { age: number; y: number }[] = [];
  for (let k = 0; k < 24; k++) { sim.tick(); const p = sim.see(d, man); rows.push({ age: p.age ?? 0, y: p.pos.y }); }
  return rows;
}

describe('SIGHT_COVER: a receiver behind a body is the picture he last had', () => {
  it('off: the ordinary delayed picture throughout', async () => {
    const rows = await scene(false);
    expect(new Set(rows.slice(4).map((r) => r.age.toFixed(3))).size).toBe(1);
  });

  it('on: behind the body the picture ages from the last clear moment and moves on, with no jump; facing away does not blind him', async () => {
    const off = await scene(false), on = await scene(true);
    const base = off[off.length - 1].age;
    // Before the crossing: the ordinary picture even though he faces away (occlusion only).
    expect(on[Math.round(base / 0.05) + 2].age).toBeCloseTo(base, 9);
    // Somewhere during the crossing it is older than the ordinary picture, by more than a tick.
    expect(Math.max(...on.map((r) => r.age))).toBeGreaterThan(base + 0.1);
    // (The first ticks' pictures predate the staging, one delay's worth, in both arms.)
    for (let i = Math.round(base / 0.05) + 2; i < on.length; i++) expect(Math.abs(on[i].y - on[i - 1].y)).toBeLessThan(6 * 0.05 + 0.31);
    // After it, the ordinary picture again.
    expect(on[on.length - 1].age).toBeCloseTo(base, 9);
  });
});
