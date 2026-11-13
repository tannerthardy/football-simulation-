/** DL_ANCHOR (engagement.ts runContactRead): an engaged run defender who is
 * doubled, or is being driven back by a real load, sits into his stance
 * (pads down); otherwise he keeps the installed run posture. Off: the
 * installed posture whatever the block. Under PAD_LEVERAGE pad level decides
 * whose feet carry the load (test/pad-leverage.test.ts). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { G } from '../src/core/units.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function posture(enabled: boolean, doubled: boolean, driven = false) {
  vi.stubEnv('DL_ANCHOR', enabled ? '1' : '0');
  vi.resetModules();
  const { contactCommands, contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11 });
  if (doubled) f.engagement.helpers = [f.sim.slot('LG')!];
  if (driven) {
    // A drive load the size of half his weight, and he is moving with it.
    const load = .5 * f.defender.profile.massKg * G;
    f.defender.body.support!.felt = { x: load, y: 0 };
    f.defender.body.vel = { x: .5, y: 0 };
  }
  return contactCommands(f)[f.defender.idx].posture;
}

describe('an engaged run defender sits into a drive', () => {
  it('off: the installed run posture, doubled or not', async () => {
    expect(await posture(false, true)).toBe(.85);
  });
  it('on: doubled, he sits', async () => {
    expect(await posture(true, true)).toBe(1);
  });
  it('on: driven back by a real load, he sits', async () => {
    expect(await posture(true, false, true)).toBe(1);
  });
  it('on: a single block he is not losing keeps the run posture', async () => {
    expect(await posture(true, false)).toBe(.85);
  });
});
