import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { QBPass } from '../src/sim/behaviors/qb.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';

// These two consumer regressions also run, unchanged, on accepted develop.
const home = generateTeam(new Rng(91), 'Forecast offense', 'FOF');
const away = generateTeam(new Rng(92), 'Forecast defense', 'FDF');
function fixture() {
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: 'slant' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'match', label: 'Over Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  sim.t = .2;
  const qb = sim.qb.behavior as QBPass;
  qb.update(sim.qb, sim); // Ordinary quick-game look acquires the delayed receiver picture.
  const r = sim.agents[qb.recordedState().read!];
  expect(r.behavior).toBeInstanceOf(RouteRunner);
  // Private entry points isolate forecast consumers from unrelated live eligibility,
  // protection and progression gates. Those gates are not claimed invariant.
  const consumer = qb as unknown as {
    evaluate: (a: typeof sim.qb, s: PlaySim, r: typeof sim.qb, urgency: number) => {
      target: typeof sim.qb; point: { x: number; y: number; z: number }; T: number; P: number; value: number;
    };
    release: (a: typeof sim.qb, s: PlaySim, ev: ReturnType<typeof consumer.evaluate>) => void;
  };
  return { sim, qb, r, consumer };
}

function unseenChange(f: ReturnType<typeof fixture>) {
  const r = f.r, rr = r.behavior as RouteRunner;
  r.body.pos = { x: r.pos.x + 9, y: r.pos.y + 5 };
  r.body.vel = { x: -3, y: -5 };
  r.body.facing = 2.4; r.body.energy = .12; r.body.sprintLoad = 8;
  rr.idx = rr.path.length - 1; rr.settled = true;
  rr.path = [{ p: { x: 85, y: 46 }, s: .1 }];
}

function result(ev: ReturnType<ReturnType<typeof fixture>['consumer']['evaluate']>) {
  return { point: ev.point, T: ev.T, P: ev.P, value: ev.value };
}

describe('QB forecast-consumer acquired-information boundary', () => {
  it('evaluation is unchanged under unseen receiver body/path/progress divergence with the acquired inputs held', () => {
    const held = fixture(), hidden = fixture();
    unseenChange(hidden);
    for (const t of [.2, .4, .6]) {
      held.sim.t = hidden.sim.t = t; // The same acquired picture ages in both arms.
      const a = held.consumer.evaluate(held.sim.qb, held.sim, held.r, .2);
      const b = hidden.consumer.evaluate(hidden.sim.qb, hidden.sim, hidden.r, .2);
      expect(a).not.toBeNull(); expect(b).not.toBeNull();
      expect(result(b)).toEqual(result(a));
    }
  });

  it('release aim AND launch are unchanged under the same unseen divergence', () => {
    const held = fixture(), hidden = fixture();
    const a = held.consumer.evaluate(held.sim.qb, held.sim, held.r, .2);
    const b = hidden.consumer.evaluate(hidden.sim.qb, hidden.sim, hidden.r, .2);
    unseenChange(hidden);
    // A later release must not get a false pass from RouteRunner's old same-tick cache.
    held.sim.t = hidden.sim.t = .25;
    const throwA = vi.spyOn(held.sim, 'throwBall').mockImplementation(() => {});
    const throwB = vi.spyOn(hidden.sim, 'throwBall').mockImplementation(() => {});
    held.consumer.release(held.sim.qb, held.sim, a);
    hidden.consumer.release(hidden.sim.qb, hidden.sim, b);
    expect(throwA).toHaveBeenCalledOnce(); expect(throwB).toHaveBeenCalledOnce();
    expect(throwB.mock.calls[0].slice(2)).toEqual(throwA.mock.calls[0].slice(2));
  });
});
