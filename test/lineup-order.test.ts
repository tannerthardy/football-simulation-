import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, OFF_PERSONNEL, OL_SLOTS, type DefPersonnelId, type PersonnelId } from '../src/playbook/types.js';
import { derivePhysical } from '../src/players/physical.js';
import { DEFENSE_ACTOR_ORDER, OFFENSE_ACTOR_ORDER, orderedDefense, orderedOffense } from '../src/sim/lineup.js';
import { PlaySim } from '../src/sim/playsim.js';
import { lineupExperiment, lineupFixture, reordered } from './helpers/lineup-experiment.js';

describe('lineup input experiment identity', () => {
  for (const kind of ['run', 'pass'] as const) {
    it(`${kind}: identical, offense-reversed, defense-reversed and both-reversed mappings execute identically`, () => {
      const setup = lineupFixture(kind);
      Object.freeze(setup.offense);
      Object.freeze(setup.defense);
      const expected = lineupExperiment(setup);
      expect(expected.initial).toHaveLength(22);
      expect(expected.steps.length).toBeGreaterThan(20);
      expect(expected.steps.some(s => s.raw.some(r => r.actor.startsWith('O:RG:')))).toBe(true);
      expect(expected.events.length).toBeGreaterThan(0);
      expect(lineupExperiment(setup)).toEqual(expected);
      for (const [offense, defense] of [[true, false], [false, true], [true, true]]) {
        const actual = lineupExperiment(reordered(setup, offense, defense));
        expect(actual.initial, `O reversed=${offense}, D reversed=${defense}: initialization`).toEqual(expected.initial);
        expect(actual.steps.map(s => s.raw), 'raw controller requests').toEqual(expected.steps.map(s => s.raw));
        expect(actual.events, 'identity-keyed events').toEqual(expected.events);
        expect(actual.steps, 'unrounded native physical continuation').toEqual(expected.steps);
        expect(actual.rngNext, 'RNG continuation').toBe(expected.rngNext);
      }
    });
  }

  it('request observation leaves the ordinary native continuation and RNG unchanged', () => {
    const setup = lineupFixture('pass');
    const observed = lineupExperiment(setup), plain = lineupExperiment(setup, 2, false);
    const withoutRaw = (r: typeof observed) => ({ ...r, steps: r.steps.map(({ raw: _, ...step }) => step) });
    expect(withoutRaw(observed)).toEqual(withoutRaw(plain));
  });

  it('retains a real player substitution and its physical profile, including reordered inputs', () => {
    const setup = lineupFixture('run');
    const used = new Set(Object.values(setup.offense).map(p => p!.id));
    const replacement = generateTeam(new Rng(19), 'Offense', 'OFF').roster.find(p => p.position === 'OG' && !used.has(p.id))!;
    expect(replacement).toBeDefined();
    const changed = { ...setup, offense: { ...setup.offense, RG: replacement } };
    const ordinary = lineupExperiment(setup), actual = lineupExperiment(changed);
    const rg = actual.initial.find(a => a.actor.startsWith('O:RG:'))!;
    expect(rg.actor).toBe(`O:RG:${replacement.id}`);
    expect(rg.body.profile).toEqual(derivePhysical(replacement));
    expect(rg.body.profile).not.toEqual(ordinary.initial.find(a => a.actor.startsWith('O:RG:'))!.body.profile);
    expect(actual.steps.some(s => s.raw.some(r => r.actor === rg.actor))).toBe(true);
    expect(lineupExperiment(reordered(changed, true, true))).toEqual(actual);
  });

  it('covers the actual slot vocabulary and preserves picker order for every personnel package', () => {
    const offense = generateTeam(new Rng(19), 'Offense', 'OFF'), defense = generateTeam(new Rng(20), 'Defense', 'DEF');
    const offSlots = new Set(['QB', ...OL_SLOTS, ...Object.values(OFF_PERSONNEL).flatMap(Object.keys)]);
    const defSlots = new Set(Object.values(DEF_PERSONNEL).flatMap(Object.keys));
    expect([...OFFENSE_ACTOR_ORDER].sort()).toEqual([...offSlots].sort());
    expect([...DEFENSE_ACTOR_ORDER].sort()).toEqual([...defSlots].sort());
    for (const personnel of Object.keys(OFF_PERSONNEL) as PersonnelId[]) {
      const lineup = pickOffense(offense, personnel);
      const expected = Object.entries(lineup);
      expect(orderedOffense(lineup), personnel).toEqual(expected);
      expect(orderedOffense(Object.fromEntries([...expected].reverse())), personnel).toEqual(expected);
      // Same player objects, including the packages with an F and no Z.
      for (const [slot, player] of orderedOffense(lineup)) expect(player).toBe(lineup[slot]);
    }
    for (const personnel of Object.keys(DEF_PERSONNEL) as DefPersonnelId[]) {
      const lineup = pickDefense(defense, personnel);
      const expected = Object.entries(lineup);
      expect(orderedDefense(lineup), personnel).toEqual(expected);
      expect(orderedDefense(Object.fromEntries([...expected].reverse())), personnel).toEqual(expected);
      for (const [slot, player] of orderedDefense(lineup)) expect(player).toBe(lineup[slot]);
    }
  });

  it('treats undefined optional seats as absent without mutating the supplied records', () => {
    const setup = lineupFixture('pass');
    const defense = Object.freeze({ ...setup.defense, NT: undefined, DB: undefined });
    expect(orderedDefense(defense)).toEqual(orderedDefense(setup.defense));
    const sim = new PlaySim({ ...setup, defense });
    expect(sim.agents).toHaveLength(22);
    expect(sim.slot('NT')).toBeUndefined();
    expect(sim.slot('DB')).toBeUndefined();
    expect(sim.defense.map(a => [a.slot, a.player])).toEqual(orderedDefense(setup.defense));
    expect(Object.hasOwn(defense, 'NT')).toBe(true);
  });

  it('does not normalize a genuine call change into the original play', () => {
    const setup = lineupFixture('run');
    const run = new PlaySim(setup), pass = new PlaySim({ ...lineupFixture('pass'), offense: setup.offense,
      offCall: { ...lineupFixture('pass').offCall, formation: FORMATIONS.find(f => f.id === 'ace_12')! } });
    expect(run.isPass).toBe(false);
    expect(pass.isPass).toBe(true);
    expect(pass.slot('RG')!.behavior.kind).not.toBe(run.slot('RG')!.behavior.kind);
  });

  it('rejects unknown identities or an unalignable supplied player instead of silently dropping him', () => {
    const setup = lineupFixture('pass');
    expect(() => new PlaySim({ ...setup, offense: { ...setup.offense, TE2: setup.offense.Y } } as never))
      .toThrow('Unsupported offense lineup slot: TE2');
    expect(() => new PlaySim({ ...setup, defense: { ...setup.defense, EXTRA_CB: setup.defense.NB } } as never))
      .toThrow('Unsupported defense lineup slot: EXTRA_CB');
    expect(() => new PlaySim({ ...setup, offense: { ...setup.offense, F: setup.offense.Y } }))
      .toThrow('Offense lineup slot F has no alignment');
  });
});
