import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, readCombination, type Combination, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { helperSupport } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
function fixture(kind: RunBlockKind = 'drive') {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'combination' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const owner = sim.slot('C')!, partner = sim.slot('LG')!, defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  for (const a of sim.agents) a.body.pos = { x: 75 + a.idx * 3, y: 10 };
  owner.body.pos = { x: 40, y: CENTER_Y - .25 };
  partner.body.pos = { x: 40, y: CENTER_Y + .25 };
  defender.body.pos = { x: 40.8, y: CENTER_Y };
  backer.body.pos = { x: 43, y: CENTER_Y + .5 };
  const combination: Combination = { members: [owner, partner], defender, backer, released: false, secureSince: -1, nextRead: 0 };
  owner.behavior = new RunBlocker({ kind, target: defender, drive: { x: 1, y: 0 }, combination });
  partner.behavior = new RunBlocker({ kind: 'combo', target: defender, drive: { x: 1, y: 0 }, combination });
  sim.t = 1;
  const observe = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents); };
  observe();
  return { sim, owner, partner, defender, backer, combination, observe };
}

describe('shared combination ownership before either member climbs', () => {
  it.each(['drive', 'reach', 'down'] as const)('lets the %s owner join when his helper lands first', (kind) => {
    const { sim, owner, partner, defender, combination } = fixture(kind);
    const e = sim.engage(partner, defender, 'run', { x: 1, y: 0 })!;
    owner.behavior.update(owner, sim);
    expect(owner.engagement).toBe(e);
    expect(e.helpers).toEqual([owner]);
    expect((owner.behavior as RunBlocker).target).toBe(defender);
    expect(combination.released).toBe(false);
    expect(sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it('lets the helper join when the covered owner lands first', () => {
    const { sim, owner, partner, defender, combination } = fixture();
    const e = sim.engage(owner, defender, 'run', { x: 1, y: 0 })!;
    partner.behavior.update(partner, sim);
    expect(partner.engagement).toBe(e);
    expect(e.helpers).toEqual([partner]);
    expect(combination.released).toBe(false);
  });

  it('keeps responsibility when the partner lands first but cannot join remotely', () => {
    const { sim, owner, partner, defender, combination, observe } = fixture();
    const e = sim.engage(partner, defender, 'run', { x: 1, y: 0 })!;
    owner.body.pos.x = 37;
    observe();
    const command = owner.behavior.update(owner, sim);
    expect((owner.behavior as RunBlocker).target).toBe(defender);
    expect(owner.engagement).toBeNull();
    expect(e.helpers).toEqual([]);
    expect(command.vel.x).toBeGreaterThan(0);
    expect(combination.released).toBe(false);
  });

  it.each(['owner', 'helper'] as const)('does not treat an outsider block as the %s combination', (member) => {
    const { sim, owner, partner, defender, observe } = fixture();
    const outsider = sim.slot('RG')!;
    outsider.body.pos = { x: 40, y: CENTER_Y };
    const e = sim.engage(outsider, defender, 'run', { x: 1, y: 0 })!;
    observe();
    const a = member === 'owner' ? owner : partner;
    a.behavior.update(a, sim);
    expect(a.engagement).toBeNull();
    expect((a.behavior as RunBlocker).target).not.toBe(defender);
    expect(e.helpers).toEqual([]);
  });

  it('does not restore a responsibility after its combination has released', () => {
    const { sim, owner, partner, defender, combination } = fixture();
    const e = sim.engage(partner, defender, 'run', { x: 1, y: 0 })!;
    combination.released = true;
    owner.behavior.update(owner, sim);
    expect(owner.engagement).toBeNull();
    expect((owner.behavior as RunBlocker).target).not.toBe(defender);
    expect(e.helpers).toEqual([]);
  });

  it('does not use stale combination membership to join an unrelated defender', () => {
    const { sim, owner, partner, combination, observe } = fixture();
    const other = sim.slot('DT_S')!;
    other.body.pos = { x: 40.8, y: CENTER_Y };
    const e = sim.engage(partner, other, 'run', { x: 1, y: 0 })!;
    (owner.behavior as RunBlocker).plan.target = other;
    observe();
    owner.behavior.update(owner, sim);
    expect(combination.defender).not.toBe(other);
    expect(owner.engagement).not.toBe(e);
    expect((owner.behavior as RunBlocker).target).not.toBe(other);
    expect(e.helpers).toEqual([]);
  });

  it('releases through actual shared contact, secure control and the existing backer read', () => {
    const { sim, owner, partner, defender, backer, combination, observe } = fixture();
    const e = sim.engage(partner, defender, 'run', { x: 1, y: 0 })!;
    owner.behavior.update(owner, sim);
    e.control = .8; e.baseB = .9; e.phi = 0;
    // Immediately adding the second man is not an earned double-team release.
    sim.t = 1.05;
    readCombination(owner, sim, combination);
    expect(helperSupport(sim, e, owner)).toBeLessThan(.4);
    expect(combination.released).toBe(false);
    sim.t = 1.2; observe();
    readCombination(owner, sim, combination);
    // The observer already began his own credible-contact confirmation;
    // an earlier partner/global schedule does not restart that dwell.
    expect(combination.reads?.[combination.members.indexOf(owner)].secureSince).toBeCloseTo(1.05);
    expect(combination.released).toBe(false);
    sim.t = 1.2 + owner.mind.decisionInterval + .16; observe();
    readCombination(owner, sim, combination);
    expect(combination.released).toBe(true);
    expect(sim.events.filter(e => e.type === 'block_climb')).toHaveLength(1);
    const climber = [owner, partner].find(a => a.engagement === null)!;
    expect((climber.behavior as RunBlocker).target).toBe(backer);
    expect([owner, partner].filter(a => a.engagement === e)).toHaveLength(1);
    expect(e.defender).toBe(defender);
  });

  it('reads the release from pictures and own contact, not the keeper\'s private hand-fight state', () => {
    const release = (control: number) => {
      const { sim, owner, partner, defender, combination, observe } = fixture();
      const e = sim.engage(partner, defender, 'run', { x: 1, y: 0 })!;
      owner.behavior.update(owner, sim);
      e.control = control; e.baseB = .9; e.phi = 0;
      const steps: boolean[] = [];
      for (const t of [1.05, 1.2, 1.2 + owner.mind.decisionInterval + .16]) {
        sim.t = t; observe();
        readCombination(owner, sim, combination);
        steps.push(combination.released);
      }
      return { steps, events: sim.events.map(x => x.type), keeper: [owner, partner].find(a => a.engagement === e)?.slot };
    };
    // Same bodies, contact and pictures; only the hidden hand standing differs.
    expect(release(-.9)).toEqual(release(.8));
    expect(release(-.9).steps.at(-1)).toBe(true);
  });
});
