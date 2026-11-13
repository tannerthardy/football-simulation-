// Sim twin of bdb26_rcv_flight.py: the targeted receiver through the ball's flight on deep targets (air yards 20+ at
// the landing, or route go / post). At the release: his speed, the nearest defender and that defender's speed; at
// mid-flight and at the arrival (the ball's end): his speed, how far he is off the line his release velocity pointed
// along, his distance to the landing point (true path at catch height), the nearest defender and its speed. By flight.
// usage: npx tsx scripts/diag/risk/rcv-flight.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
const near = (sim: any, T: any) => sim.defense.reduce((b: any, d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y) < Math.hypot(b.pos.x - T.pos.x, b.pos.y - T.pos.y) ? d : b);
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  if (this.ball.kind === 'air' && this.__rf === undefined) {
    this.__rf = null;
    const T = this.ball.target, rid = (T?.behavior as any)?.route?.id ?? (T?.behavior as any)?.fallback?.route?.id;
    const land = [...this.ballPath].find((s: any) => s.t > this.t && s.z < 2.2) ?? this.ballPath.at(-1);
    const dir = this.attackDir(this.offense[0].team);
    if (T && land && (((land.x - this.los) * dir >= 20) || ['go', 'post'].includes(rid))) {
      const d = near(this, T), v = { ...T.vel }, sp = Math.hypot(v.x, v.y) || 1;
      this.__rf = { T, land, t0: this.t, flight: land.t - this.t, x0: T.pos.x, y0: T.pos.y, ux: v.x / sp, uy: v.y / sp, s0: sp, sep0: Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y), ds0: Math.hypot(d.vel.x, d.vel.y), mid: null };
    }
  }
  const S = this.__rf;
  if (S && !S.done) {
    if (!S.mid && this.t - S.t0 >= S.flight / 2) S.mid = Math.hypot(S.T.vel.x, S.T.vel.y);
    if (this.ball.kind !== 'air' || this.t >= S.land.t) {
      S.done = true; const T = S.T, d = near(this, T), dx = T.pos.x - S.x0, dy = T.pos.y - S.y0;
      rows.push({ fl: S.flight, s0: S.s0, sm: S.mid, sA: Math.hypot(T.vel.x, T.vel.y), dev: Math.abs(dx * S.uy - dy * S.ux), land: Math.hypot(T.pos.x - S.land.x, T.pos.y - S.land.y),
        sep0: S.sep0, sepA: Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y), ds0: S.ds0, dsA: Math.hypot(d.vel.x, d.vel.y), caught: this.ball.kind === 'held' && this.ball.carrier === T });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== sim seed ${seed} deep targets (20+ air yd or go / post): the targeted receiver through the flight, n ${rows.length}`);
for (const [a, b] of [[0, 1.5], [1.5, 2.0], [2.0, 2.5], [2.5, 9]]) {
  const V = rows.filter(r => r.fl >= a && r.fl < b);
  if (V.length) console.log(`   flight ${a}-${b < 9 ? b : '+'} s n ${String(V.length).padStart(4)} | rcv speed release ${q(V.map(r => r.s0))} -> mid ${q(V.map(r => r.sm))} -> arrival ${q(V.map(r => r.sA))} yd/s | off his release line ${q(V.map(r => r.dev))} yd | to the landing ${q(V.map(r => r.land))} | sep release ${q(V.map(r => r.sep0))} -> arrival ${q(V.map(r => r.sepA))} | nearest def speed ${q(V.map(r => r.ds0))} -> ${q(V.map(r => r.dsA))} | complete ${(100 * V.filter(r => r.caught).length / V.length).toFixed(0)}%`);
}
