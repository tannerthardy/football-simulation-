/** OPEN_NEED (defense.ts; experimental, off), step 1: `openForNeed` called without a state is `openTo` exactly, so the
 * carries routed through it (the match corner's man carry, the zone deep carry, the underneath open carry) do not
 * move. Fixed plays (four verts and comebacks against Cover 3 match and Cover 4, seeds 1-4), CARRY_READ off and on:
 * every body's position on every tick is identical with OPEN_NEED off and on. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function trace(openNeed: string, carryRead: string) {
  vi.resetModules();
  vi.stubEnv('OPEN_NEED', openNeed);
  vi.stubEnv('CARRY_READ', carryRead);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: number[] = [];
  for (const coverage of ['cover3_match', 'cover4']) for (const concept of ['four_verts', 'comebacks']) for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); for (const a of sim.defense) out.push(a.pos.x, a.pos.y); };
    sim.run();
  }
  return out;
}

describe('OPEN_NEED step 1: the carry through openForNeed is the carry through openTo', () => {
  for (const carry of ['0', '1']) it(`identical bodies on every tick, CARRY_READ=${carry}`, async () => {
    const off = await trace('0', carry), on = await trace('1', carry);
    expect(on.length).toBe(off.length);
    expect(off.length).toBeGreaterThan(1000);
    for (let i = 0; i < off.length; i++) if (on[i] !== off[i]) throw new Error(`diverged at sample ${i}: ${off[i]} vs ${on[i]}`);
  });
  it('the fixture reaches the carry: CARRY_READ moves these plays', async () => {
    const a = await trace('0', '0'), b = await trace('0', '1');
    expect(a.some((v, i) => v !== b[i])).toBe(true);
  });
});
