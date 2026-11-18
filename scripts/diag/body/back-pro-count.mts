/** Protecting backs deeper than the QB at 2.5 s and moving away from the line, over N games (Integration, 2026-11-18). A back in protection = a 'pass-pro' agent in the backfield (not a lineman); the
 * play is a dropback still in the pocket (no throw yet) at t = 2.5 s. Per such back: depth below/above the QB, velocity away from the line, whether a rusher is assigned, that rusher's depth against the QB's.
 *   node --import tsx scripts/diag/body/back-pro-count.mts [--seed 101] [--games 8] [--out out/backpro/g.json]. Read-only. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8')), out = arg('--out', 'out/backpro/g.json');
mkdirSync(dirname(out), { recursive: true });
const r1 = (v: number) => Math.round(v * 10) / 10;
const rows: any[] = [];
const seen = new WeakSet<object>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live' || seen.has(this) || this.t < 2.5 - 1e-6) return;
  seen.add(this);
  if (this.offCall.kind !== 'pass' || this.throwAt >= 0 || this.carrier !== this.qb) return;
  const dir = this.attackDir('O'), rel = (a: any) => (a.pos.x - this.los) * dir;
  for (const a of this.agents) {
    if (a.team !== 'O' || a.behavior?.kind !== 'pass-pro' || !this.offAlign.spots[a.slot]?.backfield) continue;
    const r = a.behavior.recordedTarget?.(a); const rush = r !== null && r !== undefined ? this.agents[r] : null;
    rows.push({ slot: a.slot, concept: this.offCall.label, cov: this.defCall.label, depth: r1(rel(a)), qb: r1(rel(this.qb)), v: r1(a.vel.x * dir), vy: r1(a.vel.y), engaged: !!a.engagement,
      rusher: rush ? rush.slot : null, rusherDepth: rush ? r1(rel(rush)) : null, rusherSpeed: rush ? r1(rush.vel.x * dir) : null, toRusher: rush ? r1(Math.hypot(rush.pos.x - a.pos.x, rush.pos.y - a.pos.y)) : null });
  }
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let plays = 0;
for (let g = 0; g < games; g++) { simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false, handContact: 'center' } as never); console.error(`game ${g + 1}/${games}`); }
writeFileSync(out, JSON.stringify(rows)); console.error(`${rows.length} protecting-back samples -> ${out}`);
