/** OFF_VARIETY (playbook) and ZONE_IT (coverage), both experimental and off. Off, the playbook is as before; on, the
 * variety formations and the smash corner are callable, and quarters vs a strong-side stack installs Box. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(variety: boolean, zoneIt = false) {
  vi.resetModules();
  vi.stubEnv('OFF_VARIETY', variety ? '1' : '0');
  vi.stubEnv('ZONE_IT', zoneIt ? '1' : '0');
  return { ...(await import('../src/playbook/formations.js')), ...(await import('../src/playbook/concepts.js')),
    PlaySim: (await import('../src/sim/playsim.js')).PlaySim, nativeTraceSetup: (await import('../scripts/diag/command-trace.js')).nativeTraceSetup };
}

describe('OFF_VARIETY', () => {
  it('off: no variety formation and the deep corner in smash', async () => {
    const m = await load(false);
    expect(m.FORMATIONS.some((f) => ['gun_flex_11', 'gun_stack_11', 'gun_doubles_tight_11'].includes(f.id))).toBe(false);
    expect(m.PASS_BY_ID.smash.strong[2]).toBe('corner');
  });
  it('on: the three formations are installed and smash runs the smash corner', async () => {
    const m = await load(true);
    for (const id of ['gun_flex_11', 'gun_stack_11', 'gun_doubles_tight_11']) expect(m.FORMATION_BY_ID[id], id).toBeDefined();
    expect(m.PASS_BY_ID.smash.strong[2]).toBe('smash_corner');
  });
});

describe('ZONE_IT', () => {
  it('quarters vs the stack to the strength checks to Box only with the flag', async () => {
    for (const [zoneIt, want] of [[false, 'cover4'], [true, 'cover4_box']] as const) {
      const m = await load(true, zoneIt);
      const sim = new m.PlaySim(m.nativeTraceSetup({ coverage: 'cover4', concept: 'smash', seed: 1, roster: 1, formation: 'gun_stack_11', flip: true }));
      expect(sim.defCall.coverage.id).toBe(want);
    }
  });
});
