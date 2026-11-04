import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import { screenSpot } from '../src/sim/screen-spot.js';

function tunnel(flip: boolean) {
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip, kind: 'pass', pass: SCREEN_BY_ID.tunnel_screen, label: 'tunnel' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over3' },
    los: 35, ballY: 26, firstDownX: 45, seed: 1007 });
}
type Evaluation = { point: { x: number; y: number; z: number }; T: number } | null;
type Consumer = {
  evaluate: (a: Agent, s: PlaySim, r: Agent, urgency: number) => Evaluation;
  toSpot: (a: Agent, s: PlaySim, r: Agent) => { spot: { x: number; y: number } } | null;
};

describe('tunnel installed catch point survives throw evaluation', () => {
  it.each([false, true])('native evaluated spot throws retain the call landmark through flight selection, flip %s', flip => {
    const sim = tunnel(flip), work = sim.qb.behavior as unknown as Consumer;
    const evaluate = work.evaluate.bind(work), toSpot = work.toSpot.bind(work);
    let active: ReturnType<Consumer['toSpot']> = null, inside = false;
    const observations: { intended: { x: number; y: number }; actual: NonNullable<Evaluation> }[] = [];
    work.toSpot = (...args) => { const to = toSpot(...args); if (inside) active = to; return to; };
    work.evaluate = (...args) => {
      active = null; inside = true;
      try {
        const result = evaluate(...args);
        // evaluate synchronously invokes the toSpot wrapper above.
        const intended = active as ReturnType<Consumer['toSpot']>;
        if (intended && result) observations.push({ intended: { ...intended.spot }, actual: { point: { ...result.point }, T: result.T } });
        return result;
      } finally { inside = false; }
    };
    sim.run();
    expect(observations.length).toBeGreaterThan(0);
    for (const { intended, actual } of observations) {
      expect(actual.point).toEqual({ ...intended, z: 1.3 });
      expect(actual.T).toBeGreaterThan(0);
    }
  });

  it('an acquired deep receiver forecast cannot set catch height for a shallow installed spot', () => {
    const sim = tunnel(false), spot = screenSpot(sim, sim.offCall.pass!)!, r = spot.receiver;
    const work = sim.qb.behavior as unknown as Consumer;
    const forecast = (Reflect.get(work, 'receiverForecasts') as Map<Agent, ReceiverForecast>).get(r)!;
    sim.t = 2;
    forecast.acquire({ pos: { x: sim.los + 25, y: r.pos.y }, vel: { x: 1, y: 0 }, facing: 0,
      pose: 'up', sampledAt: sim.t, acquiredAt: sim.t });
    expect(work.toSpot(sim.qb, sim, r)).not.toBeNull();
    const evaluated = work.evaluate(sim.qb, sim, r, 1);
    expect(evaluated?.point).toEqual({ ...spot.spot, z: 1.3 });
  });
});
