/** Step 1 bench (CONTACT_LAYER): two generated bodies on the real World, no game. A runner at speed v meets a hitter
 * offset `off` yd from his path; both keep a steady request with push on (the same setup as bench.mts), stepped at
 * 5 ms so the contact force is resolved. Reports, from first torso distance (centres <= 0.65 yd):
 *   the runner's speed along his path at +0.05/+0.1/+0.2/+0.3/+0.5 s and the share kept at +0.1 s,
 *   the peak contact force on the runner (|change of momentum - ground impulse| per 5 ms, N),
 *   separation at +0.5 and +1.0 s;
 * and pair momentum with free intents (no ground force), which must be kept exactly.
 * Settings are read at load: run once per arm, e.g.
 *   node --import tsx scripts/diag/effective-mass/layer-bench.mts
 *   CONTACT_LAYER=1 node --import tsx scripts/diag/effective-mass/layer-bench.mts */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport } from '../../../src/physics/support.js';
import { World, type Intent } from '../../../src/physics/world.js';
import type { Body } from '../../../src/physics/kinematics.js';

const seed = process.argv.includes('--seed') ? Number(process.argv[process.argv.indexOf('--seed') + 1]) : 3;
const DT = 0.005, N_PER = (s: number) => Math.round(s / DT), YD = 0.9144;
const rng = new Rng(seed);
const runnerProfile = derivePhysical(generatePlayer(rng, 'RB'));
const hitterProfile = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number): Body =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);

function collide(v: number, off: number, free = false) {
  const r = body(runnerProfile, 0, 0, 0, v), h = body(hitterProfile, 1.5, off, Math.PI, 0);
  const world = new World([r, h], process.env.BENCH_PATCH === '1' ? { handContact: 'patch', handIntegration: 'centered' } as any : {});
  const rI: Intent = free ? { vel: { x: 0, y: 0 }, free: true } as Intent : { vel: { x: v, y: 0 }, push: 1 } as Intent;
  const hI: Intent = free ? { vel: { x: 0, y: 0 }, free: true } as Intent : { vel: { x: -0.5, y: 0 }, push: 1 } as Intent;
  let t0 = -1, peak = 0, momErr = 0, fallen = false; const course: any[] = [];
  for (let k = 0; k < N_PER(2.5); k++) {
    const pr = { x: r.vel.x * r.profile.massKg, y: r.vel.y * r.profile.massKg };
    const p0 = pr.x + h.vel.x * h.profile.massKg;
    const rep = world.step([rI, hI], DT);
    const g = rep.groundImpulse;
    momErr = Math.max(momErr, Math.abs(r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg - p0 - g[0].x - g[1].x));
    const fx = (r.vel.x * r.profile.massKg - pr.x - g[0].x) / DT, fy = (r.vel.y * r.profile.massKg - pr.y - g[0].y) / DT;
    const sep = Math.hypot(h.pos.x - r.pos.x, h.pos.y - r.pos.y);
    if (t0 < 0 && sep <= 0.65) t0 = k;
    if (t0 >= 0 || sep < 1.2) peak = Math.max(peak, Math.hypot(fx, fy) * YD);
    if (t0 >= 0) { course.push({ vr: r.vel.x, sep, fr: r.facing, fh: h.facing }); if (r.support!.state !== 'up' && k - t0 <= N_PER(0.5)) fallen = true; }
    if (t0 >= 0 && k - t0 >= N_PER(1.0)) break;
  }
  const at = (s: number) => course[Math.min(course.length - 1, N_PER(s))] ?? { vr: NaN, sep: NaN, fr: NaN, fh: NaN };
  const turn = (s: number) => ({ r: (at(s).fr - course[0].fr) * 180 / Math.PI, h: (at(s).fh - course[0].fh) * 180 / Math.PI });
  return { at, turn, v0: course[0]?.vr ?? NaN, peak, momErr, fallen };
}

console.log(`CONTACT_LAYER=${process.env.CONTACT_LAYER ?? ''} BENCH_PATCH=${process.env.BENCH_PATCH ?? ''} | runner ${runnerProfile.massKg.toFixed(0)} kg, hitter ${hitterProfile.massKg.toFixed(0)} kg (seed ${seed}); runner speed along his path from torso distance (<= 0.65 yd), yd/s`);
console.log('  v  off | +0.05 +0.10 +0.20 +0.30 +0.50 | kept @0.1 | peak force N | sep +0.5 +1.0 | runner down by +0.5 | turned by +0.3 s (deg) runner / hitter');
for (const v of [3, 4, 5, 6]) for (const off of [0, 0.3]) {
  const c = collide(v, off), f = (s: number) => c.at(s).vr.toFixed(2).padStart(5);
  console.log(`  ${v}  ${off.toFixed(1)} | ${[0.05, 0.1, 0.2, 0.3, 0.5].map(f).join(' ')} | ${(100 * c.at(0.1).vr / c.v0).toFixed(0).padStart(4)}% | ${c.peak.toFixed(0).padStart(6)} | ${c.at(0.5).sep.toFixed(2)} ${c.at(1.0).sep.toFixed(2)} | ${c.fallen ? 'yes' : 'no'} | ${c.turn(0.3).r.toFixed(1)} / ${c.turn(0.3).h.toFixed(1)}`);
}
const free = collide(4, 0.2, true);
console.log(`conservation, free intents (no ground force), 4 yd/s at 0.2 yd: max pair momentum error ${free.momErr.toExponential(2)} kg·yd/s per step; peak force ${free.peak.toFixed(0)} N, runner kept @0.1 ${(100 * free.at(0.1).vr / free.v0).toFixed(0)}%`);
