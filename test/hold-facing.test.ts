/** HOLD_FACING (tackle.ts updateBond; experimental, off): a holder beside or
 * behind the runner keeps the facing he has instead of re-squaring his chest
 * on the runner every tick. Reproducer: Inside Zone vs Cover 3. Re-pinned on
 * engine-55 (SPACING_SMOOTH changes the play from the C's first steps, so seed
 * 1916's DT_S no longer side-holds): seed 1937, the weak tackle (DT_W) grabs
 * the back from the side, 144 deg in the hold's first 0.5 s off against 36 on
 * (candidate stack). The free-holder case (OPEN_HANDS) stays on 1916 / DT_S.
 * Runs on the engine defaults (the reference stack), not the legacy pin. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function turn(flag: string, openHands = '0', seed = 1937, slot = 'DT_W') {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
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
  it('OPEN_HANDS (the DT free of his blocker when he grabs): HOLD_FACING still keeps him from spinning with the runner', async () => {
    const off = await turn('0', '1', 1916, 'DT_S'), on = await turn('1', '1', 1916, 'DT_S');
    expect(off.held && off.side).toBe(true); expect(on.held && on.side).toBe(true);
    // No blocker's hands hold him now, so the hold and contacts carry him further (about 103 vs 167 deg off).
    expect(on.turnDeg).toBeLessThan(off.turnDeg - 30);
    console.log(`free holder, first 0.5 s of the hold: off ${off.turnDeg.toFixed(0)} deg, on ${on.turnDeg.toFixed(0)} deg`);
  });
});
