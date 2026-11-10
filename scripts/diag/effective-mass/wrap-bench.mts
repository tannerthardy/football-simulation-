// WRAP_TWO_POINT bench (the tackler's over-rotation). A runner at 4.5 yd/s passing a hitter who stands beside his path
// (lateral offset `off`, the hitter facing him), the grasp formed at first proximity (centres <= 1.0 yd): two-arm (lock 0.5)
// or one-arm (lock 0). The hitter's facing request either tracks square to the runner every tick (as the game's does) or
// holds the facing he had at the grasp. Reports the hitter's rotation and the runner's by +0.5 / +1.0 s, the bearing
// hitter -> runner turned, the runner's speed kept at +0.5 s, the pair's slip at +0.1 s, and pair momentum with free intents.
// usage: node scripts/ref.mjs [--flag WRAP_TWO_POINT=1] -- node --import tsx .../wrap-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const { newSupport, supportParams } = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(3);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number) =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);
const dt = 0.05, deg = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
function run(off: number, lock: number, track: boolean) {
  const r = body(R, 0, 0, 0, 4.5), h = body(H, 2.0, off, Math.atan2(-off, -2.0), 0), w: any = new World([r, h]);
  let t0 = -1, f0 = 0, fr0 = 0, b0 = 0, v0 = 4.5, out: any = {}, face = h.facing;
  for (let k = 0; k < 40; k++) {
    const sq = Math.atan2(r.pos.y - h.pos.y, r.pos.x - h.pos.x);
    w.step([{ vel: { x: 4.5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: track || t0 < 0 ? sq : face, push: 1 } as any], dt);
    const d = Math.hypot(r.pos.x - h.pos.x, r.pos.y - h.pos.y), bear = Math.atan2(r.pos.y - h.pos.y, r.pos.x - h.pos.x);
    if (t0 < 0 && d <= 1.0) { t0 = k; f0 = h.facing; fr0 = r.facing; b0 = bear; face = h.facing;
      w.joints.push({ kind: 'grasp', a: h, b: r, reach: R.radius + H.radius + H.reach * 0.9, capacity: supportParams(H).armForce * 0.96 * (0.3 + 2.5 * lock * lock + (lock ? 0 : 0.15 - 0.3)), legs: 0.25, pull: lock ? 2.2 : 1.2, hold: d, lock }); continue; }
    if (t0 < 0) continue; const n = k - t0;
    if (n === 2) { const nx = (h.pos.x - r.pos.x) / d, ny = (h.pos.y - r.pos.y) / d; out.slip = Math.abs(-(r.vel.x - h.vel.x) * ny + (r.vel.y - h.vel.y) * nx); }
    if (n === 10) { out.h5 = deg(h.facing - f0); out.r5 = deg(r.facing - fr0); out.b5 = deg(bear - b0); out.v5 = r.vel.x / v0; }
    if (n === 20) { out.h10 = deg(h.facing - f0); out.r10 = deg(r.facing - fr0); out.b10 = deg(bear - b0); }
  }
  return out;
}
for (const track of [true, false]) { console.log(`== hitter's facing request ${track ? 'tracks square to the runner (as the game)' : 'held at the grasp'}`);
  for (const lock of [0.5, 0]) for (const off of [0.6, 0.9]) { const x = run(off, lock, track);
    console.log(`   ${lock ? 'two-arm' : 'one-arm'} wrap, hitter ${off.toFixed(1)} yd beside | hitter rotation +0.5 / +1.0 s ${x.h5?.toFixed(0)} / ${x.h10?.toFixed(0)} deg | runner ${x.r5?.toFixed(0)} / ${x.r10?.toFixed(0)} | bearing turned ${x.b5?.toFixed(0)} / ${x.b10?.toFixed(0)} | runner speed kept +0.5 s ${(100 * x.v5).toFixed(0)}% | slip +0.1 s ${x.slip?.toFixed(2)} yd/s`); } }
{ let err = 0; const r = body(R, 0, 0, 0, 4.5), h = body(H, 0.8, 0.5, Math.PI, 0), w: any = new World([r, h]);
  w.joints.push({ kind: 'grasp', a: h, b: r, reach: 1.5, capacity: supportParams(H).armForce * 1.2, legs: 0.25, pull: 2.2, hold: 0.95, lock: 0.5 });
  for (let k = 0; k < 30; k++) { const p0x = r.vel.x * R.massKg + h.vel.x * H.massKg, p0y = r.vel.y * R.massKg + h.vel.y * H.massKg;
    const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], dt);
    err = Math.max(err, Math.hypot(r.vel.x * R.massKg + h.vel.x * H.massKg - p0x - rep.groundImpulse[0].x - rep.groundImpulse[1].x, r.vel.y * R.massKg + h.vel.y * H.massKg - p0y - rep.groundImpulse[0].y - rep.groundImpulse[1].y)); }
  console.log(`pair momentum error with free intents ${err.toExponential(1)} kg yd/s`); }
