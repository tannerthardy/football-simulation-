import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { supportParams } from '../src/physics/support.js';
import type { HandJoint, Intent } from '../src/physics/world.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { contactControl, inBlockReach, promoteContact, syncJoints, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

// A preserved legacy trace (commands, control and RNG) on the installed get-off.
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
// RUN_FEEL: the blocker mirrors the defender's acquired motion; this scene is staged on true-velocity mirroring (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.SNAP_REACT = '0'; process.env.ARM_PRESS = '0'; process.env.RUN_FEEL = '0'; process.env.SEAL_HOLD = '0'; });
// SEAL_HOLD keeps a loaded run blocker's caught leverage; this scene is staged on the unbounded seal correction (re-record by review 2).

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
afterEach(() => vi.restoreAllMocks());

function fixture(side = 1, primaryHands = 10, helperHands = 90, type: 'run' | 'pass' = 'run', noise = false, legacyRunPolicy = false) {
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  for (const [slot, handTechnique] of [['C', primaryHands], ['LG', helperHands]] as const) {
    personnel[slot] = { ...personnel[slot], ratings: { ...personnel[slot].ratings,
      handTechnique, runBlock: 60, passBlock: 60 },
    measurables: { ...personnel[slot].measurables, armIn: 35 } };
  }
  const defenders = pickDefense(defense, 'base43');
  const originalDefender = defenders.DT_W!;
  defenders.DT_W = { ...originalDefender, ratings: { ...originalDefender.ratings,
    passRushFinesse: 60, blockShedding: 60, strength: 60 },
  measurables: { ...originalDefender.measurables, armIn: 35 } };
  const sim = new PlaySim({ offense: personnel, defense: defenders,
    offCall: type === 'run'
      ? { formation, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'hand continuity' }
      : { formation, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.smash, label: 'hand continuity' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const primary = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!;
  // The frozen hand-law witness uses the preserved insertion policy. Its gap
  // read is the old interior read, while the new first-level foot policy is
  // tested independently with real interior/edge jobs in run-contact-flow.
  if (legacyRunPolicy) defender.runFit = { ...defender.runFit!, kind: 'insert' };
  primary.body.pos = { x: 40, y: CENTER_Y };
  defender.body.pos = { x: 40 + primary.profile.radius + defender.profile.radius + .05, y: CENTER_Y };
  helper.body.pos = { x: defender.pos.x - .32, y: CENTER_Y + side * .6 };
  primary.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
  sim.qb.body.pos = { x: 35, y: CENTER_Y };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  // These contact islands isolate hand technique from execution uncertainty.
  // Separate seed/noise controls below preserve real stochastic acquisition.
  if (!noise) vi.spyOn(sim.rng, 'normal').mockImplementation(mean => mean);
  const engagement = sim.engage(primary, defender, type, type === 'run' ? { x: 1, y: 0 } : null)!;
  expect(engagement).not.toBeNull();
  return { sim, primary, helper, defender, engagement, side };
}

type Fixture = ReturnType<typeof fixture>;
function join(f: Fixture) {
  expect(f.sim.engage(f.helper, f.defender, f.engagement.type, f.engagement.drive)).toBe(f.engagement);
  return f.engagement.helperHands!.get(f.helper)!;
}
function outsideWorkingReach(f: Fixture) {
  const sep = f.helper.profile.radius + f.defender.profile.radius;
  const arm = f.helper.player.measurables.armIn / 36;
  const working = sep + arm * .3, strike = sep + .1 + arm * .45;
  return (working + strike) / 2;
}
function handState(j: HandJoint) {
  return { actor: j.actor, extension: j.extension, push: j.push, hold: j.hold,
    steer: j.steer, normalForce: j.normalForce, tangentForce: j.tangentForce };
}
function step(f: Fixture) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, f.sim.dt);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
  }
  f.sim.t += f.sim.dt;
  f.sim.perception.record(f.sim.agents);
  return { intents, report };
}

