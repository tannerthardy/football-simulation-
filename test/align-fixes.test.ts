/** Alignment fixes (alignment.ts / playsim.ts, experimental, off):
 *  TIGHT_OFF  a DB over a tight #2 plays off, not pressed;
 *  SLOT_LEV   a zone slot DB takes his final seat's shade (curl-flat head-up, not the hook default inside);
 *  ALIGN_HABIT off-ball defenders carry a personal habit and per-snap scatter; front men do not move. */
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.MIRROR_SCATTER = '0'; }); // engine-72: fixture recorded on the old alignment scatter; the lane that owns it re-records with MIRROR_SCATTER on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { CENTER_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(env: Record<string, string>, cov: string, form: string, style: any = {}) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const off = alignOffense(FORMATION_BY_ID[form], false, 40, CENTER_Y);
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: '' },
    off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[], {}, style);
  return { off, def };
}

describe('TIGHT_OFF', () => {
  it('no defensive back stands pressed within 1.5 yd of a tight #2 with the flag', async () => {
    for (const form of ['ace_11', 'gun_doubles_11']) {
      const { off, def } = await align({ TIGHT_OFF: '1' }, 'cover1_banjo', form);
      const lt = off.spots.LT!.pos.y, rt = off.spots.RT!.pos.y;
      const tight = Object.values(off.spots).filter((s: any) => s && !s.backfield && (s.inline || Math.min(Math.abs(s.pos.y - lt), Math.abs(s.pos.y - rt)) < 3.5) && !['LT', 'LG', 'C', 'RG', 'RT'].some(k => off.spots[k as 'LT'] === s));
      for (const [slot, sp] of Object.entries(def.spots) as any) {
        if (!/^(CB|NB|DB|SS|FS)/.test(slot) || sp.role.kind === 'blitz') continue;
        if (tight.some((t: any) => Math.abs(t.pos.y - sp.pos.y) <= 1.5)) expect(sp.pos.x - 40).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('SLOT_LEV', () => {
  it('a cover 3 curl-flat nickel stands head-up on his slot with the flag, inside without it', async () => {
    const on = await align({ SLOT_LEV: '1' }, 'cover3', 'gun_doubles_11'), off = await align({ SLOT_LEV: '0' }, 'cover3', 'gun_doubles_11');
    const nb = (a: any) => a.def.spots.NB!;
    expect(nb(on).role.kind).toBe('zone');
    const r = (a: any) => Object.values(a.off.spots).filter((s: any) => s && !s.backfield && !s.inline).sort((x: any, y: any) => Math.abs(x.pos.y - nb(a).pos.y) - Math.abs(y.pos.y - nb(a).pos.y))[0] as any;
    const lev = (a: any) => (nb(a).pos.y - r(a).pos.y) * Math.sign(r(a).pos.y - CENTER_Y);
    expect(Math.abs(lev(on))).toBeLessThan(0.05);
    expect(lev(off)).toBeLessThan(-0.3);
  });
});

describe('ALIGN_HABIT', () => {
  it('moves off-ball defenders by the given scatter and leaves front men alone', async () => {
    const scatter = Object.fromEntries((Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]).map(s => [s, { x: 0.7, y: 0.3 }]));
    const on = await align({}, 'cover3', 'gun_doubles_11', { scatter }), off = await align({}, 'cover3', 'gun_doubles_11');
    for (const slot of Object.keys(off.def.spots) as DefSlot[]) {
      const a = on.def.spots[slot]!.pos, b = off.def.spots[slot]!.pos, deep = b.x - 40 > 2 && !off.def.spots[slot]!.press && off.def.spots[slot]!.role.kind !== 'blitz';
      if (deep) { expect(a.x - b.x).toBeCloseTo(0.7, 6); expect(a.y - b.y).toBeCloseTo(0.3, 6); }
      else expect(a).toEqual(b);
    }
  });
  it('PlaySim draws a scatter only with the flag', async () => {
    vi.stubEnv('ALIGN_HABIT', '1'); vi.resetModules();
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const on: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'iz_strong', seed: 3, roster: 7, formation: 'gun_doubles_11', flip: false }) as any);
    vi.unstubAllEnvs(); vi.stubEnv('ALIGN_HABIT', '0'); vi.resetModules();
    const m2 = await import('../src/sim/playsim.js'); const t2 = await import('../scripts/diag/command-trace.js');
    const off: any = new m2.PlaySim(t2.nativeTraceSetup({ coverage: 'cover3', concept: 'iz_strong', seed: 3, roster: 7, formation: 'gun_doubles_11', flip: false }) as any);
    const lb = (s: any) => s.defAlign.spots.LB_M?.pos.x ?? s.defAlign.spots.LB_W.pos.x;
    expect(lb(on)).not.toBeCloseTo(lb(off), 3);
  });
});
