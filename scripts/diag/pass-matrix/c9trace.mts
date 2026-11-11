/** C9 controller trace (Defense, 2026-11-11; report only). League-sampled games (leagueSample, as sim-export).
 * Targeted passes; non-line defenders 3-8 yd from the eventual catch point at the release and 2+ yd deeper than it
 * (the deep defender over the catch point, where C9 sits). Tick by tick from 0.5 s before the release to arrival:
 * whether he is playing the ball ('onBall', set when he acts on a throw he has seen), his technique label, his
 * requested and achieved velocity toward the catch point, his body facing against the line to the QB.
 * At +0.3 s after the release each defender is put in the first class that holds:
 *   not on the ball yet (facing the QB / facing away), on the ball but requesting less than 1 yd/s toward the catch
 *   point (aimed elsewhere), requesting toward it but achieving less than 1 yd/s (the body still turning), breaking.
 * usage: node --import tsx scripts/diag/pass-matrix/c9trace.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/defense.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';

const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const S = new WeakMap<object, any>(); const out: any[] = [];
const ZONE = new Set(['cover2', 'tampa2', 'cover3', 'cover4', 'cover6']);
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  tick0.call(this); const sim = this;
  let s = S.get(sim); if (!s) { s = { h: new Map(), rel: -1, done: false }; S.set(sim, s); }
  if (s.done || sim.offCall?.kind === 'run') return;
  if (s.rel < 0 && sim.ball?.kind === 'air') s.rel = sim.t;
  for (const d of sim.defense) {
    const cmd = sim.cmds[d.idx], h = s.h.get(d) ?? [];
    const toQB = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
    h.push({ t: sim.t, on: d.tags.has('onBall'), label: cmd ? facingTechnique(cmd)?.label ?? null : null, pos: { ...d.pos }, vel: { ...d.vel },
      req: cmd?.vel ? { ...cmd.vel } : { x: 0, y: 0 }, faceQB: Math.cos(d.body.facing - toQB) });
    if (h.length > 50) h.shift(); s.h.set(d, h);
  }
  if (!s.oh) s.oh = new Map();
  for (const o of sim.offense) { const h = s.oh.get(o) ?? []; h.push({ t: sim.t, pos: { ...o.pos }, vel: { ...o.vel } }); if (h.length > 50) h.shift(); s.oh.set(o, h); }
  if (s.rel < 0) return;
  const ended = sim.ball?.kind !== 'air';
  if (!ended) return;
  s.done = true;
  const tgt = sim.carrier && sim.carrier.team === 'O' && sim.carrier !== sim.qb ? sim.carrier : (sim as any).target ?? null;
  if (!tgt) return;
  const cp = { ...tgt.pos }, fam = (COVERAGE_BY_ID as any)[sim.defCall.coverage.id]?.family ?? sim.defCall.coverage.id;
  if (!ZONE.has(fam)) return;
  for (const d of sim.defense) {
    if (/^(DE|DT|NT)/.test(d.slot)) continue;
    const h = s.h.get(d); if (!h) continue;
    const at = (t: number) => h.reduce((p: any, q: any) => Math.abs(q.t - t) < Math.abs(p.t - t) ? q : p);
    const r0 = at(s.rel), d0 = Math.hypot(r0.pos.x - cp.x, r0.pos.y - cp.y);
    if (d0 < 3 || d0 >= 8 || r0.pos.x - cp.x <= 2) continue;
    const tw = (r: any, v: any) => { const ux = cp.x - r.pos.x, uy = cp.y - r.pos.y, L = Math.hypot(ux, uy) || 1; return (v.x * ux + v.y * uy) / L; };
    const series = [-0.4, -0.2, 0, 0.2, 0.4, 0.6].map(T => { const r = at(s.rel + T); return { T, on: r.on, label: r.label, req: +tw(r, r.req).toFixed(2), ach: +tw(r, r.vel).toFixed(2), faceQB: +r.faceQB.toFixed(2), vx: +r.vel.x.toFixed(2) }; });
    const onAt = h.find((r: any) => r.t >= s.rel - 1e-9 && r.on);
    const r3 = at(s.rel + 0.3);
    const cls = !r3.on ? (r3.faceQB > -0.2 ? 'not on ball, facing QB' : 'not on ball, facing away')
      : tw(r3, r3.req) < 1 ? 'on ball, aimed elsewhere' : tw(r3, r3.vel) < 1 ? 'on ball, body still turning' : 'breaking';
    const th = s.oh.get(tgt) ?? []; const ta = (t: number) => th.reduce((p: any, q: any) => Math.abs(q.t - t) < Math.abs(p.t - t) ? q : p);
    const rc = [-0.4, -0.2, 0].map(T => { const c = ta(s.rel + T), r = at(s.rel + T); return { T, cvx: +c.vel.x.toFixed(2), cushion: +(r.pos.x - c.pos.x).toFixed(2) }; });
    out.push({ rc, fam, slot: d.slot, label0: r0.label, spd0: +Math.hypot(r0.vel.x, r0.vel.y).toFixed(2), brake: d.profile.brake, vmax: d.profile.vmax, tau: d.profile.tau, onLag: onAt ? +(onAt.t - s.rel).toFixed(2) : null, cls, series, flight: +(sim.t - s.rel).toFixed(2) });
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
console.log(`deep zone defenders over the catch point (3-8 yd at the release, 2+ yd deeper): ${out.length}`);
const lag = out.filter(r => r.onLag !== null).map(r => r.onLag);
console.log(`on the ball after the release: p25/50/75 ${q(lag, .25).toFixed(2)}/${q(lag).toFixed(2)}/${q(lag, .75).toFixed(2)} s; never before the end ${(100 * out.filter(r => r.onLag === null).length / out.length).toFixed(0)}%`);
const C: Record<string, number> = {}; for (const r of out) C[r.cls] = (C[r.cls] ?? 0) + 1;
console.log('first thing holding him at +0.3 s:'); for (const [k, v] of Object.entries(C).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(30)} ${v} (${(100 * v / out.length).toFixed(0)}%)`);
console.log('mean over defenders, t from release:  req toward | achieved toward | on ball | facing QB (cos)');
for (const T of [-0.4, -0.2, 0, 0.2, 0.4, 0.6]) {
  const X = out.map(r => r.series.find((s: any) => s.T === T));
  const m = (f: (s: any) => number) => X.reduce((a, s) => a + f(s), 0) / X.length;
  console.log(`  ${T >= 0 ? '+' : ''}${T.toFixed(1)}  ${m(s => s.req).toFixed(2).padStart(6)} | ${m(s => s.ach).toFixed(2).padStart(6)} | ${(100 * m(s => +s.on)).toFixed(0).padStart(3)}% | ${m(s => s.faceQB).toFixed(2)}`);
}
for (const k of ['on ball, body still turning', 'breaking', 'not on ball, facing away']) {
  const X = out.filter(r => r.cls === k); if (!X.length) continue;
  const m = (f: (r: any) => number) => X.reduce((a, r) => a + f(r), 0) / X.length;
  const a = (T: number, f: string) => m(r => r.series.find((s: any) => s.T === T)[f]);
  console.log(`${k}: n ${X.length}, speed at release ${m(r => r.spd0).toFixed(1)} yd/s, profile brake ${m(r => r.brake).toFixed(1)} yd/s^2, vmax ${m(r => r.vmax).toFixed(1)}; achieved toward 0/+0.2/+0.4 ${a(0, 'ach').toFixed(2)}/${a(0.2, 'ach').toFixed(2)}/${a(0.4, 'ach').toFixed(2)}; req ${a(0, 'req').toFixed(2)}/${a(0.2, 'req').toFixed(2)}/${a(0.4, 'req').toFixed(2)}; facing QB at 0 ${a(0, 'faceQB').toFixed(2)}`);
}
{ const m = (T: number, f: string, X: any[]) => X.reduce((a, r) => a + r.rc.find((x: any) => x.T === T)[f], 0) / X.length;
  const climbing = out.filter(r => r.rc.find((x: any) => x.T === -0.2).cvx > 2);
  console.log(`catcher at -0.4/-0.2/0: downfield speed ${m(-0.4, 'cvx', out).toFixed(2)}/${m(-0.2, 'cvx', out).toFixed(2)}/${m(0, 'cvx', out).toFixed(2)}; defender cushion over him ${m(-0.4, 'cushion', out).toFixed(1)}/${m(-0.2, 'cushion', out).toFixed(1)}/${m(0, 'cushion', out).toFixed(1)} yd; catcher still climbing (>2 yd/s) at -0.2: ${(100 * climbing.length / out.length).toFixed(0)}%`);
  for (const k of ['on ball, body still turning', 'not on ball, facing away', 'breaking']) { const X = out.filter(r => r.cls === k); if (X.length) console.log(`  ${k}: catcher vx at -0.2 ${m(-0.2, 'cvx', X).toFixed(2)}, cushion ${m(-0.2, 'cushion', X).toFixed(1)}, still climbing ${(100 * X.filter(r => r.rc.find((x: any) => x.T === -0.2).cvx > 2).length / X.length).toFixed(0)}%`); } }
{ const fc = (c: number) => c >= Math.SQRT1_2 ? 'square' : c > -Math.SQRT1_2 ? 'side-on' : 'turned away';
  const F: Record<string, { n: number; tw: number }> = {};
  for (const r of out) { const s0 = r.series.find((x: any) => x.T === 0), s4 = r.series.find((x: any) => x.T === 0.4); const k = fc(s0.faceQB); F[k] = F[k] ?? { n: 0, tw: 0 }; F[k].n++; F[k].tw += s4.ach; }
  console.log('facing the QB at the release (cos of body facing vs line to the QB; square within 45 deg, turned away beyond 135):');
  for (const k of ['square', 'side-on', 'turned away']) if (F[k]) console.log(`  ${k.padEnd(12)} ${(100 * F[k].n / out.length).toFixed(0)}%  achieved toward the catch point at +0.4 s ${(F[k].tw / F[k].n).toFixed(2)}`); }
const L: Record<string, number> = {}; for (const r of out) L[String(r.label0)] = (L[String(r.label0)] ?? 0) + 1;
console.log('technique at the release:', Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', '));
