/** Sim side of nflcarry_split.py (same definitions): simcarry.mts split by the climber's route and position:
 * WR go (go, fade, seam), WR post/corner/wheel, WR other, TE/RB. usage: npx tsx simcarry_split.mts GAMES SEED */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const MARKS = [1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];
const St = new WeakMap<object, any>(); const S: Record<string, any[]> = {};
const group = (r: any) => { if (r.player?.position !== 'WR') return 'TE/RB'; const id = r.behavior?.route?.id ?? '';
  return ['go', 'fade', 'seam', 'seam_read'].includes(id) ? 'WR go' : ['post', 'corner', 'wheel'].includes(id) ? 'WR post/corner/wheel' : 'WR other'; };
const add = (k: string, v: any) => (S[k] = S[k] ?? []).push(v);
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; tick0.call(this);
  if (sim.offCall?.kind === 'run' || sim.defCall.coverage.man) return;
  let s = St.get(sim); if (!s) { s = { pairs: null, done: false, marks: new Set() }; St.set(sim, s); }
  if (s.done) return;
  const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  if (!s.pairs && sim.t >= 1.0 - 1e-9) {
    s.pairs = [];
    for (const d of sim.defense) {
      if (!/^(CB|FS|SS)/.test(d.slot)) continue;
      const c = recs.map((r: any) => [Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y), r]).filter(([dd, r]: any) => dd < 8 && d.pos.x - r.pos.x > 2).sort((a: any, b: any) => a[0] - b[0]);
      if (c.length) s.pairs.push({ d, r: c[0][1], grp: group(c[0][1]), help: sim.defense.some((m: any) => m !== d && /^(CB|FS|SS|NB|DB)/.test(m.slot) && m.pos.x - d.pos.x >= 3 && Math.abs(m.pos.y - d.pos.y) <= 12) });
    }
  }
  if (!s.pairs) return;
  if (sim.t >= 1.5 - 1e-9 && !s.climb) s.climb = new Set(s.pairs.filter((p: any) => p.r.vel.x > 3));
  const air = sim.ball?.kind === 'air';
  const snapAt = (lab: string) => { for (const p of s.pairs) { if (!s.climb?.has(p)) continue; const { d, r } = p;
    const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
    const a = Math.abs(Math.atan2(Math.sin(d.shoulders - toQB), Math.cos(d.shoulders - toQB))) * 180 / Math.PI;
    add(`${p.help}|${p.grp}|${lab}`, [a, Math.hypot(d.vel.x, d.vel.y), r.vel.x, d.pos.x - r.pos.x, Math.abs(d.pos.y - r.pos.y), (d.pos.y - r.pos.y) * (sim.ballY - r.pos.y) > 0]); } };
  if (air) { snapAt('release'); s.done = true; return; }
  for (const m of MARKS) if (!s.marks.has(m) && sim.t >= m - 1e-9) { s.marks.add(m); snapAt(m.toFixed(2)); }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
for (const grp of ['WR go', 'WR post/corner/wheel', 'WR other', 'TE/RB']) for (const h of [false, true]) {
  console.log(`sim zone deep defenders over a climber, ${grp}, ${h ? 'help behind' : 'no help'} (${games} games)`);
  console.log('    t        n   angle off QB  his speed  receiver vx  cushion  lateral  inside | square / 45-90 / 90-135 / turned');
  for (const lab of ['1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', 'release']) {
    const V = S[`${h}|${grp}|${lab}`] ?? []; if (!V.length) continue;
    const cl = [[-1, 45], [45, 90], [90, 135], [135, 181]].map(([lo, hi]) => V.filter(v => v[0] > lo && v[0] <= hi).length / V.length);
    console.log(`    ${lab.padEnd(7)} ${String(V.length).padStart(5)}   ${q(V.map(v => v[0])).toFixed(0).padStart(5)}       ${q(V.map(v => v[1])).toFixed(1)}       ${q(V.map(v => v[2])).toFixed(1)}      ${q(V.map(v => v[3])).toFixed(1)}    ${q(V.map(v => v[4])).toFixed(1)}   ${(100 * V.filter(v => v[5]).length / V.length).toFixed(0)}% | ${cl.map(c => (100 * c).toFixed(0) + '%').join(' / ')}`);
  }
}
