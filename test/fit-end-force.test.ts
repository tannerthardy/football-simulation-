/** FIT_END_FORCE (run-fits.ts; experimental, off), ported from #397: without
 * an installed flat or curl/flat seat, run force comes from a player head-up
 * on or outside the end man on the line; a box backer inside him keeps his
 * gap. Installed seats still own force from any alignment. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Every force player on trap from a few formations and two-high / man calls:
 * is he inside the end man, and does he hold an installed flat seat? */
async function forces(flag: string) {
  vi.stubEnv('FIT_END_FORCE', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { slot: string; inside: boolean; seat: boolean }[] = [];
  for (const formation of ['gun_wing_12', 'ace_11', 'gun_doubles_11', 'i_pro_21']) for (const coverage of ['cover4', 'cover2', 'cover6', 'cover1']) for (let seed = 1; seed <= 3; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'trap', seed, roster: 7, formation, flip: false }));
    for (const d of sim.defense) {
      const j = d.runFit; if (j?.kind !== 'force') continue;
      const edgeY = j.side === sim.offAlign.strongSign ? sim.offAlign.coreEdge.S : sim.offAlign.coreEdge.W;
      const role = sim.defAlign.spots[d.slot].role;
      out.push({ slot: d.slot, inside: (d.pos.y - edgeY) * j.side <= -.5,
        seat: role.kind === 'zone' && (role.zone.startsWith('flat') || role.zone.startsWith('curl_flat')) });
    }
  }
  return out;
}

describe('FIT_END_FORCE', () => {
  it('off: a free player inside the end man can take force', async () => {
    const f = await forces('0');
    expect(f.some((x) => x.inside && !x.seat)).toBe(true);
  });

  it('on: force from inside the end man only for an installed flat or curl/flat seat', async () => {
    const f = await forces('1');
    expect(f.length).toBeGreaterThan(0);
    for (const x of f) if (x.inside) expect(x.seat, x.slot).toBe(true);
  });
});
