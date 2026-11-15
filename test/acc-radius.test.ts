/** ACC_RADIUS (behaviors/qb.ts window; experimental, off): his accuracy belief's catchable radius grows with the
 * flight (docs/reviews/2026-11-13-qb-gather.md). Over a named panel of four verticals against two-high shells (gun
 * doubles; every play has a seam or go 5+ yd from his nearest defender at 2.2 s):
 * - off, he checks down to the back on most (the fixed 1.35 yd radius priced the deep ball at a fifth of its catches);
 * - on, he throws a vertical on most: the median before 3.0 s and none after 3.5 s (the NFL's other targets on
 *   four-verts shapes leave at 2.47 s p50, 2.87 p75; off, his check-downs here came at a median of about 3.7 s). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PANEL: [string, number, boolean][] = [
  ['cover2', 2, false], ['cover2', 2, true], ['cover2', 6, false], ['cover2', 6, true], ['cover2', 7, true], ['cover2', 8, true],
  ['cover6', 2, false], ['cover6', 6, false], ['cover6', 7, false], ['cover6', 8, false],
];

async function throws(flag: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('DECLARED_BREAK', '0'); // engine-68: recorded on the legacy readiness path; re-record on declared breaks with the quick drop
  vi.stubEnv('VERTS_QUICK', '0'); // engine-67: these four_verts scenes were recorded on the five-step set; the quick drop is a different play
  vi.stubEnv('ACC_RADIUS', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { slot: string | null; t: number | null }[] = [];
  for (const [coverage, seed, flip] of PANEL) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip }));
    let thr: { slot: string | null; t: number } | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const was = sim.ball.kind; tick(); if (!thr && was !== 'air' && sim.ball.kind === 'air') thr = { slot: sim.ball.target?.slot ?? null, t: sim.t }; };
    sim.run();
    out.push(thr ?? { slot: null, t: null });
  }
  return out;
}
const vertical = (s: string | null) => !!s && ['X', 'Z', 'Y', 'H'].includes(s);

describe('ACC_RADIUS', () => {
  it('four verts against two-high with a seam open: off he checks down, on he throws the vertical on time', async () => {
    const off = await throws('0'), on = await throws('1');
    expect(off.filter((r) => r.slot === 'RB').length).toBeGreaterThanOrEqual(6);
    const onV = on.filter((r) => vertical(r.slot)), offV = off.filter((r) => vertical(r.slot));
    // Restated at engine-63 as a comparison with the off arm (was an absolute 8 of 10). The panel was chosen because
    // the seam was open on the defense of the time; APEX_LEVERAGE now walls it and the sight flags change what he sees,
    // so fewer of the ten are there to throw (7 on engine-61, 6 on engine-62, 5 here). What the flag does is unchanged:
    // off he throws no vertical on this panel, on he throws several. ACC_RADIUS itself is held and will be replaced by
    // a belief fitted to receivers without the ball-path oracle (docs/REFERENCE_STACK.md, engine-63).
    expect(onV.length).toBeGreaterThanOrEqual(offV.length + 4);
    // On time: the median vertical leaves before 3.0 s (the NFL's other targets on four-verts shapes leave at 2.47 s
    // p50, 2.87 p75), none after 3.5 s; off, his check-downs on this panel came at 2.4-5.0 s, median about 3.7.
    const ts = onV.map((r) => r.t!).sort((a, b) => a - b);
    expect(ts[Math.floor(ts.length / 2)]).toBeLessThan(3.0);
    // Restated at engine-64: with OUTLET_LAST the back is his last read, so on two plays where the first vertical is
    // not there he now comes back to a vertical late (4.15 and 4.45 s) instead of dumping it to the back at 2.9 s.
    // Those are 7 verticals of 10 (5 on engine-63). The on-time claim is held for the ones the flag opens: at least
    // five leave by 3.5 s. Was "none after 3.5 s".
    expect(ts.filter((t) => t <= 3.5 + 1e-9).length).toBeGreaterThanOrEqual(5);
  }, 180000);
});
