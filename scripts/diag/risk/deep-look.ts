// BALL_EST diagnosis, deep targets (route family deep): when his own picture says the ball is due against when it
// really arrives, when his body turns to look (facing over 60 deg off his running line) and when he first samples it.
// Times are relative to the ball's closest pass to him (the arrival). due: catchSpot on his read-only estimate (peek),
// at its first appearance and at 0.5 s before the arrival.
// usage: BALL_EST=7 npx tsx scripts/diag/risk/deep-look.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const off = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__dl && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, rt = T.behavior?.fallback?.route ?? T.behavior?.route;
    this.__dl = { T, deep: rt?.family === 'deep', rel: this.t, best: Infinity, log: [] as any[] };
  }
  const S = this.__dl;
  if (S?.deep && this.ball.kind === 'air') {
    const T = S.T, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    if (dh < S.best) { S.best = dh; S.tArr = this.t; }
    const est = this.ballEstimates.peek(T, this), due = est.length ? catchSpot(T, { t: this.t, ballPath: est }) : null;
    const sp = Math.hypot(T.vel.x, T.vel.y);
    S.log.push({ t: this.t, due: due?.t, turned: sp > 1 && off(T.facing, Math.atan2(T.vel.y, T.vel.x)) > 60, seen: !!this.ballEstimates.lastSeen(T), head: this.ballEstimates.headOf(T), toBall: Math.atan2(b.y - T.pos.y, b.x - T.pos.x), facing: T.facing });
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__dl; this.__dl = undefined;
  if (S?.deep && S.tArr !== undefined) {
    const A = S.tArr, L = S.log, firstDue = L.find((x: any) => x.due !== undefined), late = [...L].reverse().find((x: any) => x.t <= A - 0.5 && x.due !== undefined);
    const turn = L.find((x: any) => x.turned), seen = L.find((x: any) => x.seen);
    const atA = L.find((x: any) => x.t >= A - 1e-6) ?? L[L.length - 1];
    rows.push({ cmp: !!this.stats?.completed, best: S.best, flight: A - S.rel, dueFirst: firstDue ? firstDue.due - A : undefined, due05: late ? late.due - A : undefined,
      turn: turn ? turn.t - A : undefined, seen: seen ? seen.t - A : undefined, bodyAtA: atA ? off(atA.facing, atA.toBall) : undefined });
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: deep targets n ${rows.length}, caught ${rows.filter(r => r.cmp).length}`);
for (const [lab, f] of [['all', (r: any) => true], ['caught', (r: any) => r.cmp], ['not caught, ball within 1.5 yd', (r: any) => !r.cmp && r.best < 1.5], ['not caught, ball 1.5+ yd away', (r: any) => !r.cmp && r.best >= 1.5]] as const) {
  const V = rows.filter(f);
  console.log(`   ${lab}: n ${V.length} | flight ${q(V.map(r => r.flight))} s | his due, first estimate ${q(V.map(r => r.dueFirst))}, 0.5 s out ${q(V.map(r => r.due05))} (vs the arrival) | body turned ${q(V.map(r => r.turn))} (never ${V.filter(r => r.turn === undefined).length}) | first sample ${q(V.map(r => r.seen))} (never ${V.filter(r => r.seen === undefined).length}) | body off the ball at the arrival ${q(V.map(r => r.bodyAtA))} deg`);
}
