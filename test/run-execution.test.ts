import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { bodyRadius, squeezeForGap } from '../src/physics/bodyshape.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, planRunBlocking, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { contactControl, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const offense = generateTeam(new Rng(11), 'O', 'OFF', { strength: 0.55 });
const defense = generateTeam(new Rng(12), 'D', 'DEF', { strength: 0.55 });
function setup(concept = 'iz_strong', flip = false, form = 'ace_11', front = 'over') {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
}

describe('run responsibilities', () => {
  it.each([false, true])('accounts for every down lineman before doubling, flip=%s', (flip) => {
    const sim = setup('iz_strong', flip);
    const targets = sim.offense.flatMap((a) => a.behavior instanceof RunBlocker && a.behavior.plan.target ? [a.behavior.plan.target] : []);
    for (const d of sim.defense.filter((d) => d.slot.startsWith('DE') || d.slot.startsWith('DT'))) expect(targets).toContain(d);
    const backside = sim.slot(flip ? 'RT' : 'LT')!;
    expect((backside.behavior as RunBlocker).plan.kind).toBe('cutoff');
  });

  it.each([false, true])('keeps the wide end accounted for when an under-front shade moves toward the tackle, flip=%s', (flip) => {
    const sim = setup('iz_strong', flip, 'ace_11', 'under');
    const shade = sim.slot('DT_W')!;
    const side = Math.sign(shade.pos.y - CENTER_Y);
    shade.body.pos.y = CENTER_Y + side * 2.15;
    sim.slot('DE_W')!.body.pos.y = CENTER_Y + side * 4.9;
    const plans = planRunBlocking(sim, sim.offCall.run!);
    for (const d of sim.defense.filter((d) => d.slot.startsWith('DE') || d.slot.startsWith('DT'))) {
      expect([...plans.values()].some((p) => p.target === d)).toBe(true);
    }
  });

  it.each([false, true])('leaves only the intended interior trap target to the puller, flip=%s', (flip) => {
    const sim = setup('trap', flip, 'i_pro_21');
    const blockers = sim.offense.filter((a) => a.behavior instanceof RunBlocker);
    const trapper = blockers.find((a) => (a.behavior as RunBlocker).plan.pullRole === 'trap')!;
    const target = (trapper.behavior as RunBlocker).target;
    expect(target).not.toBeNull();
    expect(blockers.filter((a) => (a.behavior as RunBlocker).target === target)).toEqual([trapper]);
    for (const d of sim.defense.filter((d) => d.slot.startsWith('DT'))) expect(blockers.some((a) => (a.behavior as RunBlocker).target === d)).toBe(true);
  });

  it.each([false, true])('lets the covered interior blocker handle the counter threat before the tackle doubles, flip=%s', (flip) => {
    const sim = setup('counter', flip);
    const owners = sim.offense.filter((a) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'down' && a.behavior.target?.slot.startsWith('DT'));
    expect(owners).toHaveLength(2);
    expect(owners.every((a) => ['LG', 'C', 'RG'].includes(a.slot))).toBe(true);
    for (const a of owners) expect(Math.abs(a.pos.y - (a.behavior as RunBlocker).target!.pos.y)).toBeLessThan(a.slot === 'C' ? 2.8 : 1.7);
  });

  it('presses the designed track at his own tempo with an unfinished lead block just ahead', () => {
    // Tracked backs run 4.6-4.7 yd/s with a puller 1.4-1.6 yd ahead on power/counter/trap (2022 all-22):
    // the puller is a moving wall, not a man to wait for. Spacing, not the decision, keeps him off the back.
    const sim = setup('counter');
    const rb = sim.slot('RB')!;
    const lead = sim.slot('RT')!;
    rb.body.pos = { x: 38.2, y: CENTER_Y };
    for (const d of sim.defense) d.body.pos = { x: 50, y: CENTER_Y + 15 };
    const observe = () => { for (let i = 0; i < 16; i++) sim.perception.record(sim.agents); };
    const speed = (cmd: { vel: { x: number; y: number } }) => Math.hypot(cmd.vel.x, cmd.vel.y);
    const press = rb.profile.vmax * (0.62 + 0.18 * (1 - rb.r('patience')));
    lead.body.pos = { x: 38.8, y: CENTER_Y + 0.4 };
    observe();
    const behind = new BallCarrier({ aim: { x: 40.6, y: CENTER_Y + 2 }, aimUntil: 3 }, rb).update(rb, sim);
    expect(behind.vel.y).toBeGreaterThan(0);
    expect(speed(behind)).toBeCloseTo(press, 6);
    lead.body.pos = { x: 37, y: CENTER_Y + 0.4 };
    observe();
    expect(speed(new BallCarrier({ aim: { x: 40.6, y: CENTER_Y + 2 }, aimUntil: 3 }, rb).update(rb, sim))).toBeCloseTo(speed(behind), 6);
  });
});

