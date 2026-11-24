/** SIGHT_BODY (experimental, off): a man is seen when his head or either shoulder tip is visible. src/sim/sight.ts. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Sight from '../src/sim/sight.js';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const YD = 1 / 36;
function body(x: number, y: number, heightIn: number, posture = 0.2, radius = 0.3): any {
  const profile = { massKg: 110, radius, reach: 0.8, heightYd: heightIn * YD, vmax: 8, tau: 1.2, brake: 6, lateral: 6,
    turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.4, reactionTime: 0.25 };
  return { pos: { x, y }, profile, body: { support: { state: 'up', posture } } };
}
async function sight(on: boolean): Promise<typeof Sight> {
  vi.stubEnv('SIGHT_BODY', on ? '1' : '0'); vi.resetModules();
  return await import('../src/sim/sight.js');
}
// The passer at the origin, a corner 12 yd away on the line, a tall man's helmet 9 yd out on that line, 3 yd from the corner (his shoulders are below the line; his helmet is not). A helmet NEAR the passer's eye hides a far man whatever the points: at 4 yd out the shoulder tips' parallax at his helmet is only 0.07 yd, inside the 0.125 yd helmet radius.
const world = () => { const qb = body(0, 0, 75), corner = body(12, 0, 70), tackle = body(9, 0, 72, 0.2, 0.3); return { qb, corner, tackle }; };

describe('SIGHT_BODY', () => {
  it('off: a helmet exactly on the line to the head hides the man (one ray, one point)', async () => {
    const { lineOfSight } = await sight(false); const { qb, corner, tackle } = world();
    expect(lineOfSight([qb, corner, tackle], qb, corner)).toBe(false);
  });
  it('on: the same helmet leaves his shoulder tips in view (they are 0.2 yd either side, outside the 0.125 yd helmet at 12 yd range)', async () => {
    const { lineOfSight } = await sight(true); const { qb, corner, tackle } = world();
    expect(lineOfSight([qb, corner, tackle], qb, corner)).toBe(true);
  });
  it('on: three men shoulder to shoulder (heads 0.2 yd apart) cover the head and both shoulder tips: still hidden', async () => {
    const { lineOfSight } = await sight(true); const { qb, corner } = world();
    const wall = [body(9, 0, 72, 0.2, 0.3), body(9, 0.2, 72, 0.2, 0.3), body(9, -0.2, 72, 0.2, 0.3)];
    expect(lineOfSight([qb, corner, ...wall], qb, corner)).toBe(false);
  });
  it('on: a torso across the line (a back square in front of him, shoulders above the line) still hides him', async () => {
    const { lineOfSight } = await sight(true); const { qb, corner } = world();
    const near = body(2, 0, 90, 0, 0.45);
    expect(lineOfSight([qb, corner, near], qb, corner)).toBe(false);
  });
  it('on: with nobody in between the answer does not change; an explicit height (a point query) is the old single ray', async () => {
    const { lineOfSight } = await sight(true); const { qb, corner, tackle } = world();
    expect(lineOfSight([qb, corner], qb, corner)).toBe(true);
    expect(lineOfSight([qb, corner, tackle], qb, corner, 1.9)).toBe(false);
  });
  it('the per-tick frame answers what lineOfSight answers, on and off', async () => {
    for (const on of [false, true]) {
      const S = await sight(on); const { qb, corner, tackle } = world();
      const agents = [qb, corner, tackle], f = new S.SightFrame(3);
      agents.forEach((a: any, i: number) => f.set(i, a, a.pos.x, a.pos.y, null));
      expect(f.clear(0, 1)).toBe(S.lineOfSight(agents, qb, corner));
    }
  });
});
