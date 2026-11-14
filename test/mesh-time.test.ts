/** MESH_TIME (src/sim/behaviors/receiver.ts meshTime; experimental, off): mesh's X steers his depth to pass just under
 * Y at the meeting, from his own picture of Y; Y does not adjust; X's lateral speed is kept and his speed never rises. */
import { describe, expect, it } from 'vitest';
import { meshTime } from '../src/sim/behaviors/receiver.js';

const body = (x: number, y: number, vx: number, vy: number, id?: string) =>
  ({ pos: { x, y }, vel: { x: vx, y: vy }, team: 'O', behavior: id ? { route: { id } } : {} }) as any;
function world(yDepth: number) {
  const X = body(44.5, 20, 0, 6), Y = body(40 + yDepth, 26, 0, -6, 'shallow_high');
  const sim: any = { offense: [X, Y], los: 40, attackDir: () => 1, see: (_a: any, b: any) => ({ pos: b.pos, vel: b.vel }) };
  return { X, sim };
}

describe('MESH_TIME', () => {
  it('X climbs toward a deeper Y, keeps running across, and never speeds up', () => {
    const { X, sim } = world(6.5);
    const cmd = { vel: { x: 0, y: 6 } };
    const out = meshTime(X, sim, cmd, 1);
    expect(out.vel.x).toBeGreaterThan(0);                     // up toward Y's depth less his margin
    expect(out.vel.y).toBeGreaterThan(0);                     // still across
    expect(Math.hypot(out.vel.x, out.vel.y)).toBeLessThanOrEqual(6 + 1e-9);
  });
  it('a worse route runner stays further under; far from the mesh he runs his points', () => {
    const good = meshTime(world(6.5).X, world(6.5).sim, { vel: { x: 0, y: 6 } }, 1);
    const w = world(6.5), poor = meshTime(w.X, w.sim, { vel: { x: 0, y: 6 } }, 0);
    expect(poor.vel.x).toBeLessThan(good.vel.x);
    const far = world(6.5); far.sim.offense[1].pos.y = 40;        // 20 yd apart: more than 1.5 s
    expect(meshTime(far.X, far.sim, { vel: { x: 0, y: 6 } }, 1)).toEqual({ vel: { x: 0, y: 6 } });
  });
});
