import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import type { Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { RunBlocker, playSideSign, type Combination } from '../src/sim/behaviors/blocking.js';
import { axisOf, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

// Same generated players as helper-fit.test.ts. This is a controlled first-
// acquisition test, not a replay of the native Ace opening or a protection claim.
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
type Concept = 'wz_weak' | 'oz_weak' | 'duo';
type Arrival = 'covered' | 'uncovered';

function fixture(concept: Concept = 'wz_weak', mirror = 1) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[concept], label: 'combo initial surface' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
  });
  // Formation.flip leaves the OL slot offsets fixed. Reflect the installed
  // slot order as well as the bodies for this controlled mirror; otherwise a
  // reflected LG would still be told that his known half is on the old side.
  if (mirror < 0) {
    for (const spot of Object.values(sim.offAlign.spots)) {
      spot.pos.y = 2 * CENTER_Y - spot.pos.y;
      if (spot.side !== 'C') spot.side = spot.side === 'L' ? 'R' : 'L';
    }
    sim.offAlign.strongSign = -sim.offAlign.strongSign;
    sim.offAlign.strong = sim.offAlign.strong === 'L' ? 'R' : 'L';
    sim.offAlign.coreEdge.S = 2 * CENTER_Y - sim.offAlign.coreEdge.S;
    sim.offAlign.coreEdge.W = 2 * CENTER_Y - sim.offAlign.coreEdge.W;
  }
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3,
      y: CENTER_Y + mirror * (3 + Math.floor(a.idx / 5) * 3 - CENTER_Y) };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const covered = sim.slot('C')!, uncovered = sim.slot('LG')!, defender = sim.slot('DT_W')!;
  const half = (a: Agent, partner: Agent) => Math.sign(
    sim.offAlign.spots[a.slot].pos.y - sim.offAlign.spots[partner.slot].pos.y);
  defender.body.pos = { x: 40.85, y: CENTER_Y };
  for (const [a, partner] of [[covered, uncovered], [uncovered, covered]]) {
    // Physically separated neighboring feet, on their installed halves and
    // within ordinary strike reach. The depth/width differ deliberately:
    // exact symmetric far-apart feet would require lateral gathering first.
    a.body.pos = { x: defender.pos.x - (a === covered ? .70 : .49),
      y: defender.pos.y + half(a, partner) * (a === covered ? .40 : .77) };
    a.body.facing = Math.atan2(defender.pos.y - a.pos.y, defender.pos.x - a.pos.x);
  }
  defender.body.facing = Math.PI;
  if (defender.runFit) defender.runFit = { ...defender.runFit, side: defender.runFit.side * mirror };
  sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  const k = concept === 'wz_weak' ? 1.8 : concept === 'oz_weak' ? 1.1 : 0;
  const drive = norm({ x: 1, y: playSideSign(sim, RUN_BY_ID[concept]) * k });
  const combination: Combination = { members: [covered, uncovered], defender,
    backer: sim.slot('LB_M')!, released: false, secureSince: -1, nextRead: 0,
    soloKind: concept === 'duo' ? 'drive' : 'reach' };
  covered.behavior = new RunBlocker({ kind: concept === 'duo' ? 'drive' : 'reach',
    target: defender, drive: { ...drive }, combination });
  uncovered.behavior = new RunBlocker({ kind: 'combo', target: defender,
    climbTo: combination.backer, drive: { ...drive }, combination });
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const order = (arrival: Arrival) => arrival === 'covered'
    ? [covered, uncovered] as const : [uncovered, covered] as const;
  return { sim, covered, uncovered, defender, combination, drive, half, order };
}

const bodies = (f: ReturnType<typeof fixture>) => f.sim.agents.map(a => structuredClone(a.body));
const sealForHalf = (side: number) => 2 / Math.PI * Math.atan2(side * .55, .35);
const cases = (['wz_weak', 'oz_weak'] as const).flatMap(concept => [-1, 1].flatMap(mirror =>
  (['covered', 'uncovered'] as const).map(arrival => ({ concept, mirror, arrival }))));

