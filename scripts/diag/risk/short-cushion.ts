// What a deeper corner costs underneath (sim only): No. 1 (widest on his side at the snap) running a hitch / quick out /
// out / curl / comeback / deep out against a Cover 3 call; his corner = the CB nearest him at the snap. At the break
// (the first tick after he has run over 3 yd/s upfield that his upfield speed drops below 1.5 or his lateral speed
// passes his upfield speed): the corner's depth over him and distance. When he is the target: completion, and the
// play's credited yards on completions. Non-PA pass calls.
// usage: npx tsx scripts/diag/risk/short-cushion.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const ROUTES = ['hitch', 'quick_out', 'out', 'curl', 'comeback', 'deep_out'];
const P: any = PlaySim.prototype, tick0 = P.tick, build0 = P.buildResult;
const rows: any[] = [];
P.tick = function () {
  if (this.__sc === undefined) {
    this.__sc = null;
    const id = String(this.defCall?.coverage?.id ?? '');
    if (id.startsWith('cover3') && this.offCall?.kind === 'pass' && !String(this.offCall?.pass?.id ?? '').startsWith('pa_')) {
      const cy = this.offense.reduce((t: number, p: any) => t + p.pos.y, 0) / this.offense.length; const pairs: any[] = [];
      for (const o of this.offense) {
        const rid = o.behavior?.route?.id; if (!ROUTES.includes(rid)) continue;
        const side = Math.sign(o.pos.y - cy) || 1;
        if (!this.offense.every((p: any) => (p.pos.y - cy) * side <= 0 || Math.abs(p.pos.y - cy) <= Math.abs(o.pos.y - cy) + 1e-6)) continue;
        const cbs = this.defense.filter((d: any) => d.player?.position === 'CB'); if (!cbs.length) continue;
        const c = cbs.reduce((b: any, d: any) => Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) ? d : b);
        pairs.push({ o, c, rid, call: id, up: false, brk: null, target: false });
      }
      if (pairs.length) this.__sc = { pairs };
    }
  }
  const r = tick0.call(this), S = this.__sc;
  if (S) {
    const dir = this.attackDir(this.offense[0].team);
    for (const p of S.pairs) {
      const vx = p.o.vel.x * dir, vy = Math.abs(p.o.vel.y);
      if (vx > 3) p.up = true;
      if (p.up && !p.brk && (vx < 1.5 || vy > vx)) p.brk = { t: this.t, over: (p.c.pos.x - p.o.pos.x) * dir, dist: Math.hypot(p.c.pos.x - p.o.pos.x, p.c.pos.y - p.o.pos.y), held: this.ball.kind === 'held' };
      if (this.ball.kind === 'air' && this.ball.target === p.o) p.target = true;
    }
  }
  return r;
};
P.buildResult = function () {
  const res = build0.call(this), S = this.__sc;
  if (S) for (const p of S.pairs) rows.push({ rid: p.rid, call: p.call, brk: p.brk, target: p.target, caught: res.outcome !== 'incomplete' && !res.turnover, yards: res.yards });
  this.__sc = null;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { if (v.length < 5) return '-'; const x = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(f => x[Math.floor(f * (x.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
console.log(`== sim seed ${seed}: No. 1 short/intermediate breaking routes vs Cover 3, his corner at the break; targets`);
for (const grp of [['hitch', 'quick_out'], ['out', 'curl'], ['comeback', 'deep_out']]) {
  const V = rows.filter(r => grp.includes(r.rid)), B = V.filter(r => r.brk && r.brk.held), T = V.filter(r => r.target);
  const C = T.filter(r => r.caught);
  console.log(`   ${grp.join('/').padEnd(18)} n ${String(V.length).padStart(3)} | at the break (ball held) n ${B.length}: over him ${q(B.map(r => r.brk.over))} | distance ${q(B.map(r => r.brk.dist))} | break at ${q(B.map(r => r.brk.t))} s | targeted ${T.length}: complete ${C.length} (${T.length ? (100 * C.length / T.length).toFixed(0) : '-'}%), yards per target ${mean(T.map(r => C.includes(r) ? r.yards : 0))}, per catch ${mean(C.map(r => r.yards))}`);
}
