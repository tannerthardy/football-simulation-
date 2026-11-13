// Sim twin of apex_leverage_nfl.py: the quarters / Cover 6 apex (rule q_apex, a curl-flat zone on his side) against
// No. 2 and a flat-releasing back through time, and the Mike (hook_mid / mike_3, or the hook defender nearest the ball).
// No. 2 = the second eligible from that sideline at the snap; the back = an RB who is 2+ yd outside the ball, under 4
// yd deep and moving out at 2.0 s. At 0.5 / 1.0 / 1.5 / 2.0 / 2.5 s: the apex's depth, his `out` vs No. 2 and vs the
// back (+ = outside), depth over the back; the Mike's depth and out vs No. 2. Split as the NFL operator.
// usage: npx tsx scripts/diag/risk/apex-leverage.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const TS = [0.5, 1.0, 1.5, 2.0, 2.5];
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || String(this.offCall?.pass?.id ?? '').startsWith('pa_')) return r;
  const id = String(this.defCall?.coverage?.id ?? ''); if (!/^(cover4|cover6|split_quarters)/.test(id)) return r;
  if (this.__al === undefined) {
    this.__al = null;
    const dir = this.attackDir(this.offense[0].team), by = this.ballY, sides: any[] = [];
    for (const side of [1, -1]) {
      const apex = this.defense.filter((d: any) => (d.behavior as any)?.rule === 'q_apex' && (d.pos.y - by) * side > 0);
      if (apex.length !== 1) continue;
      const recv = this.offense.filter((o: any) => ['WR', 'TE'].includes(o.player?.position) && (o.pos.y - by) * side > 0).sort((a: any, b: any) => (b.pos.y - by) * side - (a.pos.y - by) * side);
      if (recv.length < 2) continue;
      const mike = this.defense.filter((d: any) => ['hook_mid'].includes((d.behavior as any)?.zone) || (d.behavior as any)?.rule === 'mike_3')[0] ?? null;
      sides.push({ side, apex: apex[0], two: recv[1], mike, back: this.offense.find((o: any) => o.player?.position === 'RB'), two0: recv[1].pos.x, rows: {} as any });
    }
    if (sides.length) this.__al = { sides, dir, by, snapT: this.t, marks: [...TS] };
  }
  const S = this.__al;
  if (S && S.marks.length && this.t - S.snapT >= S.marks[0] - 1e-9) {
    const tt = S.marks.shift(), d = (p: any) => (p.x - this.los) * S.dir;
    for (const s of S.sides) {
      const out = (p: any) => (p.y - S.by) * s.side, a = s.apex.pos;
      const e: any = { depth: d(a), out2: out(a) - out(s.two.pos) };
      if (s.back) { e.outB = out(a) - out(s.back.pos); e.overB = d(a) - d(s.back.pos); e.bOut = out(s.back.pos); e.bDepth = d(s.back.pos); e.bVy = s.back.vel.y * s.side; }
      if (s.mike) { e.mdepth = d(s.mike.pos); e.mout2 = out(s.mike.pos) - out(s.two.pos); }
      s.rows[tt] = e;
      if (tt === 2.0) { s.vert = (s.two.pos.x - s.two0) * S.dir > 5; s.flat = !!s.back && e.bOut > 2 && e.bDepth < 4 && e.bVy > 0.4 * 10 / 3; }
    }
    if (!S.marks.length) { for (const s of S.sides) rows.push({ vert: s.vert, back: s.flat, t: s.rows, cov: id.startsWith('cover6') ? 'C6' : 'Q' }); this.__al = null; }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== sim seed ${seed} quarters / Cover 6 apex (q_apex) by side, n ${rows.length}`);
for (const [lab, F] of [['No. 2 vertical, no flat back', (r: any) => r.vert && !r.back], ['No. 2 vertical, flat back', (r: any) => r.vert && r.back], ['No. 2 not vertical, flat back', (r: any) => !r.vert && r.back]] as const) {
  const V = rows.filter(F); console.log(`   ${lab} n ${V.length}`);
  for (const tt of TS) {
    const E = V.map(r => r.t[tt]).filter(Boolean); if (E.length < 5) continue;
    let line = `      ${tt.toFixed(1)} s | apex depth ${q(E.map((e: any) => e.depth))} | out vs No. 2 ${q(E.map((e: any) => e.out2))}`;
    if (V[0] && V.some(r => r.back)) line += ` | out vs back ${q(E.map((e: any) => e.outB))}, over back ${q(E.map((e: any) => e.overB))}`;
    line += ` | Mike depth ${q(E.map((e: any) => e.mdepth))}, out vs No. 2 ${q(E.map((e: any) => e.mout2))}`;
    console.log(line);
  }
}
