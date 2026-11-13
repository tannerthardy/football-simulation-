// Sustained run-block drive (Integration, 2026-11-10): a DT driven back by an OG through a hands row (push = OG's arm
// force) while the OG drives at 2 yd/s requested. The DT's request: 'hold' (no motion, push 1, posture 0.6), 'retreat'
// (giving ground along the drive at 1.2 yd/s, push 1), 'anchor' (no motion, push 1, posture 1), 'hold-noPush' (no motion,
// push 0). Per tick for the DT: velocity along the drive, felt load (x mg), lean (x mg), lean released into his capture
// point this tick (yd), capture-point deviation over the fall threshold, time beyond his base (sup.out), availability,
// ground force over traction; fall and when.
// usage: [LEAN_PITCH=1] node --import tsx scripts/diag/effective-mass/drive-bench.mts [arm]
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(11);
const OG = derivePhysical(generatePlayer(rng, 'OG')), DT = derivePhysical(generatePlayer(rng, 'DT'));
const G = 9.81 * 1.0936;
const only = process.argv[2];
for (const arm of ['hold', 'retreat', 'anchor', 'hold-noPush']) {
  if (only && arm !== only) continue;
  const gap = OG.radius + DT.radius;
  const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: OG, support: S.newSupport(0.8) } as any;
  const d = { pos: { x: gap, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI, energy: 1, profile: DT, support: S.newSupport(arm === 'anchor' ? 1 : 0.6) } as any;
  const w = new World([b, d]); w.joints.push({ kind: 'hands', a: b, b: d, extension: gap, push: S.supportParams(OG).armForce, hold: 0, steer: 0 } as any);
  const di = arm === 'retreat' ? { vel: { x: 1.2, y: 0 }, facing: Math.PI, push: 1, posture: 0.6 } : { vel: { x: 0, y: 0 }, facing: Math.PI, push: arm === 'hold-noPush' ? 0 : 1, posture: arm === 'anchor' ? 1 : 0.6 };
  const sp = S.supportParams(DT), m = DT.massKg; const lines: string[] = []; let fell = '';
  for (let k = 0; k < 40; k++) {
    const rep = w.step([{ vel: { x: 2, y: 0 }, facing: 0, push: 1, posture: 0.8 } as any, di as any], 0.05);
    const sup = d.support, i = 1, w0 = S.omega0(sp, sup.posture), crit = S.baseRadiusAt(sp, sup.posture) + S.recoverySpeed(sp, 0, 1) / w0;
    const gi = rep.groundImpulse[i], gl = rep.groundImpulseLimit[i], rl = rep.leanRelease?.[i];
    if (k % 2 === 1) lines.push(`${((k + 1) * 0.05).toFixed(2)}s v ${d.vel.x.toFixed(2)} felt ${(Math.hypot(sup.felt.x, sup.felt.y) / (m * G)).toFixed(2)} lean ${(Math.hypot(sup.lean.x, sup.lean.y) / (m * G)).toFixed(2)} rel ${rl ? Math.hypot(rl.x, rl.y).toFixed(3) : '-'} xi/crit ${(Math.hypot(sup.xi.x, sup.xi.y) / crit).toFixed(2)} out ${sup.out.toFixed(2)} alpha ${((w as any).alpha[i]).toFixed(2)} ground ${(Math.hypot(gi.x, gi.y) / Math.max(1e-9, gl)).toFixed(2)} ${sup.state}`);
    if (!fell && sup.state !== 'up') { fell = `fell at ${((k + 1) * 0.05).toFixed(2)} s (${sup.cause})`; break; }
  }
  console.log(`== ${arm}: ${fell || 'stayed up'}  (OG ${OG.massKg.toFixed(0)} kg, DT ${DT.massKg.toFixed(0)} kg)`); console.log(lines.join('\n'));
}
