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

/** The state path (no caller yet in step 1): margins and the held side. A defender at the origin facing a QB 8 yd in
 * front (-x), asked to run away from him (+x, the backpedal direction) at a need set relative to the caps. */
describe('OPEN_NEED: openForNeed with a state', () => {
  async function setup() {
    vi.resetModules();
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { openForNeed } = await import('../src/sim/behaviors/defense.js');
    const { directionalSpeedFactor } = await import('../src/physics/kinematics.js');
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(71), 'O', 'ONO', { strength: .55 }), '11'),
      defense: pickDefense(generateTeam(new Rng(72), 'D', 'OND', { strength: .55 }), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'o' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const a = sim.slot('LB_M')!;
    a.body.pos = { x: 50, y: 26 };
    const qb = { x: 42, y: 26 }, p = a.profile;
    const square = p.vmax * directionalSpeedFactor(p, Math.PI);           // facing the QB, running straight away: backpedal
    const at = (deg: number) => p.vmax * directionalSpeedFactor(p, Math.PI - deg * Math.PI / 180);
    return { a, qb, openForNeed, square, at, deg: (f: number, side = 1) => Math.round(Math.abs(Math.atan2(Math.sin(f - Math.PI), Math.cos(f - Math.PI))) * 180 / Math.PI) * side };
  }
  it('a need hovering within 5% of the square cap for 20 calls never opens him', async () => {
    const { a, qb, openForNeed, square } = await setup();
    const st = { deg: 0 };
    for (let i = 0; i < 20; i++) openForNeed(a, qb, { x: 60, y: 27 }, 0, square * (i % 2 ? 1.05 : 0.95), st);
    expect(st.deg).toBe(0);
  });
  it('a need past the square cap by more than OPEN_IN opens him; a need below the squarer cap by OPEN_OUT squares him', async () => {
    const { a, qb, openForNeed, square, at } = await setup();
    const st = { deg: 0 };
    const big = Math.max(square, at(45)) * 1.25;
    openForNeed(a, qb, { x: 60, y: 27 }, 0, big, st);
    expect(st.deg).toBeGreaterThan(0);
    const opened = st.deg;
    // A small drop in need (inside the exit margin) holds the opening.
    openForNeed(a, qb, { x: 60, y: 27 }, 0, big * 0.95, st);
    expect(st.deg).toBe(opened);
    // Well below the square cap: back to square.
    openForNeed(a, qb, { x: 60, y: 27 }, 0, square * 0.5, st);
    expect(st.deg).toBe(0);
  });
  it('while open, a target crossing the QB line does not flip his side', async () => {
    const { a, qb, openForNeed, square, at } = await setup();
    const st: { deg: number; side?: number } = { deg: 0 };
    const big = Math.max(square, at(45)) * 1.25;
    const f1 = openForNeed(a, qb, { x: 60, y: 28 }, 0, big, st);
    const side = st.side;
    const f2 = openForNeed(a, qb, { x: 60, y: 24 }, 0, big, st);
    expect(st.side).toBe(side);
    expect(Math.abs(Math.atan2(Math.sin(f2 - f1), Math.cos(f2 - f1)))).toBeLessThan(1e-9);
  });
});
