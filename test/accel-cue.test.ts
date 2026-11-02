import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.ACCEL_CUE = '1'; });
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';

/** ACCEL_CUE: a tackle keys his guard's first step from the push-off he can
 * see, the body's achieved acceleration, never the guard's command. The same
 * native outside-zone snap with the guard free to move, and with the guard's
 * body unable to move although his lateral command is unchanged. */
function snap(held: boolean) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'oz_strong', seed: 1, roster: 7, formation: 'ace_11', flip: false }));
  const dt = sim.defense.find(d => d.slot === 'DT_S')!;
  const guard = sim.offense.filter(o => ['LG', 'RG', 'C'].includes(o.slot))
    .reduce((m, o) => Math.abs(o.pos.y - dt.pos.y) < Math.abs(m.pos.y - dt.pos.y) ? o : m);
  // Held: his command is unchanged, but his body can barely move (a speed cap of 0.01 yd/s).
  if (held) (guard.profile as { vmax: number }).vmax = 0.01;
  let stepAt = Infinity, pushSeen = 0;
  while (sim.t < 0.4 - 1e-9) {
    sim.tick();
    pushSeen = Math.max(pushSeen, Math.abs(sim.see(dt, guard, 0.5).accel?.y ?? 0));
    if (stepAt === Infinity && dt.tags.has('key-step')) stepAt = sim.t;
  }
  return { stepAt, pushSeen };
}

describe('the first step seen from its push-off', () => {
  it('the tackle keys the guard\'s step from its push-off, before its speed shows', () => {
    const free = snap(false);
    expect(free.pushSeen).toBeGreaterThan(1.5);
    // Without the cue the step first shows at 0.35 s on this snap (its speed in the tackle's picture).
    expect(free.stepAt).toBeLessThanOrEqual(0.3 + 1e-9);
  });
  it('a guard whose body cannot move shows nothing, whatever he is told to do', () => {
    const held = snap(true);
    expect(held.pushSeen).toBeLessThan(0.1);
    expect(held.stepAt).toBe(Infinity);
  });
});
