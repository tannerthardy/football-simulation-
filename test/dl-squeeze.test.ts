/** DL_SQUEEZE (engagement.ts stepRunRep): an engaged first-level man whose
 * blocker is seen moving away from the ball (a down block, a wash) works
 * back across toward it at his contact depth; with a blocker moving toward
 * the ball (a reach) nothing changes. Off: he follows his blocker's flow. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

/** The back in the backfield flowing to `side`; the blocker on the
 * lineman seen moving `blocker` yd/s across. Returns the lineman's
 * requested lateral speed toward the back's flow. */
async function request(enabled: boolean, blocker: number, side = 1,
  opts: { carrying?: boolean; backVel?: number; backY?: number; later?: number } = {}) {
  return (await scene(enabled, blocker, side, opts)).vel;
}

/** As `request`, also reporting whether he took the squeeze. `backVel` is the
 * back's seen lateral speed toward `side`; `later` re-reads the blocker one
 * decision beat on, seen moving `later` yd/s across. */
async function scene(enabled: boolean, blocker: number, side = 1,
  opts: { carrying?: boolean; backVel?: number; backY?: number; later?: number } = {}) {
  vi.stubEnv('DL_SQUEEZE', enabled ? '1' : '0');
  vi.resetModules();
  const { contactCommands, contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side, seed: 11 });
  f.engagement.surfaceAxis = { x: -1, y: 0 }; f.engagement.drive = { x: 1, y: 0 }; f.engagement.sealTarget = 0; f.engagement.nextMoveAt = Infinity;
  f.defender.runFit = { gap: 'B', side, kind: 'interior', technique: 'attack', edge: 'box', pace: 'stack' }; f.defender.recog!.read = 'run';
  f.sim.world.step(f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), f.sim.dt); f.sim.t = f.sim.world.time = 1.5;
  const back = f.sim.slot('RB')!; f.sim.ball = { kind: 'held', carrier: back }; f.sim.handoffAt = .5;
  const pictures = new Map<Agent, Perceived>([
    [back, { pos: { x: 35, y: CENTER_Y + side * (opts.backY ?? 0) }, vel: { x: 1, y: side * (opts.backVel ?? 3) }, facing: 0, pose: 'up', stance: null, carrying: opts.carrying ?? true, age: .25 }],
    [f.sim.qb, { pos: { x: 39, y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', stance: null, carrying: false, age: .25 }],
    [f.blocker, { pos: { ...f.blocker.pos }, vel: { x: 0, y: blocker * side }, facing: f.blocker.facing, pose: 'up', stance: 'low', age: .25 }],
  ]);
  const see = f.sim.see.bind(f.sim);
  vi.spyOn(f.sim, 'see').mockImplementation((o, t, ...rest) => o === f.defender && pictures.has(t) ? structuredClone(pictures.get(t)!) : see(o, t, ...rest));
  let vel = contactCommands(f)[f.defender.idx].vel.y * side;
  if (opts.later !== undefined) {
    pictures.get(f.blocker)!.vel = { x: 0, y: opts.later * side };
    f.sim.t = f.sim.world.time = f.sim.t + f.defender.mind.decisionInterval + .01;
    vel = contactCommands(f)[f.defender.idx].vel.y * side;
  }
  return { vel, squeezed: f.defender.tags.has('squeeze') };
}

describe('a down-blocked lineman squeezes back toward the ball', () => {
  it.each([1, -1])('blocker washing him away from the ball: on works back across (side %s)', async side => {
    const off = await request(false, -2, side), on = await request(true, -2, side);
    expect(on).toBeGreaterThan(0);
    expect(on).toBeGreaterThan(off + 1);
  });
  it('blocker reaching toward the ball: unchanged', async () => {
    expect(await request(true, 2)).toBeCloseTo(await request(false, 2), 9);
  });
  // The play's direction is a seen carrier's track: no squeeze from the back's
  // path before he has the ball, or from where a still back stands.
  it.each([1, -1])('no squeeze before he sees a carrier running a track (side %s)', async side => {
    expect((await scene(true, -2, side, { carrying: false })).squeezed).toBe(false);
    // A still back standing to the play side: where he is is not a track.
    expect((await scene(true, -2, side, { backVel: 0, backY: 2 })).squeezed).toBe(false);
    expect((await scene(true, -2, side)).squeezed).toBe(true);
  });
  // A reach is judged by the first step he saw: a reaching blocker the pair
  // later carries back against the play has not become a down block.
  it.each([1, -1])('a first step with the play stays a reach when the pair later moves against it (side %s)', async side => {
    expect((await scene(true, 2, side, { later: -2 })).squeezed).toBe(false);
    expect((await scene(true, -2, side, { later: -2 })).squeezed).toBe(true);
  });
});