function doubleTeam(insecure = false, slant = false) {
  // Reuse the declared ordinary contact panel's roster and acquisition seeds.
  // No assigned win/control or special force: both blockers earn their hands.
  const panelOffense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
  const panelDefense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(panelOffense, formation.personnel), defense: pickDefense(panelDefense, 'base43'),
    offCall: { formation, flip: true, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'controlled combo' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: insecure ? 3 : 11 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const primary = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  primary.body.pos = { x: 40, y: CENTER_Y - .4 };
  helper.body.pos = { x: 40, y: CENTER_Y + .4 };
  defender.body.pos = { x: 40.75, y: CENTER_Y + (slant ? .1 : 0) };
  backer.body.pos = { x: 42, y: CENTER_Y + 1.5 };
  sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  sim.qb.body.pos = { x: 36, y: CENTER_Y - 2 };
  primary.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
  defender.recog!.read = 'run';
  const combo: Combination = { members: [primary, helper], defender, backer, released: false,
    secureSince: -1, nextRead: 0, soloKind: 'drive' };
  primary.behavior = new RunBlocker({ kind: 'drive', target: defender, drive: { x: 1, y: 0 }, combination: combo });
  helper.behavior = new RunBlocker({ kind: 'combo', target: defender, drive: { x: 1, y: 0 }, combination: combo });
  const observe = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents); };
  observe();
  const e = sim.engage(primary, defender, 'run', { x: 1, y: 0 })!;
  expect(sim.engage(helper, defender, 'run', { x: 1, y: 0 })).toBe(e);
  const step = () => {
    const intents: Intent[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    updateEngagements(sim, intents);
    const report = sim.world.step(intents, sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of sim.agents) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
    }
    sim.t += sim.dt; sim.perception.record(sim.agents);
    return report;
  };
  for (let k = 0; k < 4; k++) step();
  expect(e.baseB).toBeGreaterThan(.6);
  expect(Math.hypot(e.helperHands!.get(helper)!.normalForce ?? 0,
    e.helperHands!.get(helper)!.tangentForce ?? 0)).toBeGreaterThan(0);
  observe();
  const due = (reader: typeof primary) => {
    const next = combo.reads?.[combo.members.indexOf(reader)]?.nextRead ?? combo.nextRead;
    while (sim.t + 1e-9 < next) step();
  };
  return { sim, helper, primary, combo, e, step, due, observe };
}

