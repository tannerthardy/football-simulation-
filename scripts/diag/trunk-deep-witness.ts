// TRUNK_TWIST Stage 1 witness: the deep target's speed from the release to the arrival, whether his hips or his
// shoulders turned off his running line, the trunk he used, separation and completion. Read-only tap on PlaySim.tick.
//   TRUNK_TWIST=1 node --import tsx scripts/diag/trunk-deep-witness.ts SEED FIRST LAST [out.json]   (games FIRST..LAST; one game per run survives container resets)
//   node --import tsx scripts/diag/trunk-deep-report.ts out/trunk/deep-0-*.json  pools per-game rows
import { writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam, leagueSample } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), first = Number(process.argv[3] ?? 0), last = Number(process.argv[4] ?? first), games = last + 1;
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const off = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__tw && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, rt = T.behavior?.fallback?.route ?? T.behavior?.route;
    this.__tw = { T, deep: rt?.family === 'deep', rel: this.t, best: Infinity, log: [] as any[] };
  }
  const S = this.__tw;
  if (S?.deep && this.ball.kind === 'air') {
    const T = S.T, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    if (dh < S.best) { S.best = dh; S.tArr = this.t; }
    const sp = Math.hypot(T.vel.x, T.vel.y), path = Math.atan2(T.vel.y, T.vel.x);
    let near = Infinity; for (const d of this.defense) near = Math.min(near, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
    S.log.push({ t: this.t, sp, near, hips: sp > 1 ? off(T.body.facing, path) : 0, shoulders: sp > 1 ? off(T.shoulders, path) : 0, trunk: Math.abs(T.body.trunk ?? 0) * 180 / Math.PI });
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__tw; this.__tw = undefined;
  if (S?.deep && S.tArr !== undefined) {
    const A = S.tArr, L = S.log, atA = L.find((x: any) => x.t >= A - 1e-6) ?? L[L.length - 1], m5 = [...L].reverse().find((x: any) => x.t <= A - 0.5) ?? L[0];
    rows.push({ cmp: !!this.stats?.completed, best: S.best, spRel: L[0]?.sp, spM5: m5?.sp, spA: atA?.sp, sepA: atA?.near,
      hipsA: atA?.hips, shouldersA: atA?.shoulders, trunkA: atA?.trunk, hipsMax: Math.max(...L.map((x: any) => x.hips)), trunkMax: Math.max(...L.map((x: any) => x.trunk)) });
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = first; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
const sh = (v: any[]) => { const w = v.filter((x) => x !== undefined); return w.length ? (100 * w.filter(Boolean).length / w.length).toFixed(0) + '%' : '-'; };
console.log(`== seed ${seed} games ${games} TRUNK_TWIST=${process.env.TRUNK_TWIST ?? 0}: deep targets n ${rows.length}, caught ${rows.filter(r => r.cmp).length} (${sh(rows.map(r => r.cmp))})`);
console.log(`   speed at release ${q(rows.map(r => r.spRel))} -> 0.5 s out ${q(rows.map(r => r.spM5))} -> arrival ${q(rows.map(r => r.spA))} (quartiles; NFL turned receivers 7.5 -> 7.0 -> 6.4, 6.7 at the arrival)`);
console.log(`   at the arrival: hips off the path ${q(rows.map(r => r.hipsA))} deg | shoulders off the path ${q(rows.map(r => r.shouldersA))} deg | trunk ${q(rows.map(r => r.trunkA))} deg | trunk max ${q(rows.map(r => r.trunkMax))} | nearest defender ${q(rows.map(r => r.sepA))} yd`);
console.log(`   hips turned >60 deg at the arrival ${sh(rows.map(r => r.hipsA > 60))} | shoulders turned >60 deg ${sh(rows.map(r => r.shouldersA > 60))}`);
if (process.argv[5]) writeFileSync(process.argv[5], JSON.stringify(rows));
