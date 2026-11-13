import { describe, expect, it } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { clamp, norm, type Vec2 } from '../src/core/vec.js';
import { World, type Intent } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, type Combination, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { runThrough } from '../src/sim/behaviors/common.js';
import { updateEngagements } from '../src/sim/engagement.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { chooseRunBlockFit } from '../src/sim/run-block-fit.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

// This structural read also permits running the public-controller tests on
// the baseline, which has no zone-specific helper or getter to import.
interface ZoneRead {
  target: number;
  t: number;
  nextRead: number;
  seen: Perceived;
  phase: 'reach' | 'runoff' | 'seal';
  drive: Vec2;
  sealTarget: number;
  aim: Vec2;
  horizon: number;
  neededTravel: number;
  availableTravel: number;
}
const read = (a: Agent) => (a.behavior as RunBlocker & { zoneRead?: ZoneRead | null }).zoneRead;

/** Ordinary abilities, actual bodies and genuine delayed perception. */
function fixture(kind: RunBlockKind = 'reach', concept = 'wz_strong', side = 1) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  const blocker = sim.slot('C')!, defender = sim.slot('DT_S')!;
  blocker.body.pos = { x: 40, y: CENTER_Y };
  defender.body.pos = { x: 42, y: CENTER_Y };
  const stretch = norm({ x: 1, y: side * (concept.startsWith('oz') ? 1.1 : 1.8) });
  const behavior = new RunBlocker({ kind, target: defender, drive: { ...stretch } });
  blocker.behavior = behavior;
  sim.t = .5;
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  const bodyContact = blocker.profile.radius + defender.profile.radius;
  const contact = bodyContact + .1 + blocker.player.measurables.armIn / 36 * .45;
  return { sim, blocker, defender, behavior, stretch, observe, bodyContact, contact };
}

function ordinary(f: ReturnType<typeof fixture>, corrected = true): Intent {
  const seen = f.sim.see(f.blocker, f.defender);
  const nominal = { x: seen.pos.x - .3, y: seen.pos.y + f.stretch.y * .6 };
  const error = f.blocker.mind.placementError * (1 - .5 * f.blocker.r('runBlock'));
  const original = { ...runThrough(f.blocker, { x: nominal.x,
    y: clamp(nominal.y + error, .5, FIELD_WIDTH - .5) }), posture: .7 };
  return corrected ? chooseRunBlockFit(f.blocker, seen, f.stretch, nominal, error,
    f.contact, f.bodyContact, original, f.sim.t) : original;
}

function advance(body: Agent['body'], command: Intent, ticks = 8) {
  const moved = structuredClone(body), world = new World([moved]);
  world.time = .5;
  for (let k = 0; k < ticks; k++) {
    const report = world.step([command], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(report.armImpulse).toEqual([0]);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[0] + 1e-8);
    expect(report.supportMotorWork[0]).toBeLessThanOrEqual(report.supportMotorWorkLimit[0] + 1e-8);
  }
  return moved;
}

