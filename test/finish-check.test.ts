/** SET_DECIDE's finish check (behaviors/qb.ts; experimental, off): he does not start a throw
 * he cannot finish before the rusher he sees closing arrives, that rusher's
 * delayed picture carried forward with the acceleration he has seen it gaining
 * (feltClosing), not at constant velocity. With TRACK_FEEL the rusher in front is felt through the tracking channel
 * and feltClosing's acceleration carry retires (acceleration is not perceived; timeToReach already brings him to top
 * speed): it returns felt() itself. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setPlay(seed: number, flag: string, feel = process.env.TRACK_FEEL ?? '0') {
  vi.stubEnv('SET_DECIDE', flag); vi.stubEnv('TRACK_FEEL', feel); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  return new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false })) as any;
}

/** The sim as he sees it with one defender moved to `at` (yd from him along his facing) running at him at `speed`. */
function closing(sim: any, at: number, speed: number) {
  const qb = sim.qb, d = sim.defense.find((x: any) => !x.engagement) ?? sim.defense[0], f = qb.body.facing;
  const pos = { x: qb.pos.x + Math.cos(f) * at, y: qb.pos.y + Math.sin(f) * at }, vel = { x: -Math.cos(f) * speed, y: -Math.sin(f) * speed };
  const seen = (x: any) => x === d ? { pos, vel, age: 0, facing: f + Math.PI, stance: null } : null;
  return { d, view: new Proxy(sim, { get(t: any, p: string | symbol) {
    // Both entry points: felt() reads see() or, under TRACK_FEEL, track().
    if (p === 'see') return (o: any, x: any, s?: number) => seen(x) ?? t.see(o, x, s);
    if (p === 'track') return (o: any, x: any, s?: number, g?: boolean) => seen(x) ?? t.track(o, x, s, g);
    if (p === 'defense') return [d];
    const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v; } }) };
}

describe('SET_DECIDE finish check', () => {
  it('feltClosing carries a rusher who is speeding up further along than the constant-velocity picture', async () => {
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      const sim = await setPlay(seed, '1', '0');
      while (sim.phase === 'live' && sim.t < 3 && sim.throwAt < 0) {
        sim.tick();
        const b = sim.qb.behavior;
        for (const d of sim.defense) {
          const seen = b.felt(sim.qb, sim, d), age = seen.age ?? 0;
          if (age <= 0) continue;
          const older = sim.perception.perceive(d.idx, age + sim.dt);
          const ax = (seen.vel.x - older.vel.x) / sim.dt, ay = (seen.vel.y - older.vel.y) / sim.dt;
          if (Math.hypot(ax, ay) < 2) continue;                       // a body clearly accelerating
          const c = b.feltClosing(sim.qb, sim, d);
          // Further along his acceleration than the constant-velocity picture, by a t^2/2 over the picture's age.
          const along = ((c.pos.x - seen.pos.x) * ax + (c.pos.y - seen.pos.y) * ay) / Math.hypot(ax, ay);
          expect(along).toBeCloseTo(0.5 * Math.hypot(ax, ay) * age * age, 9);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('TRACK_FEEL: feltClosing is felt() itself, with no acceleration carry', async () => {
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      const sim = await setPlay(seed, '1', '1');
      while (sim.phase === 'live' && sim.t < 3 && sim.throwAt < 0) {
        sim.tick();
        const b = sim.qb.behavior;
        for (const d of sim.defense) { expect(b.feltClosing(sim.qb, sim, d)).toEqual(b.felt(sim.qb, sim, d)); checked++; }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('TRACK_FEEL: a rusher who really runs at the set QB from 8 yd (his history recorded) stops the throw inside 1.5 yd', async () => {
    const sim = await setPlay(1, '1', '1');
    while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
    const qb = sim.qb, b = qb.behavior, f = qb.body.facing, side = f + 1.2;
    const d = sim.defense.find((x: any) => !x.engagement) ?? sim.defense[0];
    for (const e of [...sim.engagements]) sim.disengage(e);
    // Only the approach is staged: the QB holds where he set (his behaviour, and its finish check, kept aside) and
    // everyone else stands clear, so the man runs a free lane at him inside his view from 8 yd.
    qb.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: f }) } as any; qb.body.vel = { x: 0, y: 0 };
    for (const o of sim.agents) if (o !== qb && o !== d) { o.body.pos = { x: 5, y: 1 + o.idx * 0.9 }; o.body.vel = { x: 0, y: 0 };
      o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
    d.body.pos = { x: qb.pos.x + Math.cos(side) * 8, y: qb.pos.y + Math.sin(side) * 8 };
    d.body.vel = { x: 0, y: 0 }; d.body.facing = side + Math.PI;
    d.behavior = { kind: 'idle', update: (a: any) => { const dx = qb.pos.x - a.pos.x, dy = qb.pos.y - a.pos.y, l = Math.hypot(dx, dy) || 1;
      return { vel: { x: 6 * dx / l, y: 6 * dy / l }, facing: Math.atan2(dy, dx) }; } } as any;
    // His approach is recorded tick by tick from 8 yd, so no picture still holds him somewhere else.
    for (let k = 0; k < 40 && sim.phase === 'live' && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 1.5; k++) sim.tick();
    expect(Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y)).toBeLessThanOrEqual(1.6);
    expect(b.felt(qb, sim, d).age).toBeLessThanOrEqual(0.12 + 1e-9);
    expect(b.canFinish(qb, sim)).toBe(false);
  });

  it('he cannot finish with a rusher closing at 1 yd, and can with him 8 yd away', async () => {
    const sim = await setPlay(1, '1');
    while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
    const b = sim.qb.behavior;
    expect(b.canFinish(sim.qb, closing(sim, 1.5, 6).view)).toBe(false);
    expect(b.canFinish(sim.qb, closing(sim, 8, 0).view)).toBe(true);
  });

  it('off, nothing checks: plays are the same as before the flag', async () => {
    // His pass behaviour's own count: by the end of the play he may be a carrier (a scramble), with no such field.
    const run = async (flag: string) => { const sim = await setPlay(2, flag); let pass: any = null;
      while (sim.phase === 'live' && sim.t < 6) { if (sim.qb.behavior.kind === 'qb-pass') pass = sim.qb.behavior; sim.tick(); }
      return [sim.throwAt, sim.t, pass?.noFinish]; };
    const off = await run('0');
    expect(off[2]).toBe(0);
  });
});
