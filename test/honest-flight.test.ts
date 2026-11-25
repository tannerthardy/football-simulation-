/** HONEST_FLIGHT (src/sim/behaviors/defense.ts; experimental, off): the outside audit's staged case (docs/reviews/
 * 2026-11-24-defense-outside-audit.md, finding 1). A slant against cover 1: double_slants, gun doubles, seed and roster 5,
 * flipped, the reference stack's on-flags. The Z is caught with his back (about 160 deg) to the man defender trailing him
 * by about half a yard. On the tick the ball reaches the Z's hands, only the receiver's hidden true facing is turned
 * half a circle; nothing the defender can have seen has changed yet.
 *  - off: his drive through the catch reads the receiver's true facing, so his request turns on the very next tick;
 *  - on: it reads the facing he sees, so his request on the next tick is exactly unchanged (his closest read, the tracking
 *    channel, is 0.1 s behind: from 0.10 s the turn is in his picture and he may answer it), and he is driving on the
 *    receiver his own flight estimate brought the ball to.
 * The scene was chosen by a rule (double_slants and slant_flat vs cover1, doubles and trips, seeds 1-12, both flips: the
 * receiver's man defender within 3 yd at the touch, the receiver's back over 110 deg to him); re-find it by that rule if
 * the play moves. Requests only; no outcome is asserted. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(honest: string, turn: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('HONEST_FLIGHT', honest);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { catchOpportunity } = await import('../src/sim/possession-read.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'double_slants', seed: 5, roster: 5, formation: 'gun_doubles_11', flip: true }));
  let t0 = -1, d: any = null, R: any = null, back = 0, gap = 0, own: any = null;
  const req: { x: number; y: number }[] = [];
  while (sim.phase !== 'dead' && sim.t < 8) {
    sim.tick();
    if (t0 < 0 && sim.ball.kind === 'air' && sim.ball.securing) {
      R = sim.ball.securing.receiver; t0 = sim.t;
      d = sim.defense.find((x: any) => x.behavior?.kind === 'man' && x.behavior.target === R);
      const rx = d.pos.x - R.pos.x, ry = d.pos.y - R.pos.y; gap = Math.hypot(rx, ry);
      back = Math.abs(Math.atan2(Math.sin(Math.atan2(ry, rx) - R.body.facing), Math.cos(Math.atan2(ry, rx) - R.body.facing))) * 180 / Math.PI;
      own = catchOpportunity(d)?.receiver ?? null;
      if (turn) R.body.facing += Math.PI;
    }
    if (t0 >= 0) { req.push({ ...sim.cmds[d.idx].vel }); if (sim.t - t0 >= 0.1 - 1e-9) break; }
  }
  return { R, d, back, gap, own, req, drive: d?.tags.has('drive-catch') ?? false };
}
const diff = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('HONEST_FLIGHT: the drive on a slant catch reads what the trailing man can see', () => {
  it('premise: the receiver is caught with his back to the man defender trailing him', async () => {
    const r = await run('0', false);
    expect(r.R?.slot).toBe('Z');
    expect(r.gap).toBeLessThan(1);
    expect(r.back).toBeGreaterThan(120);
    expect(r.drive).toBe(true);
  }, 120_000);
  it('off: his request turns with the receiver\'s hidden true facing on the next tick', async () => {
    const a = await run('0', false), b = await run('0', true);
    expect(diff(a.req[1], b.req[1])).toBeGreaterThan(1);
  }, 120_000);
  it('on: his next request is unchanged (his sight is behind the turn), on the receiver his own estimate named', async () => {
    const a = await run('1', false), b = await run('1', true);
    expect(a.own).toBe(a.R);
    expect(a.drive).toBe(true);
    expect(diff(a.req[1], b.req[1])).toBeLessThan(1e-9);
  }, 120_000);
});
