// In-phase man defender through the flight (Integration 2026-11-14, the 39 vs 57% split). For every targeted pass whose
// receiver has a matched man defender (his ManCoverage target at the release), in phase at the release (no more than
// 1.0 yd behind, 1.5 yd side, the receiver's frame): every 0.2 s from the release to the arrival (the ball's closest
// pass): distance, behind / side / over (+ he is deeper), receiver and defender speed, the receiver's heading change
// since the release; the defender's requested velocity (his behaviour's command) against achieved (next tick), the
// request's component toward the receiver, and his behaviour / tags. By route family at the throw. Dozen-play listing.
//   npx tsx scripts/diag/risk/man-phase-trace.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
import { DeepCoverage } from '../../../src/sim/coverage-leverage.js';
import { RouteObservation } from '../../../src/sim/coverage-read.js';
{ const O: any = RouteObservation.prototype, r0 = O.read; O.read = function (cue: any, ...r: any[]) { const out = r0.call(this, cue, ...r); this.__last = { inX: cue.pos.x, outX: out.pos.x, age: cue.age, inVx: cue.vel.x }; return out; }; }
import { facingTechnique as facingTechniqueOf } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 16);
const FAM: Record<string, string> = {};
for (const r of ['go', 'fade', 'seam', 'bender', 'wheel', 'post', 'corner', 'sail']) FAM[r] = 'vertical';
for (const r of ['slant', 'dig', 'in', 'short_in', 'cross', 'shallow', 'shallow_high', 'mesh_under', 'drag', 'over']) FAM[r] = 'in';
for (const r of ['out', 'deep_out', 'flat', 'quick_out', 'speed_out', 'arrow', 'swing']) FAM[r] = 'out';
for (const r of ['curl', 'hitch', 'comeback', 'stick', 'hook', 'stop', 'sit', 'spot']) FAM[r] = 'back';
{ const D: any = DeepCoverage.prototype, c0 = D.choose; D.choose = function (a: any, ...r: any[]) { const out = c0.call(this, a, ...r); a.__deepOverride = out !== r[4] ? (out.vel ? +Math.hypot(out.vel.x, out.vel.y).toFixed(1) : 1) : 0; return out; }; }
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, plays: any[] = [];
const ang = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const label = (d: any) => { const b = d.behavior; const n = b?.constructor?.name ?? '?'; const sub = b?.sub?.constructor?.name; return `${n}${sub ? '/' + sub : ''}${b?.job ? ':' + String(b.job).split(':')[0] : ''}${d.tags?.has('onBall') ? '+onBall' : ''}${d.tags?.has('arm-bite') ? '+armBite' : ''}${d.tags?.has('looking') ? '+looking' : ''}`; };
P.tick = function () {
  const S0 = this.__mp;
  if (S0 && S0.M && this.ball.kind === 'air') {
    // Capture his command this tick: wrap whatever behaviour he is in.
    const M = S0.M, b = M.behavior;
    if (b && !b.__mpWrapped) { const u = b.update.bind(b); b.update = (a: any, sim: any) => { const c = u(a, sim); if (a === M) S0.cmd = c; return c; }; b.__mpWrapped = true; }
  }
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__mp && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target;
    const M = this.defense.find((d: any) => { const b = d.behavior, m = b?.constructor?.name === 'ManCoverage' ? b : b?.sub?.constructor?.name === 'ManCoverage' ? b.sub : null; return m && m.target === T; }) ?? null;
    const h = Math.atan2(T.vel.y, T.vel.x), ux = Math.cos(h), uy = Math.sin(h);
    let ph: any = null;
    if (M && Math.hypot(T.vel.x, T.vel.y) > 2) { const dx = M.pos.x - T.pos.x, dy = M.pos.y - T.pos.y; ph = { behind: -(dx * ux + dy * uy), side: Math.abs(-dx * uy + dy * ux) }; }
    const rid = String(routeOfAgent.get(T) ?? '').split(':').pop() ?? '';
    const mv = M ? Math.atan2(M.vel.y, M.vel.x) : 0, msp = M ? Math.hypot(M.vel.x, M.vel.y) : 0;
    const mode = !M || msp < 1 ? 'slow' : (() => { const o = Math.abs(ang(M.facing, mv)) * 180 / Math.PI; return o > 120 ? 'pedal' : o > 60 ? 'side' : 'run'; })();
    this.__mp = { T, M, rel: this.t, p0: { ...T.pos }, v0: { ...T.vel }, mode, mv, turnAt: null as number | null, h0: h, ph, inPhase: !!ph && ph.behind <= 1.0 && ph.behind >= -1.0 && ph.side <= 1.5, fam: FAM[rid] ?? `other:${rid}`, rid, best: Infinity, tArr: this.t, trace: [] as any[], next: this.t, cmd: null, play: plays.length };
  }
  const S = this.__mp;
  if (S && S.M && S.inPhase && this.ball.kind === 'air') {
    const T = S.T, M = S.M, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    if (dh < S.best) { S.best = dh; S.tArr = this.t; S.ball = { x: b.x, y: b.y }; }
    if (S.turnAt === null && S.ball) { const need = Math.atan2(T.pos.y - M.pos.y, T.pos.x - M.pos.x), sp = Math.hypot(M.vel.x, M.vel.y);
      if (sp > 2 && Math.abs(ang(Math.atan2(M.vel.y, M.vel.x), need)) < Math.PI / 6) S.turnAt = this.t - S.rel; }
    if (this.t >= S.next - 1e-9) {
      S.next += 0.2;
      const h = Math.atan2(T.vel.y, T.vel.x), ux = Math.cos(h), uy = Math.sin(h), dx = M.pos.x - T.pos.x, dy = M.pos.y - T.pos.y, dist = Math.hypot(dx, dy);
      const req = S.cmd?.vel ?? null, toR = { x: -dx / (dist || 1), y: -dy / (dist || 1) };
      S.trace.push({ dt: +(this.t - S.rel).toFixed(2), dist, behind: -(dx * ux + dy * uy), side: Math.abs(-dx * uy + dy * ux), over: (M.pos.x - T.pos.x) * this.attackDir('O'),
        rsp: Math.hypot(T.vel.x, T.vel.y), dsp: Math.hypot(M.vel.x, M.vel.y), rturn: Math.abs(ang(h, S.h0)) * 180 / Math.PI,
        req: req ? Math.hypot(req.x, req.y) : null, reqTo: req ? req.x * toR.x + req.y * toR.y : null, achTo: M.vel.x * toR.x + M.vel.y * toR.y, lab: label(M) + (S.cmd ? '[' + (facingTechniqueOf(S.cmd)?.label ?? '-') + (M.tags?.has('carry-hold') ? ',hold' : '') + (M.__deepOverride ? `,deep${M.__deepOverride}` : '') + (M.__deepDbg ? `,dbg${JSON.stringify(M.__deepDbg)}` : '') + (() => { const mc = M.behavior?.constructor?.name === 'ManCoverage' ? M.behavior : M.behavior?.sub; const l = mc?.observation?.__last; return l ? `,tgt ${mc.target?.slot}/T ${T.slot},obs in${(l.inX - T.pos.x).toFixed(1)} vsTgt${(l.inX - (mc.target?.pos.x ?? 0)).toFixed(1)} out${(l.outX - T.pos.x).toFixed(1)} age${(l.age ?? 0).toFixed(2)} vx${l.inVx.toFixed(1)}` : ''; })() + (() => { const mc = M.behavior?.constructor?.name === 'ManCoverage' ? M.behavior : M.behavior?.sub; return mc ? `,rel${mc.releaseObserved ? 1 : 0},pd${mc.opts?.protectDepth ? 1 : 0},ot${mc.opts?.overTop ? 1 : 0},open${mc.hipsOpen ? 1 : 0}` : ''; })() + ']' : ''), seenErr: (() => { const sv = this.see(M, T); return +Math.hypot(sv.pos.x - T.pos.x, sv.pos.y - T.pos.y).toFixed(1); })() });
    }
  }
  return r;
};
P.buildResult = function (...x: any[]) {
  const res = b0.apply(this, x), S = this.__mp;
  if (S?.M && S.inPhase && S.ball) {
    const h = Math.atan2(S.v0.y, S.v0.x), ux = Math.cos(h), uy = Math.sin(h), fl = S.tArr - S.rel;
    const px = S.p0.x + S.v0.x * fl, py = S.p0.y + S.v0.y * fl;
    S.along = (S.ball.x - px) * ux + (S.ball.y - py) * uy;
    const toArr = Math.atan2(S.ball.y - S.M.pos.y, S.ball.x - S.M.pos.x);
    S.needTurn = Math.abs(ang(toArr, S.mv)) * 180 / Math.PI;
  }
  if (S?.M && S.inPhase) { S.cmp = !!this.stats?.completed; S.flight = S.tArr - S.rel; S.trace = S.trace.filter((p: any) => p.dt <= S.flight + 1e-9); plays.push(S); }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
const med = (v: any[]) => { v = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : v[Math.floor(v.length / 2)].toFixed(2); };
console.log(`== man-phase-trace BALL_EST=${process.env.BALL_EST ?? 0} seed ${seed} games ${games}: in-phase targets ${plays.length}`);
for (const fam of ['all', 'vertical', 'in', 'out', 'back']) {
  const R = plays.filter((p) => fam === 'all' || p.fam === fam);
  if (R.length < 5) continue;
  const at = (k: number) => R.map((p) => p.trace.find((q: any) => Math.abs(q.dt - k) < 0.05)).filter(Boolean);
  const arr = R.map((p) => p.trace.at(-1)).filter(Boolean);
  const cells = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((k) => { const A = at(k); return A.length >= 5 ? `${k.toFixed(1)}s ${med(A.map((q: any) => q.dist))}/${med(A.map((q: any) => q.over))}` : null; }).filter(Boolean).join(' ');
  console.log(`${fam.padEnd(9)} n ${String(R.length).padStart(3)} complete ${Math.round(100 * R.filter((p) => p.cmp).length / R.length)}% flight ${med(R.map((p) => p.flight))} | dist/over by time: ${cells} | arrival ${med(arr.map((q: any) => q.dist))}/${med(arr.map((q: any) => q.over))} | rcv speed rel ${med(R.map((p) => p.trace[0]?.rsp))} -> arr ${med(arr.map((q: any) => q.rsp))}, turn ${med(arr.map((q: any) => q.rturn))} deg | def speed ${med(R.map((p) => p.trace[0]?.dsp))} -> ${med(arr.map((q: any) => q.dsp))} | requested toward rcv ${med(R.flatMap((p) => p.trace.map((q: any) => q.reqTo)))} achieved ${med(R.flatMap((p) => p.trace.map((q: any) => q.achTo)))} yd/s`);
}
const awayReq = plays.filter((p) => p.trace.filter((q: any) => q.reqTo != null && q.reqTo < -1).length >= 2);
const al: Record<string, number> = {}; for (const p of awayReq) for (const q of p.trace) if (q.reqTo != null && q.reqTo < -1) al[`${p.fam} ${q.lab}`] = (al[`${p.fam} ${q.lab}`] ?? 0) + 1;
console.log(`away-requests (2+ samples asking > 1 yd/s away from his man): ${awayReq.length} of ${plays.length} plays | ` + Object.entries(al).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', '));
for (const fam of ['vertical', 'in', 'out', 'back']) {
  const R = plays.filter((p) => p.fam === fam);
  if (R.length < 5) continue;
  const md: Record<string, number> = {}; for (const p of R) md[p.mode] = (md[p.mode] ?? 0) + 1;
  console.log(`${fam.padEnd(9)} ball vs his constant-velocity line: along ${med(R.map((p) => p.along))} yd (+ long) | defender at the release: ${Object.entries(md).map(([k, v]) => `${k} ${Math.round(100 * v / R.length)}%`).join(' ')} | heading change to the catch ${med(R.map((p) => p.needTurn))} deg | time to head at his man (within 30 deg, 2+ yd/s) ${med(R.map((p) => p.turnAt))} s (never ${Math.round(100 * R.filter((p) => p.turnAt === null).length / R.length)}%)`);
}
if (process.env.AWAY_LIST) for (const p of awayReq.slice(0, 10)) console.log(`AWAY #${p.play} ${p.rid}(${p.fam}) ${p.cmp ? 'C' : 'I'} | ` + p.trace.map((q: any) => `${q.dt}: d${q.dist.toFixed(1)} beh${q.behind.toFixed(1)} o${q.over.toFixed(1)} rv${q.rsp.toFixed(1)}/${q.rturn.toFixed(0)}deg mv${q.dsp.toFixed(1)} req${q.req == null ? '-' : q.req.toFixed(1)}/to${q.reqTo == null ? '-' : q.reqTo.toFixed(1)} seenErr${q.seenErr} ${q.lab}`).join(' | '));
const labs: Record<string, number> = {}; for (const p of plays) for (const q of p.trace) labs[q.lab] = (labs[q.lab] ?? 0) + 1;
const tot = Object.values(labs).reduce((a, b) => a + b, 0);
console.log('behaviour during flight (share of samples):', Object.entries(labs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${Math.round(100 * v / tot)}%`).join(', '));
console.log('--- dozen plays (in phase at the release):');
for (const p of plays.slice(0, 12)) console.log(`#${p.play} ${p.rid}(${p.fam}) ${p.cmp ? 'C' : 'I'} flight ${p.flight.toFixed(2)} | release behind ${p.ph.behind.toFixed(2)} side ${p.ph.side.toFixed(2)} | ` + p.trace.map((q: any) => `${q.dt}: d${q.dist.toFixed(1)} o${q.over.toFixed(1)} r${q.rsp.toFixed(1)}/${q.rturn.toFixed(0)}° m${q.dsp.toFixed(1)} req${q.reqTo == null ? '-' : q.reqTo.toFixed(1)} ach${q.achTo.toFixed(1)} ${q.lab}`).join(' | '));
