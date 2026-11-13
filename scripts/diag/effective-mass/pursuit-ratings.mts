/** Which ratings move pursuit skill measures in the sim (Defense, report only). Same measures as
 * scripts/diag/pass-operators/skill_spread.py, from live sim state:
 *   lead  - open field, level geometry, 5-25 yd: straight-intercept angle minus aim (deg);
 *   rel   - pass: closing on the eventual catch point at the throw, defenders within 8 yd of the catch (yd/s);
 *   angle - his first arrival inside 1.5 yd: closing angle off the line to the carrier (deg);
 *   appr  - arrivers, speed in the 3-2 yd band (yd/s).
 * Per defender-play value (median of his samples that play), split by position group (DL / LB / DB) and by tercile of
 * each rating; reports low / high tercile medians and the rank correlation with the rating.
 * usage: node --import tsx scripts/diag/effective-mass/pursuit-ratings.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 4), seed0 = Number(process.argv[3] ?? 101);
const RAT = ['pursuit', 'playRecognition', 'anticipation', 'awareness', 'tackling', 'zoneCoverage', 'manCoverage', 'ballSkills', 'workRate'];
const grp = (slot: string) => /^(DE|DT|NT|LE|RE|DL|N|T|E)/.test(slot) ? 'DL' : /LB|^[MWS]$|MIKE|WILL|SAM/.test(slot) ? 'LB' : 'DB';
const St = new WeakMap<any, any>(); const vals: any[] = [];
const iang = (dx: number, dy: number, cvx: number, cvy: number, s: number) => { const L = Math.hypot(dx, dy); if (L < 1e-6 || s < .5) return null;
  const ux = dx / L, uy = dy / L, along = cvx * ux + cvy * uy, perp = -cvx * uy + cvy * ux; if (Math.abs(perp) >= s) return null;
  const a = Math.asin(perp / s); return s * Math.cos(a) - along > 0 ? a : null; };
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)] : NaN; };
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; const wasAir = sim.ball.kind === 'air';
  tick0.call(this);
  let s = St.get(sim); if (!s) { s = { t0: -1, c: null, per: new Map(), throwT: -1, atThrow: null }; St.set(sim, s); }
  if (s.throwT < 0 && sim.ball.kind === 'air') { s.throwT = sim.t; s.atThrow = sim.defense.map((d: any) => ({ d, p: { ...d.pos }, v: { ...d.vel } })); }
  if (sim.phase !== 'live') return;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!c || c.team !== 'O') return;
  if (s.t0 < 0) { const open = sim.offCall?.kind === 'pass' ? c !== sim.qb : c.pos.x > sim.los; if (!open) return; s.t0 = sim.t; s.c = c;
    if (wasAir && s.atThrow) for (const r of s.atThrow) { if (Math.hypot(r.d.pos.x - c.pos.x, r.d.pos.y - c.pos.y) > 8) continue;
      const L = Math.hypot(c.pos.x - r.p.x, c.pos.y - r.p.y) || 1; per(s, r.d).rel.push((r.v.x * (c.pos.x - r.p.x) + r.v.y * (c.pos.y - r.p.y)) / L); } }
  if (c !== s.c || sim.t - s.t0 > 3) return;
  for (const d of sim.defense) {
    const P = per(s, d); if (P.arrived) continue;
    const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dist = Math.hypot(dx, dy), sp = Math.hypot(d.vel.x, d.vel.y), cs = Math.hypot(c.vel.x, c.vel.y);
    if (dist <= 1.5) { P.arrived = true; if (sp > .5) P.angle.push(Math.abs(Math.atan2(-d.vel.x * dy + d.vel.y * dx, d.vel.x * dx + d.vel.y * dy)) * 180 / Math.PI); if (P.band.length) P.appr.push(P.band[P.band.length - 1]); continue; }
    if (dist >= 2 && dist < 3) P.band.push(sp);
    if (dist >= 5 && dist <= 25 && sp >= 1.5 && cs >= 1) {
      const bear = Math.acos(Math.max(-1, Math.min(1, (-dx * c.vel.x - dy * c.vel.y) / (dist * cs)))) * 180 / Math.PI;
      if (bear >= 60 && bear <= 120) { const side = (-c.vel.x * dy + c.vel.y * dx) / dist >= 0 ? 1 : -1;
        const aim = Math.atan2((-d.vel.x * dy + d.vel.y * dx) / dist, (d.vel.x * dx + d.vel.y * dy) / dist) * 180 / Math.PI * side;
        const ia = iang(dx, dy, c.vel.x, c.vel.y, sp); if (ia !== null) P.lead.push(ia * 180 / Math.PI * side - aim); }
    }
  }
};
function per(s: any, d: any) { let P = s.per.get(d); if (!P) { P = { d, lead: [], rel: [], angle: [], appr: [], band: [], arrived: false }; s.per.set(d, P);
  vals.push(P); P.g = grp(d.slot); P.r = Object.fromEntries(RAT.map(k => [k, d.r(k)])); P.r.speed = d.profile.vmax * d.speedScale; } return P; }
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const rank = (v: number[]) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); o.forEach(([, i], k) => r[i] = k); return r; };
const spear = (a: number[], b: number[]) => { const ra = rank(a), rb = rank(b), n = a.length, ma = (n - 1) / 2; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - ma); da += (ra[i] - ma) ** 2; db += (rb[i] - ma) ** 2; } return num / Math.sqrt(da * db); };
console.log(`pursuit measures by rating (${games} games from ${seed0}); per defender-play medians; low/high tercile median and Spearman rho`);
for (const m of ['lead', 'rel', 'angle', 'appr']) for (const g of ['DL', 'LB', 'DB']) {
  const X = vals.filter(P => P.g === g && P[m].length).map(P => ({ v: med(P[m]), r: P.r })).filter(x => Number.isFinite(x.v));
  if (X.length < 30) continue;
  const cells = [...RAT, 'speed'].map(k => { const S = [...X].sort((a, b) => a.r[k] - b.r[k]), n = S.length;
    const lo = med(S.slice(0, Math.floor(n / 3)).map(x => x.v)), hi = med(S.slice(Math.ceil(2 * n / 3)).map(x => x.v)); const rho = spear(X.map(x => x.r[k]), X.map(x => x.v));
    return `${k} ${lo.toFixed(1)}>${hi.toFixed(1)} (${rho >= 0 ? '+' : ''}${rho.toFixed(2)})`; });
  console.log(`  ${m.padEnd(5)} ${g} n ${String(X.length).padStart(4)} median ${med(X.map(x => x.v)).toFixed(1)}: ${cells.join(', ')}`);
}
