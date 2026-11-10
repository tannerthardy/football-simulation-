/** Grasp bench (step 2 (b)): one hitter's grasp on one runner on the real World, no game, so the contact law is
 * compared on identical bodies and requests (a game arm also changes which contacts happen: the movement previews
 * read the World's law). A runner at 4 yd/s meets a hitter offset `off` from his path; at touching distance the
 * hitter takes a grasp (upper: legs 0; lower: legs 0.8) with a capacity of 0.3 x his arm force x 1.5 and a reel of
 * 1.8 yd/s, as tackle.ts builds a sound two-arm wrap. Both keep requesting: the runner his path at 4 yd/s, the
 * hitter toward the runner. Reports, from the grasp: the runner's slip across the line of centres at +0.1/+0.3 s,
 * how far that line has turned by +0.3 s, the runner's speed along his path at +0.1/+0.5/+1.0 s, whether the grasp
 * still holds at +1.0 s, whether the runner is down by +1.0 s, and pair momentum error with free intents.
 * Settings at load: run once per law, e.g. GRASP_PATCH=1, or --patch for the World's patch mode.
 * usage: node --import tsx scripts/diag/effective-mass/grasp-bench.mts [--patch] */
import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
import { newSupport, supportParams } from '../../../src/physics/support.js';
import { World, type Intent } from '../../../src/physics/world.js';
const patch = process.argv.includes('--patch');
const rng = new Rng(3);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number): any =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) });
function run(off: number, legs: number, free = false) {
  const r = body(R, 0, 0, 0, 4), h = body(H, 1.2, off, Math.PI, 0);
  const w = new World([r, h], patch ? { handContact: 'patch', handIntegration: 'centered' } as any : {});
  let t0 = -1, a0 = 0, err = 0; const out: any = {}; let k = 0;
  const DT = 0.05;
  for (; k < 60; k++) {
    const ri: Intent = free ? { vel: { x: 0, y: 0 }, free: true } as any : { vel: { x: 4, y: 0 }, facing: 0, push: 1 } as any;
    const dx = r.pos.x - h.pos.x, dy = r.pos.y - h.pos.y, dd = Math.hypot(dx, dy);
    const hi: Intent = free ? { vel: { x: 0, y: 0 }, free: true } as any : { vel: { x: dx / dd * 2, y: dy / dd * 2 }, facing: Math.atan2(dy, dx), push: 1 } as any;
    const p0 = r.vel.x * R.massKg + h.vel.x * H.massKg;
    const rep = w.step([ri, hi], DT);
    err = Math.max(err, Math.abs(r.vel.x * R.massKg + h.vel.x * H.massKg - p0 - rep.groundImpulse[0].x - rep.groundImpulse[1].x));
    const d = Math.hypot(r.pos.x - h.pos.x, r.pos.y - h.pos.y);
    if (t0 < 0 && d <= R.radius + H.radius + 0.1) {
      t0 = k; a0 = Math.atan2(r.pos.y - h.pos.y, r.pos.x - h.pos.x);
      w.joints.push({ kind: 'grasp', a: h, b: r, reach: R.radius + H.radius + H.reach * 0.9, capacity: supportParams(H).armForce * 0.3 * 1.5,
        legs, pull: 1.8, hold: d, origin: 'bench' } as any);
    }
    if (t0 >= 0) {
      const s = k - t0, nx = (r.pos.x - h.pos.x) / d, ny = (r.pos.y - h.pos.y) / d;
      const slip = Math.abs(-(r.vel.x - h.vel.x) * ny + (r.vel.y - h.vel.y) * nx);
      if (s === 2) out.s1 = slip;
      if (s === 6) { out.s3 = slip; const a = Math.atan2(r.pos.y - h.pos.y, r.pos.x - h.pos.x); out.turn = Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI; }
      if (s === 2) out.v1 = r.vel.x; if (s === 10) out.v5 = r.vel.x;
      if (s === 20) { out.v10 = r.vel.x; out.held = (w.joints as any[]).some(j => j.kind === 'grasp' && !j.broken); out.down = r.support.state !== 'up'; out.hdown = h.support.state !== 'up'; break; }
    }
  }
  return { ...out, err };
}
console.log(`law: ${patch ? 'patch mode' : `centre${process.env.GRASP_PATCH === '1' ? ' + GRASP_PATCH' : ''}`} | runner ${R.massKg.toFixed(0)} kg at 4 yd/s, hitter ${H.massKg.toFixed(0)} kg; grasp at touching distance`);
for (const legs of [0, 0.8]) for (const off of [0, 0.3]) {
  const o = run(off, legs);
  console.log(`  ${legs ? 'lower' : 'upper'} grasp, offset ${off.toFixed(1)} | slip +0.1 ${o.s1?.toFixed(2)} +0.3 ${o.s3?.toFixed(2)} | line turned +0.3 ${o.turn?.toFixed(0)} deg | runner +0.1 ${o.v1?.toFixed(2)} +0.5 ${o.v5?.toFixed(2)} +1.0 ${o.v10?.toFixed(2)} | grasp holds at +1.0 ${o.held} | runner down ${o.down}, hitter down ${o.hdown}`);
}
const f = run(0.3, 0, true);
console.log(`  conservation, free intents, upper grasp at 0.3: max pair momentum error ${f.err.toExponential(2)}`);