describe('combination exchanges', () => {
  it('can strike within functional arm extension, but cannot engage a distant defender', () => {
    const sim = setup();
    const blocker = sim.slot('C')!;
    const defender = sim.slot('DT_S')!;
    blocker.body.pos = { x: 38, y: CENTER_Y };
    const reach = blocker.profile.radius + defender.profile.radius + 0.1 + blocker.player.measurables.armIn / 36 * 0.45;
    defender.body.pos = { x: 38 + reach + 0.1, y: CENTER_Y };
    const behavior = new RunBlocker({ kind: 'down', target: defender, drive: { x: 1, y: 0 } });
    blocker.behavior = behavior;
    sim.t = 0.5;
    behavior.update(blocker, sim);
    expect(blocker.engagement).toBeNull();
    defender.body.pos.x = 38 + reach - 0.02;
    expect(defender.body.pos.x - blocker.pos.x).toBeGreaterThan(blocker.profile.radius + defender.profile.radius + 0.25);
    behavior.update(blocker, sim);
    expect(blocker.engagement?.defender).toBe(defender);
  });

  it('keeps an insecure block even after the old fixed release time', () => {
    const { sim, helper, primary, combo, e, observe } = doubleTeam(true);
    sim.t = 4;
    expect(e.control).toBeLessThan(-.12);
    // Insecure as the climber sees it: the defender is across his partner's
    // face (chest turned off the man). The hidden hand value alone is not a cue.
    primary.body.facing = 1.3;
    observe();
    readCombination(helper, sim, combo);
    sim.t = 5;
    readCombination(helper, sim, combo);
    expect(combo.released).toBe(false);
    expect(helper.engagement).toBe(e);
    expect(e.helpers).toContain(helper);
  });

  it('releases exactly one blocker when the block is secured and the backer fills', () => {
    const { sim, helper, primary, combo, e, due } = doubleTeam();
    expect(e.control).toBeGreaterThan(0);
    readCombination(helper, sim, combo);
    expect(combo.released).toBe(false);
    due(helper);
    readCombination(helper, sim, combo);
    readCombination(primary, sim, combo);
    expect(combo.released).toBe(true);
    expect(helper.engagement).toBeNull();
    expect((helper.behavior as RunBlocker).target).toBe(combo.backer);
    expect(primary.engagement).toBe(e);
    expect(e.defender.engagement).toBe(e);
    expect(e.helpers).toHaveLength(0);
    expect(sim.events.filter((x) => x.type === 'block_climb')).toHaveLength(1);
  });

  it('allows the original blocker to climb when his partner has better leverage on the slant', () => {
    const { sim, helper, primary, combo, e, step, due, observe } = doubleTeam(false, true);
    combo.backer!.body.pos = { x: 41, y: CENTER_Y - 3 };
    observe();
    const hands = e.helperHands!.get(helper)!;
    const angle = (a: typeof primary) => Math.abs(Math.atan2(a.pos.y - combo.defender.pos.y,
      combo.defender.pos.x - a.pos.x));
    expect(angle(helper)).toBeLessThan(angle(primary));
    expect(contactControl(e, helper)).not.toBeNull();
    expect(contactControl(e, helper)!).toBeGreaterThan(-.1);
    readCombination(primary, sim, combo);
    due(primary);
    const bodies = sim.agents.map(a => structuredClone(a.body));
    const acquiredControl = contactControl(e, helper);
    readCombination(primary, sim, combo);
    expect(combo.released).toBe(true);
    expect(e.blocker).toBe(helper);
    expect(e.hands).toBe(hands);
    expect(e.control).toBe(acquiredControl);
    expect(sim.agents.map(a => a.body)).toEqual(bodies);
    expect(helper.engagement).toBe(e);
    expect(primary.engagement).toBeNull();
    expect((primary.behavior as RunBlocker).target).toBe(combo.backer);
    // A balanced kept contact need not transmit load on every step. Its
    // original joint must remain live and obey the shared World budgets.
    step();
    expect(sim.world.joints).toContain(hands);
    expect(e.hands).toBe(hands);
  });
});

describe('carrier shoulder turn', () => {
  const opening = (clearance: number) => [{ pos: { x: 1, y: 0.32 + clearance }, radius: 0.32 }, { pos: { x: 1, y: -0.32 - clearance }, radius: 0.32 }];
  it('requests posture only for a narrow, physically passable opening on both sides', () => {
    expect(squeezeForGap({ x: 0, y: 0 }, 0, 0.30, opening(0.24))).toBeGreaterThan(0.8);
    expect(squeezeForGap({ x: 0, y: 0 }, 0, 0.30, opening(0.15))).toBe(0);
    expect(squeezeForGap({ x: 0, y: 0 }, 0, 0.30, opening(0.65))).toBe(0);
    expect(squeezeForGap({ x: 0, y: 0 }, 0, 0.30, opening(0.24).slice(0, 1))).toBe(0);
    const mirrored = opening(0.24).map((b) => ({ ...b, pos: { x: -b.pos.x, y: -b.pos.y } }));
    expect(squeezeForGap({ x: 0, y: 0 }, Math.PI, 0.30, mirrored)).toBeCloseTo(squeezeForGap({ x: 0, y: 0 }, 0, 0.30, opening(0.24)));
  });

  it('narrows sideways rather than shrinking the whole player, without changing tackle reach', () => {
    const a = setup().slot('RB')!;
    const reach = a.profile.reach;
    a.body.squeeze = 1;
    a.body.squeezeHeading = 0;
    expect(bodyRadius(a.body, 0, 1)).toBeCloseTo(a.profile.radius * 0.68);
    expect(bodyRadius(a.body, 1, 0)).toBeGreaterThan(a.profile.radius);
    expect(a.profile.reach).toBe(reach);
  });

  it('takes time to enter and recover and costs acceleration', () => {
    const a = setup().slot('RB')!;
    const plain: Body = { ...a.body, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } };
    const narrow: Body = { ...plain, pos: { ...plain.pos }, vel: { ...plain.vel } };
    stepBody(narrow, { vel: { x: a.profile.vmax, y: 0 }, squeeze: 1 }, 0.05);
    stepBody(plain, { vel: { x: a.profile.vmax, y: 0 } }, 0.05);
    expect(narrow.squeeze).toBeGreaterThan(0);
    expect(narrow.squeeze).toBeLessThan(1);
    expect(narrow.vel.x).toBeLessThan(plain.vel.x);
    for (let i = 0; i < 6; i++) stepBody(narrow, { vel: { x: 1, y: 0 } }, 0.05);
    expect(narrow.squeeze).toBe(0);
  });
});
