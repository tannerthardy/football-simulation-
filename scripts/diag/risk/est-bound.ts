// What his eyes can know: a deep flight (QB 2 yd up at the origin, landing at catch height about 38 yd downfield and
// 6 yd across, 2.0 s), a receiver running under it at 8 yd/s from 22 yd downfield; samples every 0.05 s from 0.25 s
// with the estimator's noise model (bearing sd 0.75 deg, range sd 7.5% of distance, each error a first-order process
// with time constant tau; tau 0 = independent). fitFlight on his samples alone (no prior) at 0.5 / 1.0 / 1.5 s: landing
// error (the fit's point at catch height vs the true one), median and p90 over 400 throws.
//   npx tsx scripts/diag/risk/est-bound.ts
import { fitFlight } from '../../../src/sim/ball-estimate.js';
const G = 10.72; // yd/s^2
const rng = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const T = 2.0, land = { x: 38, y: 6, z: 1.3 }, p0 = { x: 0, y: 0, z: 2 };
const v0 = { x: (land.x - p0.x) / T, y: (land.y - p0.y) / T, z: (land.z - p0.z + 0.5 * G * T * T) / T };
const ball = (t: number) => ({ x: p0.x + v0.x * t, y: p0.y + v0.y * t, z: p0.z + v0.z * t - 0.5 * G * t * t });
const rcv = (t: number) => ({ x: 22 + 8 * t, y: 6, z: 1.7 });
const perp = (u: any) => { const a = Math.abs(u.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }; const c = { x: u.y * a.z - u.z * a.y, y: u.z * a.x - u.x * a.z, z: u.x * a.y - u.y * a.x }; const n = Math.hypot(c.x, c.y, c.z); return { x: c.x / n, y: c.y / n, z: c.z / n }; };
const cross = (a: any, b: any) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const landingOf = (f: any) => { // where the fit crosses catch height (no drag)
  const vz = f.v.z, pz = f.p.z - land.z; const tt = (vz + Math.sqrt(Math.max(0, vz * vz + 2 * G * pz))) / G;
  return { x: f.p.x + f.v.x * tt, y: f.p.y + f.v.y * tt };
};
for (const tau of [0, 0.25]) for (const at of [0.5, 1.0, 1.5]) {
  const errs: number[] = [];
  for (let k = 0; k < 400; k++) {
    let e = [0, 0, 0]; const samples: any[] = [];
    for (let t = 0.25; t <= at + 1e-9; t += 0.05) {
      const rho = tau > 0 ? Math.exp(-0.05 / tau) : 0, q = Math.sqrt(1 - rho * rho);
      e = e.map((x) => rho * x + q * gauss());
      const b = ball(t), eye = rcv(t), d = { x: b.x - eye.x, y: b.y - eye.y, z: b.z - eye.z }, r = Math.hypot(d.x, d.y, d.z), u = { x: d.x / r, y: d.y / r, z: d.z / r };
      const e1 = perp(u), e2 = cross(u, e1), sr = 0.075, sa = 0.75 * Math.PI / 180;
      const er = e[0] * sr * r, ea = e[1] * sa * r, eb = e[2] * sa * r;
      const inflate = tau > 0 ? Math.sqrt(Math.max(1, tau / 0.05)) : 1;
      samples.push({ t, p: { x: b.x + u.x * er + e1.x * ea + e2.x * eb, y: b.y + u.y * er + e1.y * ea + e2.y * eb, z: b.z + u.z * er + e1.z * ea + e2.z * eb }, along: u, sr: sr * r * inflate, sa: sa * r * inflate });
    }
    const f = fitFlight(samples, 0); const L = landingOf(f);
    if (Number.isFinite(L.x)) errs.push(Math.hypot(L.x - land.x, L.y - land.y));
  }
  errs.sort((a, b) => a - b);
  console.log(`tau ${tau.toFixed(2)} at ${at.toFixed(1)} s (${Math.round((at - 0.25) / 0.05) + 1} samples): landing error p50 ${errs[Math.floor(errs.length / 2)].toFixed(2)} yd, p90 ${errs[Math.floor(errs.length * 0.9)].toFixed(2)} yd`);
}

