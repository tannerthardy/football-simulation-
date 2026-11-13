/** FREE_BOUND (behaviors/qb.ts; experimental, off): for a rusher he sees
 * unblocked, the QB's felt time is at most how soon that man could hit him.
 * Repro geometry (Rules + Coaching, 2026-11-12, hitches vs Cover 2 seed 2
 * flipped under READ_PLAN): a free end 1.6-1.9 yd from a sliding QB, moving
 * across him at 5-6 yd/s. Constructed directly, since the play needs READ_PLAN. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setPlay(flag: string) {
  vi.stubEnv('FREE_BOUND', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'hitches', seed: 2, roster: 7, formation: 'gun_doubles_11', flip: true })) as any;
  while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
  return sim;
}

/** The QB's pressure() with only `d` rushing, seen at `at` yd beside him (in view), moving across him at `speed`
 * (and drifting away at `away`), on a picture 0.3 s old; nobody else near him. */
function felt(sim: any, at: number, speed: number, away = 0) {
  const qb = sim.qb, b = qb.behavior, d = sim.defense.find((x: any) => x.slot === 'DE_S') ?? sim.defense[0];
  const side = Math.sign(qb.pos.y - sim.ballY) || 1, f = qb.body.facing + side * Math.PI / 2;
  const back = { x: Math.cos(f), y: Math.sin(f) };                              // square beside his shoulder
  const pos = { x: qb.pos.x + back.x * at, y: qb.pos.y + back.y * at };
  const across = { x: -back.y * side, y: back.x * side };                       // perpendicular to the line to him
  const vel = { x: across.x * speed + back.x * away, y: across.y * speed + back.y * away };
  const orig = b.felt.bind(b);
  b.felt = (a: any, s: any, x: any) => x === d ? { pos, vel, age: 0.3, facing: Math.atan2(vel.y, vel.x), stance: null } : orig(a, s, x);
  const view = new Proxy(sim, { get(t: any, p: string | symbol) {
    if (p === 'defense') return [d];
    const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v; } });
  const out = b.pressure(qb, view).time;
  b.felt = orig;
  return out;
}

describe('FREE_BOUND', () => {
  it('a free end 1.6-1.9 yd away going across him is under half a second on, 1-2 s off', async () => {
    const on = await setPlay('1'), off = await setPlay('0');
    for (const at of [1.6, 1.9]) for (const speed of [5, 6]) {
      const away = 2;                                                           // the stale picture's drift away
      expect(felt(on, at, speed, away)).toBeLessThan(0.5);
      const o = felt(off, at, speed, away);
      expect(o).toBeGreaterThan(1); expect(o).toBeLessThan(2.2);
    }
  });

  it('a man he sees in a block is not bounded', async () => {
    const sim = await setPlay('1');
    const qb = sim.qb, b = qb.behavior;
    const d = sim.defense.find((x: any) => sim.offense.some((o: any) => o !== qb && Math.hypot(o.pos.x - x.pos.x, o.pos.y - x.pos.y) <= o.profile.reach + x.profile.radius));
    expect(d).toBeTruthy();
    expect(b.freeBound(qb, sim, d, b.felt(qb, sim, d))).toBe(Infinity);
  });

  it('beyond 3 yd it changes nothing', async () => {
    const on = await setPlay('1'), off = await setPlay('0');
    expect(felt(on, 8, 0)).toBeCloseTo(felt(off, 8, 0), 9);
  });
});
