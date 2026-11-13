import { describe, expect, it } from 'vitest';
import { CENTER_Y, OPP_GOAL_X } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { fastRefillRate, Game, RESERVE_SHARE } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import type { Player } from '../src/players/types.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PlayResult } from '../src/sim/types.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
const duration = 5;

/** Script results only; no live snap is run by these bookkeeping tests. */
function scripted(sim: PlaySim, touchdown = false): PlayResult {
  return {
    outcome: touchdown ? 'touchdown' : 'incomplete', possession: 'O', turnover: false,
    endX: touchdown ? OPP_GOAL_X + 1 : sim.los, endY: CENTER_Y,
    yards: touchdown ? OPP_GOAL_X - sim.los : 0,
    offenseYards: touchdown ? OPP_GOAL_X - sim.los : 0,
    segments: [], score: touchdown ? { team: 'O', kind: 'TD' } : null,
    duration, clockStops: true, kind: touchdown ? 'run' : 'pass', events: [],
    stats: { tacklers: [], completed: false, attempted: !touchdown, sacked: false,
      scramble: false, throwaway: false, pressured: false, brokenTackles: 0,
      missedTackles: 0, dropped: false },
  };
}

function persistentEnergy(game: Game): Map<string, number> {
  return (game as unknown as { energy: Map<string, number> }).energy;
}

function persistentReserve(game: Game): Map<string, number> {
  return (game as unknown as { reserve: Map<string, number> }).reserve;
}

/** The fast pool after the snap: the reserve loses its share of what the
 * play spent, and only the rest after the play refills toward it. */
function recovered(p: Participant, rest: number): number {
  const reserve = p.reserve - RESERVE_SHARE * Math.max(0, p.before - p.energy);
  return p.energy + (reserve - p.energy) * (1 - Math.exp(-rest * fastRefillRate(p.player)));
}

interface Participant { player: Player; energy: number; before: number; reserve: number }

describe('completed-snap energy persistence', () => {
  it.each([true, false])('saves both teams after a two-point try (successful: %s)', (good) => {
    const kinds: string[] = [];
    const participants: Participant[] = [];
    const appeared = new Set<string>();
    const game = new Game(home, away, { seed: 5, hooks: {
      preSnapFoul: () => null,
      tryChoice: () => 'two',
      playResult: (sim, kind) => {
        kinds.push(kind);
        for (const [index, agent] of sim.agents.entries()) {
          appeared.add(agent.player.id);
          const before = persistentEnergy(game).get(agent.player.id)!, reserve = persistentReserve(game).get(agent.player.id)!;
          agent.body.energy = kind === 'two-point' ? .35 + .007 * index : .75;
          if (kind === 'two-point') participants.push({ player: agent.player, energy: agent.body.energy, before, reserve });
        }
        return scripted(sim, kind === 'scrimmage' || good);
      },
    } });
    // Second-possession OT: either try result ends the game, avoiding a kickoff.
    game.setState({ quarter: 5, clock: 500, possession: 'away', yardline: 95,
      down: 1, distance: 5, score: { home: 7, away: 0 }, otPossessions: 2,
      otFirst: 'home' });
    game.step();

    expect(kinds).toEqual(['scrimmage', 'two-point']);
    expect(game.state.score).toEqual({ home: 7, away: good ? 8 : 6 });
    expect(game.state.over).toBe(true);
    expect(game.result().log.filter(play => play.kind === 'two')).toHaveLength(1);
    expect(participants).toHaveLength(22);
    for (const p of participants) {
      // Keep the existing TD recovery interval; this correction adds no rest.
      expect(persistentEnergy(game).get(p.player.id)).toBeCloseTo(recovered(p, 60), 12);
    }
    const bench = home.roster.find(player => !appeared.has(player.id))!;
    // A player outside both snaps retains full energy.
    expect(persistentEnergy(game).get(bench.id)).toBe(1);
  });

  it('preserves ordinary-scrimmage writeback and recovery', () => {
    const participants: Participant[] = [];
    const kinds: string[] = [];
    const game = new Game(home, away, { seed: 5, hooks: {
      preSnapFoul: () => null,
      playResult: (sim, kind) => {
        kinds.push(kind);
        for (const [index, agent] of sim.agents.entries()) {
          const before = persistentEnergy(game).get(agent.player.id)!, reserve = persistentReserve(game).get(agent.player.id)!;
          agent.body.energy = .35 + .007 * index;
          participants.push({ player: agent.player, energy: agent.body.energy, before, reserve });
        }
        return scripted(sim);
      },
    } });
    game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 50,
      down: 1, distance: 10, score: { home: 0, away: 0 } });
    game.step();

    expect(kinds).toEqual(['scrimmage']);
    expect(participants).toHaveLength(22);
    for (const p of participants) {
      // An incompletion has zero clock runoff, but players still get the
      // ordinary 30 seconds between snaps.
      expect(persistentEnergy(game).get(p.player.id)).toBeCloseTo(recovered(p, 30), 12);
    }
  });
});
