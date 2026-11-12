/** A carrier still in bounds can hold the ball beyond the sideline's plane (his support is what puts him out). A
 * fumble there is loose already beyond it, so it crossed at the fumble's yard line; if it then touches the ground out
 * of bounds the play ends there, rather than failing the loose-ball crossing invariant (engine-50 cards, seed 23: a
 * fumble on a hit at the sideline, the ball on the ground 2 yd outside with no recorded crossing). */
import { describe, expect, it } from 'vitest';
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(carrierY: number) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'sideline fumble' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: FIELD_WIDTH / 2, firstDownX: 50, seed: 131, audibles: false });
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.snapReadyAt = 0; a.downUntil = 99;
  }
  const rb = sim.slot('RB')!;
  rb.body.pos = { x: 45, y: carrierY };
  sim.ball = { kind: 'held', carrier: rb };
  sim.t = sim.world.time = 2;
  sim.fumble(rb, null);
  const loose = sim.ball as PlaySim['ball'];
  if (loose.kind !== 'loose') throw new Error('Missing loose ball');
  return { sim, loose };
}
const update = (sim: PlaySim) => (sim as unknown as { updateBall(): void }).updateBall();

describe('a fumble beyond the sideline plane', () => {
  it('records its crossing at the fumble, and a touch outside ends the play there', () => {
    const { sim, loose } = stage(FIELD_WIDTH + 0.4);
    expect(loose.boundaryExit).toEqual({ x: 45, y: FIELD_WIDTH });
    // The ball, already outside, comes down on the ground beyond the line.
    loose.flight = { pos: { x: 45.2, y: FIELD_WIDTH + 1.0, z: 0.05 }, vel: { x: 0, y: 1, z: -2 }, drag: 0 };
    expect(() => update(sim)).not.toThrow();
    expect(sim.events.some((e) => e.type === 'out_of_bounds')).toBe(true);
  });

  it('a fumble inside the field records no crossing until the ball crosses', () => {
    const { loose } = stage(FIELD_WIDTH - 1);
    expect(loose.boundaryExit).toBeUndefined();
  });
});
