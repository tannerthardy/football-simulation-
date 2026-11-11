/** usage: node --import tsx scripts/diag/pass-matrix/contactprobe.mts [games] [seed]; set CUSHION_BREAK.
 * Downfield contacts before the throw in zone calls (Defense, C9 attempt 3; report only). First tick a defender
 * (not DL) is within 0.6 yd of a receiver before the ball is in the air. Per contact: receiver depth past the line,
 * the defender's facing class to the QB, who moved into whom (each one's speed along the line joining them, toward
 * the other), whether the receiver changed course in the 0.5 s before (heading change over 20 deg), and the label. */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const traces: any[] = []; const St = new WeakMap<object, any>(); const rows: any[] = []; let plays = 0;
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; tick0.call(this);
  if (sim.offCall?.kind === 'run' || sim.defCall.coverage.man) return;
  let s = St.get(sim); if (!s) { s = { hist: [], seen: new Set(), done: false }; St.set(sim, s); plays++; }
  if (s.done) return;
  if (sim.ball?.kind === 'air' || sim.ball?.kind === 'carried' && sim.ball.holder !== sim.qb) { s.done = true; return; }
  const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  s.hist.push({ t: sim.t, v: new Map(recs.map((r: any) => [r, { ...r.vel }])), dd: new Map(sim.defense.map((d: any) => [d, { vx: d.vel.x, f: d.body.facing, x: d.pos.x, lab: sim.cmds?.[d.idx] ? facingTechnique(sim.cmds[d.idx])?.label ?? 'none' : 'none', rq: sim.cmds?.[d.idx]?.vel?.x ?? NaN }])), rr: new Map(recs.map((r: any) => [r, { vx: r.vel.x, x: r.pos.x }])) });
  while (s.hist.length && s.hist[0].t < sim.t - 1.0 - 1e-9) s.hist.shift();
  for (const d of sim.defense) {
    if (/^(DE|DT|NT)/.test(d.slot)) continue;
    for (const r of recs) {
      const dist = Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y), key = d.idx * 100 + r.idx;
      if (dist >= 0.6 || s.seen.has(key)) continue;
      s.seen.add(key);
      const ux = (r.pos.x - d.pos.x) / (dist || 1), uy = (r.pos.y - d.pos.y) / (dist || 1);
      const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
      const ang = Math.abs(Math.atan2(Math.sin(d.body.facing - toQB), Math.cos(d.body.facing - toQB))) * 180 / Math.PI;
      const h5 = s.hist.find((h: any) => h.t >= sim.t - 0.5 - 1e-9); const v0 = h5?.v.get(r);
      const help0 = sim.defense.some((m: any) => m !== d && /^(CB|FS|SS|NB|DB)/.test(m.slot) && m.pos.x - d.pos.x >= 3 && Math.abs(m.pos.y - d.pos.y) <= 12);
      if (!help0 && r.pos.x - sim.los >= 5 && traces.length < 400) traces.push(s.hist.map((h: any) => { const D = h.dd.get(d), R = h.rr.get(r); return { t: h.t - sim.t, cush: D.x - R.x, dvx: D.vx, rq: D.rq, rvx: R.vx, face: Math.abs(Math.atan2(Math.sin(D.f), Math.cos(D.f))) * 180 / Math.PI, lab: D.lab }; })); const h0 = v0 && Math.hypot(v0.x, v0.y) > 1 ? Math.atan2(v0.y, v0.x) : null;
      const h1 = Math.hypot(r.vel.x, r.vel.y) > 1 ? Math.atan2(r.vel.y, r.vel.x) : null;
      const turn = h0 !== null && h1 !== null ? Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) * 180 / Math.PI : null;
      const c = sim.cmds?.[d.idx];
      rows.push({ depth: r.pos.x - sim.los, face: ang <= 45 ? 'square' : ang <= 135 ? 'side-on' : 'turned',
        dInto: d.vel.x * ux + d.vel.y * uy, rInto: -(r.vel.x * ux + r.vel.y * uy), dSpd: Math.hypot(d.vel.x, d.vel.y),
        rCourse: turn, label: c ? facingTechnique(c)?.label ?? 'none' : 'none', slot: d.slot, t: sim.t, lat: Math.abs(r.pos.y - d.pos.y), over: d.pos.x - r.pos.x,
        help: sim.defense.some((m: any) => m !== d && /^(CB|FS|SS|NB|DB)/.test(m.slot) && m.pos.x - d.pos.x >= 3 && Math.abs(m.pos.y - d.pos.y) <= 12) });
    }
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
console.log(`zone-call contacts before the throw (CUSHION_BREAK ${process.env.CUSHION_BREAK}, ${games} games from ${seed0}): ${rows.length} pairs in ${plays} zone dropbacks`);
for (const [name, f] of [['inside 5 yd', (r: any) => r.depth < 5], ['5+ yd, help behind', (r: any) => r.depth >= 5 && r.help], ['5+ yd, no help', (r: any) => r.depth >= 5 && !r.help]] as const) {
  const X = rows.filter(f); if (!X.length) continue;
  const by = (k: string) => ['square', 'side-on', 'turned'].map(c => `${c} ${pct(X.filter(x => x[k] === c).length, X.length)}`).join(' / ');
  const into = X.filter(x => x.dInto > 0.5 && x.dInto >= x.rInto), ran = X.filter(x => x.rInto > 0.5 && x.dInto <= 0.5), both = X.filter(x => !into.includes(x) && !ran.includes(x));
  const L: Record<string, number> = {}; for (const x of X) L[x.label] = (L[x.label] ?? 0) + 1;
  console.log(`  ${name}: n ${X.length}; defender ${by('face')}`);
  console.log(`     receiver ran into a defender who was not moving into him (his speed toward the receiver <= 0.5): ${pct(ran.length, X.length)}; defender stepped into the route: ${pct(into.length, X.length)}; other/both: ${pct(both.length, X.length)}`);
  console.log(`     defender speed p50 ${q(X.map(x => x.dSpd)).toFixed(1)}, toward receiver p50 ${q(X.map(x => x.dInto)).toFixed(1)}; receiver toward defender p50 ${q(X.map(x => x.rInto)).toFixed(1)}; receiver changed course (>20 deg in 0.5 s) ${pct(X.filter(x => x.rCourse !== null && x.rCourse > 20).length, X.length)}; defender over him p50 ${q(X.map(x => x.over)).toFixed(2)} yd, lateral p50 ${q(X.map(x => x.lat)).toFixed(2)} yd`);
  console.log(`     labels: ${Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

console.log('  no-help contacts 5+ yd: medians by time before contact (facing: deg off straight downfield; 0 = running away, 180 = square to the QB)');
for (const T of [-1.0, -0.8, -0.6, -0.5, -0.4, -0.3, -0.2, -0.1, 0]) {
  const X = traces.map(tr => tr.reduce((b: any, x: any) => (!b || Math.abs(x.t - T) < Math.abs(b.t - T) ? x : b), null)).filter((x: any) => x && Math.abs(x.t - T) < 0.03);
  if (!X.length) continue;
  const L: Record<string, number> = {}; for (const x of X) L[x.lab] = (L[x.lab] ?? 0) + 1;
  console.log(`    t ${T.toFixed(1)} n ${X.length}: cushion ${q(X.map((x: any) => x.cush)).toFixed(2)}, his vx ${q(X.map((x: any) => x.dvx)).toFixed(1)} (req ${q(X.map((x: any) => x.rq)).toFixed(1)}), receiver vx ${q(X.map((x: any) => x.rvx)).toFixed(1)}, facing ${q(X.map((x: any) => x.face)).toFixed(0)}; ${Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, b]) => a + ' ' + b).join(', ')}`);
}