describe('the narrow zone acquisition controller preserves other installed jobs', () => {
  it.each([
    ['reach', 'iz_strong'], ['reach', 'toss'], ['cutoff', 'wz_strong'],
  ] as const)('keeps the ordinary %s request on %s', (kind, concept) => {
    const f = fixture(kind, concept), expected = ordinary(f);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(read(f.blocker) == null).toBe(true);
    expect(f.behavior.plan.drive).toEqual(f.stretch);
    expect(command).toEqual(expected);
    expect(advance(f.blocker.body, command)).toEqual(advance(f.blocker.body, expected));
  });

  it('uses its installed half without a solo-zone read or releasing an unjoined double', () => {
    const f = fixture(), helper = f.sim.slot('LG')!;
    helper.body.pos = { x: 40, y: CENTER_Y + .6 };
    const combination: Combination = { members: [f.blocker, helper], defender: f.defender,
      backer: f.sim.slot('LB_W')!, released: false, secureSince: -1, nextRead: 0, soloKind: 'reach' };
    f.behavior.plan.combination = combination;
    helper.behavior = new RunBlocker({ kind: 'combo', target: f.defender, drive: { ...f.stretch }, combination });
    f.observe();
    const seen = f.sim.see(f.blocker, f.defender);
    // This fixture has not acquired hands. C owns the lower installed half,
    // while the pair's displacement intention still points playside.
    expect(Math.sign(f.sim.offAlign.spots.C.pos.y - f.sim.offAlign.spots.LG.pos.y)).toBe(-1);
    const error = f.blocker.mind.placementError * (1 - .5 * f.blocker.r('runBlock'));
    const expected = { ...runThrough(f.blocker, { x: seen.pos.x - .35,
      y: clamp(seen.pos.y - .55 + error, .5, FIELD_WIDTH - .5) }), posture: .7 };
    const bodies = structuredClone(f.sim.agents.map(a => a.body));
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(read(f.blocker) == null).toBe(true);
    expect(f.behavior.plan.combination).toBe(combination);
    expect(combination.released).toBe(false);
    expect(f.behavior.plan.drive).toEqual(f.stretch);
    expect(f.behavior.plan.target).toBe(f.defender);
    expect((helper.behavior as RunBlocker).plan.combination).toBe(combination);
    expect((helper.behavior as RunBlocker).plan.target).toBe(f.defender);
    expect((helper.behavior as RunBlocker).plan.drive).toEqual(f.stretch);
    expect(command).toEqual(expected);
    expect(command.vel.y).toBeLessThan(0);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(f.sim.world.joints).toEqual([]);
    expect(f.sim.engagements).toEqual([]);
    expect(f.blocker.engagement).toBeNull();
    expect(helper.engagement).toBeNull();
  });

  it('leaves a body with a foreign physical hand constraint under its existing controller', () => {
    const f = fixture();
    const joint = { kind: 'hands' as const, a: f.blocker.body, b: f.defender.body,
      extension: 1, push: 0, hold: 0, steer: 0 };
    f.sim.world.joints.push(joint);
    const expected = ordinary(f, false);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(read(f.blocker) == null).toBe(true);
    expect(f.behavior.plan.drive).toEqual(f.stretch);
    expect(command).toEqual(expected);
    expect(f.sim.world.joints).toEqual([joint]);
    expect(f.blocker.engagement).toBeNull();
  });
});

