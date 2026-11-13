/** Open-catch trace (Defense, report only): catches still live at +1 s that no defender comes within 2 yd of by +3 s,
 * and the defenders within 8 yd of the catcher at the catch. For each: his job (behaviour kind, zone or man target,
 * coverage-defender 'doing'), whether and when after the throw / the catch his pursuit planner fired (broke), his
 * requested and achieved speed at the catch and +0.5 / +1.0 s, his geometry to the catcher (ahead / level / trailing)
 * and the distance trajectory; the catcher's speed and whether a defender is in front of him (within 5 yd, ahead).
 * Classes: trailing-outrun (trailing at the catch, never broke-inside), zone-no-break (zone/match job, planner not
 * fired by +0.5 s after the catch), broke-no-close (planner fired, gap never under 2 yd), other.
 * usage: node --import tsx scripts/diag/effective-mass/open-catch-trace.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 4), seed0 = Number(process.argv[3] ?? 101);
const fired = new WeakMap<any, boolean>();
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: any, d: any) => { fired.set(a, true); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any;
};
const job = (b: any) => !b ? '-' : `${b.kind}${b.zone ? ':' + b.zone : ''}${b.target?.slot && b.kind === 'man' ? ':' + b.target.slot : ''}`;
const St = new WeakMap<any, any>();
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this;
  for (const a of sim.agents) fired.delete(a);
  tick0.call(this);
  let s = St.get(sim); if (!s) { s = { throwT: -1, catchT: -1, c: null, frames: [] }; St.set(sim, s); }
  if (s.throwT < 0 && sim.ball.kind === 'air') s.throwT = sim.t;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (s.throwT >= 0 && s.catchT < 0 && c && c.team === 'O' && c !== sim.qb) { s.catchT = sim.t; s.c = c; }
  if (s.throwT < 0 || (s.catchT >= 0 && sim.t - s.catchT > 3.05)) return;
  const live = sim.phase === 'live' && (s.catchT < 0 || c === s.c);
  s.frames.push({ t: sim.t, live, cp: s.c ? { ...s.c.pos } : null, cv: s.c ? { ...s.c.vel } : null,
    D: sim.defense.map((d: any) => ({ d, p: { ...d.pos }, v: { ...d.vel }, rq: Math.hypot(sim.intents?.[d.idx]?.vel?.x ?? 0, sim.intents?.[d.idx]?.vel?.y ?? 0),
      job: job(d.behavior), doing: (d.behavior as any)?.doing ?? '', fired: !!fired.get(d) })) });
};
const reqProf: any[] = []; const out: any[] = []; let catches = 0, live1 = 0;
const run0 = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const r = run0.call(this); const s = St.get(this);
  if (!s || s.catchT < 0) return r;
  catches++;
  const F = s.frames.filter((f: any) => f.t >= s.catchT - 1e-9 && f.live && f.cp);
  if (!F.length || F[F.length - 1].t - s.catchT < 1.0 - 1e-6) return r;
  live1++;
  const dist = (f: any, i: number) => Math.hypot(f.D[i].p.x - f.cp.x, f.D[i].p.y - f.cp.y);
  const nd = F[0].D.length;
  const mn = Math.min(...F.flatMap((f: any) => f.D.map((_: any, i: number) => dist(f, i))));
  for (let i = 0; i < F[0].D.length; i++) if (dist(F[0], i) <= 8) {
    const prof = [0, .05, .1, .15, .2, .25, .3, .35, .4, .5].map(dt => { const f = F.find((f: any) => f.t >= s.catchT + dt - 1e-9); return f ? [f.D[i].rq, Math.hypot(f.D[i].v.x, f.D[i].v.y), f.D[i].job, f.D[i].fired] : null; });
    const pre = s.frames.filter((f: any) => f.t < s.catchT - 1e-9 && f.t >= s.catchT - 0.31).map((f: any) => f.D[i].rq);
    reqProf.push({ open: mn > 2, prof, pre, job: F[0].D[i].job });
  }
  if (mn <= 2) return r;
  const f0 = F[0], cs0 = Math.hypot(f0.cv.x, f0.cv.y);
  const at = (dt: number) => F.find((f: any) => f.t >= s.catchT + dt - 1e-9) ?? F[F.length - 1];
  const geo = (f: any, i: number) => { const dx = f.D[i].p.x - f.cp.x, dy = f.D[i].p.y - f.cp.y, L = Math.hypot(dx, dy), cs = Math.hypot(f.cv.x, f.cv.y);
    if (cs < 1) return 'still'; const b = Math.acos(Math.max(-1, Math.min(1, (dx * f.cv.x + dy * f.cv.y) / (L * cs)))) * 180 / Math.PI; return b < 60 ? 'ahead' : b <= 120 ? 'level' : 'trailing'; };
  const before = s.frames.filter((f: any) => f.t < s.catchT - 1e-9);
  const ahead5 = (f: any) => f.D.some((_: any, i: number) => dist(f, i) <= 5 && geo(f, i) === 'ahead');
  for (let i = 0; i < nd; i++) {
    const d0 = dist(f0, i); if (d0 > 8) continue;
    const firstFire = s.frames.find((f: any) => f.D[i].fired);
    const fireRel = firstFire ? firstFire.t - s.catchT : null;
    const g = geo(f0, i), j = f0.D[i].job;
    const zoneish = /zone|match|cover/.test(j) || j.startsWith('zone');
    const cls = g === 'trailing' && (fireRel === null || fireRel > 0.5) ? 'trailing-outrun' : fireRel === null || fireRel > 0.5 ? (zoneish ? 'zone-no-break' : 'no-break-' + j.split(':')[0]) : g === 'trailing' ? 'trailing-broke' : 'broke-no-close';
    const sp = (dt: number) => { const f = at(dt); return [Math.hypot(f.D[i].v.x, f.D[i].v.y), f.D[i].rq]; };
    out.push({ id: `${this.seed}:${this.t.toFixed(1)}`, label: this.offCall?.label, cov: this.defCall?.coverage?.id, job: j, doing: f0.D[i].doing, cls, geo: g, d0,
      traj: [0, .5, 1, 2].map(dt => dist(at(dt), i)), fireRel, throwToCatch: s.catchT - s.throwT, sp: [0, .5, 1].map(sp), cs: [0, .5, 1, 2].map(dt => { const f = at(dt); return Math.hypot(f.cv.x, f.cv.y); }),
      inFront: [0, .5, 1].map(dt => ahead5(at(dt))), cs0, preJob: before.length ? before[0].D[i].job : j });
  }
  return r;
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = (x: number) => x.toFixed(1)) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length < 3 ? '-' : [.25, .5, .75].map(p => f(w[Math.floor(p * (w.length - 1))])).join('/'); };
console.log(`open-catch trace (${games} games from ${seed0}): catches ${catches}, live at +1 s ${live1}, defenders within 8 yd on open catches ${out.length}`);
const by = (k: (r: any) => string, X = out) => Object.entries(X.reduce((m: any, r) => (m[k(r)] = (m[k(r)] ?? 0) + 1, m), {})).sort((a: any, b: any) => b[1] - a[1]);
console.log('  class:', by(r => r.cls).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('  job at catch:', by(r => r.job).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', '));
for (const [cls] of by(r => r.cls)) {
  const X = out.filter(r => r.cls === cls);
  console.log(`  ${cls} (n ${X.length}): start ${q(X.map(r => r.d0))} yd, dist +0.5/+1/+2 ${q(X.map(r => r.traj[1]))} / ${q(X.map(r => r.traj[2]))} / ${q(X.map(r => r.traj[3]))}; broke ${q(X.map(r => r.fireRel ?? NaN), v => v.toFixed(2))} s after catch (never ${X.filter(r => r.fireRel === null).length}); `
    + `his speed ach/req at catch ${q(X.map(r => r.sp[0][0]))}/${q(X.map(r => r.sp[0][1]))}, +0.5 ${q(X.map(r => r.sp[1][0]))}/${q(X.map(r => r.sp[1][1]))}, +1 ${q(X.map(r => r.sp[2][0]))}/${q(X.map(r => r.sp[2][1]))}; carrier ${q(X.map(r => r.cs[0]))} -> ${q(X.map(r => r.cs[1]))} -> ${q(X.map(r => r.cs[2]))} -> ${q(X.map(r => r.cs[3]))}`);
  console.log(`      jobs ${by(r => r.job, X).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')} | doing ${by(r => String(r.doing), X).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
console.log('  examples:'); for (const r of out.slice(0, 14)) console.log(`    ${r.id} ${r.label} vs ${r.cov}: ${r.job} [${r.doing}] ${r.cls} ${r.geo} d ${r.traj.map((x: number) => x.toFixed(1)).join('/')} broke ${r.fireRel?.toFixed(2)} sp ${r.sp.map((s: number[]) => s[0].toFixed(1) + '/' + s[1].toFixed(1)).join(' ')} carrier ${r.cs.map((x: number) => x.toFixed(1)).join('/')}`);
const allCarr = out; console.log(`  someone ahead within 5 yd of the carrier at catch/+0.5/+1: ${[0, 1, 2].map(k => (100 * allCarr.filter(r => r.inFront[k]).length / Math.max(1, allCarr.length)).toFixed(0) + '%').join(' / ')}`);

for (const open of [false, true]) { const X = reqProf.filter(r => r.open === open);
  console.log(`  ${open ? 'open' : 'other'} catches, defenders within 8 yd (n ${X.length}): requested speed in the 0.3 s before the catch ${q(X.flatMap(r => r.pre))}`);
  console.log('    after catch +s: ' + [0, .05, .1, .15, .2, .25, .3, .35, .4, .5].map((dt, k) => `${dt}: req ${q(X.map(r => r.prof[k]?.[0] ?? NaN))} ach ${q(X.map(r => r.prof[k]?.[1] ?? NaN))} zero-req ${(100 * X.filter(r => r.prof[k] && r.prof[k][0] < 0.3).length / Math.max(1, X.filter(r => r.prof[k]).length)).toFixed(0)}% pursuit ${(100 * X.filter(r => r.prof[k]?.[3]).length / Math.max(1, X.length)).toFixed(0)}%`).join('\n                    '));
  const zj = X.filter(r => r.prof[2] && r.prof[2][0] < 0.3); console.log('    jobs with zero request at +0.1:', Object.entries(zj.reduce((m: any, r) => (m[r.prof[2][2]] = (m[r.prof[2][2]] ?? 0) + 1, m), {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '));
}
