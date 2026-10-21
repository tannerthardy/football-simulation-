/** COMBO_SOLO (src/sim/behaviors/blocking.ts): the man decides who stays.
 * Outside zone strong against a wide-nine front (zone lab case
 * oz/strong/ace_12/wide9/pair11/77): the tackle owns a double on the
 * 3-technique inside him with the guard. The guard takes the man alone;
 * the tackle runs the track past him and never touches him. Without the
 * flag the unjoined double never releases and the tackle drifts with no
 * one to block; with it he climbs to the double's linebacker. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// Recorded on the lab/generated rosters before FRONT_FIT (on in the pinned
// profile) put real tackles at DT_S/DT_W; the changed bodies change this
// scenario. Pin it off here. test/front-fit.test.ts covers the depth chart.
vi.hoisted(() => { process.env.FRONT_FIT = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function at(solo: boolean, t: number) {
  vi.stubEnv('COMBO_SOLO', solo ? '1' : '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker } = await import('../src/sim/behaviors/blocking.js');
  const sim = makeSim({ concept: 'oz', dir: 'strong', formation: 'ace_12', look: 'wide9', roster: 'pair11', seed: 77 } as never, rosters());
  const rt = sim.slot('RT')!, rg = sim.slot('RG')!, dt = sim.slot('DT_S')!;
  const backer = (rt.behavior as InstanceType<typeof RunBlocker>).plan.combination!.backer!;
  while (sim.phase === 'live' && sim.t < t) sim.tick();
  return { plan: (rt.behavior as InstanceType<typeof RunBlocker>).plan, rt, rg, dt, backer };
}

describe('COMBO_SOLO: the free member of a double climbs when his partner holds the man alone', () => {
  it('the tackle who ran past his man climbs to the linebacker instead of drifting', async () => {
    const off = await at(false, 1.6), on = await at(true, 1.6);
    for (const s of [off, on]) expect(s.dt.engagement?.blocker).toBe(s.rg);
    expect(off.plan.combination?.released).toBe(false);
    expect(off.rt.engagement).toBeNull();
    expect(on.plan.kind).toBe('climb');
    expect(on.plan.target).toBe(on.backer);
  }, 60000);
});