describe('zone surface acquisition is separate from the intended displacement', () => {
  it.each(['oz_strong', 'wz_strong'])('approaches the playside half of an even defender on %s', concept => {
    const f = fixture('reach', concept), before = structuredClone(f.blocker.body);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.phase).toBe('reach');
    expect(zone.drive).toEqual({ x: 1, y: 0 });
    expect(zone.aim.y).toBeGreaterThan(zone.seen.pos.y);
    expect(f.blocker.body).toEqual(before);
    expect(f.blocker.engagement).toBeNull();
    expect(command.vel.x).toBeGreaterThan(0);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(f.blocker.profile.vmax + 1e-8);
    const moved = advance(f.blocker.body, command);
    expect(moved.pos.x).toBeGreaterThan(before.pos.x);
    expect(moved.pos.y).toBeGreaterThan(before.pos.y);
    expect(moved.support!.state).toBe('up');
  });

  it('runs a widening defender outward instead of declaring an unattained outside seal', () => {
    const f = fixture();
    f.defender.body.pos.y += 1.2;
    f.defender.body.vel = { x: 0, y: 4 };
    f.observe();
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.phase).toBe('runoff');
    expect(zone.drive).toEqual(f.stretch);
    expect(zone.aim.y).toBeLessThan(zone.seen.pos.y);
    expect(zone.neededTravel).toBeGreaterThan(zone.availableTravel);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(f.blocker.profile.vmax + 1e-8);
    expect(f.blocker.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
    expect(advance(f.blocker.body, command).pos.y).toBeGreaterThan(CENTER_Y);
  });

  it('recognizes physically attained outside position without assigning a block win', () => {
    const f = fixture();
    f.defender.body.pos = { x: 40 + .8 * f.bodyContact, y: CENTER_Y - .8 * f.bodyContact };
    f.observe();
    const bodies = f.sim.agents.map(a => structuredClone(a.body));
    f.behavior.update(f.blocker, f.sim);
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.phase).toBe('seal');
    expect(zone.drive).toEqual({ x: 1, y: 0 });
    expect(f.blocker.pos.y - f.defender.pos.y).toBeGreaterThan(.45 * f.bodyContact);
    const e = f.blocker.engagement!;
    expect(e).not.toBeNull();
    expect(e.drive).toEqual({ x: 1, y: 0 });
    expect(e.win).toBe(0);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(f.sim.events.some(event => event.type === 'shed' || event.type === 'block_climb')).toBe(false);
  });

  it('recovers a truly lost upfield shoulder without treating lateral position as an attained seal', () => {
    const f = fixture();
    // Legal torso separation and reachable arms do not mean the blocker is
    // still in front. Here he is already upfield and outside the defender.
    f.defender.body.pos = { x: 39.8, y: CENTER_Y - .8 };
    const clearance = Math.hypot(f.blocker.pos.x - f.defender.pos.x, f.blocker.pos.y - f.defender.pos.y);
    expect(clearance).toBeGreaterThan(f.bodyContact);
    expect(clearance).toBeLessThan(f.contact);
    const leverage = (p: Vec2) => Math.abs(Math.atan2(p.y - f.defender.pos.y,
      f.defender.pos.x - p.x)) / (Math.PI / 2);
    const before = structuredClone(f.blocker.body);
    expect(leverage(before.pos)).toBeGreaterThan(1.1);
    f.observe();
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.phase).toBe('reach');
    expect(f.blocker.body).toEqual(before);
    expect(f.blocker.engagement).toBeNull();
    expect(f.defender.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
    const moved = advance(f.blocker.body, command);
    expect(leverage(moved.pos)).toBeLessThan(leverage(before.pos));
    expect(Math.hypot(moved.pos.x - f.defender.pos.x, moved.pos.y - f.defender.pos.y))
      .toBeGreaterThan(f.bodyContact);
    expect(moved.support!.state).toBe('up');
  });

  it('mirrors phase and football surface while retaining imperfect physical execution', () => {
    const run = (side: number) => {
      const f = fixture('reach', 'wz_strong', side);
      const command = f.behavior.update(f.blocker, f.sim) as Intent;
      const zone = read(f.blocker)!;
      expect(zone).toBeDefined();
      expect(command.vel.y * side).toBeGreaterThan(0);
      const body = advance(f.blocker.body, command);
      expect((body.pos.y - CENTER_Y) * side).toBeGreaterThan(0);
      expect(body.support!.state).toBe('up');
      return { zone, body };
    };
    const right = run(1), left = run(-1);
    expect(right.zone.phase).toBe(left.zone.phase);
    expect(right.zone.drive).toEqual(left.zone.drive);
    expect(right.zone.aim.x).toBeCloseTo(left.zone.aim.x, 10);
    expect(right.zone.aim.y + left.zone.aim.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(right.zone.sealTarget).toBeCloseTo(-left.zone.sealTarget, 10);
    expect(right.zone.availableTravel).toBeCloseTo(left.zone.availableTravel, 10);
    // The same player's existing placement error is a field-coordinate error
    // in both trials, so achieved motion need not be an exact reflection.
    expect(Math.abs(right.body.pos.x - left.body.pos.x)).toBeLessThan(.05);
    expect(Math.abs(right.body.pos.y + left.body.pos.y - 2 * CENTER_Y)).toBeLessThan(.05);
  });
});

