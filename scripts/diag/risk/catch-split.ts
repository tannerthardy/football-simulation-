// Short completions (intended under 10 air yd, thrown non-screen passes): the catch point's depth past the line, the
// catcher's speed and his upfield velocity at the catch, the nearest defender's distance at the catch, and the yards
// after the catch. To read where a rise in short yards per attempt comes from.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/catch-split.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  const dir = this.attackDir(this.offense[0].team);
  if (this.ball.kind === 'air' && !this.__cs && this.ball.target && !this.ball.throwaway) this.__cs = { air: (this.ball.intended.x - this.los) * dir, T: this.ball.target };
  const S = this.__cs;
  if (S && !S.caught && this.ball.kind === 'held' && this.ball.carrier !== this.qb && this.offense.includes(this.ball.carrier)) {
    const C = this.ball.carrier;
    const D = this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y) < Math.hypot(m.pos.x - C.pos.x, m.pos.y - C.pos.y) ? d : m);
    S.caught = { depth: (C.pos.x - this.los) * dir, speed: Math.hypot(C.vel.x, C.vel.y), up: C.vel.x * dir, near: Math.hypot(D.pos.x - C.pos.x, D.pos.y - C.pos.y), fam: String(S.T.behavior?.fallback?.route?.family ?? S.T.behavior?.route?.family ?? '-') };
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__cs; this.__cs = undefined;
  if (S?.caught && S.air < 10 && this.stats?.completed) rows.push({ ...S.caught, yards: res.yards, yac: res.yards - S.caught.depth });
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: short completions n ${rows.length} | yards mean ${mean(rows.map(r => r.yards))} | catch depth ${q(rows.map(r => r.depth))} (mean ${mean(rows.map(r => r.depth))}) | YAC ${q(rows.map(r => r.yac))} (mean ${mean(rows.map(r => r.yac))}) | speed at the catch ${q(rows.map(r => r.speed))} | upfield ${q(rows.map(r => r.up))} | nearest defender ${q(rows.map(r => r.near))}`);
for (const fam of ['flat', 'back', 'quick', 'cross', 'intermediate']) { const V = rows.filter(r => r.fam === fam); if (V.length >= 10) console.log(`   ${fam}: n ${V.length} | yards ${mean(V.map(r => r.yards))} | YAC ${mean(V.map(r => r.yac))} | upfield at the catch ${q(V.map(r => r.up))} | nearest ${q(V.map(r => r.near))}`); }
