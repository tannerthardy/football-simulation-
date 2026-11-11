/** Cushion trace from the snap, same definitions as nflcushion.py (Defense, C9; report only). Sim.
 * usage: node --import tsx scripts/diag/pass-matrix/simcushion.mts [games] [seed]; set CUSHION_BREAK to compare arms.
 * Pairs at 1.0 s (CB/FS/SS 2+ yd over a receiver within 8 yd), kept when the receiver climbs > 3 yd/s at 1.5 s.
 * Marks 0/0.5/1.0/1.5/2.0 s before the release: depth from the LOS, cushion, his vx and speed, facing class to the QB,
 * receiver vx; plus requested vx/speed (the command) vs achieved. First retreat: first tick his vx > 1 yd/s. */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/defense.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const FAM: Record<string, string> = { cover2: 'C2', tampa2: 'C2', cover3: 'C3', cover4: 'C4', cover6: 'C6' };
const MARKS = [0, 0.5, 1.0, 1.5, 2.0];
const St = new WeakMap<object, any>(); const rows: any[] = [];
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind === 'run') return tick0.call(this);
  const fam = FAM[(COVERAGE_BY_ID as any)[sim.defCall.coverage.id]?.family ?? ''];
  if (!fam) return tick0.call(this);
  let s = St.get(sim); if (!s) { s = { snaps: {}, first: new Map(), pairs: null, done: false, t0: sim.t }; St.set(sim, s); }
  tick0.call(this);
  if (s.done) return;
  const air = sim.ball?.kind === 'air';
  const t = sim.t - s.t0;
  for (const d of sim.defense) if (/^(CB|FS|SS)/.test(d.slot) && !s.first.has(d) && d.vel.x > 1 && !air) s.first.set(d, t);
  for (const m of MARKS) if (!(m in s.snaps) && t >= m - 1e-9) {
    if (air) { s.snaps[m] = null; continue; }
    const snap = new Map();
    for (const a of sim.agents) {
      const toQB = Math.atan2(sim.qb.pos.y - a.pos.y, sim.qb.pos.x - a.pos.x);
      const ang = Math.abs(Math.atan2(Math.sin(a.body.facing - toQB), Math.cos(a.body.facing - toQB))) * 180 / Math.PI;
      const c = sim.cmds?.[a.idx];
      snap.set(a, { x: a.pos.x, vx: a.vel.x, spd: Math.hypot(a.vel.x, a.vel.y), face: ang <= 45 ? 'square' : ang <= 135 ? 'side-on' : 'turned',
        rvx: c?.vel?.x ?? NaN, rspd: c ? Math.hypot(c.vel.x, c.vel.y) : NaN, label: c ? facingTechnique(c)?.label ?? null : null });
    }
    s.snaps[m] = snap;
  }
  const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  if (!s.pairs && t >= 1.0 - 1e-9) {
    s.pairs = [];
    if (!air) for (const d of sim.defense) {
      if (!/^(CB|FS|SS)/.test(d.slot)) continue;
      const c = recs.map((r: any) => [Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y), r]).filter(([dd, r]: any) => dd < 8 && d.pos.x - r.pos.x > 2).sort((a: any, b: any) => a[0] - b[0]);
      if (c.length) s.pairs.push({ d, r: c[0][1] });
    }
  }
  if (s.pairs && (air || t >= 2.0 + 1e-9 && 2.0 in s.snaps)) {
    if (!air && !(2.0 in s.snaps)) return;
    s.done = true;
    const s15 = s.snaps[1.5];
    for (const { d, r } of s.pairs) {
      if (!s15 || !(s15.get(r).vx > 3)) continue;
      const row: any = { retreat: s.first.get(d) ?? null, fam };
      for (const m of MARKS) {
        const sn = s.snaps[m]; if (!sn) continue;
        const D = sn.get(d), R = sn.get(r);
        row[m] = { depth: D.x - sim.los, cushion: D.x - R.x, vx: D.vx, spd: D.spd, face: D.face, rvx: R.vx, reqvx: D.rvx, reqspd: D.rspd, label: D.label };
      }
      rows.push(row);
    }
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
const f = (x: number, sgn = false) => (sgn && x >= 0 ? '+' : '') + x.toFixed(1);
console.log(`sim deep defenders over a vertical stem (${games} games from ${seed0}, CUSHION_BREAK ${process.env.CUSHION_BREAK ?? 'default'}): n ${rows.length}; first retreat p50 ${f(q(rows.map(r => r.retreat).filter(x => x !== null)))} s`);
console.log('  t    n     depth  cushion  his vx (req)  speed (req)  receiver vx | speed by facing (share): square / side-on / turned | side-on req/achieved');
for (const m of MARKS) {
  const X = rows.map(r => r[m]).filter(Boolean); if (!X.length) continue;
  const fc = ['square', 'side-on', 'turned'].map(c => X.filter(x => x.face === c));
  const so = fc[1];
  console.log(`  ${m.toFixed(1)}  ${String(X.length).padStart(5)}  ${f(q(X.map(x => x.depth))).padStart(5)}  ${f(q(X.map(x => x.cushion))).padStart(6)}  ${f(q(X.map(x => x.vx)), true)} (${f(q(X.map(x => x.reqvx)), true)})  ${f(q(X.map(x => x.spd)))} (${f(q(X.map(x => x.reqspd)))})  ${f(q(X.map(x => x.rvx)), true).padStart(6)}   | `
    + fc.map(V => `${f(q(V.map(x => x.spd)))} (${(100 * V.length / X.length).toFixed(0)}%)`).join(' / ') + ` | ${f(q(so.map(x => x.reqspd)))}/${f(q(so.map(x => x.spd)))}`);
}
const L: Record<string, number> = {}; for (const r of rows) for (const m of [1.5, 2.0]) if (r[m]?.face === 'turned') { const k = r[m].label ?? 'none'; L[k] = (L[k] ?? 0) + 1; }
console.log('  turned at 1.5/2.0 s by label: ' + Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', '));