describe('zone reads have real latency and finite reassessment', () => {
  it('holds the previous decision between reads, then responds to an observed inward slant', () => {
    const f = fixture();
    f.defender.body.vel = { x: 0, y: 4 };
    f.observe();
    f.behavior.update(f.blocker, f.sim);
    const old = read(f.blocker)!;
    expect(old).toBeDefined();
    expect(old.phase).toBe('runoff');
    f.defender.body.vel = { x: 0, y: -2 };
    f.observe();
    f.sim.t = old.t + .5 * (old.nextRead - old.t);
    f.behavior.update(f.blocker, f.sim);
    expect(read(f.blocker)).toBe(old);
    expect(f.behavior.plan.drive).toEqual(f.stretch);
    f.sim.t = old.nextRead + 1e-6;
    f.behavior.update(f.blocker, f.sim);
    const changed = read(f.blocker)!;
    expect(changed).not.toBe(old);
    expect(changed.seen.vel.y).toBe(-2);
    expect(changed.phase).toBe('reach');
    expect(changed.drive).toEqual({ x: 1, y: 0 });
  });

  it('uses delayed hip motion rather than an unseen current widening move', () => {
    const f = fixture();
    f.defender.body.vel = { x: 0, y: -2 };
    f.observe();
    f.defender.body.vel = { x: 0, y: 4 };
    f.sim.perception.record(f.sim.agents);
    const seen = f.sim.see(f.blocker, f.defender);
    expect(seen.age).toBeGreaterThan(0);
    expect(seen.vel.y).toBe(-2);
    f.behavior.update(f.blocker, f.sim);
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.seen).toEqual(seen);
    expect(zone.phase).toBe('reach');
    expect(zone.drive).toEqual({ x: 1, y: 0 });
  });

  it('does not turn a stale near hip into physical hands on a remote defender', () => {
    const f = fixture();
    const sampledX = 40 + .8 * f.bodyContact;
    f.defender.body.pos = { x: sampledX, y: CENTER_Y - .8 * f.bodyContact };
    f.observe();
    f.defender.body.pos = { x: 45, y: CENTER_Y };
    f.sim.perception.record(f.sim.agents);
    f.behavior.update(f.blocker, f.sim);
    const zone = read(f.blocker)!;
    expect(zone).toBeDefined();
    expect(zone.seen.pos.x).toBe(sampledX);
    expect(zone.phase).toBe('seal');
    expect(f.blocker.engagement).toBeNull();
    expect(f.defender.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
  });
});

