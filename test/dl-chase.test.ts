/** DL_CHASE (engagement.ts runContactRead): an engaged interior lineman who
 * sees the guard beside him pull works across his blocker's face toward the
 * pull and follows it, instead of holding a shoulder that slides with the
 * block. A lineman stepping across at his own depth is not a pull, and a
 * declared runner still owns the aim. Off: the installed shoulder. The squeeze
 * reads a pull too (lineRead); it is held off here so the two arms isolate the
 * chase, and has its own tests. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

/** Before the handoff: the center has the backside tackle; the guard beside
 * him is `back` yd behind his stance, moving across at 3 yd/s toward `pull`;
 * the center's cutoff drives the tackle the other way. */
async function read(enabled: boolean, pull: number, back = .4) {
  vi.stubEnv('DL_CHASE', enabled ? '1' : '0'); vi.stubEnv('PULL_EARLY', '1'); vi.stubEnv('PULL_CUE', '0');
  vi.stubEnv('DL_SQUEEZE', '0');
  vi.resetModules();
  const { contactCommands, contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const { runContactObservers } = await import('../src/sim/run-contact-observer.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11 });
  f.engagement.surfaceAxis = { x: -1, y: 0 }; f.engagement.drive = { x: 1, y: 0 }; f.engagement.sealTarget = 0; f.engagement.nextMoveAt = Infinity;
  f.defender.runFit = { gap: 'A', side: 1, kind: 'interior', technique: 'attack', edge: 'box', pace: 'stack' }; f.defender.recog!.read = 'run';
  f.sim.world.step(f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), f.sim.dt); f.sim.t = f.sim.world.time = 1.5;
  const back0 = f.sim.slot('RB')!, guard = f.sim.slot('RG')!;
  f.sim.ball = { kind: 'held', carrier: f.sim.qb }; f.sim.handoffAt = -1;
  const home = f.sim.offAlign.spots[guard.slot].pos;
  const pictures = new Map<Agent, Perceived>([
    [f.sim.qb, { pos: { x: 37.5, y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', stance: null, carrying: true, age: .25 }],
    [back0, { pos: { x: 35, y: CENTER_Y }, vel: { x: 1, y: 0 }, facing: 0, pose: 'up', stance: null, carrying: false, age: .25 }],
    [f.blocker, { pos: { ...f.blocker.pos }, vel: { x: 0, y: -pull }, facing: f.blocker.facing, pose: 'up', stance: 'low', age: .25 }],
    [guard, { pos: { x: home.x - back, y: f.defender.pos.y - 1.2 }, vel: { x: 0, y: pull * 3 }, facing: 0, pose: 'up', stance: null, age: .25 }],
  ]);
  const see = f.sim.see.bind(f.sim);
  vi.spyOn(f.sim, 'see').mockImplementation((observer, target, ...rest) =>
    observer === f.defender && pictures.has(target) ? structuredClone(pictures.get(target)!) : see(observer, target, ...rest));
  const samples: Record<string, unknown>[] = [];
  runContactObservers.set(f.sim, (_rep, phase, data) => { if (phase === 'movement') samples.push(data); });
  const command = contactCommands(f)[f.defender.idx];
  return { command, flow: samples[0]?.heldTargetFlow as number | undefined, aim: samples[0]?.defensiveAim as { y: number }, f };
}

describe('an engaged lineman follows the pull beside him', () => {
  it('off: the pull does not move his read', async () => {
    const r = await read(false, -1);
    expect(r.flow).toBeUndefined();
    expect(r.f.defender.tags.has('fit-follow-pull')).toBe(false);
  });
  it.each([-1, 1])('on: he works across toward the pull and follows it, pull=%s', async pull => {
    const on = await read(true, pull), off = await read(false, pull);
    expect(on.flow).toBe(pull * 3);
    expect((on.aim.y - on.f.blocker.pos.y) * pull).toBeGreaterThan(0);
    expect(on.command.vel.y * pull).toBeGreaterThan(off.command.vel.y * pull);
  });
  it('on: a step across at the guard\'s own depth is not a pull', async () => {
    const on = await read(true, -1, 0), off = await read(false, -1, 0);
    expect(on.command).toEqual(off.command);
  });
});
