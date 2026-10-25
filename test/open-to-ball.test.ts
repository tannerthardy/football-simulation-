import { describe, expect, it } from 'vitest';
import type { MoveCommand } from '../src/physics/kinematics.js';
import type { Agent } from '../src/sim/agent.js';
import { openToBall } from '../src/sim/open-to-ball.js';
import type { PlaySim } from '../src/sim/playsim.js';

const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

/** A defender at the origin and a back he has seen `range` yards away at
 * `bearing`. Facing PI is chest to the line of scrimmage. */
function scene(facing: number, bearing = Math.PI, range = 4, qbRun = false, carrying: boolean | null = true,
  vel = { x: 0, y: 0 }) {
  const carrier = { team: 'O' } as unknown as Agent;
  const qb = qbRun ? carrier : { team: 'O' } as unknown as Agent;
  const pos = { x: Math.cos(bearing) * range, y: Math.sin(bearing) * range };
  const a = { team: 'D', pos: { x: 0, y: 0 }, engagement: null, isDown: () => false, recog: { read: 'run' },
    body: { facing, vel: { x: 0, y: 0 }, pos: { x: 0, y: 0 } } } as unknown as Agent;
  // Only the defender's pictures decide: the back (or QB) he sees with the
  // ball, and an empty-handed QB when the two differ.
  const sim = { qb, t: 2, los: -3, bond: null, ball: { kind: 'held', carrier },
    opponents: () => (qbRun ? [carrier] : [carrier, qb]), slot: () => undefined,
    see: (_: Agent, target: Agent) => (target === carrier
      ? { pos, vel, carrying, age: .1 } : { pos: { x: -8, y: 0 }, vel: { x: 0, y: 0 }, carrying: false, age: .1 }) } as unknown as PlaySim;
  return { a, sim };
}

const toward = (heading: number, speed = 6): MoveCommand => ({ vel: { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed } });

describe('a defender reversing near the ball opens toward it', () => {
  it.each([1, -1])('turns back through the line, not through his back (side %i)', side => {
    // Flowing laterally, he must reverse: the shortest arc passes downfield.
    const { a, sim } = scene(side * 1.4);
    const out = openToBall(a, sim, toward(-side * 1.6));
    const step = wrap(out.facing! - a.body.facing);
    expect(Math.sign(step)).toBe(side);
    // The waypoint keeps the rotation on the ball side of his body.
    expect(Math.abs(wrap(out.facing! - Math.PI))).toBeLessThan(Math.abs(wrap(a.body.facing - Math.PI)));
  });

  it('leaves a turn that already passes in front of him alone', () => {
    const { a, sim } = scene(Math.PI - .4);
    const cmd = toward(Math.PI + .9);
    expect(openToBall(a, sim, cmd)).toBe(cmd);
  });

  it('keeps the shortest arc when the turn ends facing away (turn and run)', () => {
    const { a, sim } = scene(1.4);
    const cmd = toward(0);
    expect(openToBall(a, sim, cmd)).toBe(cmd);
  });

  it('does not steer coverage on a pocket quarterback before a run read', () => {
    const { a, sim } = scene(1.4, Math.PI, 4, true);
    (a as unknown as { recog: { read: string } }).recog.read = 'pass';
    const cmd = toward(-1.6);
    expect(openToBall(a, sim, cmd)).toBe(cmd);
  });

  it.each([false, null])('leaves the turn alone when his picture does not show the carrier holding the ball (%s)', carrying => {
    // A fake or a handoff he has not picked up: no true-possession steering.
    const { a, sim } = scene(1.4, Math.PI, 4, false, carrying);
    const cmd = toward(-1.6);
    expect(openToBall(a, sim, cmd)).toBe(cmd);
  });

  it('ignores a carrier beyond his immediate range', () => {
    const { a, sim } = scene(1.4, Math.PI, 14);
    const cmd = toward(-1.6);
    expect(openToBall(a, sim, cmd)).toBe(cmd);
  });

  it('a quarterback he sees running at the line is a carrier to open to', () => {
    const { a, sim } = scene(1.4, Math.PI, 4, true, true, { x: 3.5, y: 0 });
    (a as unknown as { recog: { read: string } }).recog.read = 'pass';
    const out = openToBall(a, sim, toward(-1.6));
    expect(Math.sign(wrap(out.facing! - a.body.facing))).toBe(1);
  });
});