describe('run helpers earn contact and retain it through ownership', () => {
  it.each([-1, 1])('a good helper can have inside hands while the poor primary does not, side %s', side => {
    const f = fixture(side), joint = join(f), e = f.engagement;
    expect(e.control).toBeLessThan(0);
    expect(contactControl(e, f.helper)).toBeGreaterThan(0);
    expect(joint.actor).toBe(f.helper.body);
    const keeperControl = contactControl(e, f.helper)!, saved = handState(joint);
    const bodies = f.sim.agents.map(a => structuredClone(a.body)), joints = [...f.sim.world.joints];
    e.holding = true;
    expect(promoteContact(e, f.helper)).toBe(true);
    expect(e.blocker).toBe(f.helper); expect(e.hands).toBe(joint);
    expect(e.control).toBe(keeperControl); expect(e.holding).toBe(false);
    expect(handState(joint)).toEqual(saved);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(f.sim.world.joints).toEqual(joints);
    f.primary.engagement = null;
    syncJoints(f.sim, e);
    expect(handState(joint)).toEqual(saved);
    expect(e.helperHands!.has(f.helper)).toBe(false);
    const report = step(f).report;
    expect(e.hands).toBe(joint);
    expect(report.armImpulse[f.helper.idx]).toBeGreaterThan(0);
  });

  it.each([-1, 1])('the good primary does not lend his inside hands to a poor helper, side %s', side => {
    const f = fixture(side, 90, 10), joint = join(f), e = f.engagement;
    expect(e.control).toBeGreaterThan(0);
    expect(contactControl(e, f.helper)).toBeLessThan(0);
    expect(joint.actor).toBe(f.defender.body);
    const report = step(f).report;
    // Positive compressive load alone cannot mean the helper won his hands.
    expect(joint.normalForce).toBeGreaterThan(0);
    expect(contactControl(e, f.helper)).toBeLessThan(0);
    expect(report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
    const prior = contactControl(e, f.helper)!, saved = handState(joint);
    expect(promoteContact(e, f.helper)).toBe(true);
    expect(e.control).toBe(prior);
    f.primary.engagement = null; syncJoints(f.sim, e);
    expect(handState(joint)).toEqual(saved);
    expect(e.hands!.actor).toBe(f.defender.body);
    expect(step(f).report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
  });

  it('reflects the same hand decisions, contact loads and achieved movement', () => {
    const a = fixture(-1), b = fixture(1); join(a); join(b);
    for (let k = 0; k < 3; k++) {
      step(a); step(b);
      expect(contactControl(a.engagement, a.helper)).toBe(contactControl(b.engagement, b.helper));
      expect(a.engagement.control).toBe(b.engagement.control);
      for (const name of ['primary', 'helper', 'defender'] as const) {
        expect(a[name].pos.x).toBeCloseTo(b[name].pos.x, 9);
        expect(a[name].pos.y-CENTER_Y).toBeCloseTo(CENTER_Y-b[name].pos.y, 9);
        expect(a[name].vel.x).toBeCloseTo(b[name].vel.x, 9);
        expect(a[name].vel.y).toBeCloseTo(-b[name].vel.y, 9);
      }
      expect(a.engagement.helperHands!.get(a.helper)!.normalForce)
        .toBeCloseTo(b.engagement.helperHands!.get(b.helper)!.normalForce!, 8);
    }
  });

  it('does not acquire control, arm capacity or RNG draws by reaching at air', () => {
    const f = fixture(), checkpoint = new Rng(11);
    // Own the helper at a reachable approach distance outside neutral hands.
    f.helper.body.pos = { x: f.defender.pos.x - outsideWorkingReach(f), y: CENTER_Y };
    expect(inBlockReach(f.helper, f.defender, 'run')).toBe(true);
    // Comparing equal streams after joining avoids assuming constructor draws.
    const state = structuredClone(f.sim.rng);
    Object.assign(checkpoint, state);
    const joint = join(f);
    expect(contactControl(f.engagement, f.helper)).toBeNull();
    expect(joint.push + joint.hold + joint.steer).toBe(0);
    expect(f.sim.rng.nextU32()).toBe(checkpoint.nextU32());
    expect(promoteContact(f.engagement, f.helper)).toBe(false);
  });

  it('forgets separated hands and earns a fresh contact rather than recycling security', () => {
    const f = fixture(), joint = join(f), first = contactControl(f.engagement, f.helper)!;
    expect(first).toBeGreaterThan(0);
    const contact = { ...f.helper.pos };
    f.helper.body.pos = { x: f.defender.pos.x - 2, y: CENTER_Y };
    syncJoints(f.sim, f.engagement);
    expect(contactControl(f.engagement, f.helper)).toBeNull();
    expect(joint.push + joint.hold + joint.steer).toBe(0);
    expect(promoteContact(f.engagement, f.helper)).toBe(false);
    // Historical telemetry remains historical. A prior nonzero load must not
    // reacquire separated hands outside their current working distance.
    joint.normalForce = 900;
    f.helper.body.pos = { x: f.defender.pos.x - outsideWorkingReach(f), y: CENTER_Y };
    syncJoints(f.sim, f.engagement);
    expect(contactControl(f.engagement, f.helper)).toBeNull();
    expect(joint.push + joint.hold + joint.steer).toBe(0);
    vi.mocked(f.sim.rng.normal).mockImplementation((mean, sd) => mean - sd * 2);
    f.helper.body.pos = contact;
    syncJoints(f.sim, f.engagement);
    expect(contactControl(f.engagement, f.helper)).toBeLessThan(first);
    expect(contactControl(f.engagement, f.helper)).not.toBeNull();
    expect(f.engagement.helperHands!.get(f.helper)).toBe(joint);
  });

  it('uses first-contact uncertainty independently of the primary', () => {
    const a = fixture(1, 10, 90, 'run', true), b = fixture(1, 10, 90, 'run', true);
    join(a); join(b);
    expect(contactControl(a.engagement, a.helper)).toBe(contactControl(b.engagement, b.helper));
    expect(contactControl(a.engagement, a.helper)).not.toBe(a.engagement.control);
    const quiet = fixture(); join(quiet);
    expect(contactControl(a.engagement, a.helper)).not.toBe(contactControl(quiet.engagement, quiet.helper));
  });

  it('permits extended working hands to exchange without awarding an inside-hand win', () => {
    const good = fixture(), adverse = fixture();
    for (const f of [good, adverse]) {
      const sep = f.helper.profile.radius + f.defender.profile.radius;
      const arm = f.helper.player.measurables.armIn / 36;
      const distance = sep + arm * .225;
      // Current feet are beyond neutral arms but within the same law's
      // maximum working extension. The new contact must not wait for a
      // shorter invented helper reach, or inherit the primary's hands.
      f.helper.body.pos = { x: f.defender.pos.x - distance * .5,
        y: f.defender.pos.y + distance * Math.sqrt(.75) };
      expect(Math.hypot(f.helper.pos.x-f.primary.pos.x, f.helper.pos.y-f.primary.pos.y))
        .toBeGreaterThan(f.helper.profile.radius+f.primary.profile.radius);
    }
    vi.mocked(adverse.sim.rng.normal).mockReturnValueOnce(0)
      .mockReturnValueOnce(-.54).mockReturnValueOnce(.54);
    const goodJoint = join(good), adverseJoint = join(adverse);
    expect(contactControl(good.engagement, good.helper)).toBeGreaterThan(0);
    expect(contactControl(adverse.engagement, adverse.helper)).toBeLessThan(0);
    expect(goodJoint.actor).toBe(good.helper.body);
    expect(adverseJoint.actor).toBe(adverse.defender.body);
    expect(goodJoint.extension).not.toBe(adverseJoint.extension);
  });

  it('shares one defender arm budget when he controls both contacts', () => {
    const f = fixture(1, 10, 10), joint = join(f);
    expect(f.engagement.hands!.actor).toBe(f.defender.body);
    expect(joint.actor).toBe(f.defender.body);
    const report = step(f).report;
    expect(f.engagement.hands!.normalForce).toBeGreaterThan(0);
    expect(joint.normalForce).toBeGreaterThan(0);
    expect(report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
    expect(report.armImpulse[f.defender.idx]).toBeLessThanOrEqual(report.armImpulseLimit[f.defender.idx] + 1e-8);
  });

  it('leaves a pass helper on its legacy bounded law without run control state', () => {
    const f = fixture(1, 10, 90, 'pass'), joint = join(f);
    expect(contactControl(f.engagement, f.helper)).toBeNull();
    expect(joint.hold).toBe(0);
    step(f);
    expect(contactControl(f.engagement, f.helper)).toBeNull();
  });

  it('does not transfer a departed pass blocker\'s landed finesse window after conversion to run', () => {
    const f = fixture(1, 10, 90, 'pass'), joint = join(f), e = f.engagement;
    e.move = 'swim'; e.moveOk = true; e.moveUntil = f.sim.t + .3;
    f.sim.isPass = false;
    step(f);
    expect(e.type).toBe('run');
    expect(e.moveOk).toBe(true);
    expect(contactControl(e, f.helper)).not.toBeNull();
    const saved = handState(joint), bodies = f.sim.agents.map(a => structuredClone(a.body));
    expect(promoteContact(e, f.helper)).toBe(true);
    expect(e.moveOk).toBe(false);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    f.primary.engagement = null;
    syncJoints(f.sim, e);
    expect(handState(joint)).toEqual(saved);
  });
});

describe('solo hand-fight execution retains its legacy policy with the selected yaw motor', () => {
  it.each(['run', 'pass'] as const)('preserves legacy %s commands/control/RNG and the reviewed motor-specific physical trace', type => {
    const f = fixture(1, 10, 90, type, true, type === 'run'), trace: unknown[] = [], policyTrace: unknown[] = [];
    for (let k = 0; k < 6; k++) {
      const { intents, report } = step(f);
      // The frozen witness predates Rule12 observation receipts. Preserve
      // every historical physics field and its order, excluding only the
      // newly added contact/strike metadata from this legacy hash. Commands,
      // bodies, loads, control and the next execution RNG draw stay exact.
      // armSwingYaw (GRASP_ARM_MOMENT) is a later report field, 0 here (no grasp); left out so the hash stays on the physics.
      const { armSwingYaw: _armSwingYaw, ...reportFields } = report;
      const historicalReport = { ...reportFields,
        contacts: report.contacts.map(({ first: _first, ...physical }) => physical),
        strikes: report.strikes.map(({ requestedAt: _requestedAt, first: _first,
          contactAnatomy: _contactAnatomy, ...physical }) => physical),
      };
      trace.push({ intents, control: f.engagement.control,
        bodies: f.sim.agents.map(a => structuredClone(a.body)), report: historicalReport });
      policyTrace.push({ intents, control: f.engagement.control });
    }
    const nextRng = f.sim.rng.nextU32();
    // The approved #180 motor intentionally changes post-contact yaw and
    // recovery. The six-tick accepted / motor-only / combined diagnostic
    // preserves the historical full hashes and shows the first physical
    // change at tick six, with no command, control or RNG change. Keep those
    // legacy policy fields pinned separately; pin the complete physical trace
    // to independently reviewed #180, rather than requiring the old motor.
    // See docs/reviews/solo-hand-motor-contract.md and its exact trace receipt.
    // G5 (ARM_PRESS): the cloned bodies' profiles now carry the bench-press
    // capacity (`press`); with it removed the #180 hashes reproduce exactly.
    // FAT-2 (two energy pools): the fast pool drains three times faster under
    // load, so energies and fatigue factors move. With the old drain and curve
    // both hashes reproduce exactly. In the pass rep one command moves by at
    // most 4e-7 yd/s on ticks 3-6 (agent 3, vel.x); the run policy is unchanged.
    // PHY-1 (leg force-velocity): a leaning body's strength term now falls with
    // his speed along the force, and the ground limit is friction on his actual
    // normal load. Commands, control and RNG are unchanged (the policy hashes
    // above), only the achieved bodies move, so both physical hashes are
    // re-recorded.
    // Start law (#336): C's 2.4 (run) / 2.2 (pass) yd/s and DT_W's sub-top-speed
    // requests now start at full leg force, so bodies move from tick 1 and C's
    // seal/set commands follow them from tick 2; tick-1 commands, every control
    // value and the RNG are unchanged. Policy and physical hashes re-recorded.
    // Direction-free start (#353): a below-cap request starts at the body's full
    // start force whatever his facing. The first divergence is the tick-1 bodies
    // of exactly the agents with such a request off their facing: run C (2.4 yd/s,
    // 6-17 deg off) and DT_W (1.5 yd/s, 11 deg off); pass C (2.2 yd/s set, 180
    // deg off). Tick-1 commands, every control value and the next RNG draw are
    // unchanged; C's later commands follow his body (run <= 0.008, pass <= 0.09
    // yd/s by tick 6). With the old start force both hashes reproduce exactly.
    // Policy and physical hashes re-recorded.
    const policy = { trace: policyTrace, nextRng };
    const policyHash = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
    expect(policyHash).toBe(type === 'run'
      ? '04f3e3b09f78e10495d63d73ed66e0cabbc68bd11d8caba06a4eb3facef9fd93'
      : 'c880366aa2b2fc9662b93c1734521f1c4b1700f4730144558a36686df172e6c5');
    const actual = createHash('sha256').update(JSON.stringify({ trace, nextRng })).digest('hex');
    const motor180 = type === 'run'
      ? 'f054f02f10718e96e18c041fc1191a240da26a2c5215e0099d2099061f4d380b'
      : '4c9f557fe7ae66d00860fadb146fadca5e1972320053ce2505407612d77f23d5';
    expect(actual).toBe(motor180);
  });
});
