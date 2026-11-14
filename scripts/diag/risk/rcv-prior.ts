// Sim twin of rcv_prior_nfl.py: deep targets (20+ air yd at the landing, or route go / post). For the targeted
// receiver from the release to the end of the flight (the ball leaves the air or starts being secured): the first time
// he is off his release-velocity line by more than 0.5 / 1.0 yd, and the first time his speed over 0.2 s drops 0.5 yd/s
// below its running maximum, as fractions of the flight. By flight bin.
// usage: [BALL_EST=1] npx tsx scripts/diag/risk/rcv-prior.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  if (this.ball.kind === 'air' && this.__rp === undefined) {
    this.__rp = null;
    const T = this.ball.target, rid = String((T?.behavior as any)?.route?.id ?? (T?.behavior as any)?.fallback?.route?.id ?? '');
    const land = [...this.ballPath].reverse().find((s: any) => s.z > 0.5) ?? this.ballPath.at(-1);
    const dir = this.attackDir(this.offense[0].team);
    if (T && land && ((land.x - this.los) * dir >= 20 || /go|post|fade|seam/.test(rid))) {
      const sp = Math.hypot(T.vel.x, T.vel.y);
      this.__rp = { T, rel: this.t, x0: T.pos.x, y0: T.pos.y, ux: sp > 0.5 ? T.vel.x / sp : dir, uy: sp > 0.5 ? T.vel.y / sp : 0, top: sp, track: [{ t: this.t, x: T.pos.x, y: T.pos.y }] };
    }
  }
  const S = this.__rp;
  if (S && !S.done) {
    if (this.ball.kind === 'air' && !this.ball.securing) S.track.push({ t: this.t, x: S.T.pos.x, y: S.T.pos.y });
    else {
      S.done = true;
      const end = S.track.at(-1).t, fl = end - S.rel; if (fl < 0.6) return r;
      const fr = (t: number) => (t - S.rel) / fl;
      const dev = (d: number) => { const p = S.track.find((p: any) => Math.abs((p.x - S.x0) * S.uy - (p.y - S.y0) * S.ux) > d); return p ? fr(p.t) : null; };
      let top = S.top, slow = null;
      for (let i = 0; i < S.track.length; i++) {
        const p = S.track[i], a = [...S.track.slice(0, i)].reverse().find((q: any) => p.t - q.t >= 0.2 - 1e-9); if (!a) continue;
        const sp = Math.hypot(p.x - a.x, p.y - a.y) / (p.t - a.t); top = Math.max(top, sp);
        if (sp < top - 0.5) { slow = fr(p.t); break; }
      }
      rows.push({ fl, d05: dev(0.5), d10: dev(1.0), slow });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[]) => { const w = v.filter((x) => x !== null).sort((a, b) => a - b); return w.length < 5 ? '-' : [.25, .5, .75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/'); };
console.log(`== sim seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0} deep targets: leaves his release line / first slows, as a fraction of the flight, n ${rows.length}`);
for (const [a, b] of [[0, 1.5], [1.5, 2.0], [2.0, 9]]) {
  const V = rows.filter(r => r.fl >= a && r.fl < b); if (!V.length) continue;
  const nv = (k: string) => V.filter(r => r[k] === null).length;
  console.log(`   flight ${a}-${b < 9 ? b : '+'} s n ${V.length} | off the line by 0.5 yd at ${q(V.map(r => r.d05))} (never ${nv('d05')}) | by 1.0 yd at ${q(V.map(r => r.d10))} (never ${nv('d10')}) | first slows 0.5 yd/s at ${q(V.map(r => r.slow))} (never ${nv('slow')})`);
}
