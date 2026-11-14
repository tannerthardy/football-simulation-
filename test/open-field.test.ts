/** OPEN_FIELD (src/sim/open-field.ts): the open-field approach on a free runner in space, from the defender's picture.
 * The rule's cases on a stub picture: on top when he is upfield; met, not mirrored, in short yardage; left once he is
 * beaten, with the exit on the far side of the entry; not taken with a body in the lane; the gather's on-top shift
 * shrinks to nothing at contact. */
import { describe, expect, it } from 'vitest';
import { onTopCushion, onTopPoint } from '../src/sim/open-field.js';

const agent = (idx: number, team: 'O' | 'D', x: number, y: number) => ({ idx, team, pos: { x, y }, vel: { x: 0, y: 0 }, profile: { vmax: 9.5 } }) as any;
function scene(opts: { firstDownX?: number; blocker?: { x: number; y: number } } = {}) {
  const runner = agent(0, 'O', 50, 20), other = agent(1, 'O', opts.blocker?.x ?? 0, opts.blocker?.y ?? 0);
  const sim: any = { attackDir: () => 1, firstDownX: opts.firstDownX ?? 70, offense: opts.blocker ? [runner, other] : [runner],
    see: (_a: any, o: any) => ({ pos: { ...o.pos }, vel: { ...o.vel } }) };
  return { sim, runner };
}
const seenOf = (r: any, vx = 5, vy = 0) => ({ pos: { ...r.pos }, vel: { x: vx, y: vy } }) as any;

describe('OPEN_FIELD: the open-field approach on a free runner in space', () => {
  it('a defender upfield of the runner aims on top of him: ahead of his projected position, at the leverage offset', () => {
    const { sim, runner } = scene(); const d = agent(10, 'D', 55, 22);
    const p = onTopPoint(sim, d, runner, seenOf(runner), -0.5)!;
    expect(p).not.toBeNull();
    // Projected runner x after the lead (dist / vmax s at 5 yd/s), plus a cushion of 0.4 x distance.
    const dist = Math.hypot(5, 2), tau = dist / 9.5;
    expect(p.x).toBeCloseTo(50 + 5 * tau + 0.4 * dist, 6);
    expect(p.y).toBeCloseTo(20 - 0.5, 6);
  });

  it('short yardage: a runner within 2 yd of the line to gain (or the goal line) is met, not mirrored', () => {
    const { sim, runner } = scene({ firstDownX: 51.5 }); const d = agent(10, 'D', 55, 22);
    expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).toBeNull();
    const far = scene({ firstDownX: 53 });
    expect(onTopPoint(far.sim, agent(11, 'D', 55, 22), far.runner, seenOf(far.runner), 0)).not.toBeNull();
  });

  it('enters above -0.3 yd of depth and leaves only below -0.8 yd (the exit beyond the entry)', () => {
    const { sim, runner } = scene(); const d = agent(10, 'D', 49.5, 23);
    expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).toBeNull(); // -0.5: not yet entered
    d.pos.x = 50.5; expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).not.toBeNull(); // +0.5: enters
    d.pos.x = 49.5; expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).not.toBeNull(); // -0.5: holds
    d.pos.x = 49.0; expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).toBeNull(); // -1.0: leaves
  });

  it('not with an offensive body in the lane between them', () => {
    const { sim, runner } = scene({ blocker: { x: 52.5, y: 21 } }); const d = agent(10, 'D', 55, 22);
    expect(onTopPoint(sim, d, runner, seenOf(runner), 0)).toBeNull();
  });

  it("the gather's on-top shift shrinks with distance to nothing at contact, and is zero outside the approach", () => {
    const { sim, runner } = scene(); const d = agent(10, 'D', 54, 21);
    onTopPoint(sim, d, runner, seenOf(runner), 0);
    expect(onTopCushion(sim, d, runner, seenOf(runner), 4, 1)).toBeCloseTo(1.2, 9);
    expect(onTopCushion(sim, d, runner, seenOf(runner), 1, 1)).toBe(0);
    const out = agent(12, 'D', 40, 21);
    onTopPoint(sim, out, runner, seenOf(runner), 0);
    expect(onTopCushion(sim, out, runner, seenOf(runner), 4, 1)).toBe(0);
  });
});
