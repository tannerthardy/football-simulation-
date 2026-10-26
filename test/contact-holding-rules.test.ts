import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { GraspJoint, HandJoint, Intent } from '../src/physics/world.js';
import { captureHoldingStart, observeHolding } from '../src/sim/contact-holding.js';
import { syncJoints } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
import { gripForce } from '../src/sim/tackle.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const offense = generateTeam(new Rng(603), 'Offense', 'OFF', { strength: .55 });
const defense = generateTeam(new Rng(604), 'Defense', 'DEF', { strength: .55 });

/** Ordinary generated bodies and the real World; stage one already-acquired
 * cloth-grab technique so neither a random selection nor a requested contact
 * can award the foul. No force/capacity or ratings are increased. */
function scene() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel),
    defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'holding mechanism' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50,
    seed: 53, record: false });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.qb.body.pos = { x: 35, y: CENTER_Y };
  const blocker = sim.slot('LT')!, victim = sim.slot('DE_S')!;
  blocker.body.pos = { x: 39, y: CENTER_Y };
  victim.body.pos = { x: 37.95, y: CENTER_Y };
  blocker.body.facing = Math.PI; victim.body.facing = Math.PI;
  const rep = sim.engage(blocker, victim, 'pass')!;
  expect(rep).not.toBeNull();
  rep.control = .7; rep.holding = true;
  syncJoints(sim, rep);
  // Start just beyond the ordinary acquired working distance. This does not
  // extend reach or create a prescribed reaction; World supplies bounded pull.
  victim.body.pos.x = blocker.pos.x - rep.hands!.extension - .04;
  victim.body.vel.x = -3;
  sim.t = .5;
  const intents: Intent[] = sim.agents.map(a => ({ vel: { ...a.vel }, facing: a.facing }));
  sim.intents = intents;
  return { sim, blocker, victim, rep, intents };
}

function step(f: ReturnType<typeof scene>) {
  const start = captureHoldingStart(f.sim);
  const report = f.sim.world.step(f.intents, f.sim.dt);
  observeHolding(f.sim, report, start);
  return report;
}

const calls = (sim: PlaySim) => sim.penalties.filter(p => p.kind === 'holding' || p.kind === 'defensive_holding');

