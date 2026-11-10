/** RECEIVER_DEPTH (alignment.ts, playsim.ts; experimental, off): receivers on
 * the line stand where tracked receivers do, measured from the ball (outside
 * receiver 0.74 yd, tight end 0.83, with no defender in front), and one who
 * sees a press look before the snap sets 0.23 yd deeper. The rules still read
 * on and off the line from the formation, so legality does not change. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flag: string) {
  vi.stubEnv('RECEIVER_DEPTH', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { FORMATIONS } = await import('../src/playbook/formations.js');
  const make = (formation: string, coverage: string) =>
    new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed: 1, roster: 7, formation, flip: false })) as any;
  return { make, FORMATIONS };
}
const depth = (sim: any, slot: string) => +(sim.los - sim.slot(slot).pos.x).toFixed(2);

describe('RECEIVER_DEPTH', () => {
  it('on: an outside receiver on the line stands at 0.74, deeper facing a press corner; off-line receivers keep their depth', async () => {
    const { make } = await load('1');
    // Gun Doubles: X on the line (installed 0.6), Z off it (1.2); Cover 1 presses both.
    const press = make('gun_doubles_11', 'cover1');
    expect(depth(press, 'X')).toBeCloseTo(0.74 + 0.23, 2);
    expect(depth(press, 'Z')).toBeCloseTo(1.2, 2);
    // Cover 3 corners play off: no press look, the tracked base.
    const off = make('gun_doubles_11', 'cover3');
    expect(depth(off, 'X')).toBeCloseTo(0.74, 2);
  });

  it('on: an attached tight end stands at 0.83, deeper with a man set in front of him', async () => {
    const { make } = await load('1');
    const sim = make('ace_12', 'cover3');
    const d = depth(sim, 'Y');
    expect([0.83, 1.06]).toContainEqual(+d.toFixed(2));
  });

  it('off: the installed depths are unchanged', async () => {
    const { make } = await load('0');
    expect(depth(make('gun_doubles_11', 'cover1'), 'X')).toBeCloseTo(0.6, 2);
  });

  it('reads the same players on and off the line, with the same eligibility and fouls', async () => {
    const off = await load('0');
    const a = off.FORMATIONS.map((f: any) => JSON.stringify(off.make(f.id, 'cover1').snapAssessment));
    const on = await load('1');
    const b = on.FORMATIONS.map((f: any) => JSON.stringify(on.make(f.id, 'cover1').snapAssessment));
    expect(b).toEqual(a);
  });
});
