// How a defender plays a flight he has (playObservedFlight): per flight tick for each defender with a flight of his
// own (his estimate under BALL_EST, the copied true path otherwise): his estimated catch point (catchSpot on his path)
// against the true one (catchSpot on the true path), how far it jumps tick to tick (jitter), where his velocity points
// (cos to the estimated point, the true point, the targeted receiver), his speed; for rushers, engaged share before and
// after his first sample. By role and by flight-time third. Reads only.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/def-flight.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
import { rememberedFlight } from '../../../src/sim/possession-read.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const P: any = PlaySim.prototype, tick0 = P.tick, rows: any[] = [];
const cosTo = (d: any, p: { x: number; y: number }) => { const sp = Math.hypot(d.vel.x, d.vel.y), dx = p.x - d.pos.x, dy = p.y - d.pos.y, l = Math.hypot(dx, dy); return sp < 0.5 || l < 0.5 ? NaN : (d.vel.x * dx + d.vel.y * dy) / (sp * l); };
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass' || this.ball?.kind !== 'air' || this.ball.securing) return r;
  const S = (this.__df ??= { rel: this.t, prev: new Map(), dur: undefined as number | undefined });
  const tgt = this.ball.target, E = this.ballEstimates;
  const truePath = this.ballPath, end = truePath.length ? truePath[truePath.length - 1].t : this.t + 1;
  for (const d of this.defense) {
    const own = E && process.env.BALL_EST && process.env.BALL_EST !== '0';
    const path = own ? E.peek(d, this) : (rememberedFlight(d, this.t) ?? []);
    if (!path.length) continue;
    const est = catchSpot(d, { t: this.t, ballPath: path }), tru = catchSpot(d, { t: this.t, ballPath: truePath });
    if (!est || !tru) continue;
    const prev = S.prev.get(d.idx); S.prev.set(d.idx, est.p);
    const frac = Math.min(0.999, Math.max(0, (this.t - S.rel) / Math.max(0.1, end - S.rel)));
    rows.push({ role: d.behavior?.kind ?? '?', third: Math.floor(frac * 3), err: Math.hypot(est.p.x - tru.p.x, est.p.y - tru.p.y), jit: prev ? Math.hypot(est.p.x - prev.x, est.p.y - prev.y) : NaN,
      cEst: cosTo(d, est.p), cTrue: cosTo(d, tru.p), cRcv: tgt ? cosTo(d, tgt.pos) : NaN, sp: Math.hypot(d.vel.x, d.vel.y), eng: !!d.engagement, dEst: Math.hypot(est.p.x - d.pos.x, est.p.y - d.pos.y) });
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[], d = 2) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
console.log(`BALL_EST=${process.env.BALL_EST ?? 0}: flight ticks with a defender's own flight: ${rows.length}`);
for (const role of ['zone', 'man', 'rush']) {
  for (const th of [0, 1, 2]) {
    const V = rows.filter(r => r.role === role && r.third === th && !r.eng);
    if (!V.length) continue;
    console.log(`  ${role.padEnd(4)} third ${th} n ${String(V.length).padStart(5)} | est-true catch pt ${q(V.map(r => r.err), 1)} yd | jitter/tick ${q(V.map(r => r.jit))} yd | vel cos to est ${q(V.map(r => r.cEst))} true ${q(V.map(r => r.cTrue))} rcv ${q(V.map(r => r.cRcv))} | speed ${q(V.map(r => r.sp), 1)}`);
  }
}
const R = rows.filter(r => r.role === 'rush');
console.log(`  rush engaged share of flight ticks with a flight: ${(100 * R.filter(r => r.eng).length / Math.max(1, R.length)).toFixed(0)}% (n ${R.length}); engaged rusher speed ${q(R.filter(r => r.eng).map(r => r.sp), 1)}`);
