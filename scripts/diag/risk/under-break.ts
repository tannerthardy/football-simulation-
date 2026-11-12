// Underneath zone defenders and the QB's throw (sim only; engine instrumentation). Games, league-sampled. On each
// completed pass caught 0-10 yd past the line against a zone call, the underneath zone defender (ZoneCoverage, not deep,
// 1-12 yd past the line at the release, > 3 yd from the QB) nearest the catch point at the release. Relative to the
// release: the windup start (sim.windupAt), when his keysQB cue fired ('readArm' tag), when he was onBall, his facing
// toward the QB at the windup (cos), whether his recorded eyes were on the QB, and his break (first tick his velocity
// points within 45 deg of the catch point at >= 1.5 yd/s). By role: hook (within 6 yd of the ball laterally) / curl-flat.
// usage: npx tsx scripts/diag/risk/under-break.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { seenQbEyes } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b && !this.__ub) {
    const dir = this.attackDir(this.offense[0].team), qb = this.qb;
    const D = this.defense.filter((d: any) => d.behavior?.kind === 'zone' && !d.behavior?.deep
      && (d.pos.x - this.los) * dir >= 1 && (d.pos.x - this.los) * dir <= 12 && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 3);
    this.__ub = { t0: this.t, windup: this.windupAt, R: b, D: D.map((d: any) => ({ d, readArm: d.tags.has('readArm') ? this.t : null, onBall: d.tags.has('onBall') ? this.t : null,
      faceQB: null as number | null, path: [] as any[], pre: (this.__hist?.get(d) ?? []).slice(), react: d.mind.observationDelay(d.profile.reactionTime * (1 - 0.4 * d.r('anticipation'))), rt: d.profile.reactionTime, leaned: d.tags.has('shoulder-read'), eyesOnR: seenQbEyes(d, this) === b })) };
    // facing toward the QB at the windup: from the recorded body (perception record), if the windup is in the past
    for (const u of this.__ub.D) {
      const back = Math.max(0, this.t - this.windupAt);
      const me = this.perception.recorded(u.d.idx, back), q = this.perception.recorded(qb.idx, back);
      if (me && q) u.faceQB = Math.cos(me.facing - Math.atan2(q.pos.y - me.pos.y, q.pos.x - me.pos.x));
    }
  }
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  const r = tick0.call(this);
  if (!this.__hist) this.__hist = new Map();
  for (const d of this.defense) { let h = this.__hist.get(d); if (!h) this.__hist.set(d, h = []); h.push({ t: this.t, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y }); if (h.length > 120) h.shift(); }
  const U = this.__ub;
  if (U && !U.done) {
    for (const u of U.D) {
      if (u.readArm === null && u.d.tags.has('readArm')) u.readArm = this.t;
      if (u.onBall === null && u.d.tags.has('onBall')) u.onBall = this.t;
      u.path.push({ t: this.t, x: u.d.pos.x, y: u.d.pos.y, vx: u.d.vel.x, vy: u.d.vel.y });
    }
    if (this.ball.kind !== 'air' || this.phase !== 'live') {
      U.done = true;
      const R = U.R, caught = this.ball.kind === 'held' && this.ball.carrier === R, dir = this.attackDir(R.team);
      const cx = R.pos.x, cy = R.pos.y, depth = (cx - this.los) * dir;
      if (caught && depth >= 0 && depth <= 10 && U.D.length && !this.defCall?.coverage?.man) {
        const u = U.D.reduce((b: any, x: any) => { const p0 = x.path[0], pb = b.path[0]; return Math.hypot(p0.x - cx, p0.y - cy) < Math.hypot(pb.x - cx, pb.y - cy) ? x : b; });
        const brk = u.path.find((s: any) => { const L = Math.hypot(cx - s.x, cy - s.y) || 1, sp = Math.hypot(s.vx, s.vy);
          return sp >= 1.5 && (s.vx * (cx - s.x) + s.vy * (cy - s.y)) / (L * sp) >= Math.cos(Math.PI / 4); });
        rows.push({ role: Math.abs(u.path[0].y - this.ballY) < 6 ? 'hook' : 'curl/flat', windup: U.windup >= 0 ? U.windup - U.t0 : null,
          readArm: u.readArm === null ? null : u.readArm - U.t0, onBall: u.onBall === null ? null : u.onBall - U.t0, faceQB: u.faceQB,
          brk: brk ? brk.t - U.t0 : null, react: u.react, rt: u.rt, leaned: u.leaned, eyesOnR: u.eyesOnR,
          vTo0: (() => { const s0 = u.path[0], L = Math.hypot(cx - s0.x, cy - s0.y) || 1; return (s0.vx * (cx - s0.x) + s0.vy * (cy - s0.y)) / L; })(),
          vToM3: (() => { const s0 = u.pre.find((s: any) => s.t >= U.t0 - 0.3 - 1e-9); if (!s0) return null; const L = Math.hypot(cx - s0.x, cy - s0.y) || 1; return (s0.vx * (cx - s0.x) + s0.vy * (cy - s0.y)) / L; })(),
          vTo3: (() => { const s0 = u.path.find((s: any) => s.t - U.t0 >= 0.3 - 1e-9) ?? u.path.at(-1), L = Math.hypot(cx - s0.x, cy - s0.y) || 1; return (s0.vx * (cx - s0.x) + s0.vy * (cy - s0.y)) / L; })(),
          vTo2: (() => { const s0 = u.path.find((s: any) => s.t - U.t0 >= 0.2) ?? u.path.at(-1), L = Math.hypot(cx - s0.x, cy - s0.y) || 1; return (s0.vx * (cx - s0.x) + s0.vy * (cy - s0.y)) / L; })() });
      }
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: (number | null)[], f = .5) => { const x = v.filter((n): n is number => n !== null && n === n).sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))].toFixed(2) : '-'; };
const mn = (v: (number | null)[]) => { const x = v.filter((n): n is number => n !== null && n === n); return x.length ? (x.reduce((a, b) => a + b, 0) / x.length).toFixed(2) : '-'; };
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
console.log(`seed ${seed}, ${games} games: zone completions 0-10 yd with an underneath zone defender, n ${rows.length} (times relative to the release; - = before)`);
for (const role of ['hook', 'curl/flat']) {
  const v = rows.filter(r => r.role === role); if (!v.length) continue;
  console.log(`  ${role.padEnd(9)} n ${v.length} | windup p50 ${q(v.map(r => r.windup))} s | keysQB (readArm) fired ${pct(v.filter(r => r.readArm !== null).length, v.length)}, at p50 ${q(v.map(r => r.readArm))} s`
    + ` | onBall p50 ${q(v.map(r => r.onBall))} s | facing the QB at the windup (cos > -0.2) ${pct(v.filter(r => r.faceQB !== null && r.faceQB > -0.2).length, v.length)}, cos p50 ${q(v.map(r => r.faceQB))}`
    + ` | break at or before the release ${pct(v.filter(r => r.brk !== null && r.brk <= 0.05).length, v.length)}, break p50 ${q(v.map(r => r.brk))} s`);
  console.log(`     react (observationDelay(reactionTime x (1 - 0.4 anticipation))) p10/p50/p90 ${q(v.map(r => r.react), .1)}/${q(v.map(r => r.react))}/${q(v.map(r => r.react), .9)} s; reactionTime p50 ${q(v.map(r => r.rt))}; windup + react matured before the release ${pct(v.filter(r => r.windup !== null && r.windup + r.react <= 0).length, v.length)}, at p50 ${q(v.map(r => r.windup === null ? null : r.windup + r.react))} s`);
  console.log(`     at the release: speed toward the catch point p25/p50/p75 ${q(v.map(r => r.vTo0), .25)}/${q(v.map(r => r.vTo0))}/${q(v.map(r => r.vTo0), .75)} yd/s; at +0.2 s ${q(v.map(r => r.vTo2), .25)}/${q(v.map(r => r.vTo2))}/${q(v.map(r => r.vTo2), .75)}; shoulder-read tagged ${pct(v.filter(r => r.leaned).length, v.length)}; QB's eyes (as he sees them) on the catcher ${pct(v.filter(r => r.eyesOnR).length, v.length)}`);
  console.log(`     toward the catcher's catch point (Defense's underarrival.py read; NFL zone LB 0.0 / +1.1 / +2.4) at -0.3 / 0 / +0.3 s: mean ${mn(v.map(r => r.vToM3))} / ${mn(v.map(r => r.vTo0))} / ${mn(v.map(r => r.vTo3))} yd/s`);
  const lv = v.filter(r => r.leaned); if (lv.length) console.log(`     leaned: n ${lv.length} | eyes on the catcher ${pct(lv.filter(r => r.eyesOnR).length, lv.length)} | toward the catch point at the release p50 ${q(lv.map(r => r.vTo0))} | break at/before ${pct(lv.filter(r => r.brk !== null && r.brk <= 0.05).length, lv.length)}, p50 ${q(lv.map(r => r.brk))}`);
  const nf = v.filter(r => r.readArm === null);
  console.log(`     no keysQB: n ${nf.length} | facing the QB at the windup ${pct(nf.filter(r => r.faceQB !== null && r.faceQB > -0.2).length, nf.length)} | onBall p50 ${q(nf.map(r => r.onBall))} s, break p50 ${q(nf.map(r => r.brk))} s`);
  const kf = v.filter(r => r.readArm !== null);
  if (kf.length) console.log(`     keysQB:    n ${kf.length} | break p50 ${q(kf.map(r => r.brk))} s, at/before release ${pct(kf.filter(r => r.brk !== null && r.brk <= 0.05).length, kf.length)}`);
}
