import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { bodyRadius, squeezeForGap } from '../src/physics/bodyshape.js';
import { stepBody, type Body } from '../src/physics/kinematics.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, planRunBlocking, readCombination } from '../src/sim/behaviors/blocking.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { PlaySim } from '../src/sim/playsim.js';

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

  it('paces an unfinished lead block, then accelerates when the lead clears the line', () => {
    const sim = setup('counter');
    const rb = sim.slot('RB')!;
    const lead = sim.slot('RT')!;
    rb.body.pos = { x: 38.2, y: CENTER_Y };
    lead.body.pos = { x: 38.8, y: CENTER_Y + 0.4 };
    for (const d of sim.defense) d.body.pos = { x: 50, y: CENTER_Y + 15 };
    for (let i = 0; i < 16; i++) sim.perception.record(sim.agents);
    const carrier = new BallCarrier({ aim: { x: 40.6, y: CENTER_Y + 2 }, aimUntil: 3, follow: [lead] }, rb);
    const slow = carrier.update(rb, sim);
    expect(rb.tags.has('paced-lead')).toBe(true);
    expect(slow.vel.y).toBeGreaterThan(0);
    lead.body.pos.x = 40.5;
    for (let i = 0; i < 16; i++) sim.perception.record(sim.agents);
    const burst = carrier.update(rb, sim);
    expect(Math.hypot(burst.vel.x, burst.vel.y)).toBeGreaterThan(Math.hypot(slow.vel.x, slow.vel.y));
  });

  it('stops waiting when the puller falls behind or an unblocked defender closes', () => {
    const sim = setup('counter');
    const rb = sim.slot('RB')!;
    const lead = sim.slot('RT')!;
    rb.body.pos = { x: 38.2, y: CENTER_Y };
    lead.body.pos = { x: 38.8, y: CENTER_Y + 0.4 };
    for (const d of sim.defense) d.body.pos = { x: 50, y: CENTER_Y + 15 };
    const carrier = new BallCarrier({ aim: { x: 40.6, y: CENTER_Y + 2 }, aimUntil: 3, follow: [lead] }, rb);
    const observe = () => { for (let i = 0; i < 16; i++) sim.perception.record(sim.agents); };
    const speed = (cmd: { vel: { x: number; y: number } }) => Math.hypot(cmd.vel.x, cmd.vel.y);
    observe();
    const slow = speed(carrier.update(rb, sim));
    lead.body.pos.x = 37;
    observe();
    expect(speed(carrier.update(rb, sim))).toBeGreaterThan(slow);
    lead.body.pos.x = 38.8;
    sim.defense[0].body.pos = { x: 39, y: CENTER_Y };
    sim.defense[0].body.vel = { x: -3, y: 0 };
    observe();
    expect(speed(carrier.update(rb, sim))).toBeGreaterThan(slow);
  });
});

function doubleTeam() {
  const sim = setup();
  const helper = sim.offense.find((a) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'combo')!;
  const combo = (helper.behavior as RunBlocker).plan.combination!;
  const primary = combo.members.find((a) => a !== helper)!;
  combo.defender.body.pos = { x: 40.7, y: CENTER_Y };
  primary.body.pos = { x: 40, y: CENTER_Y };
  helper.body.pos = { x: 40, y: CENTER_Y + 0.4 };
  combo.backer!.body.pos = { x: 42, y: CENTER_Y + 1.5 };
  const e = sim.engage(primary, combo.defender, 'run', { x: 1, y: 0 })!;
  sim.engage(helper, combo.defender, 'run', { x: 1, y: 0 });
  e.control = 0.5;
  e.baseB = 1;
  e.phi = 0;
  for (let i = 0; i < 16; i++) sim.perception.record(sim.agents);
  return { sim, helper, primary, combo, e };
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
    const { sim, helper, combo, e } = doubleTeam();
    sim.t = 4;
    e.control = -0.8;
    readCombination(helper, sim, combo);
    sim.t = 5;
    readCombination(helper, sim, combo);
    expect(combo.released).toBe(false);
    expect(helper.engagement).toBe(e);
    expect(e.helpers).toContain(helper);
  });

  it('releases exactly one blocker when the block is secured and the backer fills', () => {
    const { sim, helper, primary, combo, e } = doubleTeam();
    sim.t = 0.5;
    readCombination(helper, sim, combo);
    expect(combo.released).toBe(false);
    sim.t = 0.9;
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
    const { sim, helper, primary, combo, e } = doubleTeam();
    combo.backer!.body.pos = { x: 41, y: CENTER_Y - 3 };
    for (let i = 0; i < 16; i++) sim.perception.record(sim.agents);
    sim.t = 0.5;
    readCombination(primary, sim, combo);
    sim.t = 0.9;
    readCombination(primary, sim, combo);
    expect(combo.released).toBe(true);
    expect(e.blocker).toBe(helper);
    expect(helper.engagement).toBe(e);
    expect(primary.engagement).toBeNull();
    expect((primary.behavior as RunBlocker).target).toBe(combo.backer);
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
