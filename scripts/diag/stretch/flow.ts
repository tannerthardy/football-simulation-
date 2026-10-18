/** Stretch-rep lateral budget (observation only). Over every engaged run-rep
 * tick on outside/wide zone, what each side requested toward the play side
 * and what each achieved: blocker pre-anchor and final lateral request,
 * anchor state, defender lateral request, both achieved lateral speeds, hand
 * control. Aggregated by time band. Uses the existing run-contact observer.
 *
 * node --import tsx scripts/diag/stretch/flow.ts [--concepts oz,wz] [--seeds ...] [--out out/stretch/flow.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { G } from '../../../src/core/units.js';
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const R = rosters();
type Row = { t: number; b: string; d: string; dbl: boolean; pre: number; req: number; anchored: boolean; bv: number; dv: number; dreq: number; seal: number; dLat: number; corr: number; ctl: number; play: number; ab: number; ad: number; fb: number; fd: number; bfree: number; gb: number; gd: number; dside: number; fit: string; sh: number };
const rows: Row[] = [];
for (const concept of list('--concepts', 'oz,wz')) for (const dir of ['strong', 'weak'] as const)
  for (const lk of LOOK_SPECS.map(l => l[0])) for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001,1').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const pending: { e: any; info: any }[] = [];
    const y0 = new Map(sim.agents.map(a => [a, (a.pos.y - sim.ballY) * ps]));
    runContactObservers.set(sim, (e: any, kind: string, info: any) => { if (kind === 'movement') pending.push({ e, info }); });
    while (sim.phase === 'live' && sim.t < 3) {
      pending.length = 0;
      sim.tick();
      for (const { e, info } of pending) {
        const b = e.blocker, d = e.defender;
        if (!['LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H'].includes(b.slot)) continue;
        const di = sim.intents[d.idx];
        rows.push({ t: sim.t, b: b.slot, d: d.slot, dbl: e.helpers.length > 0, pre: info.preAnchor.y * ps, req: info.command.vel.y * ps, anchored: info.anchored,
          bv: b.vel.y * ps, dv: d.vel.y * ps, dreq: (di?.vel.y ?? 0) * ps, seal: info.seal * (info.lat.y * ps), dLat: info.dLat * (info.lat.y * ps),
          corr: info.correction * (info.lat.y * ps), ctl: e.control, play: info.lat.y * ps,
          ab: availability(b.body.support, supportParams(b.profile), fatigueFactor(b.body.energy)),
          ad: availability(d.body.support, supportParams(d.profile), fatigueFactor(d.body.energy)),
          fb: Math.hypot(b.body.support.felt.x, b.body.support.felt.y) / (b.profile.massKg * G),
          fd: Math.hypot(d.body.support.felt.x, d.body.support.felt.y) / (d.profile.massKg * G), bfree: 0,
          // Lateral ground force this step toward the play side, body weights.
          gb: (sim.lastStep?.groundImpulse[b.idx]?.y ?? 0) * ps / (sim.dt * b.profile.massKg * G),
          gd: (sim.lastStep?.groundImpulse[d.idx]?.y ?? 0) * ps / (sim.dt * d.profile.massKg * G),
          dside: y0.get(d)!, fit: d.runFit ? `${d.runFit.kind}:${d.runFit.gap}${d.runFit.side * ps > 0 ? '+' : '-'}` : 'none',
          sh: (info.heldFlow === undefined ? NaN : 0) });
      }
    }
  }
const out = arg('--out', 'out/stretch/flow.json');
mkdirSync('out/stretch', { recursive: true });
writeFileSync(out, JSON.stringify(rows));
const med = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log(`ticks ${rows.length}  (all lateral values toward the play side, yd/s; medians)`);
for (const [lo, hi] of [[0.3, 0.8], [0.8, 1.3], [1.3, 2.0], [2.0, 3.0]]) {
  const s = rows.filter(r => r.t >= lo && r.t < hi);
  if (!s.length) continue;
  console.log(`t ${lo}-${hi}: n ${s.length} | OL pre-anchor ${f(med(s.map(r => r.pre)))} final req ${f(med(s.map(r => r.req)))} achieved ${f(med(s.map(r => r.bv)))} anchored ${(100 * s.filter(r => r.anchored).length / s.length).toFixed(0)}% | DL req ${f(med(s.map(r => r.dreq)))} achieved ${f(med(s.map(r => r.dv)))} | double ${(100 * s.filter(r => r.dbl).length / s.length).toFixed(0)}% control ${f(med(s.map(r => r.ctl)))} | avail OL ${med(s.map(r => r.ab)).toFixed(2)} DL ${med(s.map(r => r.ad)).toFixed(2)} felt/bw OL ${med(s.map(r => r.fb)).toFixed(2)} DL ${med(s.map(r => r.fd)).toFixed(2)} | lateral ground force/bw OL ${f(med(s.map(r => r.gb)))} DL ${f(med(s.map(r => r.gd)))}`);
}
const all = rows.filter(r => r.t >= .8 && r.t < 2.5);
const share = (p: (r: Row) => boolean) => (100 * all.filter(p).length / all.length).toFixed(0) + '%';
console.log('0.8-2.5 s:', 'DL requests play side', share(r => r.dreq > .5), '| DL requests backside', share(r => r.dreq < -.5),
  '| OL final request below DL achieved', share(r => r.req < r.dv - .25), '| OL anchored', share(r => r.anchored),
  '| both achieved < 1.5', share(r => r.bv < 1.5 && r.dv < 1.5));

const band = rows.filter(r => r.t >= .8 && r.t < 2.5);
const groups = new Map<string, Row[]>();
for (const r of band) { const k = `${r.dside > 1 ? 'playside' : r.dside < -1 ? 'backside' : 'middle'} ${r.fit}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
console.log('\n0.8-2.5 s by defender alignment (+ = play side of the ball) and fit:');
for (const [k, s] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 14)) {
  console.log(`  ${k.padEnd(26)} n ${String(s.length).padStart(5)} | DL req ${f(med(s.map(r => r.dreq)))} (backside ${(100 * s.filter(r => r.dreq < -.5).length / s.length).toFixed(0)}%) achieved ${f(med(s.map(r => r.dv)))} | OL req ${f(med(s.map(r => r.req)))} achieved ${f(med(s.map(r => r.bv)))} | ground OL ${f(med(s.map(r => r.gb)))} DL ${f(med(s.map(r => r.gd)))}`);
}
