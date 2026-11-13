import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier, observedRecoveryAllowance } from '../src/sim/behaviors/carrier.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
function make(offFeetWitness = false) {
  const formation = offFeetWitness ? FORMATION_BY_ID.gun_wing_12 : FORMATION_BY_ID.ace_11;
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: offFeetWitness,
      run: offFeetWitness ? RUN_BY_ID.split_zone : RUN_BY_ID.iz_strong, label: 'recovery cue witness' },
    defCall: { personnel: 'base43', front: offFeetWitness ? FRONT_BY_ID.over : FRONT_BY_ID.under,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: offFeetWitness ? 'Over Cover 3' : 'Under Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: offFeetWitness ? 11 : 3, record: false });
}
type Decision = { heading: number; score: number; blocked: boolean; exits: boolean };
type InspectCarrier = { evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): Decision };

/** Staged controller slice, not prescribed native football or a tackle result.
 * Keep body kinematics/capabilities fixed and vary only the visible picture or
 * its hidden support state. Existing evaluation is called once per query. */
function scene(pose: Perceived['pose'], side = 1) {
  const sim = make(), rb = sim.slot('RB')!, threat = sim.slot('LB_M')!;
  sim.t = 4;
  for (const agent of sim.agents) { agent.body.pos = { x: 100 + agent.idx, y: 5 }; agent.body.vel = { x: 0, y: 0 }; }
  rb.body.pos = { x: 55, y: CENTER_Y }; rb.body.vel = { x: 4, y: 0 };
  threat.body.pos = { x: 58, y: CENTER_Y + side * .5 };
  sim.see = (_a, target) => ({ pos: { ...target.pos }, vel: { ...target.vel }, stance: null,
    facing: target.facing, age: .2, pose: target === threat ? pose : 'up' });
  const forecast = () => (new BallCarrier({}, rb) as unknown as InspectCarrier).evaluate(rb, sim, 1, false);
  return { sim, rb, threat, forecast };
}

