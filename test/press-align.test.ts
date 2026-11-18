/** PRESS_ALIGN (src/playbook/alignment.ts; experimental, off): a press corner aligns a yard in front of his man, not
 * 1.3 yd past the line. Cover 1 press from gun doubles: on, both corners stand within 2 yd in front of their men at
 * the snap and never nearer the ball than half a yard past the line; off, they stand 2.2 yd or more in front. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function ahead(on: boolean) {
  vi.stubEnv('PRESS_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  return sim.defense.filter((d: any) => /^CB/.test(d.slot) && sim.defAlign.spots[d.slot]?.press).map((d: any) => {
    const m = sim.offense.find((o: any) => o.slot === sim.defAlign.spots[d.slot].manTarget);
    return { ahead: d.pos.x - m.pos.x, past: d.pos.x - sim.los };
  });
}

describe('PRESS_ALIGN', () => {
  it('sets the press corner a yard off his man', async () => {
    const off = await ahead(false), on = await ahead(true);
    expect(off.length).toBe(2);
    expect(off.every((c: any) => c.ahead >= 2.2)).toBe(true);
    expect(on.every((c: any) => c.ahead < 2 && c.past >= 0.5 - 1e-9)).toBe(true);
  }, 120000);
});
