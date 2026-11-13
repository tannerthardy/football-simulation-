import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { supportParams } from '../src/physics/support.js';
import type { GraspJoint, HandJoint, Intent } from '../src/physics/world.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import { FumbleScramble } from '../src/sim/behaviors/defense.js';
import { gripForce } from '../src/sim/tackle.js';
import { captureTeamContactStart, observeTeamContactRules } from '../src/sim/team-contact-rules.js';

const offense = generateTeam(new Rng(931), 'Offense', 'OFF', { strength: .55 });
const defense = generateTeam(new Rng(932), 'Defense', 'DEF', { strength: .55 });

function scene() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'teammate contact mechanism' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 46, record: false });
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx % 5 * 4, y: 3 + Math.floor(a.idx / 5) * 4 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
  }
  sim.qb.body.pos = { x: 40, y: CENTER_Y - 5 };
  sim.t = .5;
  // Only the ordinary shared World moves these generated bodies. No profiles,
  // solver flags, reach allowances or physical capacities are increased.
  const intents: Intent[] = sim.agents.map(a => ({ free: true, vel: { x: 0, y: 0 }, facing: a.facing }));
  sim.intents = intents;
  return { sim, intents, helper: sim.slot('LT')!, teammate: sim.slot('LG')!, opponent: sim.slot('DE_S')! };
}

function hands(a: Agent, b: Agent, gap: number, pull = false): HandJoint {
  return { kind: 'hands', a: a.body, b: b.body, actor: a.body, holder: a.body,
    extension: gap, push: pull ? 0 : supportParams(a.profile).armForce,
    hold: pull ? supportParams(a.profile).armForce : 0, steer: 0 };
}

function grasp(a: Agent, b: Agent, distance: number): GraspJoint {
  return { kind: 'grasp', a: a.body, b: b.body, reach: a.profile.reach + b.profile.radius,
    capacity: gripForce(a, .8), legs: 0, hold: distance - .15, pull: .5 };
}

function step(f: ReturnType<typeof scene>) {
  const start = captureTeamContactStart(f.sim);
  const report = f.sim.world.step(f.intents, f.sim.dt);
  observeTeamContactRules(f.sim, report, start);
  return { start, report };
}

const calls = (sim: PlaySim) => sim.penalties.filter(p => ['assisting_runner', 'interlocking_interference',
  'illegal_teammate_assistance'].includes(p.kind));

