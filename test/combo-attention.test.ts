import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import * as Blocking from '../src/sim/behaviors/blocking.js';
import { RunBlocker, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import { helperSupport, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** The baseline has no pair pass. Its immediate readers still run normally,
 * so a feature-red comparison fails on football behavior, not a missing import. */
const optionalBatch = Blocking as typeof Blocking & {
  resolveJoinedCombination?: (sim: PlaySim, combo: Combination) => void;
  prepareJoinedCombinations?: (sim: PlaySim) => void;
};
const resolve = (f: Fixture) => optionalBatch.resolveJoinedCombination?.(f.sim, f.combo);
const read = (f: Fixture, a: Agent) => readCombination(a, f.sim, f.combo, true);
const batch = (f: Fixture, reverse = false) => {
  for (const a of reverse ? [...f.combo.members].reverse() : f.combo.members) read(f, a);
  resolve(f);
};

/** Real generated profiles, real strike acquisition and real World loading.
 * No declared control, force, keeper support or artificial strength bonus. */
function fixture(side = 1, poorHelper = false, recognition?: [number, number]) {
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  if (recognition) for (const [i, slot] of (['C', 'LG'] as const).entries()) {
    const player = personnel[slot];
    personnel[slot] = { ...player, ratings: { ...player.ratings, playRecognition: recognition[i] } };
  }
  const sim = new PlaySim({
    offense: personnel, defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'joined attention' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = 1; sim.world.time = 1;
  const primary = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  // Both well-fitted blockers can reach the same surface without starting
  // overlapped. Keep the original poor-fit geometry as an adverse control.
  primary.body.pos = { x: 40, y: CENTER_Y - (poorHelper ? 0 : side * .4) };
  helper.body.pos = poorHelper ? { x: 40.75, y: CENTER_Y + side * .95 }
    : { x: 40, y: CENTER_Y + side * .4 };
  defender.body.pos = { x: poorHelper ? 40.85 : 40.75, y: CENTER_Y };
  backer.body.pos = { x: 48, y: CENTER_Y + side };
  sim.qb.body.pos = { x: 36, y: CENTER_Y - side * 2 };
  sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  // This reduced solve stages an already recognised run contact. It disables
  // normal behavior/recognition updates, so it must not rely on the offensive
  // call secretly supplying the DL's belief. Physical support/hands are still
  // acquired and loaded below; unsure/false keys have separate cue controls.
  defender.recog!.read = 'run';
  primary.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
  const combo: Combination = { members: [primary, helper], defender, backer, released: false,
    secureSince: -1, nextRead: 0, soloKind: 'drive' };
  primary.behavior = new RunBlocker({ kind: 'drive', target: defender, drive: { x: 1, y: 0 }, combination: combo });
  helper.behavior = new RunBlocker({ kind: 'combo', target: defender, drive: { x: 1, y: 0 }, combination: combo });
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  const engagement = sim.engage(primary, defender, 'run', { x: 1, y: 0 })!;
  expect(engagement).not.toBeNull();
  expect(sim.engage(helper, defender, 'run', { x: 1, y: 0 })).toBe(engagement);
  return { sim, primary, helper, defender, backer, combo, engagement, observe, side, poorHelper };
}

type Fixture = ReturnType<typeof fixture>;

function step(f: Fixture, moving = false) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  if (moving) for (const a of f.combo.members)
    if (!a.engagement) intents[a.idx] = a.behavior.update(a, f.sim);
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, .05);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
    expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
    expect(report.supportMotorWork[a.idx]).toBeLessThanOrEqual(report.supportMotorWorkLimit[a.idx] + 1e-8);
    expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
  }
  f.sim.t += .05; f.sim.perception.record(f.sim.agents);
  return report;
}

function loaded(f: Fixture) {
  for (let k = 0; k < 4; k++) step(f);
  expect(f.engagement.control).toBeGreaterThan(0);
  expect(f.engagement.baseB).toBeGreaterThan(.60);
  expect(f.engagement.hands!.normalForce).toBeGreaterThan(0);
  if (!f.poorHelper) {
    const hands = f.engagement.helperHands!.get(f.helper)!;
    expect(Math.abs(hands.normalForce ?? 0) + Math.abs(hands.tangentForce ?? 0)).toBeGreaterThan(0);
  }
  f.observe();
  return f;
}

function due(f: Fixture, members: Agent[] = f.combo.members) {
  const next = Math.max(...members.map(a => f.combo.reads?.[f.combo.members.indexOf(a)]?.nextRead ?? f.combo.nextRead));
  while (f.sim.t + 1e-9 < next) step(f);
}

function prime(f: Fixture) {
  loaded(f); batch(f);
  expect(f.combo.released).toBe(false);
  due(f);
  return f;
}

const bodies = (f: Fixture) => f.sim.agents.map(a => structuredClone(a.body));
const climbs = (f: Fixture) => f.sim.events.filter(e => e.type === 'block_climb');

describe('a joined lineman reads for his own possible departure', () => {
  it.each([-1, 1])('never orders an unread poorly fitted partner to climb, side %s', side => {
    const f = loaded(fixture(side, true));
    f.backer.body.pos = { x: 43, y: CENTER_Y + side }; f.observe();
    expect(helperSupport(f.sim, f.engagement, f.helper)).toBeLessThan(.25);
    readCombination(f.primary, f.sim, f.combo);
    due(f, [f.primary]);
    const untouchedHelper = structuredClone((f.helper.behavior as RunBlocker).plan.drive);
    readCombination(f.primary, f.sim, f.combo);
    expect(f.combo.released).toBe(false);
    expect(f.helper.tags.has('combo-climb')).toBe(false);
    expect((f.helper.behavior as RunBlocker).plan.drive).toEqual(untouchedHelper);
    // His own reading can still earn a legitimate departure. The covered
    // player remains on precisely the hands that were already supporting him.
    const keeperHands = f.engagement.hands!;
    readCombination(f.helper, f.sim, f.combo);
    due(f, [f.helper]);
    readCombination(f.helper, f.sim, f.combo);
    expect(f.combo.released).toBe(true);
    expect(f.helper.tags.has('combo-climb')).toBe(true);
    expect(f.engagement.hands).toBe(keeperHands);
    expect(climbs(f)).toHaveLength(1);
    const report = step(f, true);
    expect(f.sim.world.joints).toContain(keeperHands);
    expect(report.armImpulse[f.primary.idx]).toBeGreaterThan(0);
  });

  it('a faster partner consumes his own due reads rather than borrowing the slower first member clock', () => {
    // These processing traits straddle native .05 s sampling. A smaller true
    // interval difference can quantize to the same update ticks and does not
    // imply borrowed cadence. Strength/hand/foot training remain unchanged.
    const f = loaded(fixture(1, false, [5, 99]));
    expect(f.helper.mind.decisionInterval).toBeLessThan(f.primary.mind.decisionInterval);
    const calls: Array<{ t: number; observer: Agent; nextRead: number }> = [];
    const consume = () => {
      for (const observer of f.combo.members) {
        const index = f.combo.members.indexOf(observer), before = f.combo.reads?.[index]?.readAt;
        read(f, observer);
        const actual = f.combo.reads?.[index];
        if (actual && actual.readAt !== before) {
          expect(actual.readAt).toBe(f.sim.t);
          expect(actual.nextRead).toBeCloseTo(f.sim.t + observer.mind.decisionInterval, 12);
          calls.push({ t: actual.readAt, observer, nextRead: actual.nextRead });
        }
      }
      resolve(f);
    };
    consume();
    const start = f.sim.t;
    for (let k = 0; k < 12; k++) { step(f); consume(); }
    const times = (a: Agent) => calls.filter(c => c.observer === a).map(c => c.t);
    expect(times(f.primary).length).toBeGreaterThan(1);
    expect(times(f.helper).length).toBeGreaterThan(times(f.primary).length);
    expect(times(f.helper)[0]).toBe(start);
    expect(times(f.helper).some(t => !times(f.primary).includes(t))).toBe(true);
    expect(f.combo.released).toBe(false);
  });

  it.each([-1, 1])('keeps a newer fill private to the faster reader, side %s', side => {
    const f = prime(fixture(side, false, [35, 95]));
    f.backer.body.pos = { x: 42, y: CENTER_Y + side }; f.sim.perception.record(f.sim.agents);
    let found = false;
    for (let k = 0; k < 10 && !found; k++) {
      step(f);
      const helperSees = f.sim.see(f.helper, f.backer), primarySees = f.sim.see(f.primary, f.backer);
      if (helperSees.pos.x !== 42 || primarySees.pos.x !== 48) continue;
      found = true;
      expect(helperSees.age).toBeLessThan(primarySees.age!);
      // The slower primary has no order to send his partner uphill.
      read(f, f.primary);
      expect(f.combo.released).toBe(false);
      read(f, f.helper); resolve(f);
      expect(f.combo.released).toBe(true);
      expect(f.helper.tags.has('combo-climb')).toBe(true);
      expect(f.primary.tags.has('combo-climb')).toBe(false);
      expect(climbs(f)).toHaveLength(1);
      step(f, true);
    }
    expect(found).toBe(true);
  });

  it('one player losing his delayed keeper picture leaves his partner confirmation and cadence intact', () => {
    const f = prime(fixture());
    const helperRead = f.combo.reads?.[1];
    expect(helperRead?.secureSince).toBeGreaterThanOrEqual(0);
    const saved = helperRead && { secureSince: helperRead.secureSince, nextRead: helperRead.nextRead, readAt: helperRead.readAt };
    const actual = f.helper.body.support!.state;
    f.helper.body.support!.state = 'down'; f.observe();
    f.helper.body.support!.state = actual;
    expect(f.helper.isDown(f.sim.t)).toBe(false);
    expect(f.sim.see(f.primary, f.helper).pose).toBe('down');
    expect(f.sim.see(f.helper, f.primary).pose).toBe('up');
    const before = bodies(f);
    read(f, f.primary);
    expect(f.combo.released).toBe(false);
    expect(f.combo.reads?.[0].secureSince).toBe(-1);
    expect(f.combo.reads?.[1] && {
      secureSince: f.combo.reads[1].secureSince, nextRead: f.combo.reads[1].nextRead, readAt: f.combo.reads[1].readAt,
    }).toEqual(saved);
    expect(bodies(f)).toEqual(before);
    step(f);
  });

  it.each([-1, 1])('requires fresh personal confirmation after the observer goes down and regains his feet, side %s', side => {
    const f = prime(fixture(side));
    expect(f.combo.reads?.[1].secureSince).toBeGreaterThanOrEqual(0);
    const keeperHands = f.engagement.hands!, partnerRead = f.combo.reads?.[0];
    const partnerClock = partnerRead && { next: partnerRead.nextRead, secure: partnerRead.secureSince, at: partnerRead.readAt };
    f.backer.body.pos = { x: 42, y: CENTER_Y + side }; f.observe();
    f.helper.body.support!.state = 'down';
    readCombination(f.helper, f.sim, f.combo);
    expect(f.combo.reads?.[1].secureSince).toBe(-1);
    expect(f.combo.released).toBe(false);
    f.helper.body.support!.state = 'up';
    const recoveredAt = f.sim.t;
    readCombination(f.helper, f.sim, f.combo);
    expect(f.combo.released).toBe(false);
    expect(f.combo.reads?.[1].secureSince).toBe(recoveredAt);
    expect(f.combo.reads?.[0] && {
      next: f.combo.reads[0].nextRead, secure: f.combo.reads[0].secureSince, at: f.combo.reads[0].readAt,
    }).toEqual(partnerClock);
    due(f, [f.helper]);
    readCombination(f.helper, f.sim, f.combo);
    expect(f.combo.released).toBe(true);
    expect(f.helper.tags.has('combo-climb')).toBe(true);
    expect(f.engagement.hands).toBe(keeperHands);
    expect(climbs(f)).toHaveLength(1);
    expect(step(f, true).armImpulse[f.primary.idx]).toBeGreaterThan(0);
  });
});

describe('joined pair proposals resolve before ordinary movement', () => {
  it.each([-1, 1])('chooses the same loaded keeper when deferred read order reverses, side %s', side => {
    const run = (reverse: boolean) => {
      const f = prime(fixture(side));
      f.backer.body.pos = { x: 42, y: CENTER_Y + side }; f.observe();
      const originalPrimary = f.engagement.hands!, helperHands = f.engagement.helperHands!.get(f.helper)!;
      const before = bodies(f);
      for (const a of reverse ? [...f.combo.members].reverse() : f.combo.members) read(f, a);
      expect(f.combo.released).toBe(false);
      expect(f.combo.reads?.every(r => r.proposal?.climber === f.combo.members[f.combo.reads!.indexOf(r)])).toBe(true);
      resolve(f);
      expect(f.combo.released).toBe(true); expect(climbs(f)).toHaveLength(1);
      expect(bodies(f)).toEqual(before);
      const climber = f.combo.members.find(a => a.tags.has('combo-climb'))!;
      const keeper = f.combo.members.find(a => a !== climber)!;
      expect(f.engagement.hands).toBe(keeper === f.primary ? originalPrimary : helperHands);
      const start = { ...climber.pos }, report = step(f, true);
      expect(report.armImpulse[keeper.idx]).toBeGreaterThan(0);
      expect(f.sim.world.joints).toContain(f.engagement.hands!);
      for (let k = 0; k < 5; k++) step(f, true);
      expect(climber.pos.x).toBeGreaterThan(start.x);
      return { climber: climber.slot, keeper: keeper.slot, event: climbs(f), bodies: bodies(f) };
    };
    expect(run(true)).toEqual(run(false));
  });

  it('the batch consumes both players once and ordinary same-tick updates do not reschedule them', () => {
    const f = loaded(fixture());
    const original = f.sim.see.bind(f.sim), calls: Agent[] = [];
    vi.spyOn(f.sim, 'see').mockImplementation((observer, target) => { calls.push(observer); return original(observer, target); });
    if (optionalBatch.prepareJoinedCombinations) optionalBatch.prepareJoinedCombinations(f.sim);
    else batch(f);
    expect(calls).toContain(f.primary); expect(calls).toContain(f.helper);
    const clocks = f.combo.reads?.map(r => ({ nextRead: r.nextRead, secureSince: r.secureSince, readAt: r.readAt }));
    const consumed = calls.length;
    f.primary.behavior.update(f.primary, f.sim); f.helper.behavior.update(f.helper, f.sim);
    expect(calls).toHaveLength(consumed);
    expect(f.combo.reads?.map(r => ({ nextRead: r.nextRead, secureSince: r.secureSince, readAt: r.readAt }))).toEqual(clocks);
    expect(f.combo.released).toBe(false);
  });

  it.each([0, -.5])('resolves an equal-cost surface consistently and honors a real cost advantage, backer shift %s', shift => {
    // Find the fixture's equal attainable routes through actual private reads.
    // A straight-line distance cannot account for stepping around the DL and
    // partner. Each probe starts from the same genuinely loaded world, consumes
    // each player's due read once, and never edits a proposal or hand state.
    const differenceAt = (y: number) => {
      const probe = prime(fixture());
      probe.backer.body.pos = { x: 42, y }; probe.observe();
      const before = bodies(probe);
      read(probe, probe.primary); read(probe, probe.helper);
      expect(probe.combo.released).toBe(false);
      expect(bodies(probe)).toEqual(before);
      const [primary, helper] = probe.combo.reads!;
      expect(primary.proposal?.climber).toBe(probe.primary);
      expect(helper.proposal?.climber).toBe(probe.helper);
      return primary.proposal!.cost - helper.proposal!.cost;
    };
    let lo = CENTER_Y - 1.5, hi = CENTER_Y + 1.5;
    expect(differenceAt(lo)).toBeLessThan(0);
    expect(differenceAt(hi)).toBeGreaterThan(0);
    for (let k = 0; k < 54; k++) {
      const mid = (lo + hi) / 2;
      if (differenceAt(mid) < 0) lo = mid; else hi = mid;
    }
    // Adjacent representable positions bracket the tie; use the closer one.
    // Their midpoint rounds to one end and need not be the better of the two.
    const equalRouteY = Math.abs(differenceAt(lo)) <= Math.abs(differenceAt(hi)) ? lo : hi;
    const run = (reverse: boolean) => {
      const f = prime(fixture());
      const y = equalRouteY + shift;
      f.backer.body.pos = { x: 42, y }; f.observe();
      for (const a of reverse ? [...f.combo.members].reverse() : f.combo.members) read(f, a);
      expect(f.combo.released).toBe(false);
      const primary = f.combo.reads?.[0].proposal, helper = f.combo.reads?.[1].proposal;
      expect(primary?.climber).toBe(f.primary); expect(helper?.climber).toBe(f.helper);
      if (shift === 0) expect(Math.abs(primary!.cost - helper!.cost))
        .toBeLessThanOrEqual(4 * Number.EPSILON * Math.max(1, primary!.cost, helper!.cost));
      else expect(helper!.cost - primary!.cost).toBeGreaterThan(.01);
      const before = bodies(f), originalHands = f.engagement.hands!, helperHands = f.engagement.helperHands!.get(f.helper)!;
      resolve(f);
      const expectedClimber = shift === 0 ? f.helper : f.primary, keeper = shift === 0 ? f.primary : f.helper;
      expect(expectedClimber.tags.has('combo-climb')).toBe(true);
      expect(f.engagement.blocker).toBe(keeper);
      expect(f.engagement.hands).toBe(keeper === f.primary ? originalHands : helperHands);
      expect(bodies(f)).toEqual(before); expect(climbs(f)).toHaveLength(1);
      expect(step(f, true).armImpulse[keeper.idx]).toBeGreaterThan(0);
      return { event: climbs(f), bodies: bodies(f) };
    };
    expect(run(true)).toEqual(run(false));
  });

  it('a snap-delayed member cannot consume a read while his ready partner can', () => {
    const f = loaded(fixture());
    f.primary.snapReadyAt = f.sim.t + 1;
    const original = f.sim.see.bind(f.sim), consumed: Agent[] = [];
    vi.spyOn(f.sim, 'see').mockImplementation((observer, target) => { consumed.push(observer); return original(observer, target); });
    batch(f);
    expect(consumed).not.toContain(f.primary);
    expect(consumed).toContain(f.helper);
    expect(f.primary.tags.has('combo-climb')).toBe(false);
    expect(f.combo.released).toBe(false);
  });

  it('expired proposals cannot authorize a future departure without a newly consumed read', () => {
    const f = prime(fixture());
    f.backer.body.pos = { x: 42, y: CENTER_Y + 1 }; f.observe();
    read(f, f.primary); read(f, f.helper);
    expect(f.combo.released).toBe(false);
    expect(f.combo.reads?.some(r => r.proposal)).toBe(true);
    step(f);
    const before = bodies(f), hands = f.engagement.hands;
    resolve(f);
    expect(f.combo.released).toBe(false);
    expect(f.engagement.hands).toBe(hands);
    expect(bodies(f)).toEqual(before);
    expect(climbs(f)).toHaveLength(0);
  });

  it('losing actual keeper hands between the personal proposal and resolution vetoes that release', () => {
    const f = prime(fixture());
    f.backer.body.pos = { x: 42, y: CENTER_Y + 1 }; f.observe();
    read(f, f.primary);
    expect(f.combo.released).toBe(false);
    expect(f.combo.reads?.[0].proposal?.climber).toBe(f.primary);
    const keeperHands = f.engagement.helperHands!.get(f.helper)!;
    f.sim.world.joints = f.sim.world.joints.filter(j => j !== keeperHands);
    const before = bodies(f), primaryHands = f.engagement.hands;
    resolve(f);
    expect(f.combo.released).toBe(false);
    expect(f.engagement.blocker).toBe(f.primary);
    expect(f.engagement.hands).toBe(primaryHands);
    expect(bodies(f)).toEqual(before);
    expect(climbs(f)).toHaveLength(0);
    step(f);
  });
});

describe('a stale shared fit is not a fallback permission to choose somebody else', () => {
  it.each(['newer-plan', 'new-target', 'down-observer'] as const)('rejects %s even with old common secure time already earned', failure => {
    const f = prime(fixture());
    f.backer.body.pos = { x: 42, y: CENTER_Y + 1 }; f.observe();
    // These are deliberately primed old fields. A physically shared double
    // must not reenter remote legacy release just because one plan is stale.
    f.combo.secureSince = f.sim.t - 1; f.combo.nextRead = 0;
    if (failure === 'newer-plan') f.helper.behavior = new RunBlocker({
      kind: 'drive', target: f.defender, drive: { x: 1, y: 0 },
    });
    if (failure === 'new-target') (f.helper.behavior as RunBlocker).plan.target = f.sim.slot('DT_S')!;
    if (failure === 'down-observer') f.primary.body.support!.state = 'down';
    const partnerBehavior = f.helper.behavior, partnerPlan = (f.helper.behavior as RunBlocker).plan;
    const target = partnerPlan.target, drive = { ...partnerPlan.drive }, kind = partnerPlan.kind;
    const before = bodies(f), joints = [...f.sim.world.joints], primaryHands = f.engagement.hands;
    readCombination(f.primary, f.sim, f.combo);
    resolve(f);
    expect(f.combo.released).toBe(false);
    expect(f.helper.behavior).toBe(partnerBehavior);
    expect(partnerPlan.target).toBe(target); expect(partnerPlan.drive).toEqual(drive); expect(partnerPlan.kind).toBe(kind);
    expect(f.engagement.blocker).toBe(f.primary); expect(f.engagement.hands).toBe(primaryHands);
    expect(f.sim.world.joints).toEqual(joints); expect(bodies(f)).toEqual(before);
    expect(climbs(f)).toHaveLength(0);
  });

  it('a nonmember cannot use the pair control to order either member uphill', () => {
    const f = prime(fixture()), outsider = f.sim.slot('RG')!;
    f.backer.body.pos = { x: 42, y: CENTER_Y + 1 }; f.observe();
    f.combo.secureSince = f.sim.t - 1; f.combo.nextRead = 0;
    const before = bodies(f), hands = f.engagement.hands;
    readCombination(outsider, f.sim, f.combo);
    expect(f.combo.released).toBe(false);
    expect(f.engagement.hands).toBe(hands);
    expect(bodies(f)).toEqual(before);
    expect(climbs(f)).toHaveLength(0);
  });
});
