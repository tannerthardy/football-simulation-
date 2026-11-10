/** Effective-mass bench (Phase 1 of docs/reviews/2026-11-10-effective-mass-plan.md). Two bodies on the real World, no game.
 * A generated runner at speed v runs into a generated hitter, offset `off` yd from the runner's path; both keep a
 * steady request with push on. Reports the same course as scripts/diag/run-operators/frontcourse.py (speeds along the
 * approach axis after first contact, centre separation), plus falls by +0.5 s, so a law can be compared with Gate 0
 * (docs/reviews/effective-mass.md) without a game.
 * Conservation check: the same collision with free intents (no ground force) must keep pair momentum exactly.
 * usage: node --import tsx scripts/diag/effective-mass/bench.mts [--seed 3] */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport } from '../../../src/physics/support.js';
import { World, type Intent } from '../../../src/physics/world.js';
import type { Body } from '../../../src/physics/kinematics.js';

const seed = process.argv.includes('--seed') ? Number(process.argv[process.argv.indexOf('--seed') + 1]) : 3;
const DT = 0.05, OFFS = [1, 2, 3, 4, 6, 10, 20];   // steps after contact: +0.05 .. +1.0 s
const rng = new Rng(seed);
const runnerProfile = derivePhysical(generatePlayer(rng, 'RB'));
const hitterProfile = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number): Body =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);

function collide(v: number, off: number, free = false) {
  const r = body(runnerProfile, 0, 0, 0, v), h = body(hitterProfile, 2.0, off, Math.PI, 0);
  const world = new World([r, h]);
  const rIntent: Intent = free ? { vel: { x: 0, y: 0 }, free: true } : { vel: { x: v, y: 0 }, push: 1 } as Intent;
  const hIntent: Intent = free ? { vel: { x: 0, y: 0 }, free: true } : { vel: { x: -0.5, y: 0 }, push: 1 } as Intent;
  let contact = -1, momentumError = 0;
  const course: { vr: number; vh: number; sep: number; fallen: boolean }[] = [];
  for (let k = 0; k < 60; k++) {
    const p0 = r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg;
    const rep = world.step([rIntent, hIntent], DT);
    const g = rep.groundImpulse[0].x + rep.groundImpulse[1].x;
    momentumError = Math.max(momentumError, Math.abs(r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg - p0 - g));
    const sep = Math.hypot(h.pos.x - r.pos.x, h.pos.y - r.pos.y);
    if (contact < 0 && sep <= 1.0) contact = k;
    if (contact >= 0) course.push({ vr: r.vel.x, vh: h.vel.x, sep, fallen: r.support!.state !== 'up' });
    if (contact >= 0 && k - contact >= 20) break;
  }
  const at = (n: number) => course[n] ?? course[course.length - 1];
  return { v, off, at, momentumError, fallenBy05: course.slice(0, 11).some(c => c.fallen) };
}

console.log(`runner ${runnerProfile.massKg.toFixed(0)} kg, hitter ${hitterProfile.massKg.toFixed(0)} kg (seed ${seed}); speeds along the runner's path, yd/s, after first contact (centres <= 1.0 yd)`);
console.log('  v   off | runner +0.05 +0.10 +0.15 +0.20 +0.30 +0.50 +1.0 | hitter +0.1 +0.2 +0.5 | sep +0.2 +1.0 | kept @0.1 @0.2 | runner down by 0.5 s');
for (const v of [2, 3, 4, 5, 6, 7]) for (const off of [0, 0.2, 0.4]) {
  const c = collide(v, off), f = (n: number) => c.at(n).vr.toFixed(2).padStart(5);
  console.log(`  ${v}  ${off.toFixed(1)} | ${OFFS.map(f).join(' ')} | ${[2, 4, 10].map(n => c.at(n).vh.toFixed(2).padStart(5)).join(' ')} | ${[4, 20].map(n => c.at(n).sep.toFixed(2)).join(' ')} | ${(100 * c.at(2).vr / c.at(0).vr).toFixed(0).padStart(3)}% ${(100 * c.at(4).vr / c.at(0).vr).toFixed(0).padStart(3)}% | ${c.fallenBy05 ? 'yes' : 'no'}`);
}
const free = collide(5, 0, true);
console.log(`conservation, free intents (no ground force): max pair momentum error ${free.momentumError.toExponential(2)} kg·yd/s per step`);
