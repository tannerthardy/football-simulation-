/** SIGHT_CARRIER (playsim.ts `sighted`; experimental, off): the carrier's picture of a man he cannot see is the last one
 * he had, ageing; he picks the man up again one delay after he comes back into sight. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene() {
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, defender: d } = f;
  sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
  d.engagement = null as any; sim.engagements.length = 0;
  const man = sim.slot('RB')!;
  for (const o of sim.agents) if (o !== d && o !== man) { o.body.pos = { x: 5, y: 1 + o.idx * 0.9 }; o.body.vel = { x: 0, y: 0 };
    o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
  // He runs straight downfield past a defender standing off his left; once passed, the defender turns and chases.
  man.body.pos = { x: 50, y: 20 }; man.body.vel = { x: 6, y: 0 }; man.body.facing = 0;
  man.behavior = { kind: 'idle', update: () => ({ vel: { x: 6, y: 0 }, facing: 0 }) } as any;
  d.body.pos = { x: 53, y: 22 }; d.body.vel = { x: 0, y: 0 };
  d.behavior = { kind: 'idle', update: (a: any) => a.pos.x > man.pos.x + 1.5 ? { vel: { x: 0, y: 0 } }
    : { vel: { x: 7 * Math.sign(man.pos.x - a.pos.x || 1), y: 0.5 * Math.sign(man.pos.y - a.pos.y) } } } as any;
  return { sim, man, d };
}

describe('SIGHT_CARRIER: a man behind him is the picture he last had', () => {
  it('behind his shoulders the picture holds where he last saw the man and ages; the plain picture follows him', async () => {
    const { sim, man, d } = await scene();
    const rows: { behind: boolean; age: number; plainAge: number; err: number; plainErr: number; x: number }[] = [];
    for (let k = 0; k < 24; k++) {
      sim.tick();
      const plain = sim.see(man, d), kept = (sim as any).sighted(man, d, plain, false);
      const b = Math.atan2(d.pos.y - man.pos.y, d.pos.x - man.pos.x) - man.body.facing;
      rows.push({ behind: Math.abs(Math.atan2(Math.sin(b), Math.cos(b))) > 1.8, age: kept.age ?? 0, plainAge: plain.age ?? 0,
        err: Math.hypot(kept.pos.x - d.pos.x, kept.pos.y - d.pos.y), plainErr: Math.hypot(plain.pos.x - d.pos.x, plain.pos.y - d.pos.y), x: kept.pos.x });
    }
    const behind = rows.map((r, i) => r.behind ? i : -1).filter(i => i >= 0);
    expect(behind.length).toBeGreaterThanOrEqual(6);
    const a = behind[0], z = behind[behind.length - 1];
    // In view: the ordinary picture.
    expect(rows[a - 1].age).toBeCloseTo(rows[a - 1].plainAge, 9);
    for (let i = a + 1; i <= z; i++) {
      // Behind him: it ages a tick at a time and moves only on the velocity he last saw, no jump.
      expect(rows[i].age).toBeCloseTo(rows[i - 1].age + sim.dt, 6);
      expect(Math.abs(rows[i].x - rows[i - 1].x)).toBeLessThan(7 * sim.dt + 1e-6);
    }
    // The plain picture keeps tracking the man he cannot see; the kept one is where he expects him, and falls behind.
    expect(rows[z].plainAge).toBeLessThan(rows[z].age);
    expect(rows[z].err).toBeGreaterThan(rows[z].plainErr);
  });

  it('when he turns to face the man again, the fresh picture takes over one delay later', async () => {
    const { sim, man, d } = await scene();
    for (let k = 0; k < 16; k++) { sim.tick(); (sim as any).sighted(man, d, sim.see(man, d), false); }
    // He turns round (a glance back is his choice; here he is simply turned).
    man.body.facing = Math.PI; man.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: Math.PI }) } as any;
    const ages: number[] = [], plain: number[] = [];
    for (let k = 0; k < 12; k++) { sim.tick(); const p = sim.see(man, d); plain.push(p.age ?? 0); ages.push(((sim as any).sighted(man, d, p, false).age ?? 0)); }
    const back = ages.findIndex((x, i) => Math.abs(x - plain[i]) < 1e-9);
    expect(back).toBeGreaterThan(0);
    expect(back).toBeLessThanOrEqual(Math.ceil(plain[0] / sim.dt) + 1);
  });
});