describe('achieved holding, NFL2026 12-1-2/3/5/6', () => {
  it('reaches the native live caller after a selected grab without calling the legacy visibility bit', () => {
    const f = scene(); f.rep.holding = false;
    f.victim.behavior = { kind: 'idle', update: () => ({ vel: { x: -3, y: 0 }, facing: Math.PI }) };
    const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(true);
    const actualStep = f.sim.world.step.bind(f.sim.world);
    const world = vi.spyOn(f.sim.world, 'step').mockImplementation((intents, dt) => {
      expect(f.rep.holding).toBe(true);
      expect(calls(f.sim)).toEqual([]); // selected/visible is not achieved
      return actualStep(intents, dt);
    });
    f.sim.tick();
    expect(world).toHaveBeenCalledOnce();
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'holding', phase: 'live' })]);
    expect(f.sim.foulRecords.some(r => r.evidence.action === 'selected_holding_mode'
      && r.assessment === 'unresolved' && !r.called)).toBe(true);
    expect(f.sim.foulRecords.some(r => r.evidence.action === 'achieved_grab_restriction'
      && r.assessment === 'violation' && r.called)).toBe(true);
    chance.mockRestore(); world.mockRestore();
  });

  it('calls a real loaded cloth grab only after it materially slows continuing escape', () => {
    const f = scene();
    expect(calls(f.sim)).toEqual([]);
    const before = f.victim.vel.x - f.blocker.vel.x;
    const report = step(f);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(report.armImpulse[f.blocker.idx]).toBeGreaterThan(0);
    expect(f.victim.vel.x - f.blocker.vel.x).toBeGreaterThan(before);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'holding',
      playerId: f.blocker.player.id, phase: 'live', rule: '12-1-3(c)' })]);
    expect(f.sim.foulRecords.find(r => r.called)?.evidence.facts).toMatchObject({ judgment: 'clear' });
    expect(f.sim.frames).toEqual([]);
  });

  it('does not flag the selected cloth mode when no World interval restrains anyone', () => {
    const f = scene();
    f.rep.hands!.hold = 0;
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('retains borderline achieved restriction as uncalled evidence instead of an automatic flag', () => {
    const f = scene(); f.rep.hands!.hold *= .1;
    step(f);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(calls(f.sim)).toEqual([]);
    expect(f.sim.foulRecords).toContainEqual(expect.objectContaining({ called: false,
      assessment: 'unresolved', evidence: expect.objectContaining({
        action: 'achieved_grab_restriction', facts: expect.objectContaining({ judgment: 'borderline' }) }) }));
  });

  it('retains ordinary inside-hand compression as legal physical blocking', () => {
    const f = scene();
    f.rep.holding = false; syncJoints(f.sim, f.rep);
    f.victim.body.pos.x = f.blocker.pos.x - f.blocker.profile.radius - f.victim.profile.radius - .03;
    f.victim.body.vel.x = 1;
    f.intents[f.victim.idx].vel.x = 1;
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('uses achieved sideways cloth restraint instead of requiring purely radial escape', () => {
    const f = scene();
    f.victim.body.pos.x -= .15;
    f.victim.body.vel = { x: -.2, y: 3 };
    f.intents[f.victim.idx].vel = { x: -.2, y: 3 };
    step(f);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(f.rep.hands!.tangentForceOnB?.y).toBeLessThan(0);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'holding' })]);
  });

  it('does not call the same sideways grip while the blocker is still squarely between the rusher and the QB', () => {
    const f = scene();
    // The rusher on the blocker's far side from the QB: the blocker is in his way.
    f.blocker.body.facing = 0;
    f.victim.body.pos.x = f.blocker.pos.x + f.rep.hands!.extension + .04 + .15;
    f.victim.body.vel = { x: .2, y: 3 };
    f.intents[f.victim.idx].vel = { x: .2, y: 3 };
    step(f);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(calls(f.sim)).toEqual([]);
    expect(f.sim.foulRecords).toContainEqual(expect.objectContaining({ called: false, assessment: 'unresolved',
      evidence: expect.objectContaining({ facts: expect.objectContaining({ exception: 'blocker_still_in_front_of_opponent' }) }) }));
  });

  it('can restrain escape from rest only when World actually delivers opposing leg drive', () => {
    const f = scene();
    f.victim.body.pos.x -= .15; // acquired cloth is taut beyond native hand slack
    f.victim.body.vel = { x: 0, y: 0 };
    f.intents[f.victim.idx].vel = { x: -6, y: 0 };
    const report = step(f);
    expect(report.groundImpulse[f.victim.idx].x).toBeLessThan(0);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(calls(f.sim)).toHaveLength(1);
    expect(f.sim.foulRecords.find(r => r.called)?.evidence.facts.achievedDriveDeltaV).toBeGreaterThan(0);
  });

  it('keeps a loaded legal shove/turn without a tensile cloth restriction', () => {
    const f = scene(); f.rep.holding = false; syncJoints(f.sim, f.rep);
    f.victim.body.pos.x = f.blocker.pos.x - f.blocker.profile.radius - f.victim.profile.radius - .03;
    f.victim.body.vel = { x: 1, y: 3 };
    f.intents[f.victim.idx].vel = { x: 1, y: 3 };
    step(f);
    expect(f.rep.hands!.normalForce).toBeGreaterThanOrEqual(0);
    expect(calls(f.sim)).toEqual([]);
  });

  it('does not call a pull when the victim deliberately chooses to brake', () => {
    const f = scene(); f.intents[f.victim.idx].vel.x = 0;
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('does not mistake an assigned but unloaded helper for a double-team no-call', () => {
    const f = scene();
    const helper = f.sim.slot('LG')!;
    helper.body.pos = { x: f.blocker.pos.x, y: CENTER_Y + 1 };
    f.rep.helpers.push(helper); helper.engagement = f.rep;
    step(f);
    expect(calls(f.sim)).toHaveLength(1);
  });

  it('does not convert an achieved double team without clear outside escape into a holding foul', () => {
    const f = scene(), helper = f.sim.slot('LG')!;
    // Actual helper torso contact carries load. The defender remains between
    // the two blockers in lateral space; neither a helper label nor an
    // unloaded joint supplies the exception.
    helper.body.pos = { x: f.victim.pos.x, y: CENTER_Y + .65 };
    f.rep.helpers.push(helper); helper.engagement = f.rep;
    const report = step(f);
    expect(report.contacts.some(c => c.impulse > 0
      && [c.i, c.j].includes(helper.idx) && [c.i, c.j].includes(f.victim.idx))).toBe(true);
    expect(calls(f.sim)).toEqual([]);
  });

  it('removes double-team immunity once the defender has physically split both loaded blockers toward the runner', () => {
    const f = scene(), helper = f.sim.slot('LG')!;
    f.blocker.body.pos.y = CENTER_Y - .5;
    helper.body.pos = { x: f.blocker.pos.x, y: CENTER_Y + .5 };
    f.rep.helpers.push(helper); helper.engagement = f.rep;
    const hands: HandJoint = { kind: 'hands', a: helper.body, b: f.victim.body,
      actor: helper.body, extension: f.rep.hands!.extension, push: 0,
      hold: f.rep.hands!.hold, steer: 0 };
    f.rep.helperHands!.set(helper, hands); f.sim.world.joints.push(hands);
    step(f);
    expect(f.rep.hands!.normalForce).toBeLessThan(0);
    expect(hands.normalForce).toBeLessThan(0);
    expect(calls(f.sim).some(p => p.playerId === f.blocker.player.id)).toBe(true);
  });

  it('preserves the defensive rip no-call while feet-taking attribution is unresolved', () => {
    const f = scene(); f.rep.move = 'rip'; f.rep.moveOk = true; f.rep.moveUntil = 1;
    step(f);
    expect(calls(f.sim)).toEqual([]);
    expect(f.sim.foulRecords.some(r => r.assessment === 'unresolved'
      && r.evidence.action === 'achieved_grab_exception_unresolved')).toBe(true);
  });

  it('can remove the rip exception for an isolated native cloth-caused loss of support', () => {
    const f = scene(); f.rep.move = 'rip'; f.rep.moveOk = true; f.rep.moveUntil = 5;
    f.sim.world.joints = f.sim.world.joints.filter(j => j !== f.rep.hands);
    // An actual acquired lower grasp can take the defender's feet away;
    // ordinary upper-body cloth tension is allowed to remain a legal rip.
    const grasp: GraspJoint = { kind: 'grasp', a: f.blocker.body, b: f.victim.body,
      reach: f.blocker.profile.reach + f.victim.profile.radius,
      capacity: gripForce(f.blocker, .8), legs: 1, hold: .9 };
    f.sim.world.joints.push(grasp);
    f.intents[f.victim.idx].vel = { x: -6, y: 0 };
    for (let i = 0; i < 40 && f.victim.body.support!.state === 'up'; i++) {
      step(f); f.sim.t += f.sim.dt;
    }
    expect(f.victim.body.support!.state).toBe('falling');
    expect(['contact', 'legs']).toContain(f.victim.body.support!.cause);
    expect(calls(f.sim)).toHaveLength(1);
  });

  it('does not call offensive holding when the runner is being tackled simultaneously', () => {
    const f = scene();
    f.sim.bond = { carrier: f.sim.qb, tacklers: [f.sim.slot('DT_S')!], start: .4,
      progressX: f.sim.qb.pos.x, down: false };
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('preserves the offensive no-call clearly after a downfield forward release', () => {
    const f = scene();
    f.sim.throwBall(f.sim.qb, f.sim.slot('Z')!, { x: 15, y: 0, z: 5 },
      { x: 52, y: CENTER_Y, z: 1.5 }, 1.5);
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('does not infer that forward-pass exception from a contradictory intended point on a backward release', () => {
    const f = scene();
    f.sim.throwBall(f.sim.qb, f.sim.slot('Z')!, { x: -15, y: 0, z: 5 },
      { x: 52, y: CENTER_Y, z: 1.5 }, 1.5);
    step(f);
    expect(calls(f.sim)).toHaveLength(1);
  });

  it('preserves pushing or pulling in a personal attempt to recover a grounded loose ball', () => {
    const f = scene(); f.sim.fumble(f.sim.qb, null);
    if (f.sim.ball.kind !== 'loose') throw new Error('native fumble must remain loose');
    f.sim.ball.flight.pos.z = 0;
    expect(f.blocker.behavior.kind).toBe('scramble-ball');
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('preserves the runner warding-off exception', () => {
    const f = scene(); f.sim.ball = { kind: 'held', carrier: f.blocker };
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('does not award repeated flags for one continuing loaded grab', () => {
    const f = scene(); step(f);
    expect(calls(f.sim)).toHaveLength(1);
    f.sim.t += f.sim.dt;
    f.victim.body.vel.x = -3; f.blocker.body.vel.x = 0;
    f.victim.body.pos.x = f.blocker.pos.x - f.rep.hands!.extension - .04;
    step(f);
    expect(calls(f.sim)).toHaveLength(1);
    expect(f.sim.events.filter(e => e.type === 'holding')).toHaveLength(1);
  });

  it('can call a real defensive grab of a nonrunner while preserving legal warding against a blocker', () => {
    const f = scene();
    f.sim.disengage(f.rep);
    const receiver = f.sim.slot('X')!, defender = f.sim.slot('CB_S')!;
    defender.body.pos = { x: 42, y: CENTER_Y };
    receiver.body.pos = { x: 43.1, y: CENTER_Y }; receiver.body.vel = { x: 3, y: 0 };
    defender.body.vel = { x: 0, y: 0 };
    const joint: HandJoint = { kind: 'hands', a: defender.body, b: receiver.body,
      holder: defender.body, actor: defender.body, extension: 1, push: 0,
      hold: f.rep.hands!.hold, steer: 0 };
    f.sim.world.joints.push(joint);
    f.intents[receiver.idx] = { vel: { x: 3, y: 0 }, facing: 0 };
    step(f);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'defensive_holding',
      playerId: defender.player.id, autoFirst: true, yards: 5 })]);
    // Same acquired physical action is permitted when the opponent is
    // obviously blocking this defender. A new World interval remains real.
    f.sim.penalties.length = 0; f.sim.penalty = undefined;
    receiver.engagement = { ...f.rep, blocker: receiver, defender, helpers: [] };
    receiver.body.pos.x = defender.pos.x + 1.1; receiver.body.vel.x = 3; defender.body.vel.x = 0;
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it.each([false, true])('uses performed fake presentation, not the play-call name, fake=%s', fake => {
    const f = scene(); f.sim.disengage(f.rep);
    const recipient = f.sim.slot('RB')!, defender = f.sim.slot('CB_S')!;
    f.sim.qb.body.pos = { x: 36, y: CENTER_Y - 1.05 };
    recipient.body.pos = { x: 36, y: CENTER_Y }; recipient.body.vel = { x: 3, y: 0 };
    defender.body.pos = { x: 34.9, y: CENTER_Y }; defender.body.vel = { x: 0, y: 0 };
    const joint: HandJoint = { kind: 'hands', a: defender.body, b: recipient.body,
      holder: defender.body, actor: defender.body, extension: 1, push: 0,
      hold: f.rep.hands!.hold, steer: 0 };
    f.sim.world.joints.push(joint);
    f.intents[recipient.idx] = { vel: { x: 3, y: 0 }, facing: 0 };
    if (fake) expect(f.sim.presentHandoffFake(f.sim.qb, recipient)).toBe(true);
    step(f);
    expect(joint.normalForce).toBeLessThan(0);
    expect(calls(f.sim)).toHaveLength(fake ? 0 : 1);
    if (!fake) expect(calls(f.sim)[0].kind).toBe('defensive_holding');
  });
});
