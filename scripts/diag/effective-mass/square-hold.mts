// Square head-on hold bench (Integration, 2026-11-10): a runner driving at 4 yd/s into a tackler who drives back,
// grasp at touch, lateral offset `off` between their paths. Prints the turn of the line of centres and the runner's
// forward travel at +0.3 / +0.6 s after the grasp, and both bodies' spin. Same bodies as test/contact-layer.test.ts.
// usage (arm via ref.mjs flags): node --import tsx scripts/diag/effective-mass/square-hold.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const { newSupport, supportParams } = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(3);
const runner = derivePhysical(generatePlayer(rng, 'RB')), hitter = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number) =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);
for (const off of [0, 0.02, 0.05, 0.1, 0.2]) {
  const r = body(runner, 0, 0, 0, 4), h = body(hitter, 1.2, off, Math.PI, 0), w = new World([r, h]);
  let t0 = -1, a0 = 0, x0 = 0; const out: string[] = [];
  for (let k = 0; k < 40; k++) {
    w.step([{ vel: { x: 4, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: -0.5, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05);
    const d = Math.hypot(r.pos.x - h.pos.x, r.pos.y - h.pos.y), ang = Math.atan2(h.pos.y - r.pos.y, h.pos.x - r.pos.x);
    if (t0 < 0 && d <= runner.radius + hitter.radius + 0.1) {
      t0 = k; a0 = ang; x0 = r.pos.x; w.joints.push({ kind: 'grasp', a: h, b: r, reach: runner.radius + hitter.radius + hitter.reach * 0.9,
        capacity: supportParams(hitter).armForce * 2, legs: 0, pull: 2, hold: d } as any);
    }
    if (t0 >= 0 && (k - t0 === 6 || k - t0 === 12)) out.push(`+${((k - t0) * 0.05).toFixed(1)}s turn ${(Math.abs(Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0))) * 180 / Math.PI).toFixed(1)} deg, runner +${(r.pos.x - x0).toFixed(2)} yd, spin ${(r.spin ?? 0).toFixed(2)}/${(h.spin ?? 0).toFixed(2)} rad/s, ${r.support.state}/${h.support.state}`);
  }
  console.log(`off ${off.toFixed(2)}: ${out.join(' | ')}`);
}
