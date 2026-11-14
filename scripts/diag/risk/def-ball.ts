// BALL_EST bit 128 witness (defense first): every targeted pass (not screens, not throwaways). At the arrival (the ball's
// closest pass to the target) the nearest defender: his own estimate's catch point (catchSpot on ballEstimates.peek)
// against the catch point on the true flight (the measurement's), or none; by flight time and man / zone. His first
// move toward the true catch spot after the release (velocity within 45 deg of it at 2+ yd/s), his closing on the
// target over the flight. Outcomes by openness at the arrival (nearest defender within 1 / 2 / 3 / 3+ yd): complete,
// INT, PBU (a 'pbu' event by a defender). Receiver control: completion when open (3+ yd).
//   BALL_EST=0|129|161 npx tsx scripts/diag/risk/def-ball.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 16);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__db && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target;
    this.__db = { T, rel: this.t, best: Infinity, tArr: this.t, man: !!this.defCall?.coverage?.man, d0: new Map(), first: new Map(), arr: null as any };
    for (const d of this.defense) this.__db.d0.set(d, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
  }
  const S = this.__db;
  if (S && this.ball.kind === 'air') {
    const T = S.T, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    const truth = catchSpot(T, this);
    for (const d of this.defense) {
      if (S.first.has(d) || !truth) continue;
      const sp = Math.hypot(d.vel.x, d.vel.y), tx = truth.p.x - d.pos.x, ty = truth.p.y - d.pos.y, n = Math.hypot(tx, ty) || 1;
      if (sp > 2 && (d.vel.x * tx + d.vel.y * ty) / (sp * n) > Math.SQRT1_2) S.first.set(d, this.t - S.rel);
    }
    if (dh < S.best) {
      S.best = dh; S.tArr = this.t;
      let D: any = null, nd = Infinity;
      for (const d of this.defense) { const x = Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y); if (x < nd) { nd = x; D = d; } }
      const est = this.ballEstimates?.peek ? this.ballEstimates.peek(D, this) : [];
      const own = est.length ? catchSpot(D, { t: this.t, ballPath: est }) : null, real = catchSpot(D, this);
      S.arr = { D, nd, err: own && real ? Math.hypot(own.p.x - real.p.x, own.p.y - real.p.y) : null, none: !own };
    }
  }
  return r;
};
P.buildResult = function (...x: any[]) {
  const res = b0.apply(this, x), S = this.__db;
  if (S?.arr) {
    const D = S.arr.D, flight = S.tArr - S.rel;
    const pbu = (this.events ?? []).some((e: any) => e.type === 'pbu' && this.defense.some((d: any) => d.idx === e.a));
    rows.push({ flight, man: S.man, nd: S.arr.nd, err: S.arr.err, none: S.arr.none, first: S.first.get(D) ?? null,
      close: ((S.d0.get(D) ?? S.arr.nd) - S.arr.nd) / Math.max(0.1, flight), cmp: !!this.stats?.completed, int: !!this.stats?.interceptedBy, pbu });
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const t1 = Date.now();
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
const med = (v: any[]) => { v = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 5 ? '-' : v[Math.floor(v.length / 2)].toFixed(2); };
const p90 = (v: any[]) => { v = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 10 ? '-' : v[Math.floor(0.9 * (v.length - 1))].toFixed(2); };
const pct = (v: boolean[]) => v.length ? `${(100 * v.filter(Boolean).length / v.length).toFixed(1)}%` : '-';
console.log(`== def-ball BALL_EST=${process.env.BALL_EST ?? 0} seed ${seed} games ${games}: targets ${rows.length}, ${((Date.now() - t1) / 1000).toFixed(0)} s`);
for (const [lab, f] of [['all', (r: any) => true], ['man', (r: any) => r.man], ['zone', (r: any) => !r.man]] as const) for (const [lo, hi] of [[0, 0.8], [0.8, 1.2], [1.2, 1.8], [1.8, 9]]) {
  const R = rows.filter((r) => f(r) && r.flight >= lo && r.flight < hi);
  if (R.length) console.log(`${lab.padEnd(4)} flight ${lo}-${hi} s: n ${String(R.length).padStart(4)} | nearest: no estimate ${pct(R.map((r) => r.none))}, catch-point error p50 ${med(R.map((r) => r.err))} p90 ${p90(R.map((r) => r.err))} yd | first move ${med(R.map((r) => r.first))} s | closing ${med(R.map((r) => r.close))} yd/s | nearest at arrival ${med(R.map((r) => r.nd))}`);
}
for (const [lo, hi] of [[0, 1], [1, 2], [2, 3], [3, 99]]) {
  const R = rows.filter((r) => r.nd >= lo && r.nd < hi);
  console.log(`nearest ${lo}-${hi === 99 ? '+' : hi} yd at arrival: n ${String(R.length).padStart(4)} | complete ${pct(R.map((r) => r.cmp))} | INT ${pct(R.map((r) => r.int))} | PBU ${pct(R.map((r) => r.pbu))}`);
}
console.log(`all: complete ${pct(rows.map((r) => r.cmp))} | INT ${pct(rows.map((r) => r.int))} | PBU ${pct(rows.map((r) => r.pbu))}`);
