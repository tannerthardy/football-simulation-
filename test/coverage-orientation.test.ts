import { describe, expect, it } from 'vitest';
import { angleDiff } from '../src/core/vec.js';
import type { MoveCommand } from '../src/physics/kinematics.js';
import type { Agent } from '../src/sim/agent.js';
import { CoverageOrientation, withFacingTechnique } from '../src/sim/coverage/orientation.js';

const DT = 0.05;
/** Only what the orientation technique reads; the body follows its request exactly. */
function defender(turnRate = 8): Agent {
  return { body: { facing: Math.PI, vel: { x: 2, y: 0 }, profile: { turnRate } }, engagement: null,
    isDown: () => false, r: () => 0.5, mind: { focus: 1 } } as unknown as Agent;
}
const pedal = (key = { x: 3, y: 0 }): MoveCommand => withFacingTechnique({ vel: { x: 2, y: 0 }, facing: Math.PI }, { label: 'pedal', key });
const run = (key = { x: 3, y: 0 }): MoveCommand => withFacingTechnique({ vel: { x: 2, y: 0 } }, { label: 'run', key });

function play(a: Agent, o: CoverageOrientation, commands: Array<(t: number) => MoveCommand>): number[] {
  const facings: number[] = [];
  commands.forEach((c, k) => {
    const out = o.steer(a, k * DT, DT, c(k * DT));
    a.body.facing = out.facing ?? a.body.facing;
    facings.push(a.body.facing);
  });
  return facings;
}

describe('coverage orientation technique (COV-6)', () => {
  it('passes commands without a coverage technique straight through', () => {
    const a = defender(), o = new CoverageOrientation(), c: MoveCommand = { vel: { x: 1, y: 0 } };
    expect(o.steer(a, 0, DT, c)).toBe(c);
  });

  it('commits to a turn and run instead of toggling with the request', () => {
    const a = defender(), o = new CoverageOrientation();
    // The technique flips between pedal and run every tick, inside his hold.
    const facings = play(a, o, Array.from({ length: 8 }, (_, k) => () => (k % 2 ? pedal() : run())));
    // One committed turn toward downfield, never back toward the QB.
    const off = facings.map(f => Math.abs(angleDiff(0, f)));
    expect(off[off.length - 1]).toBeLessThan(Math.PI - 1);
    for (let k = 1; k < off.length; k++) expect(off[k]).toBeLessThanOrEqual(off[k - 1] + 1e-9);
    // A rounded hip turn, not the body's ceiling: under 90° in any 0.2 s.
    for (let k = 4; k < facings.length; k++) expect(Math.abs(angleDiff(facings[k - 4], facings[k]))).toBeLessThan(Math.PI / 2);
  });

  it('a break he sees gets a speed turn', () => {
    const slow = defender(), fast = defender(), os = new CoverageOrientation(), of = new CoverageOrientation();
    const stem = Array.from({ length: 10 }, () => () => pedal());
    play(slow, os, [...stem, ...Array.from({ length: 4 }, () => () => run())]);
    // Same request, but his receiver's stem turns 90° at the transition.
    play(fast, of, [...stem, ...Array.from({ length: 4 }, () => () => run({ x: 0, y: 3 }))]);
    const turned = (a: Agent) => Math.abs(angleDiff(Math.PI, a.body.facing));
    expect(turned(slow)).toBeGreaterThan(0.5);
    expect(turned(fast)).toBeGreaterThan(1.8 * turned(slow));
  });
});
