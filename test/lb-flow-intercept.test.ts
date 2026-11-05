/** FLOW_INTERCEPT (run-fits.ts flowLead): a flowing backer keeps inside-out
 * leverage on where the back could be by the time he can reach the backer's
 * depth, the soonest he could get there at his current speed if he turned up
 * now, never less than the backer's own two reads. Off: always two reads. A
 * zone back still crossing behind the line has almost no downhill speed, so a
 * lead from his downhill speed alone would send the backer far past him. */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(enabled: boolean) {
  vi.stubEnv('FLOW_INTERCEPT', enabled ? '1' : '0');
  vi.resetModules();
  const { flowLead, pullCueReads } = await import('../src/sim/run-fits.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  return { flowLead, pullCueReads, PlaySim, nativeTraceSetup };
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('flowLead', () => {
  it('leads by the soonest the back could reach the backer depth at his speed', async () => {
    const { flowLead } = await load(true);
    // Crossing flat behind the line at 6 yd/s, 6 yd short of the backer.
    expect(flowLead(6, { x: .3, y: 6 }, .3)).toBeCloseTo(6 / Math.hypot(.3, 6), 9);
    // Downhill speed alone would have projected him 20 s ahead (6 / 0.3).
    expect(flowLead(6, { x: .3, y: 6 }, .3)).toBeLessThan(1.1);
    // Never less than the backer's two reads, and a back level with or past
    // the backer gives no extra lead.
    expect(flowLead(.5, { x: 3, y: 6 }, .3)).toBe(.3);
    expect(flowLead(-1, { x: 3, y: 6 }, .3)).toBe(.3);
    // A back barely moving is not projected arbitrarily far.
    expect(flowLead(4, { x: 0, y: .2 }, .3)).toBe(4);
  });
  it('off: always the two reads', async () => {
    const { flowLead } = await load(false);
    expect(flowLead(6, { x: .3, y: 6 }, .3)).toBe(.3);
  });
});

/** The pull read compares the puller's arrival with the backer's landmark,
 * after the runner projection has moved it. A projection that has already
 * carried the landmark past the puller's arrival must not hide the pull: the
 * landmark before the projection still reads it (and the backer fills). A
 * pull read against the projected landmark is kept, and so is one against
 * neither (no read). Native power and counter snaps (48, 3 formations, 4
 * seeds, both flips) read the pull on the same ticks with and without this. */
describe('a flowing backer still reads the pull', () => {
  it('on: a pull within reach of the landmark before the projection reads', async () => {
    const { pullCueReads } = await load(true);
    // Puller arriving at y=3 moving +y; the projection has carried the landmark to 4.
    expect(pullCueReads(3, 1, 4, 1)).toBe(true);
    // Within reach of the projected landmark: as before.
    expect(pullCueReads(5, 1, 4, 1)).toBe(true);
    // Toward neither landmark, or out of reach: no read.
    expect(pullCueReads(0, 1, 4, 1)).toBe(false);
    expect(pullCueReads(12, 1, 4, 1)).toBe(false);
    // Mirrored.
    expect(pullCueReads(-3, -1, -4, -1)).toBe(true);
  });
  it('off: only the projected landmark counts', async () => {
    const { pullCueReads } = await load(false);
    expect(pullCueReads(3, 1, 4, 1)).toBe(false);
    expect(pullCueReads(5, 1, 4, 1)).toBe(true);
  });
});

/** Native outside zone in Ace: the back crosses behind the line toward the
 * strength. With the lead the Mike's flow read fires while the back is still
 * at the mesh and he moves play side; with two reads he has not flowed and
 * is still on the backside of his alignment at 1.6 s. */
async function mike(enabled: boolean, seed: number, flip: boolean) {
  const { PlaySim, nativeTraceSetup } = await load(enabled);
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'oz_strong', seed, roster: 7, formation: 'ace_11', flip }));
  const m = sim.slot('LB_M')!, back = sim.slot('RB')!, y0 = m.pos.y;
  let flowAt = Infinity, side = 0;
  while (sim.phase === 'live' && sim.t < 1.6 - 1e-9) {
    sim.tick();
    if (!side && Math.abs(back.vel.y) > 1) side = Math.sign(back.vel.y);
    if (flowAt === Infinity && m.tags.has('fit-flow-read')) flowAt = sim.t;
  }
  return { flowAt, lateral: (m.pos.y - y0) * side };
}

describe('a backer flows with a zone back still crossing behind the line', () => {
  for (const [seed, flip] of [[2, false], [2, true]] as const) {
    it(`oz_strong seed ${seed}${flip ? ' flipped' : ''}`, async () => {
      const on = await mike(true, seed, flip), off = await mike(false, seed, flip);
      expect(on.flowAt).toBeLessThan(1.0);
      expect(off.flowAt).toBeGreaterThan(1.0);
      expect(on.lateral).toBeGreaterThan(1.5);
      expect(off.lateral).toBeLessThan(0);
    });
  }
});
