/**
 * Mechanism probes: measures that need more than the compact play record,
 * shown beside the game statistics so mechanism evidence and outcome
 * evidence are read together.
 *
 * A probe reads each GameResult once in the worker and returns sums keyed by
 * name. Its metrics then use `probe: { num, den }` like any other metric, so
 * they get splits-free totals, intervals and comparisons for free.
 *
 * To add one: write a Probe, add it to PROBES, and list its metrics.
 */
import type { GameHooks, GameResult } from '../../src/game/game.js';
import type { Metric } from './metrics.js';
import type { GameRec } from './records.js';
import { weirdProbe } from './weird/probe.js';

export interface Probe {
  id: string;
  /** Record replay frames for every play (slow; only when the probe needs positions). */
  needsReplay?: boolean;
  collect: (res: GameResult) => Record<string, number>;
  /**
   * Watch each game as it is played, for rules that need more than the finished
   * log (facing, engagement, the pre-snap phase). Returns hooks to run with the
   * game and a `finish` that turns what they saw into sums (and may add to the
   * record). It must only read: games stay identical with it on.
   */
  observe?: (ctx: { idPrefix: string; game: number }) => {
    hooks: GameHooks;
    finish: (res: GameResult, rec: GameRec) => Record<string, number>;
  };
  metrics: Metric[];
}

const GROUPS: Array<[RegExp, string]> = [
  [/-(DE|DT|NT|DL)\d+$/, 'dl'],
  [/-(LB|MLB|OLB|ILB)\d+$/, 'lb'],
  [/-(CB|NB)\d+$/, 'cb'],
  [/-(S|FS|SS)\d+$/, 's'],
];

/** Who misses tackles: tells a pursuit/angle failure in the secondary from one in the box. */
const missedBy: Probe = {
  id: 'missedBy',
  collect(res) {
    const out: Record<string, number> = { plays: 0, dl: 0, lb: 0, cb: 0, s: 0 };
    for (const p of res.log) {
      if ((p.kind !== 'run' && p.kind !== 'pass') || p.nullified || !p.stats) continue;
      out.plays++;
      for (const [id, n] of Object.entries(p.stats.missedTacklesBy ?? {})) {
        if (!n) continue;
        const g = GROUPS.find(([re]) => re.test(id));
        if (g) out[g[1]] += n;
      }
    }
    return out;
  },
  metrics: [
    { id: 'missedBy.dl', label: 'Missed tackles by DL / play', probe: { num: 'missedBy.dl', den: 'missedBy.plays' } },
    { id: 'missedBy.lb', label: 'Missed tackles by LB / play', probe: { num: 'missedBy.lb', den: 'missedBy.plays' } },
    { id: 'missedBy.cb', label: 'Missed tackles by CB / play', probe: { num: 'missedBy.cb', den: 'missedBy.plays' } },
    { id: 'missedBy.s', label: 'Missed tackles by S / play', probe: { num: 'missedBy.s', den: 'missedBy.plays' } },
  ],
};

export const PROBES: Probe[] = [missedBy, weirdProbe];
