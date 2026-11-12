/** DEF_BELIEF (behaviors/qb.ts; on since engine-43): his belief about how defenders close on a throw (the man on the
 * target moving partly with him; a defender arriving inside the securing window can still get the ball out).
 * Fixture from docs/reviews/2026-11-12-window-defenders.md, restated under OPEN_CARRY and FORECAST_HOLD (engine-44):
 * seam-hitch against Cover 1 from gun doubles, seed 2. The levels/Cover 3 play used at engine-42/43 moved with
 * FORECAST_HOLD: holding the route forecast, his window on the in-breaker reads clean (P 0.81-0.87, risk 0.002) and
 * he throws it into the strong safety coming down, with DEF_BELIEF on or off (a gap the window still has). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(defBelief: string) {
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('DEF_BELIEF', defBelief);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'seam_hitch', seed: 2, roster: 2, formation: 'gun_doubles_11', flip: false }));
  let target: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { const air = sim.ball.kind === 'air'; tick(); if (!air && sim.ball.kind === 'air' && !target) target = sim.ball.target; };
  const res = sim.run();
  return { target: target ? sim.offAlign.refOf[target.slot] ?? target.slot : null, int: res.events.some((e: any) => e.type === 'interception'),
    cmp: !!sim.stats.completed };
}

describe('DEF_BELIEF', () => {
  it('off: he throws the contested seam (S2) and it is intercepted', async () => {
    const r = await run('0');
    expect(r.target).toBe('S2');
    expect(r.int).toBe(true);
  });

  it('on: pricing how those defenders close (and the catch they can still break up), he passes it up for the back', async () => {
    const r = await run('1');
    expect(r.target).toBe('B');
    expect(r.int).toBe(false);
  });
});
