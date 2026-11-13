/** WR_SNAP (snap-count.ts planSnap; experimental, off): a wide receiver split
 * more than 4 yd from the ball starts on the ball he sees move (the visual
 * snap response a defender gets off with), not on the cadence with the line. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function starts(flag: string) {
  vi.stubEnv('WR_SNAP', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const wide: number[] = [], near: number[] = [];
  for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    for (const o of sim.offense) {
      if (o.player.position === 'WR' && Math.abs(o.pos.y - sim.ballY) > 4) wide.push(o.snapReadyAt);
      else if (o !== sim.qb) near.push(o.snapReadyAt);
    }
  }
  return { wide, near };
}

describe('WR_SNAP', () => {
  it('on: wide receivers start after seeing the ball move; everyone else keeps the cadence', async () => {
    const off = await starts('0'), on = await starts('1');
    expect(Math.max(...off.wide)).toBeLessThanOrEqual(0.1);
    expect(Math.min(...on.wide)).toBeGreaterThan(0.1);
    expect(on.near).toEqual(off.near);
  });
});
