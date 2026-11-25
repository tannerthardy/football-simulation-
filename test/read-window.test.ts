/** READ_WINDOW (behaviors/qb.ts; experimental, off) and FORECAST_FINISH (receiver-forecast.ts; on since engine-88,
 * provisional), QB lane 2026-11-18 (docs/reviews/2026-11-18-late-cross.md, 2026-11-18-forecast-finish.md).
 * 1. READ_WINDOW, on slant_flat from trips: no throw goes to a read his eyes have moved off (the plan's checkdown keeps
 *    one more look); off, many do. Not asserted: that no late flat remains. With the flag on, some still come (a key
 *    reorder puts the flat, never looked at, first after 2 s; the engine-88 section), which is why the flag is off.
 * 2. FORECAST_FINISH (quick_outs, ROUTE_FINISH): an out that finishes at its margin is forecast to stop there, as the
 *    receiver does; off, the forecast runs him on toward the sideline. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function panel(rw: string, ff: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('READ_WINDOW', rw); vi.stubEnv('FORECAST_FINISH', ff);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let reopened = 0, lateFlat = 0, throws = 0;
  for (const coverage of ['cover2', 'cover3', 'cover6', 'tampa2']) for (const roster of [3, 11]) for (const seed of [1, 3]) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'slant_flat', seed, roster, formation: 'gun_trips_11', flip }));
    const movedOff = new Set<unknown>(); let prev: unknown = null, done = false;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
      if (p === sim.qb && !done && target && intended && !away) {
        done = true; throws++;
        const b: any = p.behavior;
        if (movedOff.has(target) && target !== b.planOutlet) reopened++;
        if (sim.t >= 3.1 && arrivalT - sim.t >= 1.3 && target.behavior?.route?.id === 'flat') lateFlat++;
      }
      return tb(p, target, v0, intended, arrivalT, away, ...rest);
    };
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      const b: any = sim.qb.behavior;
      // After his set, as READ_WINDOW counts: before it the index is his drop's first look, not a read he has made.
      if (done || b?.kind !== 'qb-pass' || !b.reads || !(b.setAt >= 0)) return;
      const cur = b.reads[b.readIdx] ?? null;
      if (prev && cur !== prev) movedOff.add(prev);
      prev = cur;
    };
    try { sim.run(); } catch { /* a play that cannot finish staging */ }
  }
  return { reopened, lateFlat, throws };
}

/** The QB's 4 s forecast of each out with a finish (ROUTE_FINISH), taken 1.0-1.6 s after the snap: how far past the
 * finish toward the sideline it puts him (far: more than 3 yd; on, what remains is the forecast body braking from its
 * last point, about 2 yd). */
async function outs(ff: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('FORECAST_FINISH', ff);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let n = 0, far = 0, max = 0;
  for (const coverage of ['cover2', 'cover3']) for (const seed of [1, 2]) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'quick_outs', seed, roster: 7, formation: 'gun_trips_11', flip }));
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      const b: any = sim.qb.behavior;
      if (b?.kind !== 'qb-pass' || sim.ball.kind !== 'held' || sim.ball.carrier !== sim.qb) return;
      if (sim.t < 1.0 || sim.t > 1.6) return;
      for (const o of sim.offense) {
        const r: any = o.behavior, end = r?.path?.[r.path.length - 1];
        if (!end?.finish) continue;
        const f = b.receiverForecasts?.get(o)?.predict(sim.t, 4.0);
        if (!f) continue;
        // Past the finish toward the sideline (yd): the forecast running him on to the boundary.
        const mid = sim.ballY, d = Math.abs(f.y - mid) - Math.abs(end.p.y - mid);
        n++; max = Math.max(max, d); if (d > 3) far++;
      }
    };
    try { sim.run(); } catch { /* a play that cannot finish staging */ }
  }
  return { n, far, max };
}

describe('READ_WINDOW and FORECAST_FINISH', () => {
  it('a passed quick read is not thrown', async () => {
    const off = await panel('0', '0'), on = await panel('1', '1');
    console.log('read-window off', JSON.stringify(off), 'on', JSON.stringify(on));
    expect(off.reopened).toBeGreaterThan(0);
    expect(off.lateFlat).toBeGreaterThan(0);
    expect(on.reopened).toBe(0);
  }, 600_000);
  it('an out with a finish is forecast to stop on it', async () => {
    const off = await outs('0'), on = await outs('1');
    console.log('forecast-finish off', JSON.stringify(off), 'on', JSON.stringify(on));
    expect(on.n).toBeGreaterThan(10);
    expect(off.far).toBeGreaterThan(0);
    expect(on.far).toBe(0);
  }, 600_000);
});
