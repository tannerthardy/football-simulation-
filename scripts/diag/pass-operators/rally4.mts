/** The rally from 4+ yd on short zone catches, sim side with requests (Defense; report only). Population as rally4.py:
 * zone calls, a completion caught 0-10 yd past the line where the underneath LB/DB nearest the catch point at the throw
 * (past the line, <= 12 yd deep, > 3 yd from the QB) is 4+ yd from the catcher at the catch. The two defenders nearest
 * the catcher at the catch, every tick (0.05 s) from the catch until he is within 1 yd, the play ends, or +2.0 s:
 *  - requested vs achieved speed; the requested and achieved heading off the line to the catcher (0 = at him);
 *  - mode: catch-carry tag, pursuit intercept, chase:<planner>:<last request stage>, else the behaviour's kind;
 *  - request direction changes > 20 deg between ticks (both > 1 yd/s), undone within 0.3 s (dither), mode switches;
 *    the achieved speed change over the next tick after each, against steady ticks;
 *  - each change: after a new cue in his picture of the catcher (perceived heading turned > 20 deg or speed changed
 *    > 1 yd/s over the previous 0.2 s) or the same picture re-scored.
 * usage: node --import tsx scripts/diag/pass-operators/rally4.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { containCoverage } from '../../../src/sim/coverage-space.js';
const games = Number(process.argv[2] ?? 16), seed0 = Number(process.argv[3] ?? 101);
const DL = /^(DE|DT|NT|DL)/, UND = /^(LB|MLB|ILB|OLB|SAM|WILL|MIKE|CB|NB|DB|S|SS|FS)/;
const ang = (a: any, b: any) => Math.abs(((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180 / Math.PI + 540) % 360 - 180);
const St = new WeakMap<object, any>(); const traces: any[] = []; const yac: number[] = [];
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const s = St.get(this);
  if (!s?.D || s.done || !s.D.includes(a)) return tc0.call(this, a);
  return new Proxy({}, { get: (_o, k) => k === 'pursuit' ? (_t: any, d: any) => { s.pur.set(a, d); } : () => undefined }) as any;
};
const decide0 = (PlaySim.prototype as any).decide;
(PlaySim.prototype as any).decide = function (this: any, i: number, t: number) {
  const s = St.get(this), a = this.agents[i];
  if (!s?.D || s.done || !s.D.includes(a)) return decide0.call(this, i, t);
  const b = a.behavior, up = b.update; let out: any = null;
  b.update = (...args: any[]) => (out = up.apply(b, args));
  try { decide0.call(this, i, t); } finally { b.update = up; }
  const cov = b.kind === 'man' || b.kind === 'zone';
  // what containment alone would make of the behaviour's output, from the same body state
  let contained: any = null;
  // decide() does not move the body, so his state is the one containment saw
  if (out && cov) contained = containCoverage(a, out).vel;
  s.dec.set(a, { upd: out ? { ...out.vel } : null, cmd: { ...this.cmds[i].vel }, cov, contained, side: Math.min(a.pos.y, 53.33 - a.pos.y) });
};
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this;
  let s = St.get(sim);
  if (!s) { s = { cand: null, D: null, c: null, t0: 0, done: false, pur: new Map(), dec: new Map(), T: new Map(), cx: 0 }; St.set(sim, s); }
  if (s.D && !s.done) s.pur.clear();
  const wasAir = sim.ball.kind === 'air';
  tick0.call(this);
  if (s.done || sim.offCall?.kind !== 'pass' || sim.defCall.coverage.man) return;
  if (!s.cand && sim.ball.kind === 'air') {
    const qb = sim.qb;
    s.cand = sim.defense.filter((d: any) => !DL.test(d.slot) && UND.test(d.slot) && d.pos.x - sim.los >= 1 && d.pos.x - sim.los <= 12
      && !(qb && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) < 3)).map((d: any) => ({ d, p: { ...d.pos } }));
    return;
  }
  if (!s.D) {
    if (!s.cand) return;
    if (sim.ball.kind === 'air') return;
    const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (!wasAir || !c || c.team !== 'O' || c === sim.qb) { s.done = true; return; }
    const depth = c.pos.x - sim.los;
    if (depth < 0 || depth > 10 || !s.cand.length) { s.done = true; return; }
    const u = s.cand.reduce((b: any, x: any) => Math.hypot(x.p.x - c.pos.x, x.p.y - c.pos.y) < Math.hypot(b.p.x - c.pos.x, b.p.y - c.pos.y) ? x : b).d;
    if (Math.hypot(u.pos.x - c.pos.x, u.pos.y - c.pos.y) < 4) { s.done = true; return; }
    s.D = [...sim.defense].sort((p: any, q: any) => Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) - Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y)).slice(0, 2);
    Object.assign(s, { c, t0: sim.t, cx: c.pos.x }); s.D.forEach((d: any, i: number) => s.T.set(d, { rank: i + 1, rows: [], reached: null, open: true }));
    return;
  }
  const { c } = s, dt = sim.t - s.t0;
  const live = sim.ball.kind === 'held' && sim.ball.carrier === c && dt <= 2.0;
  for (const d of s.D) {
    const T = s.T.get(d); if (!T.open) continue;
    const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    if (!live || dist <= 1.0) { T.open = false; if (dist <= 1.0 && live) T.reached = dt; continue; }
    const it = sim.intents?.[d.idx]; const req = it ? { ...it.vel } : { x: 0, y: 0 };
    const line = { x: c.pos.x - d.pos.x, y: c.pos.y - d.pos.y };
    const pur = s.pur.get(d);
    const mode = d.tags.has('catch-carry') ? 'carry' : pur ? (pur.kind === 'intercept' ? 'intercept' : `chase:${pur.planner}:${pur.requests?.at(-1)?.stage ?? '-'}`) : (d.behavior?.kind ?? d.behavior?.constructor?.name ?? '?');
    const seen = sim.see(d, c);
    const stg: Record<string, any> = {}; if (pur?.kind === 'chase') for (const r of pur.requests ?? []) stg[r.stage] = { ...r.command.vel };
    const dc = s.dec.get(d); if (dc) { stg.update = dc.upd; stg.cmd = dc.cmd; stg.cov = dc.cov; stg.contained = dc.contained; stg.side = dc.side; }
    T.rows.push({ stg, gather: pur?.gather, t: dt, dist, req, rq: Math.hypot(req.x, req.y), ac: Math.hypot(d.vel.x, d.vel.y), reqOff: Math.hypot(req.x, req.y) > .5 ? ang(line, req) : NaN,
      acOff: Math.hypot(d.vel.x, d.vel.y) > .5 ? ang(line, d.vel) : NaN, mode, sv: { ...seen.vel } });
  }
  if (!live || [...s.T.values()].every((T: any) => !T.open)) {
    s.done = true; yac.push(c.pos.x - s.cx); for (const T of s.T.values()) traces.push(T);
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = (x: number) => x.toFixed(1)) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [.25, .5, .75].map(p => f(w[Math.floor(p * (w.length - 1))])).join('/') : '-'; };
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
console.log(`rally from 4+ yd (${games} games from ${seed0}): plays ${yac.length}; YAC (to the carrier's x at trace end) p50 ${q(yac)}`);
for (const rank of [1, 2]) {
  const T = traces.filter(x => x.rank === rank);
  const time = T.reduce((a, x) => a + x.rows.length * 0.05, 0);
  let changes = 0, dither = 0, switches = 0, cueCh = 0, cueSw = 0; const dvC: number[] = [], dvS: number[] = [], dvSw: number[] = [];
  const swPairs: Record<string, number> = {}, modes: Record<string, number> = {}, stageSrc: Record<string, number> = {}, otherSrc: Record<string, number> = {}; let atSwitch = 0; const allSrc: Record<string, number> = {}; const srcDv: Record<string, number[]> = {}; const contain: Record<string, number> = { containment: 0, 'not containment': 0 }; const sides: number[] = [];
  for (const x of T) {
    const R = x.rows; const pend: { before: any; i: number }[] = [];
    for (let i = 0; i < R.length; i++) {
      modes[R[i].mode] = (modes[R[i].mode] ?? 0) + 1;
      if (i === 0) continue;
      const p = R[i - 1], r = R[i];
      const j = Math.max(0, i - 4), sv0 = R[j].sv, sv1 = r.sv;
      const cue = (Math.hypot(sv0.x, sv0.y) > 1 && Math.hypot(sv1.x, sv1.y) > 1 && ang(sv0, sv1) > 20) || Math.abs(Math.hypot(sv1.x, sv1.y) - Math.hypot(sv0.x, sv0.y)) > 1;
      const next = R[i + 1];
      const changed = r.rq > 1 && p.rq > 1 && ang(p.req, r.req) > 20;
      if (changed && r.mode === p.mode && r.mode.startsWith('chase:used')) {
        const src = ['intercept-sprint', 'approach-and-gather', 'around-bodies', 'update', 'cmd'].find(k => p.stg[k] && r.stg[k] && Math.hypot(p.stg[k].x, p.stg[k].y) > 1 && Math.hypot(r.stg[k].x, r.stg[k].y) > 1 && ang(p.stg[k], r.stg[k]) > 20) ?? 'intent (contact technique)';
        stageSrc[src] = (stageSrc[src] ?? 0) + 1;
        if (src === 'cmd') { const c = r.stg; const ex = c.contained && Math.hypot(c.contained.x - c.cmd.x, c.contained.y - c.cmd.y) < 1e-6; contain[ex ? 'containment' : 'not containment']++; sides.push(c.side); }
      }
      if (changed && r.mode === p.mode && !r.mode.startsWith('chase:used')) {
        const src = ['update', 'cmd'].find(k => p.stg[k] && r.stg[k] && Math.hypot(p.stg[k].x, p.stg[k].y) > 1 && Math.hypot(r.stg[k].x, r.stg[k].y) > 1 && ang(p.stg[k], r.stg[k]) > 20) ?? 'intent (contact technique)';
        const key = `${r.mode.split(':').slice(0, 2).join(':')}: ${src}`; otherSrc[key] = (otherSrc[key] ?? 0) + 1;
      }
      if (changed) {
        const turned = (k: string) => p.stg[k] && r.stg[k] && Math.hypot(p.stg[k].x, p.stg[k].y) > 1 && Math.hypot(r.stg[k].x, r.stg[k].y) > 1 && ang(p.stg[k], r.stg[k]) > 20;
        const stopped = (k: string) => p.stg[k] && r.stg[k] && (Math.hypot(p.stg[k].x, p.stg[k].y) > 1) !== (Math.hypot(r.stg[k].x, r.stg[k].y) > 1);
        const src = r.mode !== p.mode ? 'mode switch' : (turned('update') || stopped('update')) ? 'behaviour / planner'
          : (turned('cmd') || stopped('cmd')) ? (r.stg.contained && Math.hypot(r.stg.contained.x - r.stg.cmd.x, r.stg.contained.y - r.stg.cmd.y) < 1e-6 ? 'coverage containment' : 'decide (other)') : 'contact technique (intent)';
        allSrc[src] = (allSrc[src] ?? 0) + 1; if (dvC.length < 1e9 && next) (srcDv[src] ??= []).push(next.ac - r.ac);
      }
      if (changed) { changes++; if (cue) cueCh++; if (r.mode !== p.mode) atSwitch++; pend.push({ before: p.req, i }); if (next) dvC.push(next.ac - r.ac); }
      else if (next) dvS.push(next.ac - r.ac);
      for (let k = pend.length - 1; k >= 0; k--) { if ((i - pend[k].i) * 0.05 > 0.3 + 1e-9) { pend.splice(k, 1); continue; } if (i > pend[k].i && r.rq > 1 && ang(pend[k].before, r.req) <= 20) { dither++; pend.splice(k, 1); } }
      if (r.mode !== p.mode) { switches++; if (cue) cueSw++; const key = `${p.mode} -> ${r.mode}`; swPairs[key] = (swPairs[key] ?? 0) + 1; if (next) dvSw.push(next.ac - r.ac); }
    }
  }
  const got = T.filter(x => x.reached !== null);
  console.log(`  defender ${rank}: n ${T.length}, within 1 yd by +2.0 s ${(100 * got.length / T.length).toFixed(0)}% (time ${q(got.map(x => x.reached), v => v.toFixed(2))} s); traced ${time.toFixed(0)} s`);
  console.log(`    request changes > 20 deg ${(changes / time).toFixed(2)}/s, dither ${(100 * dither / Math.max(1, changes)).toFixed(0)}%, after a new cue ${(100 * cueCh / Math.max(1, changes)).toFixed(0)}% | mode switches ${(switches / time).toFixed(2)}/s, after a new cue ${(100 * cueSw / Math.max(1, switches)).toFixed(0)}%`
    + ` | next-tick speed change: after a request change ${mean(dvC).toFixed(3)}, after a switch ${mean(dvSw).toFixed(3)}, steady ${mean(dvS).toFixed(3)} yd/s`);
  for (const k of [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2]) {
    const X = T.map(x => x.rows.find((r: any) => r.t >= k - 1e-6 && r.t < k + 0.05 - 1e-6)).filter(Boolean);
    if (X.length < 5) continue;
    const m: Record<string, number> = {}; for (const r of X) m[r.mode] = (m[r.mode] ?? 0) + 1;
    console.log(`    +${k.toFixed(1)} s n ${String(X.length).padStart(3)}: dist ${q(X.map((r: any) => r.dist))} | requested ${q(X.map((r: any) => r.rq))} / achieved ${q(X.map((r: any) => r.ac))} yd/s | heading off the catcher: requested ${q(X.map((r: any) => r.reqOff), v => v.toFixed(0))} / achieved ${q(X.map((r: any) => r.acOff), v => v.toFixed(0))} deg | `
      + Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a, b]) => `${a} ${b}`).join(', '));
  }
  console.log(`    request changes at a mode switch ${(100 * atSwitch / Math.max(1, changes)).toFixed(0)}%; within the chase planner, first stage that turned: ` + Object.entries(stageSrc).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(', ') + ' | other modes: ' + Object.entries(otherSrc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, b]) => `${a} ${b}`).join(', '));
  console.log('    every request change by first source: ' + Object.entries(allSrc).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${(100 * b / Math.max(1, changes)).toFixed(0)}% (next tick ${mean(srcDv[a] ?? []).toFixed(3)})`).join(', '));
  console.log(`    'cmd' turns: ${Object.entries(contain).map(([a, b]) => a + ' ' + b).join(', ')}; his distance to the sideline then p25/p50/p75 ${q(sides)}`);
  console.log('    modes (ticks): ' + Object.entries(modes).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([a, b]) => `${a} ${b}`).join(', '));
  console.log('    switches: ' + Object.entries(swPairs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, b]) => `${a} ${b}`).join(' | '));
}
