/** After first contact on a run: do the next defenders to arrive attempt, and
 * what does it cost the runner? Observation only; flags from the environment.
 *
 * Designed runs (a handoff). From the first carrier contact (the
 * `carrier_contact` event: a body collision or a grasp) for 1.0 s:
 *   the runner's speed 0.2 s before and 0.3 / 0.6 / 1.0 s after;
 *   every defender other than the first contact who comes within 1.5 yd
 *   (an arrival): when, whether he then attempts (a tackle_wrap or a
 *   missed_tackle by him while still near), and if not, his state on each
 *   tick near: engaged in a block, recoiling (`nextTackleAt`), on the ground,
 *   out of reach (beyond his standing reach + 0.45 yd lunge),
 *   or within reach with no attempt (the tackle-opportunity gate);
 *   the largest number of holders on the runner, and the yards gained after.
 *
 *   node --import tsx scripts/diag/g1/crowd.ts [--games 12] [--seed 7] [--out out/g1/crowd.jsonl]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const GAMES = Number(arg('games', '12'));
const SEED = Number(arg('seed', '7'));
const OUT = arg('out', 'out/g1/crowd.jsonl');
const group = (slot: string) => /^(DE|DT|NT)/.test(slot) ? 'DL' : /^LB/.test(slot) ? 'LB' : 'DB';

interface Arrival {
  g: string; at: number; attempt: string | null;
  /** Ticks near (within 1.5 yd) without an attempt, by state. */
  states: Record<string, number>;
  /** Closest approach while near, minus his standing reach. */
  slack: number;
}
interface Out {
  game: number; t0: number; before: number; after: Array<number | null>; gain: number;
  first: string; arrivals: Arrival[]; maxHolders: number; holders: number[];
  /** Every other tick, per holder: [origin, carrier heading toward him (+1 in front), grip 0-1, grip capacity N,
   * grip force used N, slipping, braking force on the runner along his travel N, holder's requested and achieved
   * speed along the runner's travel / the runner's speed, holders on him, runner mass kg]. */
  holds: Array<[string, number, number, number, number, number, number, number, number, number, number]>;
  /** Every other tick while held and moving: [runner speed, total grip braking along his travel N, his ground
   * force along his travel N (from the step's ground impulse), mass kg, holders]. */
  runner: Array<[number, number, number, number, number]>;
}
const rows: Out[] = [];

