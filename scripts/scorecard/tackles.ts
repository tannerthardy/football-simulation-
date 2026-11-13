/** Native-event version of #205/TKL-1's per-defender failed opportunity.
 * Post-process captured events outside the simulation timer; no frames or RNG draws.
 */
import type { GameHooks } from '../../src/game/game.js';
import type { PlayEvent, PlayStats } from '../../src/sim/types.js';

interface Player { team: 'O' | 'D'; id: string }
interface Capture { events: readonly PlayEvent[]; players: readonly Player[] }

/** One failure per defender in the first offensive carry: a whiff or lost grip,
 * unless he is credited among the final tacklers. Pocket attempts and returns
 * are excluded. This counts opportunities per play, not raw events or PFF misses.
 */
export function failedTackleOpportunities({ events, players }: Capture, stats: Pick<PlayStats, 'tacklers'>): number | undefined {
  const start = events.findIndex((e) => ['handoff', 'catch', 'pitch_catch', 'scramble'].includes(e.type));
  if (start < 0) return 0;
  const event = events[start];
  const carrier = event.type === 'handoff' ? event.b : event.a;
  if (carrier === undefined || players[carrier]?.team !== 'O') return undefined;
  const failed = new Set<number>();
  for (const e of events.slice(start + 1)) {
    if (e.type !== 'missed_tackle' && e.type !== 'broken_tackle') continue;
    const target = e.type === 'missed_tackle' ? e.b : e.a;
    if (target === undefined) return undefined;
    if (target !== carrier) continue;
    const defender = e.type === 'missed_tackle' ? e.a : e.b;
    if (defender === undefined || players[defender]?.team !== 'D') return undefined;
    failed.add(defender);
  }
  const finishers = new Set(stats.tacklers);
  return [...failed].filter((d) => !finishers.has(players[d].id)).length;
}

/** The existing observation seam retains only an event ledger and identity map.
 * Counting happens when gameRecord reads official plays, after the timer stops.
 */
export function captureTackleOpportunities(): {
  hooks: GameHooks;
  count: (stats: PlayStats) => number | undefined;
} {
  const captures = new WeakMap<PlayStats, Capture>();
  return {
    hooks: {
      playResult(sim, kind) {
        if (kind !== 'scrimmage') return undefined;
        const run = sim.run.bind(sim);
        sim.run = () => {
          const result = run();
          captures.set(result.stats, {
            events: result.events,
            players: sim.agents.map((a) => ({ team: a.team, id: a.player.id })),
          });
          return result;
        };
        return undefined;
      },
    },
    count(stats) {
      const capture = captures.get(stats);
      return capture ? failedTackleOpportunities(capture, stats) : undefined;
    },
  };
}