describe('carrier recovery is a bounded visible-pose estimate', () => {
  it('upright and unknown pictures do not infer a recovery phase', () => {
    for (const pose of ['up', null, undefined] as const) {
      expect(observedRecoveryAllowance({ pose, age: .2 }, 1.1, .05)).toBe(0);
    }
  });

  it('older off-feet pictures reduce the allowance without a negative arrival', () => {
    for (const pose of ['down', 'rising'] as const) {
      const ages = [0, .1, .3, .7, 2, Infinity];
      const allowances = ages.map(age => observedRecoveryAllowance({ pose, age }, 1.1, .05));
      for (let i = 0; i < allowances.length; i++) {
        expect(allowances[i]).toBeGreaterThanOrEqual(.05);
        expect(allowances[i]).toBeLessThanOrEqual(1.1);
        if (i) expect(allowances[i]).toBeLessThanOrEqual(allowances[i - 1]);
      }
      expect(observedRecoveryAllowance({ pose, age: -1 }, 1.1, .05)).toBe(allowances[0]);
    }
    expect(observedRecoveryAllowance({ pose: 'rising', age: .2 }, 1.1, .05))
      .toBeLessThan(observedRecoveryAllowance({ pose: 'down', age: .2 }, 1.1, .05));
  });

  it('remains finite and bounded when optional profile or picture fields are malformed', () => {
    for (const pose of ['down', 'rising'] as const)
      for (const getUp of [undefined, NaN, Infinity, -1, 0, .6, 1.4, 100])
        for (const age of [undefined, NaN, Infinity, -1, 0, 10])
          for (const dt of [.05, NaN, Infinity, 0, -1]) {
            const allowance = observedRecoveryAllowance({ pose, age }, getUp, dt);
            expect(Number.isFinite(allowance)).toBe(true);
            expect(allowance).toBeGreaterThan(0);
            expect(allowance).toBeLessThanOrEqual(2);
          }
  });

  it.each([-1, 1])('a stale upright picture ignores a hidden fall on side %s', side => {
    const { sim, threat, forecast } = scene('up', side);
    const upright = forecast();
    for (const state of ['falling', 'down', 'rising'] as const) {
      threat.body.support!.state = state;
      threat.body.support!.since = sim.t - .1;
      threat.downUntil = -1;
      expect(threat.isDown(sim.t)).toBe(true);
      expect(forecast()).toEqual(upright);
      // Expired artificial deadlines cannot become negative recovery time.
      threat.downUntil = sim.t - 100;
      expect(forecast()).toEqual(upright);
    }
  });

  it('a delayed down picture retains its estimate after the hidden body has risen', () => {
    const { threat, forecast } = scene('down');
    threat.body.support!.state = 'down';
    const visiblyDown = forecast();
    threat.body.support!.state = 'up';
    threat.body.support!.since = -Infinity;
    expect(forecast()).toEqual(visiblyDown);
  });

  it('a missing pose is conservative about availability rather than using hidden support', () => {
    const missing = scene(undefined), upright = scene('up');
    missing.threat.body.support!.state = 'down';
    expect(missing.forecast()).toEqual(upright.forecast());
  });

  it('preserves explicit scenario parking without calling it a visible fall', () => {
    const { sim, threat, forecast } = scene('up');
    const available = forecast();
    threat.downUntil = sim.t + 5;
    expect(threat.pose).toBe('up');
    const parked = forecast();
    expect(parked.score).toBeGreaterThan(available.score);
    expect(parked.heading).toBeCloseTo(0, 12);
    expect(parked.blocked).toBe(false);
  });

  it('consumes actual delayed off-feet pictures without reading the hidden recovery state', () => {
    const sim = make(), rb = sim.slot('RB')!, threat = sim.slot('LB_M')!;
    sim.t = 4;
    for (const agent of sim.agents) {
      agent.body.pos = { x: 100 + agent.idx, y: 5 };
      agent.body.vel = { x: 0, y: 0 };
    }
    rb.body.pos = { x: 55, y: CENTER_Y }; rb.body.vel = { x: 4, y: 0 };
    threat.body.pos = { x: 58, y: CENTER_Y + .5 };
    const record = () => sim.perception.record(sim.agents);
    for (let k = 0; k < 24; k++) record();
    const controller = new BallCarrier({}, rb) as unknown as InspectCarrier;
    const forecast = () => controller.evaluate(rb, sim, 1, false);
    const upright = forecast();
    const initialPicture = sim.see(rb, threat, .7);
    expect(initialPicture.pose).toBe('up');
    expect(initialPicture.age).toBeGreaterThanOrEqual(sim.dt);
    // The controlled visible pose is an initial condition, not a forced
    // tackle outcome. The ordinary buffer, latency and see path remain intact.
    threat.body.support!.state = 'down'; threat.body.support!.since = sim.t;
    record();
    expect(sim.see(rb, threat, .7).pose).toBe('up');
    expect(forecast()).toEqual(upright);
    for (let k = 0; k < 24; k++) record();
    const picture = sim.see(rb, threat, .7);
    expect(picture.pose).toBe('down');
    const allowance = observedRecoveryAllowance(picture, threat.profile.getUp, sim.dt);
    expect(allowance).toBeGreaterThanOrEqual(sim.dt);
    expect(allowance).toBeLessThanOrEqual(2);
    const visiblyDown = forecast();
    expect(visiblyDown.score).toBeGreaterThan(upright.score);
    threat.body.support!.state = 'up'; threat.body.support!.since = -Infinity;
    record();
    expect(sim.see(rb, threat, .7).pose).toBe('down');
    expect(forecast()).toEqual(visiblyDown);
  });

  it('observes finite decisions without changing either fixed native run', () => {
    for (const offFeetWitness of [false, true]) {
      const sim = make(offFeetWitness), inspected = new WeakSet<BallCarrier>();
      const decisions: Decision[] = [], allowances: number[] = [];
      const originalSee = sim.see, originalTick = sim.tick;
      let evaluating = false;
      sim.see = function (observer, target, ...rest) {
        const picture = originalSee.call(this, observer, target, ...rest);
        if (evaluating && observer.slot === 'RB' && target.team !== observer.team
          && (picture.pose === 'down' || picture.pose === 'rising'))
          allowances.push(observedRecoveryAllowance(picture, target.profile.getUp, sim.dt));
        return picture;
      };
      sim.tick = function () {
        const rb = sim.slot('RB')!, behavior = rb.behavior;
        if (behavior instanceof BallCarrier && !inspected.has(behavior)) {
          inspected.add(behavior);
          const controller = behavior as unknown as InspectCarrier, evaluate = controller.evaluate;
          controller.evaluate = function (a, s, dir, designed) {
            evaluating = true;
            try {
              const result = evaluate.call(this, a, s, dir, designed);
              decisions.push({ ...result });
              return result;
            } finally { evaluating = false; }
          };
        }
        return originalTick.call(this);
      };
      const result = sim.run();
      // Native controls retain the original calls and seeds. They establish
      // observational equivalence, not a required incidental fall. Actual
      // delayed off-feet consumption is tested above in a controlled setup.
      expect(result.outcome).not.toBe('timeout');
      expect(decisions.length).toBeGreaterThan(0);
      const plain = make(offFeetWitness), plainResult = plain.run();
      expect(result).toEqual(plainResult);
      expect(sim.agents.map(a => a.body)).toEqual(plain.agents.map(a => a.body));
      expect(sim.agents.map(a => a.mind)).toEqual(plain.agents.map(a => a.mind));
      expect(sim.perception).toEqual(plain.perception);
      expect(sim.rng.nextU32()).toBe(plain.rng.nextU32());
      for (const decision of decisions) {
        expect(Number.isFinite(decision.heading)).toBe(true);
        expect(Number.isFinite(decision.score)).toBe(true);
      }
      for (const allowance of allowances) {
        expect(allowance).toBeGreaterThanOrEqual(sim.dt);
        expect(allowance).toBeLessThanOrEqual(2);
      }
    }
  });
});
