/**
 * STRETCH_AIM (src/sim/behaviors/carrier.ts): on outside and wide zone the
 * back presses the snap landmark. The live C gap is bounded by the inline
 * end; an end who drives the tight end wide drags it outward onto himself.
 * Inside zone keeps its live landmark.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function aims(flag: boolean, concept: 'oz_strong' | 'iz_strong') {
  vi.stubEnv('STRETCH_AIM', flag ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { CENTER_Y } = await import('../src/core/field.js');
  const { gapY } = await import('../src/playbook/alignment.js');
  const { liveAim } = await import('../src/sim/behaviors/carrier.js');
  const { playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_12, run = RUN_BY_ID[concept];
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, kind: 'run', flip: false, run, label: 'aim' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'aim' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5, record: false });
  const side = playSideSign(sim, run), rb = sim.slot('RB')!;
  sim.see = (_a, t) => ({ pos: { ...t.pos }, vel: { ...t.vel }, stance: null, facing: 0, pose: 'up', age: .1 });
  const gap = run.aim as 'B' | 'C', aim = { x: 40.6, y: gapY(sim.offAlign, gap, side) };
  const opts = { aim, aimGap: { gap, side, offset: 0 }, run: { scheme: run.scheme, side } } as never;
  // In their stances the live gap is the snap landmark; the line picture is
  // cached per tick, so the moved surface is read once.
  const before = aim.y;
  // The play-side end and tackle are carried 2.5 yd wide.
  for (const s of ['Y', 'RT', 'LT', 'H']) { const a = sim.slot(s as never)!; if ((a.pos.y - CENTER_Y) * side > 0) a.body.pos = { x: a.pos.x, y: a.pos.y + 2.5 * side }; }
  return { before, after: liveAim(rb, sim, opts)!.y, side };
}

describe('STRETCH_AIM: stretch backs press the snap landmark', () => {
  it('the outside-zone landmark stays put when the end carries the tight end wide; inside zone follows the line', async () => {
    const on = await aims(true, 'oz_strong'), off = await aims(false, 'oz_strong');
    expect(on.after).toBeCloseTo(on.before, 9);
    expect((off.after - off.before) * off.side).toBeGreaterThan(1.5);
    const iz = await aims(true, 'iz_strong');
    expect((iz.after - iz.before) * iz.side).toBeGreaterThan(.5);
  });
});
