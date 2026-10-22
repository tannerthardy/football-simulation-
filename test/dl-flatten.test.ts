/** DL_FLATTEN (engagement.ts runContactRead): an attacking lineman whose
 * blocker steps across his face (a reach or zone step) flattens on the line
 * at the depth he met him instead of driving upfield; a vertical drive keeps
 * the attack, and so does a lineman already beside or past the man on him
 * (DL_FLATTEN_WON). Off: the attack drives upfield whatever the block. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

/** Before the handoff, engaged: the center has him, stepping `across` yd/s
 * along the line and `up` yd/s at him. Returns his upfield request (+ = into
 * the backfield). */
async function upfield(enabled: boolean, across: number, up: number, won = false) {
  vi.stubEnv('DL_FLATTEN', enabled ? '1' : '0'); vi.stubEnv('DL_CHASE', '0'); vi.stubEnv('DL_FLATTEN_WON', enabled ? '1' : '0');
  vi.resetModules();
  const { contactCommands, contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11 });
  f.engagement.nextMoveAt = Infinity;
  f.defender.runFit = { gap: 'A', side: 1, kind: 'interior', technique: 'attack', edge: 'box', pace: 'stack' }; f.defender.recog!.read = 'run';
  f.sim.world.step(f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), f.sim.dt); f.sim.t = f.sim.world.time = 1.0;
  f.sim.ball = { kind: 'held', carrier: f.sim.qb }; f.sim.handoffAt = -1;
  const dir = f.sim.attackDir(f.blocker.team);
  // He has beaten the reach: level with the man on him, beside him.
  if (won) f.defender.body.pos = { x: f.blocker.pos.x, y: f.blocker.pos.y + .8 };
  const pictures = new Map<Agent, Perceived>([
    [f.sim.qb, { pos: { x: 37.5, y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', stance: null, carrying: true, age: .25 }],
    [f.blocker, { pos: { ...f.blocker.pos }, vel: { x: up * dir, y: across }, facing: f.blocker.facing, pose: 'up', stance: 'low', age: .25 }],
  ]);
  const see = f.sim.see.bind(f.sim);
  vi.spyOn(f.sim, 'see').mockImplementation((observer, target, ...rest) =>
    observer === f.defender && pictures.has(target) ? structuredClone(pictures.get(target)!) : see(observer, target, ...rest));
  for (let k = 0; k < 4; k++) contactCommands(f);
  return -contactCommands(f)[f.defender.idx].vel.x * dir;
}

describe('an attacking lineman flattens against a zone step', () => {
  it('off: he drives upfield against a reach', async () => {
    expect(await upfield(false, 2.5, 0)).toBeGreaterThan(1);
  });
  it('on: against a reach he holds his depth on the line', async () => {
    expect(await upfield(true, 2.5, 0)).toBeLessThan(.6);
  });
  it('on: a lineman who has beaten the reach keeps attacking', async () => {
    expect(await upfield(true, 2.5, 0, true)).toBeGreaterThan(1);
  });
  it('on: against a vertical drive he keeps the attack', async () => {
    expect(await upfield(true, 0, 1.5)).toBeCloseTo(await upfield(false, 0, 1.5), 6);
  });
});
