// BALL_EST design 7 witness (bit 64, the look through the trunk): every targeted pass (not screens), each tick from the
// release to the ball's closest pass to the target. Bins by the ball's bearing off his running line (true ball, the
// measurement's, not his). Out of view: the ball more than his neck range + 30 deg (eyes) off his shoulders
// (shouldersOf; the hips when nothing twists). Speed while tracking, and its ratio to his speed at the release; hips
// turned (hips more than 60 deg off his velocity); drift: his lateral speed off his line at the release (yd/s), the
// cost witness for looking back at a sprint. Split by route family; catch rate per family.
//   BALL_EST=7 HEAD=1 [BALL_EST=71] npx tsx scripts/diag/risk/trunk-look.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { neckOf } from '../../../src/sim/ball-estimate.js';
import { shouldersOf } from '../../../src/physics/kinematics.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 16);
const P: any = PlaySim.prototype, t0 = P.tick, ticks: any[] = [], throws: any[] = [];
const off = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__tl && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, rt = T.behavior?.fallback?.route ?? T.behavior?.route;
    const h = Math.atan2(T.vel.y, T.vel.x);
    this.__tl = { T, fam: rt?.family ?? '?', v0: Math.hypot(T.vel.x, T.vel.y), h0: h, best: Infinity, rows: [] as any[] };
    throws.push(this.__tl);
  }
  const S = this.__tl;
  if (S && this.ball.kind === 'air') {
    const T = S.T, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    if (dh <= S.best + 0.05) {
      S.best = Math.min(S.best, dh);
      const sp = Math.hypot(T.vel.x, T.vel.y), run = sp > 1 ? Math.atan2(T.vel.y, T.vel.x) : T.facing;
      const toBall = Math.atan2(b.y - T.pos.y, b.x - T.pos.x);
      const reach = (neckOf(T) + Math.PI / 6) * 180 / Math.PI;
      S.rows.push({ fam: S.fam, ang: off(run, toBall), out: off(shouldersOf(T.body), toBall) > reach, sp, ratio: S.v0 > 1 ? sp / S.v0 : null,
        hips: sp > 1 && off(T.facing, run) > 60, drift: Math.abs(-T.vel.x * Math.sin(S.h0) + T.vel.y * Math.cos(S.h0)), twist: off(shouldersOf(T.body), T.facing) });
    }
  }
  return r;
};
const b0 = P.buildResult;
P.buildResult = function (...x: any[]) { const res = b0.apply(this, x); if (this.__tl) { this.__tl.caught = !!this.stats?.completed; ticks.push(...this.__tl.rows); } return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
const med = (v: number[]) => { v = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 5 ? '-' : v[Math.floor(v.length / 2)].toFixed(2); };
const pct = (v: boolean[]) => v.length ? `${Math.round(100 * v.filter(Boolean).length / v.length)}%` : '-';
console.log(`== trunk-look BALL_EST=${process.env.BALL_EST ?? 0} HEAD=${process.env.HEAD ?? '-'} TRUNK_TWIST=${process.env.TRUNK_TWIST ?? '-'} seed ${seed} games ${games}: throws ${throws.length}, ticks ${ticks.length}`);
for (const [lo, hi] of [[0, 30], [30, 60], [60, 90], [90, 120], [120, 181]]) {
  const R = ticks.filter((r) => r.ang >= lo && r.ang < hi);
  console.log(`ball ${String(lo).padStart(3)}-${hi} deg off his run: n ${String(R.length).padStart(5)} | out of view ${pct(R.map((r) => r.out))} | speed ${med(R.map((r) => r.sp))} (x${med(R.map((r) => r.ratio))} of release) | hips turned ${pct(R.map((r) => r.hips))} | twist ${med(R.map((r) => r.twist))} deg | drift ${med(R.map((r) => r.drift))} yd/s`);
}
for (const fam of ['deep', 'intermediate', 'cross', 'flat', 'quick', 'back']) {
  const R = ticks.filter((r) => r.fam === fam), T = throws.filter((t) => t.fam === fam);
  if (!T.length) continue;
  console.log(`  ${fam.padEnd(12)} throws ${String(T.length).padStart(4)} caught ${pct(T.map((t) => !!t.caught))} | out of view ${pct(R.map((r) => r.out))} | speed ${med(R.map((r) => r.sp))} | hips turned ${pct(R.map((r) => r.hips))} | drift ${med(R.map((r) => r.drift))}`);
}
