/** Counter kick-out against a squeezing end (src/sim/behaviors/blocking.ts):
 * KICK_INTERCEPT the flat pull track heads for where the end will be;
 * LOG_CONTACT    a kicker whose end crossed his face as they met logs him.
 * docs/reviews/run-offense.md ("What the gait exposed"). */
import { afterEach, describe, expect, it, vi } from 'vitest';
// DL_SQUEEZE=0: this recorded scene's defenders were staged without the squeeze;
// it tests another mechanism under the rule it was recorded with.
vi.hoisted(() => { process.env.DL_SQUEEZE = '0'; });
// These compare the flag on and off on plays recorded on the installed flat
// line (1.3 yd splits, 0.55 yd depth). The tracked line (OL_ALIGN) changes
// the plays themselves; it is judged by lab arms (docs/reviews/presnap.md).
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
// Recorded before DL_FLATTEN (on in the pinned profile) changed how an
// attacking lineman plays a zone step; the case keeps the old technique.
vi.hoisted(() => { process.env.DL_FLATTEN = '0'; });
// Recorded with FRONT_ALIGN's 1 technique on the centre's shoulder. AGAP_ALIGN
// (off in the profile) moves him into the gap, the over3 counter's kicker
// never meets the end, and the comparison has nothing to compare.
vi.hoisted(() => { process.env.AGAP_ALIGN = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function meet(flags: Record<string, string>, look: string) {
  vi.stubEnv('GAIT_STEP', '0.3');
  vi.stubEnv('PULL_STEP', '1');
  for (const k of ['KICK_INTERCEPT', 'LOG_CONTACT']) vi.stubEnv(k, flags[k] ?? '0');
  // The first-level gap blocks change where the line holds the end's
  // neighbours; this witness isolates the kicker (test/gap-blocks.test.ts).
  for (const k of ['GAP_FIT', 'GAP_OUT', 'CUTOFF_SEAL']) vi.stubEnv(k, '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const sim = makeSim({ concept: 'counter', dir: 'weak', formation: 'i_pro_21', look, roster: 'pair11', seed: 77 } as never, rosters());
  const ps = playSideSign(sim, sim.offCall.run!);
  const kicker = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'kick')!;
  const end = (kicker.behavior as InstanceType<typeof RunBlocker>).plan.target!;
  let outside: number | null = null, depth: number | null = null, drive: number | null = null, t0 = 0;
  while (sim.phase === 'live' && sim.t < 3 && depth === null) {
    sim.tick();
    if (outside === null && kicker.engagement?.defender === end) { outside = (kicker.pos.y - end.pos.y) * ps; t0 = sim.t; }
    if (outside !== null && sim.t >= t0 + .6) {
      depth = end.pos.x - sim.los;
      drive = kicker.engagement?.drive ? kicker.engagement.drive.y * ps : null;
    }
  }
  return { outside: outside!, depth: depth!, drive };
}

describe('counter kick-out against a squeezing end', () => {
  it.each(['wide9', 'over3'])('KICK_INTERCEPT: the kicker meets him from inside and holds him shallower (%s)', async look => {
    const off = await meet({}, look), on = await meet({ KICK_INTERCEPT: '1' }, look);
    expect(on.outside).toBeLessThan(off.outside);
    expect(on.outside).toBeLessThan(.05);
    expect(on.depth).toBeGreaterThan(off.depth + .3);
  }, 60000);

  it('LOG_CONTACT: met from his outside, the kicker drives him inside instead of out', async () => {
    const off = await meet({}, 'wide9'), on = await meet({ LOG_CONTACT: '1' }, 'wide9');
    expect(off.outside).toBeGreaterThan(.2);
    // Without the log he drives him out from the outside, or has lost him.
    expect(off.drive === null || off.drive > 0).toBe(true);
    expect(on.drive!).toBeLessThan(0);
    expect(on.depth).toBeGreaterThan(off.depth);
  }, 60000);
});
