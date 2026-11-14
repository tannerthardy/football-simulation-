// APEX_LEVERAGE read: quarters / Cover 6 pass plays (no play action), per apex side. Records the positional rows
// of apex-leverage.ts (apex vs No. 2 and the back at 1.0 / 2.0 / 2.5 s) and the play's outcome by target on that
// side: No. 2 by route class (vertical/seam: deep ≥ 10 yd and inside his release lane by < 3 yd; dig/in: crossed
// ≥ 3 yd toward the ball; out/flat: ≥ 3 yd outward; other), the back, others. Per cell: n sides, targets, completions,
// yards per target, YAC; plus target share to the back on flat-back sides; and dither = apex technique-label changes.
// usage: npx tsx scripts/diag/risk/apex-out.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const TS = [1.0, 2.0, 2.5];
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, sides: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || String(this.offCall?.pass?.id ?? '').startsWith('pa_')) return r;
  if (Math.abs(this.qb?.pos?.x - this.los) > 25) return r;
  const id = String(this.defCall?.coverage?.id ?? ''); if (!/^(cover4|cover6|split_quarters)/.test(id)) return r;
  if (this.__ao === undefined) {
    this.__ao = null; const by = this.ballY, L: any[] = [];
    for (const side of [1, -1]) {
      const apex = this.defense.filter((d: any) => (d.behavior as any)?.rule === 'q_apex' && (d.pos.y - by) * side > 0);
      if (apex.length !== 1) continue;
      const recv = this.offense.filter((o: any) => ['WR', 'TE'].includes(o.player?.position) && (o.pos.y - by) * side > 0).sort((a: any, b: any) => (b.pos.y - by) * side - (a.pos.y - by) * side);
      if (recv.length < 2) continue;
      L.push({ side, apex: apex[0], two: recv[1], two0: { ...recv[1].pos }, back: this.offense.find((o: any) => o.player?.position === 'RB'), rows: {}, labs: [] as string[], cov: id });
    }
    if (L.length) { this.__ao = { L, snapT: this.t, marks: [...TS], by }; this.__aoL = L; }
  }
  const S = this.__ao; if (!S) return r;
  const tt = this.t - S.snapT, d = (p: any) => p.x - this.los;
  for (const s of S.L) {
    const lab = facingTechnique(this.cmds?.[s.apex.idx] ?? {})?.label ?? '-';
    if (this.ball.kind !== 'air' && !s.thrown && s.labs[s.labs.length - 1] !== lab) s.labs.push(lab);
    if (this.catchAt >= 0 && s.catchX === undefined && this.ball.kind === 'held') s.catchX = this.ball.carrier.pos.x;
    if (this.ball.kind === 'air' && !s.thrown) {
      s.thrown = true; s.target = this.ball.target; s.throwT = tt;
      const out = (p: any) => (p.y - S.by) * s.side, tp = s.two.pos;
      const lat = out(tp) - out(s.two0);
      s.route = d(tp) >= 10 && Math.abs(lat) < 3 ? 'vert' : lat <= -3 ? 'in' : lat >= 3 ? 'out' : 'other';
      s.routeId = String(s.two.behavior?.route?.id ?? '-');
    }
  }
  if (S.marks.length && tt >= S.marks[0] - 1e-9) {
    const m = S.marks.shift();
    for (const s of S.L) {
      const out = (p: any) => (p.y - S.by) * s.side, a = s.apex.pos;
      const e: any = { depth: d(a), out2: out(a) - out(s.two.pos) };
      if (s.back) { e.outB = out(a) - out(s.back.pos); e.bOut = out(s.back.pos); e.bDepth = d(s.back.pos); e.bVy = s.back.vel.y * s.side; }
      s.rows[m] = e;
      if (m === 2.0) { s.vert2 = s.two.pos.x - s.two0.x > 5; s.flat = !!s.back && e.bOut > 2 && e.bDepth < 4 && e.bVy > 4 / 3; }
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  for (const s of this.__aoL ?? []) {
    s.done = true; s.complete = res.outcome !== 'incomplete' && !!s.thrown && !res.turnover && this.catchAt >= 0;
    s.yards = res.yards; s.yac = s.complete ? res.yards - ((s.catchX ?? NaN) - this.los) : NaN;
    sides.push(s);
  }
  this.__aoL = null; this.__ao = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => { v = v.filter(Number.isFinite); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'; };
const cell = (V: any[]) => `n ${V.length}, cmp ${V.filter(s => s.complete).length}, yds/tgt ${mean(V.map(s => s.yards))}, YAC ${mean(V.map(s => s.yac))}`;
const D = sides.filter(s => s.thrown);
console.log(`== seed ${seed} quarters apex sides n ${sides.length} (thrown ${D.length}) | dither: label changes before the throw ${q(sides.map(s => s.labs.length - 1))} (mean ${mean(sides.map(s => s.labs.length - 1))})`);
for (const rt of ['vert', 'in', 'out', 'other']) console.log(`   No. 2 ${rt.padEnd(5)} sides ${D.filter(s => s.route === rt).length} | targeted: ${cell(D.filter(s => s.route === rt && s.target === s.two))}`);
const FB = D.filter(s => s.flat), NB = D.filter(s => !s.flat);
console.log(`   flat-back sides ${FB.length}: target back ${cell(FB.filter(s => s.target === s.back))} (share ${(FB.filter(s => s.target === s.back).length / Math.max(1, FB.length)).toFixed(2)}) | No. 2 ${cell(FB.filter(s => s.target === s.two))} | other ${cell(FB.filter(s => s.target !== s.back && s.target !== s.two))}`);
console.log(`   no-back sides ${NB.length}: No. 2 ${cell(NB.filter(s => s.target === s.two))} | other ${cell(NB.filter(s => s.target !== s.two))}`);
for (const [lab, F] of [['No. 2 vertical, no flat back', (s: any) => s.vert2 && !s.flat], ['No. 2 vertical, flat back', (s: any) => s.vert2 && s.flat]] as const) {
  const V = sides.filter(F); console.log(`   ${lab} n ${V.length}`);
  for (const t of TS) { const E = V.map(s => s.rows[t]).filter(Boolean); if (E.length < 5) continue;
    console.log(`      ${t.toFixed(1)} s | apex depth ${q(E.map((e: any) => e.depth))} | out vs No. 2 ${q(E.map((e: any) => e.out2))} | out vs back ${q(E.map((e: any) => e.outB))}`); }
}