describe('a stretch combination acquires the surface shared by its two installed foot lanes', () => {
  it.each(cases)('installs the first actual $arrival shoulder in $concept mirror $mirror', ({ concept, mirror, arrival }) => {
    const f = fixture(concept, mirror), [first, second] = f.order(arrival);
    const before = bodies(f), acquire = vi.spyOn(f.sim, 'engage');
    try {
      first.behavior.update(first, f.sim);
      const e = first.engagement!;
      expect(e).not.toBeNull();
      expect(e.blocker).toBe(first); expect(e.defender).toBe(f.defender);
      expect(acquire.mock.calls[0][0]).toBe(first);
      expect(acquire.mock.calls[0][3]).toEqual(f.drive);
      expect(e.drive).toEqual(f.drive);
      // This depth normal is derived from the mean of the two authored
      // offsets (-.35, +/-.55), not inferred from an achieved arrival.
      expect(e.surfaceAxis).toEqual({ x: -1, y: 0 });
      expect(e.sealTarget).toBeCloseTo(sealForHalf(f.half(first, second)), 12);
      for (const member of [first, second]) {
        const offset = { x: -.35, y: f.half(member, member === first ? second : first) * .55 };
        expect(offset.x * e.surfaceAxis!.x + offset.y * e.surfaceAxis!.y).toBeGreaterThan(0);
      }
      const surface = e.surfaceAxis, seal = e.sealTarget, hands = e.hands;
      second.behavior.update(second, f.sim);
      expect(second.engagement).toBe(e); expect(e.helpers).toEqual([second]);
      expect(e.surfaceAxis).toBe(surface); expect(e.sealTarget).toBe(seal);
      expect(e.hands).toBe(hands); expect(f.sim.world.joints).toContain(hands);
      const joinedHands = e.helperHands!.get(second)!;
      expect(joinedHands.a).toBe(second.body); expect(joinedHands.b).toBe(f.defender.body);
      expect(f.sim.world.joints).toContain(joinedHands);
      const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      updateEngagements(f.sim, intents);
      // In this specific usable neighboring geometry the helper has room
      // for the installed lateral work. This is a request, not proof that
      // contact will achieve it or that every helper must move playside.
      expect(intents[second.idx].vel.y * playSideSign(f.sim, RUN_BY_ID[concept])).toBeGreaterThan(0);
      expect(e.surfaceAxis).toBe(surface); expect(e.sealTarget).toBe(seal);
      expect(bodies(f)).toEqual(before);
      expect(f.combination.released).toBe(false);
      expect((first.behavior as RunBlocker).plan.drive).toEqual(f.drive);
      expect((second.behavior as RunBlocker).plan.drive).toEqual(f.drive);
    } finally { acquire.mockRestore(); }
  });

  it.each([-1, 1])('selects a shoulder from known slot order when a partner has crossed unseen, mirror %s', mirror => {
    const f = fixture('wz_weak', mirror), before = bodies(f);
    const side = f.half(f.uncovered, f.covered);
    // The altered current partner is not re-recorded. This test is about the
    // actor's installed half, not permission for actual hands to pass bodies.
    f.covered.body.pos.y = f.uncovered.pos.y + side * .5;
    f.uncovered.behavior.update(f.uncovered, f.sim);
    const e = f.uncovered.engagement!;
    expect(e).not.toBeNull();
    expect(e.sealTarget).toBeCloseTo(sealForHalf(side), 12);
    expect(f.uncovered.body).toEqual(before[f.uncovered.idx]);
  });

  it.each([-1, 1])('leaves Duo acquisition in its existing vertical drive frame, mirror %s', mirror => {
    const f = fixture('duo', mirror), before = bodies(f);
    f.covered.behavior.update(f.covered, f.sim);
    const e = f.covered.engagement!;
    expect(e).not.toBeNull(); expect(e.surfaceAxis).toBeUndefined();
    expect(axisOf(f.sim, e)).toEqual({ x: -f.drive.x, y: -f.drive.y });
    expect(Math.abs(e.sealTarget)).toBe(0);
    f.uncovered.behavior.update(f.uncovered, f.sim);
    expect(f.uncovered.engagement).toBe(e); expect(e.surfaceAxis).toBeUndefined();
    expect(Math.abs(e.sealTarget)).toBe(0); expect(bodies(f)).toEqual(before);
  });

  it.each(([-1, 1] as const).flatMap(mirror => (['covered', 'uncovered'] as const)
    .map(arrival => ({ mirror, arrival }))))('retains a custom acquired frame when $arrival arrived first, mirror $mirror', ({ mirror, arrival }) => {
    const f = fixture('wz_weak', mirror), [first, second] = f.order(arrival), before = bodies(f);
    const axis = norm({ x: -.8, y: mirror * .6 }), seal = .27 * mirror;
    const e = f.sim.engage(first, f.defender, 'run', f.drive, { axis, sealTarget: seal })!;
    expect(e).not.toBeNull();
    const surface = e.surfaceAxis, hands = e.hands;
    second.behavior.update(second, f.sim);
    expect(second.engagement).toBe(e); expect(e.blocker).toBe(first);
    expect(e.surfaceAxis).toBe(surface); expect(e.surfaceAxis).toEqual(axis);
    expect(e.sealTarget).toBe(seal); expect(e.drive).toEqual(f.drive);
    expect(e.hands).toBe(hands); expect(f.sim.world.joints).toContain(hands);
    expect(e.helperHands!.get(second)!.a).toBe(second.body);
    expect(bodies(f)).toEqual(before);
  });
});