describe('real zone contact retains its stable surface and ordinary force budgets', () => {
  it.each([-1, 1])('preserves an already acquired diagonal inside-hip contact through the next solve, side %s', side => {
    const f = fixture('reach', 'wz_strong', side);
    f.blocker.body.pos = { x: 40.2, y: CENTER_Y - side * .8 };
    f.defender.body.pos = { x: 40, y: CENTER_Y };
    f.blocker.body.vel = { x: 0, y: side * 3 };
    f.defender.body.vel = { x: 0, y: side * 5 };
    f.observe();
    // A real solo rep may originate before this technique reader owns it,
    // for example when an adjacent double transfers its remaining blocker.
    const e = f.sim.engage(f.blocker, f.defender, 'run', f.stretch)!;
    expect(e).not.toBeNull();
    e.nextMoveAt = f.sim.t + 1; // Isolate geometry from a new random shed move.
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis).toBeUndefined();
    const hands = e.hands!, phi = e.phi, control = e.control;
    const bodies = f.sim.agents.map(a => structuredClone(a.body));
    f.behavior.update(f.blocker, f.sim);
    expect(read(f.blocker)?.phase).toBe('runoff');
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis)
      .toEqual({ x: -f.stretch.x, y: -f.stretch.y });
    expect(e.phi).toBe(phi);
    expect(e.control).toBe(control);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    // Re-measure real leverage before any body movement. Merely recording a
    // new intent must not turn a sound diagonal rep into a lost vertical one.
    updateEngagements(f.sim);
    expect(e.phi).toBeCloseTo(phi, 12);
    expect(f.blocker.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(e.hands).toBe(hands);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.events.some(event => event.type === 'shed')).toBe(false);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    const report = f.sim.world.step(f.sim.intents, f.sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, f.defender]) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
      expect(report.supportMotorWork[a.idx]).toBeLessThanOrEqual(report.supportMotorWorkLimit[a.idx] + 1e-8);
      expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
    }
    expect(f.blocker.engagement).toBe(e);
    expect(f.sim.world.joints).toContain(hands);
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis)
      .toEqual({ x: -f.stretch.x, y: -f.stretch.y });
  });

  it('changes lateral drive intention under owned hands without rotating or replacing the contact', () => {
    const f = fixture();
    f.defender.body.pos.x = 41;
    f.observe();
    f.behavior.update(f.blocker, f.sim);
    const e = f.blocker.engagement!;
    expect(e).not.toBeNull();
    expect(read(f.blocker)?.phase).toBe('reach');
    // Let actual hand contact carry load before making the next technique read.
    f.sim.tick();
    const report = f.sim.lastStep!;
    // Arm accounting belongs to the player who supplies the force. The DL
    // may win initial hand control; either motor can load this real contact.
    expect(report.armImpulse[f.blocker.idx] + report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
    expect(Math.abs(e.hands!.normalForce ?? 0) + Math.abs(e.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, f.defender]) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
      expect(report.supportMotorWork[a.idx]).toBeLessThanOrEqual(report.supportMotorWorkLimit[a.idx] + 1e-8);
      expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
    }
    const old = read(f.blocker)!;
    f.defender.body.vel = { x: 0, y: 6 };
    f.observe(); f.sim.t = old.nextRead + 1e-6;
    const hands = e.hands!, nativeHands = structuredClone(hands);
    const bodies = f.sim.agents.map(a => structuredClone(a.body));
    const before = { phi: e.phi, control: e.control, baseB: e.baseB, baseD: e.baseD };
    f.behavior.update(f.blocker, f.sim);
    expect(read(f.blocker)?.phase).toBe('runoff');
    expect(e.drive).toEqual(f.stretch);
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis).toEqual({ x: -1, y: 0 });
    expect({ phi: e.phi, control: e.control, baseB: e.baseB, baseD: e.baseD }).toEqual(before);
    expect(e.hands).toBe(hands);
    expect(hands).toEqual(nativeHands);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
  });

  it('keeps the established surface when a physically reachable helper joins', () => {
    const f = fixture();
    f.defender.body.pos.x = 41;
    f.observe(); f.behavior.update(f.blocker, f.sim);
    const e = f.blocker.engagement!;
    expect(e).not.toBeNull();
    const old = read(f.blocker)!;
    expect(old).toBeDefined();
    const primaryHands = e.hands!, before = structuredClone(primaryHands);
    const helper = f.sim.slot('LG')!;
    helper.body.pos = { x: 40.1, y: CENTER_Y + .7 };
    helper.behavior = new RunBlocker({ kind: 'combo', target: f.defender, drive: { ...f.stretch } });
    const bodies = f.sim.agents.map(a => structuredClone(a.body));
    const joined = f.sim.engage(helper, f.defender, 'run', f.stretch)!;
    expect(joined).toBe(e);
    expect(e.helpers).toContain(helper);
    expect(e.hands).toBe(primaryHands);
    expect(primaryHands).toEqual(before);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis).toEqual({ x: -1, y: 0 });
    const helperHands = e.helperHands!.get(helper)!;
    expect(helperHands).toBeDefined();
    expect(helperHands.normalForce ?? 0).toBe(0);
    expect(helperHands.tangentForce ?? 0).toBe(0);
    const drive = { ...e.drive! };
    f.sim.t = old.nextRead + 1e-6; f.observe();
    f.behavior.update(f.blocker, f.sim);
    expect(read(f.blocker)).toBe(old);
    expect(e.drive).toEqual(drive);
    expect(e.hands).toBe(primaryHands);
    expect(f.sim.world.joints).toContain(primaryHands);
    expect(f.sim.world.joints).toContain(helperHands);
    // Requested helper effort becomes load only in an ordinary solved step.
    f.sim.tick();
    const report = f.sim.lastStep!;
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, helper, f.defender]) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
      expect(report.supportMotorWork[a.idx]).toBeLessThanOrEqual(report.supportMotorWorkLimit[a.idx] + 1e-8);
      expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
    }
    expect((e as typeof e & { surfaceAxis?: Vec2 }).surfaceAxis).toEqual({ x: -1, y: 0 });
  });
});
