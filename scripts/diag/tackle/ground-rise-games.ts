/** How often does automatic rising stand a downed holder up while he still
 * holds an upright carrier, in whole games? Counts, per game, the plays with a
 * tackle bond, holders down with a live grip on an upright carrier, and rises
 * while holding (with the carrier's further gain from the rise to the end of
 * the play). Observation only; flags from the environment.
 * node --import tsx scripts/diag/tackle/ground-rise-games.ts seed [seed...] [--stay-down-hook] [--out plays.json] [--trace]
 * --trace prints, per tick, every play in which a holder is down on an upright
 * carrier: his support state, the grip's held length against his reach (which
 * includes his stretched body only while he is off his feet), and the carrier.
 */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { GROUND_STRETCH } from '../../../src/physics/world.js';
const trace = process.argv.includes('--trace');
let game = 0;

if (process.argv.includes('--stay-down-hook')) await import('./stay-down-hook.js');
const argv = process.argv.slice(2), outAt = argv.indexOf('--out'), out = outAt >= 0 ? argv.splice(outAt, 2)[1] : null;
const seeds = argv.filter((a) => !a.startsWith('--')).map(Number);
const logs: object[] = [];
type Rise = { t: number; x: number; dir: number; carrierSpeed: number; holders: number };
let bondPlays = 0, downHolding = 0, plays = 0;
const rises: (Rise & { gain?: number })[] = [];
const prev = new WeakMap<object, string>();
const open = new WeakMap<PlaySim, Rise[]>();
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: PlaySim & Record<string, any>) {
  original.call(this);
  const b = this.bond;
  if (b && !this.__bond) { this.__bond = true; bondPlays++; }
  if (b) for (const d of b.tacklers) {
    const j = b.holds?.get(d), s = d.body.support?.state ?? '?', live = !!j && !j.broken && b.carrier.body.support?.state === 'up';
    const was = prev.get(d.body);
    if (live && s === 'down' && was !== 'down') downHolding++;
    if (live && s === 'rising' && was === 'down') {
      const c = b.carrier, r = { t: this.t, x: c.pos.x, dir: this.attackDir(c.team), carrierSpeed: Math.hypot(c.vel.x, c.vel.y), holders: b.tacklers.length };
      rises.push(r); (open.get(this) ?? open.set(this, []).get(this)!).push(r);
    }
    prev.set(d.body, s);
    if (trace && j && (this.__traced || (live && s === 'down'))) {
      this.__traced = true;
      const reach = s === 'up' ? j.reach : Math.max(j.reach, j.ground ?? j.reach + GROUND_STRETCH);
      const dist = Math.hypot(b.carrier.pos.x - d.pos.x, b.carrier.pos.y - d.pos.y);
      console.log(`  [game ${game} t ${this.t.toFixed(2)}] ${d.name ?? d.slot} ${s.padEnd(7)} hold ${(j.hold ?? NaN).toFixed(2)} dist ${dist.toFixed(2)} reach ${reach.toFixed(2)}${j.broken ? ' BROKEN' : ''} | carrier ${b.carrier.body.support?.state} ${Math.hypot(b.carrier.vel.x, b.carrier.vel.y).toFixed(2)} yd/s`);
    }
  }
  if (trace && this.__traced && !b && !this.__traceEnd) { this.__traceEnd = true; console.log(`  [game ${game} t ${this.t.toFixed(2)}] bond ended (${this.phase})`); }
  if (this.phase !== 'live' && !this.__done) {
    this.__done = true; plays++;
    for (const r of open.get(this) ?? []) (r as any).gain = ((this.endSpot?.x ?? r.x) - r.x) * r.dir;
  }
};
for (const seed of seeds) {
  game = seed;
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const g = simulateGame(home, away, { seed });
  logs.push({ seed, score: g.score, plays: g.log.map((p) => ({ quarter: p.quarter, clock: p.clock, offense: p.offense, kind: p.kind, text: p.text })) });
}
console.log(`games ${seeds.join(',')}: ${plays} plays, ${bondPlays} with a tackle bond, ${downHolding} holders down holding an upright carrier, ${rises.length} rose while holding`);
for (const r of rises) console.log(`  t ${r.t.toFixed(2)}: carrier ${r.carrierSpeed.toFixed(2)} yd/s, ${r.holders} holder(s), then gained ${(r as any).gain?.toFixed(2) ?? '?'} yd`);
if (out) writeFileSync(out, JSON.stringify({ seeds, games: logs, rises }, null, 1));
