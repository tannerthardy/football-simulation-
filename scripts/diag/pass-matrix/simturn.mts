/** When does our deep defender open and run? Same definitions as nflturn.py (Defense, C9; report only).
 * League-sampled games. Pass plays in Cover 2/3/4/6 calls; deep defenders (CB/FS/SS slots) 2+ yd deeper than a
 * receiver within 8 yd of him at 1.0 s after the snap (his receiver: the nearest such one). Through the stem (snap
 * to release): turn = first tick his body facing is more than 135 deg off the line to the QB; at the turn his cushion,
 * the receiver's closing rate, the time, and the technique label / job that turned him. Split by the receiver's state
 * at the release (climbing over 3 yd/s vs not).
 * usage: node --import tsx scripts/diag/pass-matrix/simturn.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/defense.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';

const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const FAM: Record<string, string> = { cover2: 'C2', tampa2: 'C2', cover3: 'C3', cover4: 'C4', cover6: 'C6' };
const S = new WeakMap<object, any>(); const R: Record<string, any[]> = {};
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  tick0.call(this); const sim = this;
  if (sim.offCall?.kind === 'run') return;
  const fam = FAM[(COVERAGE_BY_ID as any)[sim.defCall.coverage.id]?.family ?? ''];
  if (!fam) return;
  let s = S.get(sim); if (!s) { s = { pairs: null, done: false }; S.set(sim, s); }
  if (s.done) return;
  const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  if (!s.pairs && sim.t >= 1.0 - 1e-9) {
    s.pairs = [];
    for (const d of sim.defense) {
      if (!/^(CB|FS|SS)/.test(d.slot)) continue;
      const c = recs.map((r: any) => [Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y), r]).filter(([dd, r]: any) => dd < 8 && d.pos.x - r.pos.x > 2).sort((a: any, b: any) => a[0] - b[0]);
      if (c.length) s.pairs.push({ d, r: c[0][1], turn: null, prevD: { ...d.pos }, prevR: { ...c[0][1].pos } });
    }
  }
  if (s.pairs) for (const pr of s.pairs) {
    const { d, r } = pr;
    if (!pr.turn && sim.ball?.kind !== 'air') {
      const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
      const a = Math.abs(Math.atan2(Math.sin(d.body.facing - toQB), Math.cos(d.body.facing - toQB))) * 180 / Math.PI;
      if (a > 135) { const cmd = sim.cmds[d.idx]; pr.turn = { t: sim.t, cushion: d.pos.x - r.pos.x, closing: r.vel.x - d.vel.x, rv: r.vel.x, label: cmd ? facingTechnique(cmd)?.label ?? null : null, job: (d.behavior as any)?.job ?? null }; }
    }
  }
  if (s.pairs && sim.ball?.kind === 'air') {
    s.done = true;
    for (const pr of s.pairs) (R[fam] = R[fam] ?? []).push({ turn: pr.turn, climbing: pr.r.vel.x > 3 });
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
console.log(`deep defenders (CB/FS/SS) over a receiver at 1.0 s, through the stem (sim, ${games} games from ${seed0}, CUSHION_NEED ${process.env.CUSHION_NEED ?? 'default'})`);
for (const fam of ['C2', 'C3', 'C4', 'C6']) {
  const V = R[fam]; if (!V?.length) continue;
  const T = V.filter(v => v.turn).map(v => v.turn);
  const clim = V.filter(v => v.climbing), stop = V.filter(v => !v.climbing);
  console.log(`  ${fam} n ${V.length}: turned before the release ${(100 * T.length / V.length).toFixed(0)}%; at the turn: cushion p25/50/75 ${q(T.map(t => t.cushion), .25).toFixed(1)}/${q(T.map(t => t.cushion)).toFixed(1)}/${q(T.map(t => t.cushion), .75).toFixed(1)} yd, closing ${q(T.map(t => t.closing)).toFixed(1)} yd/s, receiver ${q(T.map(t => t.rv)).toFixed(1)} yd/s, ${q(T.map(t => t.t)).toFixed(1)} s after the snap`);
  console.log(`       receiver still climbing at the release: n ${clim.length}, turned ${(100 * clim.filter(v => v.turn).length / Math.max(1, clim.length)).toFixed(0)}%; stopped or broken off: n ${stop.length}, turned ${(100 * stop.filter(v => v.turn).length / Math.max(1, stop.length)).toFixed(0)}%`);
  const L: Record<string, number> = {}; for (const t of T) { const k = `${t.label}|${String(t.job).split(':')[0]}`; L[k] = (L[k] ?? 0) + 1; }
  console.log(`       turned by: ${Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
