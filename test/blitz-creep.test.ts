/** BLITZ_CREEP (alignment.ts, experimental, off): a backer with a blitz
 * assignment stands at the tracked rusher depth (2.4 yd) instead of the
 * front's backer depth; backers without one are unchanged. Off: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(on: boolean) {
  vi.stubEnv('BLITZ_CREEP', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y);
  const pressure = PRESSURE_BY_ID.will_b;
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure, label: 'creep' },
    off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]);
  return { def, blitzers: Object.keys(pressure.blitzers) as DefSlot[] };
}

describe('BLITZ_CREEP: a blitzing backer stands where tracked rushers stand', () => {
  it('walks the blitzing backer up to 2.4 yd only with the flag; others keep their depth', async () => {
    const on = await align(true), off = await align(false);
    const lbBlitzers = on.blitzers.filter(s => s.startsWith('LB') && on.def.spots[s]);
    expect(lbBlitzers.length).toBeGreaterThan(0);
    for (const s of lbBlitzers) {
      expect(on.def.spots[s]!.pos.x - 40).toBeCloseTo(2.4, 6);
      expect(off.def.spots[s]!.pos.x - 40).toBeGreaterThan(2.4);
    }
    for (const s of Object.keys(on.def.spots) as DefSlot[]) if (!on.blitzers.includes(s)) expect(on.def.spots[s]!.pos).toEqual(off.def.spots[s]!.pos);
  });
});

describe('RUN_BLITZ: a called blitz still goes on a run', () => {
  async function blitzers(flag: string) {
    vi.stubEnv('RUN_BLITZ', flag); vi.stubEnv('BLITZ_CREEP', '1'); vi.resetModules();
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
    let through = 0, n = 0, tagged = 0;
    for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
      const setup: any = nativeTraceSetup({ coverage: 'cover3', concept: 'iz_strong', seed, roster: 7, formation: 'gun_doubles_11', flip });
      setup.defCall = { ...setup.defCall, pressure: PRESSURE_BY_ID.will_b };
      const sim: any = new PlaySim(setup); const dir = sim.attackDir(sim.offense[0].team);
      const bl = sim.defense.filter((d: any) => d.slot.startsWith('LB') && d.behavior?.kind === 'blitz');
      let best = new Map<any, number>(bl.map((b: any) => [b, Infinity]));
      while (sim.phase === 'live' && sim.t < 1.5) { sim.tick(); for (const b of bl) { best.set(b, Math.min(best.get(b)!, (b.pos.x - sim.los) * dir)); if (b.tags.has('run-blitz')) tagged++; } }
      for (const b of bl) { n++; if (best.get(b)! < 0) through++; }
    }
    return { through, n, tagged };
  }
  it('blitzing backers on inside zone get past the line more often with the flag, and only it tags the attack', async () => {
    const on = await blitzers('1'), off = await blitzers('0');
    expect(on.n).toBeGreaterThan(0);
    expect(on.through).toBeGreaterThan(off.through);
    expect(off.tagged).toBe(0);
    expect(on.tagged).toBeGreaterThan(0);
  }, 120_000);
});
