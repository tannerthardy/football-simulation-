/** Result-boundary fixtures from the accepted four-game archive. No tick,
 * World, roster generation or resimulation: restore saved actors/result state. */
import { readFileSync } from 'node:fs';
import { Game, type PlayLog } from '../../src/game/game.js';
import { BoxScore } from '../../src/game/stats.js';
import type { Team } from '../../src/league/team.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayEvent, PlayResult } from '../../src/sim/types.js';

interface SavedCase {
  id: string;
  context: { yardline: number; possession: 'home' | 'away' };
  players: Array<{ idx: number; id: string; slot: string; team: 'O' | 'D' }>;
  log: PlayLog;
  events: PlayEvent[];
}
export const saved = JSON.parse(readFileSync(new URL('../fixtures/saved-game-result-accounting.json', import.meta.url), 'utf8')) as {
  cases: Record<string, SavedCase>; pressureIds: string[]; endZoneCatchIds: string[];
};
const inputs = JSON.parse(readFileSync(new URL('../../data/reviews/current/accepted-controller-game-inputs.json', import.meta.url), 'utf8')) as {
  fixtures: Array<{ teams: { home: Team; away: Team } }>;
};

export function restore(id: string) {
  const c = structuredClone(saved.cases[id]);
  const teams = inputs.fixtures[Number(id[1]) - 1].teams;
  const off = teams[c.context.possession], def = teams[c.context.possession === 'home' ? 'away' : 'home'];
  const agents = c.players.map(a => {
    const player = (a.team === 'O' ? off : def).roster.find(p => p.id === a.id);
    if (!player) throw new Error('Saved actor missing from frozen roster: ' + a.id);
    return { idx: a.idx, team: a.team, slot: a.slot, player, pos: { x: 0, y: 26.67 }, missedTackles: 0 } as Agent;
  });
  const last = c.log.segments!.at(-1)!;
  const carrier = agents.find(a => a.player.id === last.carrier)!;
  carrier.pos.x = last.endX;
  const qb = agents.find(a => a.slot === 'QB')!;
  const sim: PlaySim = Object.assign(Object.create(PlaySim.prototype), {
    agents, bySlot: new Map(agents.map(a => [a.slot, a])),
    ball: { kind: 'held', carrier }, possession: last.team,
    los: 10 + c.context.yardline, ballY: 26.67,
    isPass: c.log.kind === 'pass', scrambled: c.log.stats!.scramble,
    throwAt: c.events.find(e => e.type === 'throw' || e.type === 'throwaway')?.t ?? -1,
    catchAt: c.events.find(e => e.type === 'catch')?.t ?? -1,
    catchX: c.log.segments?.find(s => s.how === 'catch')?.startX ?? 0,
    stats: structuredClone(c.log.stats), segments: structuredClone(c.log.segments),
    events: structuredClone(c.events), t: c.log.duration, phase: 'live',
    outcome: undefined, scoreKind: null, endSpot: undefined,
    firstContactX: null, record: false, trace: { data: undefined },
  });
  // Restoring the result method cannot accidentally invoke the physical world.
  sim.tick = () => { throw new Error('Saved accounting checks must not tick'); };
  const result: PlayResult = {
    outcome: c.log.outcome!, kind: c.log.kind as 'run' | 'pass', possession: last.team,
    turnover: last.team === 'D', endX: last.endX, endY: 26.67,
    yards: last.team === 'D' ? 0 : c.log.yards, offenseYards: c.log.yards,
    segments: structuredClone(c.log.segments!), duration: c.log.duration!,
    score: c.log.outcome === 'touchdown' ? { team: last.team, kind: 'TD' }
      : c.log.outcome === 'safety' ? { team: 'D', kind: 'safety' } : null,
    clockStops: ['touchdown', 'safety', 'oob', 'incomplete', 'touchback'].includes(c.log.outcome!) || last.team === 'D',
    stats: structuredClone(c.log.stats!), events: structuredClone(c.events),
  };
  const box = new BoxScore();
  const game: Game = Object.assign(Object.create(Game.prototype), { box });
  const record = (r = result) => {
    Reflect.get(Game.prototype, 'recordStats').call(game, sim, r, off, def);
    return box;
  };
  return { c, sim, qb, carrier, agents, off, def, result, game, record };
}
