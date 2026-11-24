/** HEAD (src/sim/head.ts; experimental, off): one head per player, set by his technique's want, turned at GAZE's rate
 * within the neck range, over the shoulder already turned to for a target behind him; recorded, and used by see()'s
 * view half for coverage defenders (with SIGHT_COVER). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function scene(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const head = await import('../src/sim/head.js');
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, defender: d } = f;
  sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
  d.engagement = null as any; sim.engagements.length = 0;
  const man = sim.slot('RB')!;
  for (const o of sim.agents) if (o !== d && o !== man) { o.body.pos = { x: 5, y: 1 + o.idx * 0.9 }; o.body.vel = { x: 0, y: 0 };
    o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
  d.body.pos = { x: 50, y: 20 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = 0;
  man.body.pos = { x: 56, y: 20 }; man.body.vel = { x: 0, y: 0 };
  man.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
  return { head, sim, d, man };
}

describe('HEAD: one head per player', () => {
  it('off: no head is kept for anyone but the passer', async () => {
    const { sim, d } = await scene({ HEAD: '0' });
    d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as any;
    for (let k = 0; k < 6; k++) sim.tick();
    expect(d.head).toBeNull();
  });

  it('turns toward the want at no more than the head rate, within the neck range, and relaxes to body facing', async () => {
    const { head, sim, d, man } = await scene({ HEAD: '1' });
    // He faces downfield (+x); the want is a point straight to his left (+90 deg), then behind-left.
    let target = { x: 50, y: 30 };
    d.behavior = { kind: 'idle', update: (a: any) => { head.want(sim, a, target, 'zone'); return { vel: { x: 0, y: 0 }, facing: 0 }; } } as any;
    const heads: number[] = [];
    for (let k = 0; k < 8; k++) { sim.tick(); heads.push(d.head!); }
    for (let i = 1; i < heads.length; i++) expect(Math.abs(heads[i] - heads[i - 1])).toBeLessThanOrEqual(head.HEAD_RATE * sim.dt + 1e-9);
    expect(heads[heads.length - 1]).toBeCloseTo(Math.PI / 2, 6);
    // Behind him and to his left: the head is already turned left, so it stays left, at the neck limit.
    target = { x: 44, y: 20.5 };
    for (let k = 0; k < 4; k++) sim.tick();
    expect(d.head!).toBeCloseTo(Math.PI / 2, 6);
    expect(head.wantAt(d, sim.t)?.reason).toBe('zone');
    // No want: back to his body facing.
    d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as any;
    for (let k = 0; k < 8; k++) sim.tick();
    expect(d.head!).toBeCloseTo(0, 6);
    void man;
  });

  it('the neck range narrows with his speed: 90 deg standing, 45 at top speed, linear between', async () => {
    const { head, d } = await scene({ HEAD: '1' });
    const at = (v: number) => { d.body.vel = { x: v, y: 0 }; return head.neckRange(d); };
    expect(at(0)).toBeCloseTo(Math.PI / 2, 9);
    expect(at(d.profile.vmax)).toBeCloseTo(Math.PI / 4, 9);
    expect(at(2 * d.profile.vmax)).toBeCloseTo(Math.PI / 4, 9);
    expect(at(d.profile.vmax / 2)).toBeCloseTo((3 * Math.PI) / 8, 9);
  });

  it('at a sprint the head stops at the narrower range: a look further back is a body turn', async () => {
    const { head, sim, d } = await scene({ HEAD: '1' });
    const target = { x: 50, y: 30 };   // straight to his left (+90 deg)
    d.behavior = { kind: 'idle', update: (a: any) => { head.want(sim, a, target, 'ball'); return { vel: { x: a.profile.vmax, y: 0 }, facing: 0 }; } } as any;
    for (let k = 0; k < 30; k++) { sim.tick(); d.body.vel = { x: d.profile.vmax, y: 0 }; d.body.facing = 0; }
    expect(Math.abs(d.head!)).toBeLessThanOrEqual(head.neckRange(d) + 1e-9);
    expect(d.head!).toBeGreaterThan(Math.PI / 4 - 0.05);
  });

  it('over the shoulder already turned to: a target dead behind is reached on that side, not through the front', async () => {
    const { head } = await scene({ HEAD: '1' });
    expect(head.sideOf(-(170 * Math.PI) / 180, 0.5)).toBeGreaterThan(Math.PI / 2);
    expect(head.sideOf((170 * Math.PI) / 180, -0.5)).toBeLessThan(-Math.PI / 2);
    expect(head.sideOf(0.6, -0.5)).toBeCloseTo(0.6, 9);
  });

  it('with SIGHT_COVER: a man defender sees his receiver only once his head is turned to him', async () => {
    const { head, sim, d, man } = await scene({ HEAD: '1', SIGHT_COVER: '1' });
    // The receiver stands to his right (-90 deg). His technique first wants the QB-side point to his left, then the man.
    man.body.pos = { x: 50, y: 14 };
    let wantMan = false;
    d.behavior = { kind: 'man', update: (a: any) => { head.want(sim, a, wantMan ? man : { x: 50, y: 30 }, wantMan ? 'man' : 'qb'); return { vel: { x: 0, y: 0 }, facing: 0 }; } } as any;
    for (let k = 0; k < 12; k++) sim.tick();
    const away = sim.see(d, man);
    // His ordinary picture (SIGHT_COVER off for comparison would give it at every tick): the delay in his see().
    const ordinary = 0.30;
    // Head on the left, the man on his right: out of the cone, so the picture has aged beyond his delay.
    expect(away.age ?? 0).toBeGreaterThan(ordinary + 0.1);
    wantMan = true;
    const ages: number[] = [];
    for (let k = 0; k < 14; k++) { sim.tick(); ages.push(sim.see(d, man).age ?? 0); }
    // While the head swings across (pi rad at the head rate) it keeps ageing a tick at a time...
    for (let i = 1; i < ages.length && ages[i] > ordinary + 1e-9; i++) expect(ages[i]).toBeCloseTo(ages[i - 1] + sim.dt, 6);
    // ...and once it is on him and one delay has passed, the ordinary picture returns.
    const back = ages.findIndex((x) => Math.abs(x - ordinary) < 1e-9);
    expect(back).toBeGreaterThan(0);
    expect(back * sim.dt).toBeLessThanOrEqual(Math.PI / head.HEAD_RATE + ordinary + 2 * sim.dt);
  });

  it('LOOK_SIDE_HOLD: a target dead behind and a head near straight keeps one shoulder as the target crosses +-180 deg', async () => {
    const { head } = await scene({ HEAD: '1' });
    const who = {}, pi = Math.PI;
    // the head within 0.2 rad of straight: the raw sign of rel flips at +-pi; with a man held it must not
    const seq = [-170, -176, -179.5, 179.5, 176, 170, 176, -179, 179].map(d => (d * pi) / 180);
    const out = seq.map(r => head.sideOf(r, 0.05, who));
    expect(new Set(out.map(v => Math.sign(v))).size).toBe(1);
    // forward again (inside the exit margin) releases the hold
    expect(head.sideOf(0.4, 0.05, who)).toBeCloseTo(0.4, 9);
    expect(Math.sign(head.sideOf((170 * pi) / 180, 0.05, who))).toBe(1);
    // a head clearly turned the other way still decides
    expect(Math.sign(head.sideOf((170 * pi) / 180, -0.5, who))).toBe(-1);
  });
});
