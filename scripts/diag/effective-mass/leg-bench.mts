// Leg wrap against upper wrap, controlled (Tanner, 2026-11-10: "wrapping around the legs is essential"). The World only,
// default options (run-ref-13 stack via env). A runner (RB) at speed meets a tackler (LB) who has just wrapped him
// (lock 0.8, the same grip capacity) with the hold at a given leg share: 0 (chest), 0.5 (waist and thighs), 0.8 (thighs
// and knees), 1 (shins). Approaches: front (head-on, runner 4 yd/s), side (runner crossing at 5 yd/s), behind (runner
// pulling away at 5 yd/s). The runner keeps driving toward his travel; the holder holds (push 1, no velocity request).
// Reported: time until the runner's support leaves 'up' (a fall), his travel at the fall and to rest (down and
// under 0.2 yd/s, or 2.0 s): yards after contact count to the end, not to the fall's start.
// usage: [flags] node --import tsx scripts/diag/effective-mass/leg-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(51);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'LB'));
const body = (p: any, x: number, y: number, f: number, vx: number, vy: number) => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing: f, energy: 1, profile: p, support: S.newSupport(0.4) } as any);
const gap = R.radius + H.radius + 0.05;
for (const ap of ['front', 'side', 'behind']) for (const legs of [0, 0.5, 0.8, 1]) {
  const v = ap === 'front' ? 4 : 5;
  const r = body(R, 0, 0, 0, v, 0);
  const h = ap === 'front' ? body(H, gap, 0, Math.PI, 0, 0) : ap === 'side' ? body(H, 0, gap, -Math.PI / 2, 0, 0) : body(H, -gap, 0, 0, 3, 0);
  const w = new World([r, h]);
  const lock = 0.8, cap = S.supportParams(H).armForce * (0.3 + 2.5 * lock * lock) * 0.96;
  const jt: any = { kind: 'grasp', a: h, b: r, reach: gap + H.reach * 0.9, capacity: cap, lock, legs, pull: 2, hold: gap, origin: 'bench' };
  w.joints.push(jt);
  let down = -1; const x0 = r.pos.x; let travel = 0;
  for (let k = 1; k <= 40; k++) {
    w.step([{ vel: { x: v, y: 0 }, facing: 0, push: 1, posture: 0.5 } as any, { vel: { x: 0, y: 0 }, facing: h.facing, push: 1 } as any], 0.05);
    if (down < 0 && r.support.state !== 'up') { down = k * 0.05; travel = r.pos.x - x0; }
    if (down >= 0 && r.support.state === 'down' && Math.hypot(r.vel.x, r.vel.y) < 0.2) break;
  }
  const rest = r.pos.x - x0;
  if (down < 0) travel = rest;
  console.log(`${ap.padEnd(6)} legs ${legs.toFixed(1)}: ${down >= 0 ? `down at ${down.toFixed(2)} s (${r.support.cause})` : 'still up at 2.0 s'}, runner travel ${travel.toFixed(2)} yd at the fall, ${rest.toFixed(2)} yd to rest (2.0 s max), hold ${jt.broken || !w.joints.includes(jt) ? 'broken' : 'held'}`);
}
