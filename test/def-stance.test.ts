import { afterEach, describe, expect, it, vi } from 'vitest';

// DEF_STANCE is read when the modules load, so each arm imports the engine fresh.
async function front(flag: string) {
  vi.resetModules();
  vi.stubEnv('DEF_STANCE', flag);
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'iz_strong', seed: 1, roster: 7, formation: 'ace_11', flip: false }));
  return sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot))
    .map((d: any) => ({ slot: d.slot, pos: d.player.position, stance: d.setStance, posture: d.body.support.posture }));
}
afterEach(() => vi.unstubAllEnvs());

describe('DEF_STANCE: front defenders line up hand down or standing up', () => {
  it('interior men are down and low; an end played by a linebacker stands, at ordinary pad level', async () => {
    const on = await front('1');
    for (const d of on.filter((x: any) => /^(DT|NT)/.test(x.slot))) { expect(d.stance).toBe('down'); expect(d.posture).toBeCloseTo(0.7); }
    for (const d of on.filter((x: any) => x.slot.startsWith('DE') && x.pos === 'LB')) { expect(d.stance).toBe('up'); expect(d.posture).toBeCloseTo(0.3); }
    expect(on.some((x: any) => x.stance === 'up')).toBe(true);
  }, 60_000);

  it('off, no stance is set', async () => {
    const off = await front('0');
    expect(off.every((x: any) => x.stance === null)).toBe(true);
  }, 60_000);
});
