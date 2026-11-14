// Short completions (intended under 10 air yd, thrown non-screen passes): the catch point's depth past the line, the
// catcher's speed and his upfield velocity at the catch, the nearest defender's distance and closing speed toward the
// catcher (at the catch and 0.3 s after), and the yards after the catch, by route kind (stopped: hitch/curl/stick/hook;
// moving: slant/cross/flat/in/drag/angle; out). Then every short target at the ball's closest pass to him: catch rate
// by his speed across the ball's line. Same definitions as nfl_catch_split.py.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/catch-split.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [], arrive: any[] = [];
const kindOf = (id: string) => /hitch|curl|stick|hook|comeback|spot|sit/.test(id) ? 'stopped' : /out/.test(id) ? 'out' : /slant|cross|flat|^in|_in|drag|shallow|angle|dig|mesh|swing|check|arrow/.test(id) ? 'moving' : 'other';
function near(sim: any, C: any) {
  const D = sim.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y) < Math.hypot(m.pos.x - C.pos.x, m.pos.y - C.pos.y) ? d : m);
  const nx = D.pos.x - C.pos.x, ny = D.pos.y - C.pos.y, dn = Math.hypot(nx, ny) || 1e-6;
  return { dn, close: -((D.vel.x - C.vel.x) * nx + (D.vel.y - C.vel.y) * ny) / dn };
}
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  const dir = this.attackDir(this.offense[0].team);
  if (this.ball.kind === 'air' && !this.__cs && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, rt = T.behavior?.fallback?.route ?? T.behavior?.route;
    this.__cs = { air: (this.ball.intended.x - this.los) * dir, T, kind: kindOf(String(rt?.id ?? '-')), from: { x: this.ball.flight.pos.x, y: this.ball.flight.pos.y }, best: Infinity };
  }
  const S = this.__cs;
  if (S && this.ball.kind === 'air') {
    const d = Math.hypot(this.ball.flight.pos.x - S.T.pos.x, this.ball.flight.pos.y - S.T.pos.y);
    if (d < S.best) {
      const ux = this.ball.flight.pos.x - S.from.x, uy = this.ball.flight.pos.y - S.from.y, L = Math.hypot(ux, uy);
      S.best = d; S.arr = L > 1 ? { cross: Math.abs((S.T.vel.x * uy - S.T.vel.y * ux) / L), near: near(this, S.T).dn } : undefined;
    }
  }
  if (S && !S.caught && this.ball.kind === 'held' && this.ball.carrier !== this.qb && this.offense.includes(this.ball.carrier)) {
    const C = this.ball.carrier, N = near(this, C);
    S.caught = { kind: S.kind, depth: (C.pos.x - this.los) * dir, speed: Math.hypot(C.vel.x, C.vel.y), up: C.vel.x * dir, near: N.dn, close: N.close, close3: NaN, at: this.t, C };
  }
  if (S?.caught && Number.isNaN(S.caught.close3) && this.t >= S.caught.at + 0.3) S.caught.close3 = near(this, S.caught.C).close;
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__cs; this.__cs = undefined;
  if (S && S.air < 10) {
    if (S.arr) arrive.push({ ...S.arr, comp: !!this.stats?.completed });
    if (S.caught && this.stats?.completed) { const { C, at, ...c } = S.caught; rows.push({ ...c, yards: res.yards, yac: res.yards - c.depth }); }
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
const line = (R: any[], tag: string) => { const c = (f: string) => R.map(r => r[f]); console.log(`${tag}: n ${R.length} | yards ${mean(c('yards'))} | depth ${q(c('depth'))} | speed ${q(c('speed'))} | upfield ${q(c('up'))} | nearest ${q(c('near'))} | closing at catch ${q(c('close'))} / +0.3 s ${q(c('close3'))} | YAC ${q(c('yac'))} (mean ${mean(c('yac'))})`); };
line(rows, `== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0} short completions`);
for (const k of ['stopped', 'moving', 'out', 'other']) line(rows.filter(r => r.kind === k), `   ${k}`);
console.log('catch rate by speed across the ball line (yd/s) at closest pass | all | nearest < 1.5 yd | nearest >= 1.5 yd');
const f = (S: any[]) => S.length ? `${(S.filter(r => r.comp).length / S.length).toFixed(3)} (n ${S.length})` : '-';
for (const [lo, hi] of [[0, 1], [1, 2], [2, 3], [3, 4.5], [4.5, 6], [6, 12]]) { const R = arrive.filter(r => r.cross >= lo && r.cross < hi); if (R.length) console.log(`${lo}-${hi} | ${f(R)} | ${f(R.filter(r => r.near < 1.5))} | ${f(R.filter(r => r.near >= 1.5))}`); }
