/** Sim side of nflcarry_bins.py (same pairs: zone-call deep CB/S over a WR go, no help): every tick from 1.0 s to
 * 1.0 s after the release, the torso (shoulders) angle off the QB and his speed, binned by the signed cushion (his
 * depth over the receiver, 0.5 yd bins from +3 to -2; negative = receiver past him) and ball in the air or not. Adds
 * the hips' angle (body facing) off the QB, which the NFL rows cannot show. usage: npx tsx simcarry_bins.mts GAMES SEED */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const S: Record<string, number[][]> = {}; const St = new WeakMap<object, any>();
const go = (r: any) => r.player?.position === 'WR' && ['go', 'fade', 'seam', 'seam_read'].includes(r.behavior?.route?.id ?? '');
const off = (x: number, toQB: number) => Math.abs(Math.atan2(Math.sin(x - toQB), Math.cos(x - toQB))) * 180 / Math.PI;
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; tick0.call(this);
  if (sim.offCall?.kind === 'run' || sim.defCall.coverage.man) return;
  let s = St.get(sim); if (!s) { s = { pairs: null, relT: null }; St.set(sim, s); }
  const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  if (!s.pairs && sim.t >= 1.0 - 1e-9) {
    s.pairs = [];
    for (const d of sim.defense) {
      if (!/^(CB|FS|SS)/.test(d.slot)) continue;
      const c = recs.map((r: any) => [Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y), r]).filter(([dd, r]: any) => dd < 8 && d.pos.x - r.pos.x > 2).sort((a: any, b: any) => a[0] - b[0]);
      if (!c.length) continue;
      const help = sim.defense.some((m: any) => m !== d && /^(CB|FS|SS|NB|DB)/.test(m.slot) && m.pos.x - d.pos.x >= 3 && Math.abs(m.pos.y - d.pos.y) <= 12);
      if (!help && go(c[0][1])) s.pairs.push({ d, r: c[0][1] });
    }
  }
  if (!s.pairs) return;
  if (sim.t >= 1.5 - 1e-9 && !s.climb) s.climb = s.pairs.filter((p: any) => p.r.vel.x > 3);
  if (!s.climb) return;
  const air = sim.ball?.kind === 'air' || (s.relT !== null);
  if (sim.ball?.kind === 'air' && s.relT === null) s.relT = sim.t;
  if (s.relT !== null && sim.t > s.relT + 1.0) return;
  for (const { d, r } of s.climb) {
    const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x), cush = d.pos.x - r.pos.x;
    if (cush > 3.25 || cush < -2.25) continue;
    const b = (Math.round(cush * 2) / 2).toFixed(1);
    (S[`${air}|${b}`] ??= []).push([off(d.shoulders, toQB), off(d.body.facing, toQB), Math.hypot(d.vel.x, d.vel.y)]);
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = 0.5) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length * f)] : NaN; };
for (const air of [false, true]) {
  console.log(`sim WR go, no help: deep man by signed cushion, ${air ? 'ball in the air' : 'before the throw'} (${games} games); ticks`);
  console.log('  cushion   ticks  torso off QB p25/p50/p75   share > 120   share > 135   hips off QB p50   his speed');
  for (const b of ['3.0', '2.5', '2.0', '1.5', '1.0', '0.5', '0.0', '-0.5', '-1.0', '-1.5', '-2.0']) {
    const V = S[`${air}|${b}`] ?? []; if (!V.length) continue; const A = V.map((v) => v[0]);
    console.log(`  ${b.padStart(5)}   ${String(V.length).padStart(6)}   ${q(A, 0.25).toFixed(0).padStart(4)} / ${q(A).toFixed(0).padStart(4)} / ${q(A, 0.75).toFixed(0).padStart(4)}        ${(100 * A.filter((x) => x > 120).length / A.length).toFixed(0).padStart(3)}%          ${(100 * A.filter((x) => x > 135).length / A.length).toFixed(0).padStart(3)}%        ${q(V.map((v) => v[1])).toFixed(0).padStart(4)}           ${q(V.map((v) => v[2])).toFixed(1)}`);
  }
}
