/** Settled-catch trace (Defense; report only). Zone calls. A completion caught 3-10 yd past the line with the catcher
 * under 2 yd/s when the ball reaches him; the nearest non-DL defender then within 3.5 yd. From the arrival tick to +1.0 s:
 * per 0.1 s the defender's distance, requested and achieved speed, the angle between them, his speed toward the catcher,
 * his mode (drive-catch while the ball is being secured, pursuit through chase(), or the coverage controller), and the
 * catcher's speed and heading. Catcher's turn: the side he accelerates to relative to the defender's momentum.
 * Prints the aggregate and the first 20 plays. */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const games = Number(process.argv[2] ?? 16), seed0 = Number(process.argv[3] ?? 101);
const DL = /^(DE|DT|NT|DL)/;
const St = new WeakMap<object, any>(); const plays: any[] = [];
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const s = St.get(this);
  if (!s || !s.d || s.done || a !== s.d) return tc0.call(this, a);
  return new Proxy({}, { get: (_o, k) => k === 'pursuit' ? (_t: any, d: any) => { s.pur = d; } : () => undefined }) as any;
};
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this;
  let s = St.get(sim);
  if (!s) { s = { thrown: false, d: null, c: null, t0: 0, rows: [], done: false, pur: null }; St.set(sim, s); }
  if (s.d && !s.done) { s.pur = null; s.d.tags.delete('drive-catch'); }
  tick0.call(this);
  if (s.done || sim.offCall?.kind !== 'pass' || sim.defCall.coverage.man) return;
  if (sim.ball.kind === 'air') {
    s.thrown = true;
    const sec = sim.ball.securing;
    if (sec && !s.d) {
      const c = sec.receiver, depth = c.pos.x - sim.los;
      if (depth < 3 || depth > 10 || Math.hypot(c.vel.x, c.vel.y) >= 2) { s.done = true; return; }
      const D = sim.defense.filter((d: any) => !DL.test(d.slot));
      const d = D.sort((p: any, q: any) => Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) - Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y))[0];
      if (!d || Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) > 3.5) { s.done = true; return; }
      Object.assign(s, { d, c, t0: sim.t, d0: { ...d.vel } });
    }
  } else if (s.thrown && !s.d) { s.done = true; return; }
  if (!s.d) return;
  const { d, c } = s, dt = sim.t - s.t0;
  if (dt > 1.0 || (sim.ball.kind === 'held' && sim.ball.carrier !== c) || (sim.ball.kind !== 'air' && sim.ball.kind !== 'held')) {
    if (sim.ball.kind === 'held' && sim.ball.carrier === c || dt > 1.0) finish(s, sim); else s.done = true; return;
  }
  const cmd = sim.cmds?.[sim.agents.indexOf(d)] ?? { vel: { x: 0, y: 0 } };
  const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
  const ux = (c.pos.x - d.pos.x) / (dist || 1), uy = (c.pos.y - d.pos.y) / (dist || 1);
  const mode = d.tags.has('drive-catch') ? 'drive-catch' : s.pur ? `pursuit:${s.pur.planner ?? s.pur.kind}` : sim.ball.kind === 'air' ? `air:${facingTechnique(cmd)?.label ?? 'flight'}` : `${facingTechnique(cmd)?.label ?? d.behavior?.constructor?.name}`;
  const rq = Math.hypot(cmd.vel.x, cmd.vel.y), ac = Math.hypot(d.vel.x, d.vel.y);
  const off = rq > .3 && ac > .3 ? Math.abs(Math.atan2(cmd.vel.x * d.vel.y - cmd.vel.y * d.vel.x, cmd.vel.x * d.vel.x + cmd.vel.y * d.vel.y)) * 180 / Math.PI : 0;
  s.rows.push({ t: dt, dist, rq, ac, off, toward: d.vel.x * ux + d.vel.y * uy, mode, secured: sim.ball.kind === 'held',
    cs: Math.hypot(c.vel.x, c.vel.y), cv: { ...c.vel }, dv: { ...d.vel } });
};
function finish(s: any, sim: any) {
  s.done = true; const R = s.rows; if (R.length < 3) return;
  const minD = Math.min(...R.map((r: any) => r.dist));
  // the catcher's turn: the side his velocity goes at +0.5 s relative to the defender's velocity at the catch
  const r5 = R.find((r: any) => r.t >= 0.5) ?? R[R.length - 1];
  const crossSide = Math.sign(s.d0.x * r5.cv.y - s.d0.y * r5.cv.x);
  const dotSame = s.d0.x * r5.cv.x + s.d0.y * r5.cv.y;
  const turn = Math.hypot(r5.cv.x, r5.cv.y) < 1 ? 'still' : dotSame > 0 ? 'with his momentum' : 'against his momentum';
  const tSec = R.find((r: any) => r.secured)?.t ?? NaN;
  const t2 = R.find((r: any) => r.cs >= 2 && r.secured)?.t ?? NaN;
  plays.push({ R, minD, turn, tSec, t2, reached: minD <= 1.0 });
}
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)] : NaN; };
console.log(`settled-catch trace (${games} games from ${seed0}): plays ${plays.length}; reached within 1.0 yd by +1.0 s ${(100 * plays.filter(p => p.reached).length / plays.length).toFixed(0)}%; secured at +${med(plays.map(p => p.tSec)).toFixed(2)} s; catcher 2+ yd/s after securing at +${med(plays.map(p => p.t2)).toFixed(2)} s`);
for (const k of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
  const X = plays.map(p => p.R.find((r: any) => r.t >= k - 1e-6)).filter(Boolean);
  const modes: Record<string, number> = {}; for (const r of X) modes[r.mode] = (modes[r.mode] ?? 0) + 1;
  console.log(`  +${k.toFixed(1)} s n ${X.length}: dist ${med(X.map((r: any) => r.dist)).toFixed(1)}, requested ${med(X.map((r: any) => r.rq)).toFixed(1)} / achieved ${med(X.map((r: any) => r.ac)).toFixed(1)} yd/s, off ${med(X.map((r: any) => r.off)).toFixed(0)} deg, toward him ${med(X.map((r: any) => r.toward)).toFixed(1)} | ` +
    Object.entries(modes).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, v]) => `${m} ${v}`).join(', '));
}
for (const grp of [true, false]) {
  const P = plays.filter(p => p.reached === grp); if (!P.length) continue;
  const tc: Record<string, number> = {}; for (const p of P) tc[p.turn] = (tc[p.turn] ?? 0) + 1;
  console.log(`  ${grp ? 'reached' : 'never reached'} n ${P.length}: catcher turns ` + Object.entries(tc).map(([k, v]) => `${k} ${v}`).join(', '));
}
console.log('  first 20 plays (t: dist / req / ach / toward / mode):');
for (const p of plays.filter(p => !p.reached).concat(plays.filter(p => p.reached)).slice(0, 20)) {
  console.log(`   ${p.reached ? 'reach' : 'NEVER'} turn ${p.turn}: ` + [0, 0.2, 0.4, 0.6, 0.8].map(k => { const r = p.R.find((r: any) => r.t >= k - 1e-6); return r ? `${k.toFixed(1)}:${r.dist.toFixed(1)}/${r.rq.toFixed(1)}/${r.ac.toFixed(1)}/${r.toward.toFixed(1)}/${r.mode}` : ''; }).join('  '));
}