function observe(sim: PlaySim, game: number): void {
  if (sim.isPass) return;
  const tick = sim.tick.bind(sim);
  let seen = 0, t0: number | null = null, carrier: Agent | null = null, first: Agent | null = null;
  let row: Out | null = null;
  const speeds: Array<[number, number]> = [];
  const near = new Map<Agent, Arrival>();
  sim.tick = () => {
    tick();
    const c = sim.carrier;
    if (c && sim.ball.kind === 'held' && c.team !== 'D') speeds.push([sim.t, c.speed]);
    for (; seen < sim.events.length; seen++) {
      const ev = sim.events[seen];
      if (ev.type === 'carrier_contact' && t0 === null && sim.events.some((e) => e.type === 'handoff') && c && c !== sim.qb) {
        t0 = ev.t; carrier = c; first = ev.b !== undefined ? sim.agents[ev.b] : null;
        const before = speeds.filter(([t]) => t <= t0! - 0.2).at(-1)?.[1] ?? c.speed;
        row = { game, t0: +t0.toFixed(2), before: +before.toFixed(2), after: [null, null, null], gain: 0,
          first: first ? group(first.slot) : '-', arrivals: [], maxHolders: 0, holders: [], holds: [], runner: [] };
      }
      if (row && t0 !== null && ev.t <= t0 + 1.0 && (ev.type === 'tackle_wrap' || ev.type === 'missed_tackle') && ev.a !== undefined) {
        const r = near.get(sim.agents[ev.a]);
        if (r && r.attempt === null) r.attempt = ev.type === 'tackle_wrap' ? 'wrap' : 'whiff';
      }
    }
    if (!row || t0 === null || !carrier) return;
    const dt = sim.t - t0;
    if (dt > 1.0 + 1e-9) return;
    if (sim.carrier === carrier) {
      const n = sim.bond?.carrier === carrier ? sim.bond.tacklers.length : 0;
      row.maxHolders = Math.max(row.maxHolders, n);
      if (Math.round(dt * 20) % 2 === 0) {
        row.holders.push(n);
        const cs = carrier.speed, ux = cs > .5 ? carrier.vel.x / cs : 0, uy = cs > .5 ? carrier.vel.y / cs : 0;
        const r2 = (v: number) => +v.toFixed(2);
        let total = 0;
        for (const d of sim.bond?.carrier === carrier ? sim.bond.tacklers : []) {
          const j = sim.bond!.holds?.get(d);
          if (!j || cs <= .5) continue;
          const tx = (carrier.pos.x - d.pos.x), ty = (carrier.pos.y - d.pos.y), dd = Math.hypot(tx, ty) || 1;
          const into = -(carrier.vel.x * tx + carrier.vel.y * ty) / (cs * dd);
          const nF = j.normalForceOnB ?? { x: 0, y: 0 }, tF = j.tangentForceOnB ?? { x: 0, y: 0 };
          const brake = -((nF.x + tF.x) * ux + (nF.y + tF.y) * uy);
          total += brake;
          const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
          row.holds.push([j.origin ?? '', r2(into), r2(sim.bond!.grip?.get(d) ?? 0), Math.round(j.capacity), Math.round(j.force ?? 0),
            j.slipping ? 1 : 0, Math.round(brake), r2((iv.x * ux + iv.y * uy) / cs), r2((d.vel.x * ux + d.vel.y * uy) / cs), n,
            Math.round(carrier.profile.massKg)]);
        }
        const gi = (sim.lastStep as unknown as { groundImpulse?: Array<{ x: number; y: number }> } | null)?.groundImpulse?.[carrier.idx];
        if (n > 0 && cs > .5 && gi) row.runner.push([r2(cs), Math.round(total), Math.round((gi.x * ux + gi.y * uy) / sim.dt), Math.round(carrier.profile.massKg), n]);
      }
      for (const [k, at] of [[0, .3], [1, .6], [2, 1.0]] as Array<[number, number]>) {
        if (row.after[k] === null && dt >= at - 1e-9) row.after[k] = +carrier.speed.toFixed(2);
      }
    }
    for (const d of sim.opponents(carrier)) {
      if (d === first) continue;
      const dist = Math.hypot(carrier.pos.x - d.pos.x, carrier.pos.y - d.pos.y);
      if (dist > 1.5) continue;
      let r = near.get(d);
      if (!r) { r = { g: group(d.slot), at: +dt.toFixed(2), attempt: null, states: {}, slack: Infinity }; near.set(d, r); row.arrivals.push(r); }
      const reach = carrier.profile.radius + d.profile.radius + d.profile.reach;
      r.slack = Math.min(r.slack, +(dist - reach).toFixed(2));
      if (r.attempt !== null) continue;
      // Already holding: he wrapped on the tick he arrived (events are read before arrivals).
      if (sim.bond?.tacklers.includes(d)) { r.attempt = 'wrap'; continue; }
      const state = d.isDown(sim.t) ? 'down'
        : d.engagement ? 'blocked'
        : sim.t < d.nextTackleAt ? 'recoiling'
        : dist > reach + 0.45 ? 'out of reach'
        : 'in reach, no attempt';
      r.states[state] = (r.states[state] ?? 0) + 1;
    }
  };
  const run = sim.run.bind(sim);
  sim.run = () => {
    const res = run();
    if (row && carrier && t0 !== null) {
      const x0 = sim.firstContactX ?? carrier.pos.x;
      row.gain = +((carrier.pos.x - x0) * sim.attackDir(carrier.team)).toFixed(1);
      rows.push(row);
    }
    return res;
  };
}

const rng = new Rng(SEED);
for (let g = 0; g < GAMES; g++) {
  const home = generateTeam(rng.fork(`h${g}`), 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng.fork(`a${g}`), 'Away', 'AWY', { strength: 0.55 });
  simulateGame(home, away, { seed: rng.nextU32(), hooks: { playResult: (sim) => { observe(sim, g); return undefined; } } });
  process.stderr.write(`game ${g + 1}/${GAMES}: ${rows.length} contacts\n`);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
process.stderr.write(`${rows.length} runs with a first contact -> ${OUT}\n`);
