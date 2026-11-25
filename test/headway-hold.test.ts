import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** HEADWAY_HOLD (src/sim/spacing.ts): the pursuit-commit panel's slant_flat 1 (gun doubles, cover3, the staged throw the
 * QB made there), the free safety converging with a teammate on the catcher. His decision holds a heading; spacing's
 * closing limit on the teammate, entered and left on one threshold, took and dropped the bound on his request tick to
 * tick (bent off his decision, straight, bent again). With the hold (exit beyond entry) it is kept: fewer toggles. */
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function safety(flag: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('PURSUIT_COMMIT', '1');
  vi.stubEnv('HEADWAY_HOLD', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: 'slant_flat' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 't' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: 1,
    stagedThrow: { at: 1.45, slot: 'Z', aim: { x: 42.883028319742365, y: 16.707114563020333, z: 1.0517015031526282 }, T: 1.1028011204157764 } } as never);
  const fs = sim.defense.find((d: any) => d.slot === 'FS');
  let caught = -1; const side: number[] = [];
  while (sim.phase !== 'dead' && sim.t < 8) {
    sim.tick();
    if (caught < 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === 'O' && sim.ball.carrier !== sim.qb) caught = sim.t;
    if (caught >= 0 && sim.t - caught <= 1.0 + 1e-9) {
      // Which side of his decision the spaced request lies (rad; + left), where they differ by more than 10 deg.
      const r = sim.intents[fs.idx].vel, c = sim.cmds[fs.idx].vel;
      if (Math.hypot(r.x, r.y) > 0.5 && Math.hypot(c.x, c.y) > 0.5) side.push(Math.atan2(c.x * r.y - c.y * r.x, c.x * r.x + c.y * r.y));
    }
  }
  const bent = side.map(x => Math.abs(x) > 10 * Math.PI / 180);
  return { toggles: bent.reduce((n, b, i) => n + (i > 0 && b !== bent[i - 1] ? 1 : 0), 0), bent: bent.filter(Boolean).length, n: side.length };
}

describe('HEADWAY_HOLD', () => {
  it('the safety converging with a teammate keeps the bound on his request; off, it is taken and dropped tick to tick', async () => {
    const off = await safety('0'), on = await safety('1');
    if (process.env.HH_PRINT) console.log('HH', JSON.stringify({ off, on }));
    expect(off.n).toBeGreaterThan(15);
    expect(off.toggles).toBeGreaterThanOrEqual(4);  // spacing bends his request off his decision, lets go, bends it again
    expect(on.bent).toBeGreaterThan(0);              // the hold still bounds it
    expect(on.toggles).toBeLessThan(off.toggles);
  });
});
