// APEX_LEVERAGE condition reads (quarters / Cover 6 snaps, cover4* / cover6* / split_quarters*):
// (a) the apex's flat-threat commitment: share of apex sides where it fired, when (s after the snap), and the share
//     still before the throw; the apex's depth speed in the 0.3 s after it (hold binding);
// (b) the Mike (rule mike_3): widened (job zone:hook_s / hook_w), when, his lateral distance from the ball at the
//     throw; outcomes of throws to the middle (target 4-15 yd deep at the throw's intended point, within 7 yd of the
//     ball laterally), screens (pass concept family 'screen') and draws (run concept 'draw'), yards per play, split by
//     whether the Mike widened before the throw / handoff.
// usage: npx tsx scripts/diag/risk/mike-out.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, plays: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  const id = String(this.defCall?.coverage?.id ?? ''); if (!/^(cover4|cover6|split_quarters)/.test(id)) return r;
  if (Math.abs((this.qb?.pos?.x ?? this.los) - this.los) > 25) return r;
  const S = this.__mo ?? (this.__mo = { snapT: this.t, kind: this.offCall?.kind, concept: String(this.offCall?.pass?.id ?? this.offCall?.run?.id ?? this.offCall?.concept?.id ?? '-'), family: String(this.offCall?.pass?.family ?? ''), apex: new Map(), mike: null as any, mikeAt: null as any, thrown: false });
  const tt = this.t - S.snapT;
  for (const d of this.defense) {
    const b: any = d.behavior; if (!b) continue;
    if (b.rule === 'q_apex') {
      const e = S.apex.get(d) ?? { at: null, x0: null, x1: null }; S.apex.set(d, e);
      if (e.at === null && b.state?.flatBack) { e.at = tt; e.x0 = d.pos.x; e.pre = !S.thrown; }
      if (e.at !== null && e.x1 === null && tt - e.at >= 0.3) e.x1 = d.pos.x;
    }
    if (b.rule === 'mike_3') { S.mike = d; if (S.mikeAt === null && /zone:hook_[sw]/.test(String(b.job ?? b.history?.at(-1)?.job ?? ''))) S.mikeAt = tt; }
  }
  if (!S.thrown && (this.ball.kind === 'air' || (this.ball.kind === 'held' && this.ball.carrier !== this.qb))) {
    S.thrown = true; S.throwT = tt;
    if (this.ball.kind === 'air') { const p = this.ball.intended; S.mid = p.x - this.los >= 4 && p.x - this.los <= 15 && Math.abs(p.y - this.ballY) <= 7; }
    S.mikeWide = S.mikeAt !== null; S.mikeLat = S.mike ? Math.abs(S.mike.pos.y - this.ballY) : NaN;
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__mo) plays.push({ ...this.__mo, apex: [...this.__mo.apex.values()], yards: res.yards, inc: res.outcome === 'incomplete' });
  this.__mo = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => { v = v.filter(Number.isFinite); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'; };
const A = plays.flatMap(p => p.kind === 'pass' ? p.apex : []), F = A.filter((e: any) => e.at !== null);
console.log(`== seed ${seed} quarters snaps ${plays.length} | apex sides on passes ${A.length}, flat threat committed ${F.length} (before the throw ${F.filter((e: any) => e.pre).length}) at ${q(F.map((e: any) => e.at))} s | apex depth speed over the next 0.3 s ${q(F.filter((e: any) => e.x1 !== null).map((e: any) => (e.x1 - e.x0) / 0.3))} yd/s`);
const M = plays.filter(p => p.mike && p.kind === 'pass');
console.log(`   Mike on passes ${M.length}: widened before the throw ${M.filter(p => p.mikeWide).length} (at ${q(M.filter(p => p.mikeWide).map(p => p.mikeAt))} s) | lateral from the ball at the throw: widened ${q(M.filter(p => p.mikeWide).map(p => p.mikeLat))}, not ${q(M.filter(p => !p.mikeWide).map(p => p.mikeLat))}`);
const cell = (V: any[]) => `n ${V.length}, cmp ${V.filter(p => !p.inc).length}, yds ${mean(V.map(p => p.yards))}`;
const mid = plays.filter(p => p.kind === 'pass' && p.mid && p.family !== 'screen');
console.log(`   middle throws: all ${cell(mid)} | Mike widened ${cell(mid.filter(p => p.mikeWide))}`);
const scr = plays.filter(p => p.family === 'screen');
console.log(`   screens: all ${cell(scr)} | Mike widened ${cell(scr.filter(p => p.mikeWide))}`);
const dr = plays.filter(p => p.kind === 'run' && /draw/.test(p.concept));
console.log(`   draws: all n ${dr.length}, yds ${mean(dr.map(p => p.yards))} | Mike widened n ${dr.filter(p => p.mikeWide).length}`);
