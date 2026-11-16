/** FORECAST_BREAK (receiver-forecast.ts pathBreak; experimental, off): the break the quarterback expects is on the
 * installed route, not on the continuation past it (docs/reviews/2026-11-11-forecast-break.md). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Corner-flat against Cover 2 on the current engine (the reference stack, not vitest.config.ts's legacy pin), the
 * strong corner (the flat defender) sinking under the corner route from 0.6 s: the flat is left open. */
async function cornerFlat(flag: string, seed: number) {
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Flex to re-record with it on
  vi.stubEnv('DECLARED_BREAK', '0'); // engine-68: this file tests the legacy forecast's break; DECLARED_BREAK replaces that path
  vi.stubEnv('FORECAST_BREAK', flag);
  // Pinned off: with the back released he is a progression read, the leftover W2 route lands last, and QB_RHYTHM's
  // rhythm outlet (the last read) throws W2 as the "outlet" on moving off the corner (seeds 2 and 6: W2 open at
  // P 0.81, completed). That is the outlet rule, not this fixture's subject (docs/reviews/2026-11-11-forecast-break.md).
  vi.stubEnv('BACK_RELEASE', '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { goTo } = await import('../src/sim/behaviors/common.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'corner_flat', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team);
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  const s1 = sim.offense.find((o: any) => ref(o) === 'S1');
  const cb = sim.defense.find((d: any) => d.slot === 'CB_S'), orig = cb.behavior;
  cb.behavior = { kind: orig.kind, update: (a: any, s: any) => s.t < 0.6 ? orig.update(a, s) : goTo(a, { x: s.los + 15 * dir, y: s1.pos.y }, { speed: 0.95 }) };
  let target: any = null, flatBreak: number | null = null as number | null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (flatBreak === null && sim.qb.behavior.kind === 'qb-pass') {
      const s2 = sim.offense.find((o: any) => ref(o) === 'S2');
      flatBreak = sim.qb.behavior.receiverForecasts.get(s2)?.breakAt() ?? -1;
    }
    if (!air && sim.ball.kind === 'air' && !target) target = sim.ball.target;
  };
  sim.run();
  return { flatBreak: flatBreak ?? -1, target: target ? ref(target) : null, throwAt: sim.throwAt as number };
}

describe('FORECAST_BREAK', () => {
  it('off: the QB expects the flat to break at the sideline turn-up, about 6 s after the snap', async () => {
    expect((await cornerFlat('0', 1)).flatBreak).toBeGreaterThan(5);
  });

  it('on: the flat breaks when it does (about 1 s); open, it is thrown, and sooner than off', async () => {
    // The hand-written order reads the corner first (S1, S2, W1, B), so the flat comes after the corner's read:
    // 3.3-4.1 s here. Off, it is not "ready" until the order runs out (thrown 4/6 at 4.15 s, else W1).
    let on = 0, off = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const a = await cornerFlat('1', seed), b = await cornerFlat('0', seed);
      expect(a.flatBreak).toBeLessThan(1.5);
      expect(a.target, `seed ${seed}`).toBe('S2');
      on += a.throwAt; off += b.throwAt;
    }
    expect(on).toBeLessThan(off);
  });
});
