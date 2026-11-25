// SCRAMBLE_SEEN and TRACK_SEEN (Flex, 2026-11-24; outside audit, offense #1 and #5): a receiver's scramble drill and his
// ball tracking go by what he sees, not by true positions or the true ball state.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const load = async (env: Record<string, string>) => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  return import('../src/sim/behaviors/receiver.js');
};
const agent = (x: number, y: number, extra: Partial<Agent> = {}) => ({ pos: { x, y }, vel: { x: 0, y: 0 }, ...extra }) as unknown as Agent;

describe('SCRAMBLE_SEEN: the scramble drill finds grass from his picture', () => {
  // A defender truly sitting on the spot he would work back to, but seen 8 yd away (a stale picture): with the flag he
  // goes by the picture; without it, by the truth.
  const drillSpot = async (flag: string) => {
    const { RouteRunner } = await load({ SCRAMBLE_SEEN: flag });
    const me = agent(52, 20), qb = agent(33, 26.67), d = agent(54, 21);
    const sim = { los: 40, t: 0, qb, defense: [d], see: (_a: Agent, o: Agent) => ({ pos: o === d ? { x: 60, y: 30 } : o.pos, vel: { x: 0, y: 0 } }) } as unknown as PlaySim;
    const rr = Object.create(RouteRunner.prototype) as { drill: unknown; scrambleDrill(a: Agent, s: PlaySim): unknown };
    rr.drill = null;
    try { rr.scrambleDrill(me, sim); } catch { /* goTo needs a full body; the spot is chosen before it */ }
    return (rr.drill as { spot: { x: number; y: number } }).spot;
  };
  it('steers by the defender he sees, not the one who is there', async () => {
    const off = await drillSpot('0'), on = await drillSpot('1');
    expect(on).not.toEqual(off);
    // Off, the true defender at (54, 21) pushes him off the base spot; on, the seen one at (60, 30) is far, so he takes it.
    expect(Math.hypot(on.x - 54, on.y - 21)).toBeLessThan(Math.hypot(off.x - 54, off.y - 21));
  });
});

describe('TRACK_SEEN: the ball tracker ends on his own estimate', () => {
  const run = async (flag: string, lastT: number) => {
    const { TrackBall } = await load({ TRACK_SEEN: flag });
    const me = agent(50, 20, { tags: new Set(), r: () => 0.5 } as unknown as Partial<Agent>);
    const fallback = { kind: 'route', update: () => ({ vel: { x: 7, y: 7 } }) };
    const sim = { t: 1, dice: () => ({ normal: () => 0 }), ball: { kind: 'held' },
      ballEstimates: { estimate: () => [{ t: lastT - 0.1, x: 55, y: 20, z: 2 }, { t: lastT, x: 56, y: 20, z: 1.5 }] } } as unknown as PlaySim;
    const tb = new TrackBall(me, sim, fallback as never);
    const spy = vi.spyOn(fallback, 'update');
    try { tb.update(me, sim); } catch { /* the rest of the tracker needs a full sim; only whether he left it matters here */ }
    return spy.mock.calls.length > 0;
  };
  it('off: the true ball no longer in the air ends tracking on the tick', async () => {
    expect(await run('0', 3)).toBe(true);
  });
  it('on: once his own estimate has the ball down he stops, though nothing told him the true ball landed', async () => {
    expect(await run('1', 0.5)).toBe(true); // his estimate's last sample is past: the flight is over for him
  });
});
