/** SET_DECIDE's finish check (behaviors/qb.ts; experimental, off): he does not start a throw
 * he cannot finish before the rusher he sees closing arrives, that rusher's
 * delayed picture carried forward with the acceleration he has seen it gaining
 * (feltClosing), not at constant velocity. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setPlay(seed: number, flag: string) {
  vi.stubEnv('SET_DECIDE', flag); vi.resetModules();
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
    if (p === 'see') return (o: any, x: any, s?: number) => seen(x) ?? t.see(o, x, s);
    if (p === 'defense') return [d];
    const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v; } }) };
}

describe('SET_DECIDE finish check', () => {
  it('feltClosing carries a rusher who is speeding up further along than the constant-velocity picture', async () => {
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      const sim = await setPlay(seed, '1');
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

  it('he cannot finish with a rusher closing at 1 yd, and can with him 8 yd away', async () => {
    const sim = await setPlay(1, '1');
    while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
    const b = sim.qb.behavior;
    expect(b.canFinish(sim.qb, closing(sim, 1.5, 6).view)).toBe(false);
    expect(b.canFinish(sim.qb, closing(sim, 8, 0).view)).toBe(true);
  });

  it('off, nothing checks: plays are the same as before the flag', async () => {
    const run = async (flag: string) => { const sim = await setPlay(2, flag);
      while (sim.phase === 'live' && sim.t < 6) sim.tick(); return [sim.throwAt, sim.t, sim.qb.behavior.noFinish]; };
    const off = await run('0');
    expect(off[2]).toBe(0);
  });
});
