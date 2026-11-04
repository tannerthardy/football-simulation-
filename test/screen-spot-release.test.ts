import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { clamp, type Vec3 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import { screenSpot } from '../src/sim/screen-spot.js';

type Evaluation = { target: Agent; point: Vec3; T: number; P: number; intRisk: number; value: number; depth: number };
type Consumer = {
  evaluate: (a: Agent, s: PlaySim, r: Agent, urgency: number) => Evaluation | null;
  toSpot: (a: Agent, s: PlaySim, r: Agent) => { spot: { x: number; y: number } } | null;
  ready: (r: Agent, s: PlaySim) => boolean;
  release: (a: Agent, s: PlaySim, ev: Evaluation) => void;
};
function fixture(id: string, seed = 1007, authorLab = false) {
  const formation = FORMATION_BY_ID[id === 'bubble_screen' ? 'gun_trey_11' : 'gun_doubles_11'];
  const concept = SCREEN_BY_ID[id] ?? PASS_BY_ID[id];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: authorLab ? concept.name : id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: authorLab ? COVERAGE_BY_ID.cover1 : COVERAGE_BY_ID.cover3, pressure: null, label: authorLab ? 'Nickel Over Cover 1' : 'Over3' },
    los: 35, ballY: authorLab ? CENTER_Y : 26, firstDownX: 45, seed });
  const work = sim.qb.behavior as unknown as Consumer;
  const r = concept.screen ? screenSpot(sim, concept)!.receiver : (Reflect.get(work, 'reads') as Agent[])[0];
  const forecast = (Reflect.get(work, 'receiverForecasts') as Map<Agent, ReceiverForecast>).get(r)!;
  return { sim, work, r, forecast };
}
afterEach(() => vi.restoreAllMocks());

describe('evaluated screen aim belongs to the pending throw through release', () => {
  it('native tunnel release throws at the selected installed spot, not a later receiver forecast', () => {
    // The author's open-gate/center release leaves the old Cover3 shift2 with
    // no selected spot throw. Use the already-declared lab's Cover1 seed1
    // (midfield), which exercises this same end-to-end aim contract.
    const f = fixture('tunnel_screen', 1007, true);
    const evaluate = f.work.evaluate.bind(f.work), toSpot = f.work.toSpot.bind(f.work);
    const fixed = new WeakMap<Evaluation, Vec3>();
    let inside = false, active: ReturnType<Consumer['toSpot']> = null;
    f.work.toSpot = (...args) => { const to = toSpot(...args); if (inside) active = to; return to; };
    f.work.evaluate = (...args) => {
      active = null; inside = true;
      try {
        const ev = evaluate(...args), chosen = active as ReturnType<Consumer['toSpot']>;
        if (ev && chosen) fixed.set(ev, { ...chosen.spot, z: 1.3 });
        return ev;
      } finally { inside = false; }
    };
    const observed: { intended: Vec3; released: Vec3 }[] = [];
    const throwBall = f.sim.throwBall.bind(f.sim);
    f.sim.throwBall = (...args) => {
      const intended = fixed.get(Reflect.get(f.work, 'pending') as Evaluation);
      if (intended) observed.push({ intended, released: { ...args[3] } });
      return throwBall(...args);
    };
    f.sim.run();
    expect(observed).toHaveLength(1);
    expect(observed[0].released).toEqual(observed[0].intended);
  });

  it('arrival after evaluation cannot silently replace the pending fixed-spot aim', () => {
    const f = fixture('tunnel_screen'), first = f.forecast.prior.path[0].p;
    f.sim.t = 2;
    f.forecast.acquire({ pos: { x: first.x, y: first.y - .1 }, vel: { x: -.2, y: 1 }, facing: 1.7,
      pose: 'up', sampledAt: 2, acquiredAt: 2 });
    expect(f.work.toSpot(f.sim.qb, f.sim, f.r)).not.toBeNull();
    const ev = f.work.evaluate(f.sim.qb, f.sim, f.r, .2)!;
    expect(ev).not.toBeNull();
    const intended = { ...ev.point }, spot = screenSpot(f.sim, f.sim.offCall.pass!)!.spot;
    f.sim.t += .05;
    f.forecast.acquire({ pos: spot, vel: { x: 0, y: 4 }, facing: 1.57, pose: 'up', sampledAt: f.sim.t, acquiredAt: f.sim.t });
    expect(f.work.ready(f.r, f.sim)).toBe(true); expect(Reflect.get(f.work, 'spotDone')).toBe(true);
    expect(f.forecast.predict(f.sim.t, ev.T)).not.toEqual({ x: intended.x, y: intended.y });
    const throwBall = vi.spyOn(f.sim, 'throwBall').mockImplementation(() => {});
    const toSpot = vi.spyOn(f.work, 'toSpot');
    f.work.release(f.sim.qb, f.sim, ev);
    expect(throwBall).toHaveBeenCalledOnce(); expect(throwBall.mock.calls[0][3]).toEqual(intended);
    expect(toSpot).not.toHaveBeenCalled();
  });

  it.each(['curl_flat', 'rb_slip_screen', 'bubble_screen'])('%s still refreshes its acquired forecast at release', id => {
    const f = fixture(id), start = f.forecast.prior.start;
    f.sim.t = 2;
    f.forecast.acquire({ pos: { x: start.x + 1, y: start.y + 1 }, vel: { x: 1, y: 1 }, facing: .8,
      pose: 'up', sampledAt: 2, acquiredAt: 2 });
    const ev = f.work.evaluate(f.sim.qb, f.sim, f.r, .2)!; expect(ev).not.toBeNull();
    f.sim.t += .05;
    f.forecast.acquire({ pos: { x: start.x + 4, y: start.y - 2 }, vel: { x: 2, y: -1 }, facing: -.5,
      pose: 'up', sampledAt: f.sim.t, acquiredAt: f.sim.t });
    const latest = f.forecast.predict(f.sim.t, ev.T)!;
    const expected = { x: latest.x, y: clamp(latest.y, 2, FIELD_WIDTH - 2), z: ev.point.z };
    expect(expected).not.toEqual(ev.point);
    const throwBall = vi.spyOn(f.sim, 'throwBall').mockImplementation(() => {});
    f.work.release(f.sim.qb, f.sim, ev);
    expect(throwBall).toHaveBeenCalledOnce(); expect(throwBall.mock.calls[0][3]).toEqual(expected);
  });
});
