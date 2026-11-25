/** Deep-throw arrival geometry in staged plays (Integration's deep-catch question, 2026-11-18). Read-only probe on PlaySim.
 * Per play with a throw to a target and the ball >= MIN yd past the line at its arrival (the first secure / catch / drop / miss / pbu / interception / incomplete
 * event): the QB's aim error (true unobstructed landing vs aim), the target's movement, ball-to-receiver (2D) at the arrival event and every 0.1 s from -0.5 to +0.5 s
 * around it, the receiver's estimate of the landing point (once he is tracking) against the true one by time to arrival, whether he knows the flight (glance rule),
 * his speed, his hips' angle off his travel and trunk twist, and whether he had to turn his body to look. Output: JSON lines (`around` is distance by 0.05 s tick from -10 to +10 around the arrival event).
 *   node --import tsx scripts/diag/receiver/deep-arrival-sim.ts OUT.jsonl [--seeds 1,2] [--rosters 1-8] [--min 15] [--forms gun_doubles_11,gun_trips_11] [--covs a,b] [--concepts a,b] [--noprobe]
 * --noprobe runs the same plays without the probe's reads of the estimator (neutrality check: only the event stream is written). */
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { getRoute } from '../../../src/playbook/routes.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const out = process.argv[2];
const range = (s: string) => s.includes('-') ? Array.from({ length: Number(s.split('-')[1]) - Number(s.split('-')[0]) + 1 }, (_, i) => Number(s.split('-')[0]) + i) : s.split(',').map(Number);
const seeds = range(arg('--seeds', '1,2')), rosters = range(arg('--rosters', '1-8')), MIN = Number(arg('--min', '15'));
const forms = arg('--forms', 'gun_doubles_11,gun_trips_11').split(','), covs = arg('--covs', 'cover1,cover2,cover2_match,cover3,cover4,cover6').split(',');
const probe = !process.argv.includes('--noprobe');
const deepConcepts = arg('--concepts', '') ? arg('--concepts', '').split(',') : Object.values(PASS_BY_ID).filter((c: any) => !c.screen && [...Object.values(c.strong), ...Object.values(c.weak)].some((id: any) => { try { return getRoute(id).depth >= 18; } catch { return false; } })).map((c: any) => c.id);
const r2 = (v: number) => Math.round(v * 100) / 100;
const ARRIVAL = new Set(['secure', 'catch', 'drop', 'miss', 'pbu', 'interception', 'incomplete']);
const lines: string[] = [];
for (const formation of forms) for (const concept of deepConcepts) for (const coverage of covs) for (const roster of rosters) for (const seed of seeds) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  let thr: any = null; const trace: any[] = []; let arrival: any = null; let seen = 0;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, ...rest: any[]) => {
    tb(qb, target, v0, intended, ...rest);
    if (!thr && target && sim.ball.kind === 'air') {
      const path = sim.ballPath.map((s: any) => ({ ...s }));
      // The true landing at the aim's height (the first path point at or below it, descending) and the QB's aim.
      let L = path[path.length - 1]; for (const s of path) if (s.z <= intended.z && s.t > sim.t + 0.3) { L = s; break; }
      thr = { t: sim.t, target, qb, aim: { ...intended }, path, land: { x: L.x, y: L.y, z: L.z, t: L.t }, los: sim.los };
    }
  };
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    tick0();
    if (!thr || arrival) return;
    const R = thr.target, b = sim.ball, f = b.flight;
    const ev = sim.events;
    for (; seen < ev.length; seen++) if (ARRIVAL.has(ev[seen].type) && ev[seen].t >= thr.t + 0.1 && !arrival) arrival = { t: ev[seen].t, type: ev[seen].type, who: ev[seen].a };
    const row: any = { t: sim.t, bx: f.pos.x, by: f.pos.y, bz: f.pos.z, rx: R.pos.x, ry: R.pos.y, rvx: R.vel.x, rvy: R.vel.y, fac: R.body.facing, trunk: R.body.trunk ?? 0, beh: R.behavior.kind };
    if (probe && b.kind === 'air' && R.behavior.kind === 'track' && sim.ballEstimates) {
      const est = sim.ballEstimates.estimate(R, sim);
      row.knows = sim.ballEstimates.glanceKnows ? sim.ballEstimates.glanceKnows(R, sim) : null;
      if (est?.length) { let E = est[est.length - 1]; for (const s of est) if (s.z <= thr.aim.z && s.t > sim.t + 0.05) { E = s; break; } row.ex = E.x; row.ey = E.y; row.et = E.t; }
    }
    trace.push(row);
  };
  let res: any; try { res = sim.run(); } catch { continue; }
  if (!thr || !arrival) continue;
  const R = thr.target, ai = trace.findIndex((r) => r.t >= arrival.t - 1e-6); if (ai < 0) continue;
  const A = trace[ai]; if (A.bx - thr.los < MIN) continue;
  const dist = (r: any) => Math.hypot(r.bx - r.rx, r.by - r.ry);
  const around: Record<string, number> = {}; for (let o = -10; o <= 10; o++) { const r = trace[ai + o]; if (r) around[String(o)] = r2(dist(r)); }
  const win = trace.slice(Math.max(0, ai - 10), ai + 11); const near = win.reduce((m, r) => dist(r) < dist(m) ? r : m, win[0]);
  const rel = (s: number) => trace[Math.max(0, ai - Math.round(s * 20))]; // ticks are 0.05 s
  const vmax = R.profile.vmax, sp = (r: any) => Math.hypot(r.rvx, r.rvy);
  const ang = (r: any) => { const s = sp(r); if (s < 0.5) return null; let d = Math.atan2(r.rvy, r.rvx) - r.fac; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
  const estAt = (back: number) => { const r = rel(back); return r && r.ex !== undefined ? r2(Math.hypot(r.ex - thr.land.x, r.ey - thr.land.y)) : null; };
  // How far he ends from straight running: from his state 0.4 s after the throw, his position at the arrival against the straight-line extrapolation of it (along and across his velocity then).
  const k4 = trace.findIndex((r) => r.t >= thr.t + 0.4 - 1e-6); let dev: any = null;
  if (k4 >= 0 && k4 < ai) { const B = trace[k4], T = A.t - B.t, sp4 = Math.hypot(B.rvx, B.rvy); if (sp4 > 1) { const ex = B.rx + B.rvx * T, ey = B.ry + B.rvy * T, ux = B.rvx / sp4, uy = B.rvy / sp4, ddx = A.rx - ex, ddy = A.ry - ey; dev = { total: r2(Math.hypot(ddx, ddy)), along: r2(ddx * ux + ddy * uy), across: r2(Math.abs(-ddx * uy + ddy * ux)), T: r2(T) }; } }
  const first = trace.find((r) => r.knows === true);
  lines.push(JSON.stringify({ formation, concept, coverage, roster, seed, slot: R.slot, air: r2(A.bx - thr.los), flight: r2(thr.land.t - thr.t), throwT: r2(thr.t), result: arrival.type, other: arrival.who !== R.idx && arrival.who !== undefined ? 'other' : 'target',
    aimErr: r2(Math.hypot(thr.land.x - thr.aim.x, thr.land.y - thr.aim.y)), rcvToAim: r2(Math.hypot(A.rx - thr.aim.x, A.ry - thr.aim.y)), rcvToLand: r2(Math.hypot(A.rx - thr.land.x, A.ry - thr.land.y)),
    rcvMoved: r2(Math.hypot(A.rx - trace[trace.findIndex((r) => r.t >= thr.t)].rx, A.ry - trace[trace.findIndex((r) => r.t >= thr.t)].ry)), ballToAim: r2(Math.hypot(A.bx - thr.aim.x, A.by - thr.aim.y)), aimZ: r2(thr.aim.z), ballToRcv: r2(dist(A)), minDist: r2(dist(near)), tMin: r2(near.t - A.t), ballZ: r2(A.bz), reach: r2(R.profile.reach), around,
    knowsAt: first ? r2(first.t - thr.t) : null, estErr: { b1_0: estAt(1.0), b0_5: estAt(0.5), b0_25: estAt(0.25), b0_1: estAt(0.1) },
    speed: { arr: r2(sp(A)), b05: r2(sp(rel(0.5))), b10: r2(sp(rel(1.0))), vmax: r2(vmax) }, hipsOff: { arr: ang(A) === null ? null : r2(ang(A)!), b05: ang(rel(0.5)) === null ? null : r2(ang(rel(0.5))!) }, trunk: { arr: r2(A.trunk * 180 / Math.PI) },
    beh: A.beh, dev }));
}
writeFileSync(out, lines.join('\n') + '\n'); console.log(lines.length, 'throws ->', out);
