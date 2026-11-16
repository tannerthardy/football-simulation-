/** HOLD_FACING (tackle.ts updateBond; experimental, off): a holder beside or
 * behind the runner keeps the facing he has instead of re-squaring his chest
 * on the runner every tick. Reproducer: Inside Zone vs Cover 3 (first pinned on
 * seed 1922, where the weak tackle, DT_W, grabbed the back from the side). In the hold's first 0.5 s he
 * turns 187 deg off against 32 on (engine-55), and 167 against 29 with
 * SPACING_SMOOTH + PURSUIT_COMMIT on (re-pinned for that candidate: SPACING_SMOOTH
 * changes the play from the C's first steps). Re-pinned on the engine-66 candidate
 * (8437292c) to seed 1921, DT_S: with ENGAGE_FELT (an engaged man reads the man he
 * is engaged with by touch) 1922's DT_W no longer makes the hold. A scan of seeds
 * 1900-1989, DT_S and DT_W, found 10 side holds that spin him over 120 deg in the
 * first 0.5 s with HOLD_FACING off; on, every one turns less (mean 184 -> 72 deg) and
 * 4 stay under 60 (1908 DT_S 123 -> 17, 1921 DT_S 206 -> 36, 1937 DT_W 145 -> 59, 1963
 * DT_W 175 -> 14). 1921 is pinned for its margin on both bounds. The free-holder case
 * (OPEN_HANDS) stays on 1916 / DT_S.
 * Re-pinned on engine-68 (ENGAGE_TRUNK and CHEST_SHOULDERS on) to seed 1957, DT_S. With the engaged trunk, 1921's DT_S
 * no longer makes the same hold. The same scan (1900-1989, DT_S and DT_W) found 9 side holds spinning him over 120 deg
 * in the first 0.5 s with HOLD_FACING off; on, 1907 DT_S 199 -> 49, 1931 DT_W 151 -> 6, 1933 DT_W 190 -> 0, 1957 DT_S
 * 200 -> 21, 1960 DT_W 148 -> 1, 1985 DT_W 151 -> 18, and three that stay over 90 (1908, 1932, 1940). 1957 is pinned
 * for its margin on both bounds.
 * Runs on the engine defaults (the reference stack), not the legacy pin. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function turn(flag: string, openHands = '0', seed = 1957, slot = 'DT_S') {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Flex to re-record with it on
  vi.stubEnv('MIRROR_SCATTER', '0'); // engine-72: fixture recorded on the old alignment scatter; Flex to re-record with MIRROR_SCATTER on
  vi.stubEnv('HOLD_FACING', flag);
  // The reproducer's play: the DT makes the hold still engaged with the C, whose hands are on him. OPEN_HANDS
  // changes the play, not the hold: his open-handed C lets him slip off at 1.75 s and he makes the hold free at
  // 1.95 s against a faster back (5.3 vs 4.8 yd/s). Pinned here; that play is the second case below.
  vi.stubEnv('OPEN_HANDS', openHands);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const o = generateTeam(new Rng(102), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(202), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' } as any,
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' } as any,
    los: 35, ballY: 23.6, firstDownX: 55, seed, audibles: false } as any);
  const dt = sim.defense.find((a: any) => a.slot === slot);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  let t0 = -1, total = 0, side = false;
  while (sim.t < 6 && !sim.outcome) {
    const held = sim.bond?.tacklers.includes(dt), before = dt.body.facing;
    sim.tick();
    if (!held || !sim.bond?.tacklers.includes(dt)) continue;
    if (t0 < 0) {
      const c = sim.carrier, cs = Math.hypot(c.vel.x, c.vel.y), bx = dt.pos.x - c.pos.x, by = dt.pos.y - c.pos.y;
      side = Math.abs((bx * c.vel.x + by * c.vel.y) / (Math.hypot(bx, by) * cs)) < Math.SQRT1_2;
      t0 = sim.t;
    }
    if (sim.t - t0 <= 0.5) total += Math.abs(wrap(dt.body.facing - before));
  }
  return { held: t0 >= 0, side, turnDeg: total * 180 / Math.PI };
}

describe('HOLD_FACING', () => {
  it('off: the side holder spins with the runner; on: he keeps his facing', async () => {
    const off = await turn('0'), on = await turn('1');
    expect(off.held && off.side).toBe(true); expect(on.held && on.side).toBe(true);
    expect(off.turnDeg).toBeGreaterThan(120);
    expect(on.turnDeg).toBeLessThan(60);
  });
  it('OPEN_HANDS (the DT free of his blocker when he grabs): HOLD_FACING still keeps him from spinning with the runner (search with a floor)', async () => {
    // A search, not a pinned seed (moved on engine-61): seeds from 1900 in order until a DT, free of his blocker, makes a
    // side hold that spins him at least 100 deg off and HOLD_FACING cuts that by at least 30 deg. Requirement: one exists.
    let found: string | null = null;
    search: for (let seed = 1900; seed < 1990; seed++) for (const slot of ['DT_S', 'DT_W']) {
      const off = await turn('0', '1', seed, slot);
      if (!(off.held && off.side) || off.turnDeg < 100) continue;
      const on = await turn('1', '1', seed, slot);
      if (on.held && on.side && on.turnDeg < off.turnDeg - 30) { found = `seed ${seed} ${slot}: off ${off.turnDeg.toFixed(0)} deg, on ${on.turnDeg.toFixed(0)} deg`; break search; }
    }
    console.log(`free holder: ${found ?? 'none'}`);
    expect(found).not.toBeNull();
  }, 480_000);
});