describe('native NFL 2026 teammate contact,12-1-4', () => {
  it.each([[1, 0], [-1, 0], [0, 1]] as const)('flags an achieved pull on the actual runner in direction(%s,%s)', (dx, dy) => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y };
    f.helper.body.pos = { x: 50 + 1.15 * dx, y: CENTER_Y + 1.15 * dy };
    runner.body.vel = { x: -2 * dx, y: -2 * dy };
    const joint = grasp(f.helper, runner, 1.15);
    f.sim.world.joints.push(joint);
    const chance = vi.spyOn(f.sim.rng, 'chance').mockImplementation(() => { throw new Error('officiating must not roll'); });
    expect(calls(f.sim)).toEqual([]);
    step(f);
    expect((joint.normalForceOnB?.x ?? 0) * dx + (joint.normalForceOnB?.y ?? 0) * dy).toBeGreaterThan(0);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'assisting_runner', rule: '12-1-4(a)',
      playerId: f.helper.player.id, yards: 10, autoFirst: false, possessionTeam: 'O' })]);
    expect(f.sim.foulRecords.find(r => r.called)?.evidence).toMatchObject({ action: 'achieved_runner_pull',
      facts: { runnerAtIntervalStart: true, runnerStartX: 50, runnerStartVx: -2 * dx } });
    chance.mockRestore();
  });

  it('legal teammate compression pushes the actual runner without an assistance flag', () => {
    const f = scene(), runner = f.sim.qb;
    f.helper.body.pos = { x: 49, y: CENTER_Y }; runner.body.pos = { x: 50, y: CENTER_Y };
    const joint = hands(f.helper, runner, 1.12);
    f.sim.world.joints.push(joint);
    step(f);
    expect(joint.normalForceOnB!.x).toBeGreaterThan(0);
    expect(runner.vel.x).toBeGreaterThan(0);
    expect(calls(f.sim)).toEqual([]);
  });

  it('an owned hand grab can pull a runner even when that runner is joint.a', () => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.15, y: CENTER_Y };
    runner.body.vel.x = -2;
    const joint = hands(runner, f.helper, .95, true);
    joint.holder = f.helper.body; joint.actor = f.helper.body;
    f.sim.world.joints.push(joint);
    step(f);
    expect(joint.normalForceOnB!.x).toBeLessThan(0);
    expect(calls(f.sim)[0]).toMatchObject({ kind: 'assisting_runner', playerId: f.helper.player.id });
  });

  it('an unloaded grip/request has no achieved pull and cannot award a foul', () => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.1, y: CENTER_Y };
    const joint = hands(f.helper, runner, 1.1, true);
    f.sim.world.joints.push(joint);
    step(f);
    expect(Math.hypot(joint.normalForceOnB!.x, joint.normalForceOnB!.y)).toBe(0);
    expect(calls(f.sim)).toEqual([]);
  });

  it('two ordinary blockers on one opponent are not interlocking interference', () => {
    const f = scene();
    f.teammate.body.pos = { x: 50, y: CENTER_Y - .7 };
    f.helper.body.pos = { x: 50, y: CENTER_Y + .7 };
    f.opponent.body.pos = { x: 50.8, y: CENTER_Y };
    const first = hands(f.helper, f.opponent, 1.15), second = hands(f.teammate, f.opponent, 1.15);
    f.sim.world.joints.push(first, second);
    step(f);
    expect(Math.hypot(first.normalForceOnB!.x, first.normalForceOnB!.y)).toBeGreaterThan(0);
    expect(Math.hypot(second.normalForceOnB!.x, second.normalForceOnB!.y)).toBeGreaterThan(0);
    expect(calls(f.sim)).toEqual([]);
  });

  it('a same-team acquired grip which actually supports another teammate block is interlocking', () => {
    const f = scene();
    f.teammate.body.pos = { x: 50, y: CENTER_Y };
    f.helper.body.pos = { x: 50.9, y: CENTER_Y + .85 };
    f.opponent.body.pos = { x: 50.95, y: CENTER_Y - .2 };
    const joint = grasp(f.helper, f.teammate, Math.hypot(.9, .85));
    const block = hands(f.teammate, f.opponent, 1.1);
    f.sim.world.joints.push(joint, block);
    step(f);
    expect(joint.normalForceOnB!.x).toBeGreaterThan(0);
    expect(block.normalForceOnB!.x).toBeGreaterThan(0);
    expect(calls(f.sim)).toContainEqual(expect.objectContaining({ kind: 'interlocking_interference', rule: '12-1-4(b)',
      playerId: f.helper.player.id }));
    expect(f.sim.foulRecords.find(r => r.called)?.evidence.facts.targetId).toBe(f.opponent.player.id);
  });

  it('a teammate grasp unrelated to any achieved opponent block does not prove interlocking', () => {
    const f = scene();
    f.teammate.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.15, y: CENTER_Y };
    f.sim.world.joints.push(grasp(f.helper, f.teammate, 1.15));
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('gripping a teammate as an anchor for the holder own achieved block is also interlocking', () => {
    const f = scene();
    f.helper.body.pos = { x: 50, y: CENTER_Y };
    f.teammate.body.pos = { x: 50.9, y: CENTER_Y + .85 };
    f.opponent.body.pos = { x: 50.95, y: CENTER_Y - .2 };
    const joint = grasp(f.helper, f.teammate, Math.hypot(.9, .85));
    const block = hands(f.helper, f.opponent, 1.1);
    f.sim.world.joints.push(joint, block);
    step(f);
    expect(joint.normalForceOnB!.x).toBeLessThan(0);
    expect(block.normalForceOnB!.x).toBeGreaterThan(0);
    expect(calls(f.sim)).toContainEqual(expect.objectContaining({ kind: 'interlocking_interference',
      playerId: f.helper.player.id }));
    expect(f.sim.foulRecords.find(r => r.called)?.evidence.facts.assistedBlockerId).toBe(f.helper.player.id);
  });

  it('a same-team compressive shove aiding an actual block is clause(c), while runner pushing remains legal', () => {
    const f = scene();
    f.helper.body.pos = { x: 49, y: CENTER_Y }; f.teammate.body.pos = { x: 50, y: CENTER_Y };
    f.opponent.body.pos = { x: 51, y: CENTER_Y };
    const shove = hands(f.helper, f.teammate, 1.12), block = hands(f.teammate, f.opponent, 1.12);
    f.sim.world.joints.push(shove, block);
    step(f);
    expect(shove.normalForceOnB!.x).toBeGreaterThan(0);
    expect(block.normalForceOnB!.x).toBeGreaterThan(0);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'illegal_teammate_assistance', rule: '12-1-4(c)',
      playerId: f.helper.player.id })]);
  });

  it('a merely assigned blocker with an unloaded opponent joint supplies no assistance predicate', () => {
    const f = scene();
    f.helper.body.pos = { x: 49, y: CENTER_Y }; f.teammate.body.pos = { x: 50, y: CENTER_Y };
    f.opponent.body.pos = { x: 54, y: CENTER_Y };
    f.sim.world.joints.push(hands(f.helper, f.teammate, 1.12), hands(f.teammate, f.opponent, 1.12));
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('an achieved teammate shove assisting an executing personal grounded-loose-ball recovery is prohibited', () => {
    const f = scene();
    f.helper.body.pos = { x: 49, y: CENTER_Y }; f.teammate.body.pos = { x: 50, y: CENTER_Y };
    f.sim.fumble(f.sim.qb, null);
    if (f.sim.ball.kind !== 'loose') throw new Error('fixture did not fumble');
    f.sim.ball.flight.pos = { x: 52, y: CENTER_Y, z: 0 };
    f.sim.ball.flight.vel = { x: 0, y: 0, z: 0 };
    f.teammate.behavior = new FumbleScramble({ kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) });
    f.intents[f.teammate.idx] = f.teammate.behavior.update(f.teammate, f.sim);
    const shove = hands(f.helper, f.teammate, 1.12);
    f.sim.world.joints.push(shove);
    step(f);
    expect(shove.normalForceOnB!.x).toBeGreaterThan(0);
    expect(calls(f.sim)).toEqual([expect.objectContaining({ kind: 'illegal_teammate_assistance', rule: '12-1-4(c)' })]);
    expect(f.sim.foulRecords.find(r => r.called)?.evidence.facts.personalLooseBallRecovery).toBe(true);
  });

  it('the same shove with a nearby loose ball but no executing recovery attempt cannot establish clause(c)', () => {
    const f = scene();
    f.helper.body.pos = { x: 49, y: CENTER_Y }; f.teammate.body.pos = { x: 50, y: CENTER_Y };
    f.sim.fumble(f.sim.qb, null);
    if (f.sim.ball.kind !== 'loose') throw new Error('fixture did not fumble');
    f.sim.ball.flight.pos = { x: 52, y: CENTER_Y, z: 0 };
    f.sim.world.joints.push(hands(f.helper, f.teammate, 1.12));
    step(f);
    expect(calls(f.sim)).toEqual([]);
  });

  it('a torso collision during a teammate block retains the missing deliberate-act fact without guessing a flag', () => {
    const f = scene();
    f.helper.body.pos = { x: 49.35, y: CENTER_Y }; f.helper.body.vel.x = 2;
    f.teammate.body.pos = { x: 50, y: CENTER_Y }; f.opponent.body.pos = { x: 51, y: CENTER_Y };
    f.sim.world.joints.push(hands(f.teammate, f.opponent, 1.12));
    const { report } = step(f);
    expect(report.contacts.some(c => [c.i, c.j].includes(f.helper.idx)
      && [c.i, c.j].includes(f.teammate.idx) && c.impulse > 0)).toBe(true);
    expect(calls(f.sim)).toEqual([]);
    expect(f.sim.foulRecords).toContainEqual(expect.objectContaining({ called: false, assessment: 'unresolved',
      evidence: expect.objectContaining({ action: 'unclassified_teammate_body_contact' }) }));
  });

  it('a takeaway returner is the actual offense for teammate pulling', () => {
    const f = scene(), runner = f.sim.slot('CB_S')!, helper = f.sim.slot('SS')!;
    runner.body.pos = { x: 50, y: CENTER_Y }; helper.body.pos = { x: 48.85, y: CENTER_Y };
    f.sim.possess(runner, 'interception');
    runner.body.vel.x = 2;
    f.sim.world.joints.push(grasp(helper, runner, 1.15));
    step(f);
    expect(calls(f.sim)).toContainEqual(expect.objectContaining({ kind: 'assisting_runner', against: 'D',
      possessionTeam: 'D', possessionChanges: 1, playerId: helper.player.id }));
  });

  it('sustained loading of one acquired grip produces one called act', () => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.15, y: CENTER_Y };
    runner.body.vel.x = -2; f.sim.world.joints.push(grasp(f.helper, runner, 1.15));
    step(f); f.sim.t += f.sim.dt;
    runner.body.vel.x = -2; step(f);
    expect(calls(f.sim)).toHaveLength(1);
  });

  it('a stale preinterval capture cannot turn a newly supplied scalar into a current World pull', () => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.1, y: CENTER_Y };
    const joint = hands(f.helper, runner, 1.1, true);
    f.sim.world.joints.push(joint);
    const start = captureTeamContactStart(f.sim), report = f.sim.world.step(f.intents, f.sim.dt);
    joint.normalForce = -1000; // no signed World vector and no loaded first row
    observeTeamContactRules(f.sim, report, start);
    expect(calls(f.sim)).toEqual([]);
  });

  it('an old interval capture cannot adjudicate an achieved pull after another real World step', () => {
    const f = scene(), runner = f.sim.qb;
    runner.body.pos = { x: 50, y: CENTER_Y }; f.helper.body.pos = { x: 51.1, y: CENTER_Y };
    const joint = hands(f.helper, runner, 1.1, true);
    f.sim.world.joints.push(joint);
    const old = captureTeamContactStart(f.sim);
    f.sim.world.step(f.intents, f.sim.dt); // unloaded first interval
    runner.body.vel.x = -3;
    const current = f.sim.world.step(f.intents, f.sim.dt); // genuine second-interval pull
    expect(joint.normalForceOnB!.x).toBeGreaterThan(0);
    observeTeamContactRules(f.sim, current, old);
    expect(calls(f.sim)).toEqual([]);
  });
});