// With his prior (the estimator's own pseudo-observations, ball-estimate.ts seed()): the release at the passer's hand
// (0.5 yd), the shoulder line one second out (along 15, across 15 x 5 deg, up 15), and the route prior: the QB's aim at
// his own expected catch time T' (placement error 1.5 yd each horizontal axis and timing error 0.15 s sd, the QB's,
// unknown to him), axes as seed(): along hypot(0.12 d, d/T' x 0.3), across hypot(1.0, 8 x 0.3), height PRIOR_HEIGHT 1.0
// at z 1.5 ("old"), or height also widened by the timing (sv = hypot(1.0, |vz at T'| x 0.3), "fix").
// PRIOR=old|fix|none (default: all three).
for (const arm of (process.env.PRIOR ? [process.env.PRIOR] : ['none', 'old', 'fix'])) for (const at of [0.5, 1.0, 1.5, 1.95]) {
  const errs: number[] = [];
  for (let k = 0; k < 400; k++) {
    let e = [0, 0, 0]; const samples: any[] = [];
    const tau = 0.25;
    for (let t = 0.25; t <= at + 1e-9; t += 0.05) {
      const rho = Math.exp(-0.05 / tau), q = Math.sqrt(1 - rho * rho);
      e = e.map((x) => rho * x + q * gauss());
      const b = ball(t), eye = rcv(t), d = { x: b.x - eye.x, y: b.y - eye.y, z: b.z - eye.z }, r = Math.hypot(d.x, d.y, d.z), u = { x: d.x / r, y: d.y / r, z: d.z / r };
      const e1 = perp(u), e2 = cross(u, e1), sr = 0.075, sa = 0.75 * Math.PI / 180;
      const er = e[0] * sr * r, ea = e[1] * sa * r, eb = e[2] * sa * r, inflate = Math.sqrt(tau / 0.05);
      samples.push({ t, p: { x: b.x + u.x * er + e1.x * ea + e2.x * eb, y: b.y + u.y * er + e1.y * ea + e2.y * eb, z: b.z + u.z * er + e1.z * ea + e2.z * eb }, along: u, sr: sr * r * inflate, sa: sa * r * inflate });
    }
    const pseudo: any[] = [];
    if (arm !== 'none') {
      pseudo.push({ t: 0, p: { ...p0 }, along: { x: 1, y: 0, z: 0 }, sr: 0.5, sa: 0.5, sv: 0.5 });
      const sh = Math.atan2(land.y, land.x) + gauss() * 5 * Math.PI / 180, us = { x: Math.cos(sh), y: Math.sin(sh), z: 0 };
      pseudo.push({ t: 1, p: { x: us.x * 15, y: us.y * 15, z: 2 }, along: us, sr: 15, sa: 15 * 5 * Math.PI / 180, sv: 15 });
      const Tp = T + gauss() * 0.15, P = { x: land.x - gauss() * 1.5, y: land.y - gauss() * 1.5 }, dd = Math.hypot(P.x, P.y), up = { x: P.x / dd, y: P.y / dd, z: 0 };
      const vzLand = Math.abs(v0.z - G * T), sv = arm === 'fix' ? Math.hypot(1.0, vzLand * 0.3) : 1.0;
      pseudo.push({ t: Tp, p: { x: P.x, y: P.y, z: 1.5 }, along: up, sr: Math.hypot(0.12 * dd, (dd / Tp) * 0.3), sa: Math.hypot(1.0, 8 * 0.3), sv });
    }
    const f = fitFlight([...pseudo, ...samples], 0); const L = landingOf(f);
    if (Number.isFinite(L.x)) errs.push(Math.hypot(L.x - land.x, L.y - land.y));
  }
  errs.sort((a, b) => a - b);
  console.log(`prior ${arm.padEnd(4)} at ${at.toFixed(2)} s: landing error p50 ${errs[Math.floor(errs.length / 2)].toFixed(2)} yd, p90 ${errs[Math.floor(errs.length * 0.9)].toFixed(2)} yd`);
}
