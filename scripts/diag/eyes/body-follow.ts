// [flags] node --import tsx scripts/diag/eyes/body-follow.ts
// Integration (2026-11-17): through his progression, does his body follow his read? In the set, at each change of the
// receiver his eyes are on (sim.qbEyes), the angle between his trunk (body facing) and that receiver at the change and
// 0.2 s after, and how long until his trunk is within 15 deg of him. And at the release, his trunk against the target
// 0.5 s and 0.25 s before. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const DEG = 180 / Math.PI, off = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * DEG;
const at0: number[] = [], at2: number[] = [], follow: number[] = [], pre: number[][] = [[], []];
let never = 0, changes = 0;
for (const concept of ['smash', 'mesh', 'flood', 'drive', 'dagger', 'y_cross', 'stick', 'curl_flat', 'four_verts', 'levels']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const roster of [3, 7]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  let eyes: any = null, since = 0, pending: any = null; const hist: { t: number; f: number; p: any }[] = [];
  let thrown: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, t: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !thrown && intended) thrown = { t: sim.t, x: intended.x, y: intended.y }; return tb(p, t, v0, intended, ...r); };
  for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
    sim.tick(); const b: any = sim.qb.behavior, q = sim.qb; if (b?.kind !== 'qb-pass') continue;
    hist.push({ t: sim.t, f: q.body.facing, p: { x: q.pos.x, y: q.pos.y } });
    const e = sim.qbEyes, ang = (r: any) => off(q.body.facing, Math.atan2(r.pos.y - q.pos.y, r.pos.x - q.pos.x));
    if (b.phase === 'set' && e && e !== eyes && e.pos) {
      if (pending && !pending.done) never++;
      eyes = e; since = sim.t; changes++; at0.push(ang(e)); pending = { r: e, t: sim.t, got2: false, done: false };
    }
    if (pending && !pending.got2 && sim.t - pending.t >= 0.2 - 1e-9) { pending.got2 = true; at2.push(ang(pending.r)); }
    if (pending && !pending.done && ang(pending.r) <= 15) { pending.done = true; follow.push(sim.t - pending.t); }
  }
  if (thrown) [0.5, 0.25].forEach((dt, k) => { const h = hist.filter((x) => x.t <= thrown.t - dt + 1e-9).pop(); if (h) pre[k].push(off(h.f, Math.atan2(thrown.y - h.p.y, thrown.x - h.p.x))); });
}
const q = (v: number[], p: number) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(p * (z.length - 1))] : NaN; };
console.log(`eye changes in the set ${changes}: trunk off the new read at the change p50 ${q(at0, .5).toFixed(0)} p90 ${q(at0, .9).toFixed(0)} deg; 0.2 s after p50 ${q(at2, .5).toFixed(0)} p90 ${q(at2, .9).toFixed(0)}; within 15 deg after p50 ${q(follow, .5).toFixed(2)} p90 ${q(follow, .9).toFixed(2)} s (${follow.length} reached, ${never} left before reaching)`);
console.log(`trunk off the eventual target 0.5 s before the release p50 ${q(pre[0], .5).toFixed(0)} p90 ${q(pre[0], .9).toFixed(0)}; 0.25 s before p50 ${q(pre[1], .5).toFixed(0)} p90 ${q(pre[1], .9).toFixed(0)} (n ${pre[0].length})`);
