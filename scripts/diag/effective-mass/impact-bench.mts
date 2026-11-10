// Early run-block impact (Integration, 2026-11-10). A blocker driving at 3 yd/s (posture 0.8, push 1) meets a defender
// crossing his face at 3 yd/s (the pursuit the trace shows: request across the push, upright posture 0.43), 0.05 s steps,
// torso contact plus the run blocker's hands row once the pads meet (push = blocker's arm force). Arms:
//   unbraced: the defender keeps his pursuit request; braced: he squares up, requests no motion, posture 0.8, push 1;
//   mirrored: unbraced with y -> -y (results must mirror); equal: a LB as the blocker (equal-mass control).
// Per arm: contact height z against the defender's COM height c; peak felt load (x mg) and peak contact tip (yd/s^2);
// the defender's velocity change along the push over the first 0.3 s, against the two bounds a coherent contact must
// respect: the inelastic collision share m_b/(m_b+m_d) x closing speed plus what the blocker's own ground force can add
// (his ground impulse over the defender's mass); the pair's energy ledger (contact work must not exceed zero beyond the
// arm/ground work: kinetic energy change - ground work - arm/hand work); fall and when.
// usage: node --import tsx scripts/diag/effective-mass/impact-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(9);
const OG = derivePhysical(generatePlayer(rng, 'OG')), LB = derivePhysical(generatePlayer(rng, 'LB')), LB2 = derivePhysical(generatePlayer(rng, 'LB'));
const G = 9.81 * 1.0936;
function run(arm: string) {
  const B = arm === 'equal' ? LB2 : OG, D = LB, sy = arm === 'mirrored' ? -1 : 1, cx = arm === 'crossing-3' ? 0 : -1.2, braced = arm === 'braced' || arm === 'square-upright', up = arm === 'square-upright';
  const b = { pos: { x: 0, y: 0 }, vel: { x: 3, y: 0 }, facing: 0, energy: 1, profile: B, support: S.newSupport(0.8) } as any;
  const d = { pos: { x: B.radius + D.radius + 0.6, y: braced ? 0 : -0.9 * sy }, vel: { x: braced ? 0 : cx, y: braced ? 0 : 3 * sy }, facing: braced ? Math.PI : Math.PI / 2 * sy, energy: 1, profile: D, support: S.newSupport(braced && !up ? 0.8 : 0.43) } as any;
  const w = new World([b, d]); const mb = B.massKg, md = D.massKg;
  const bi = { vel: { x: 3, y: 0 }, facing: 0, push: 1, posture: 0.8 } as any;
  const di = braced ? { vel: { x: 0, y: 0 }, facing: Math.PI, push: up ? 0 : 1, posture: up ? 0.43 : 0.8 } as any : { vel: { x: cx, y: 3 * sy }, facing: Math.PI / 2 * sy, push: 1, posture: 0.43 } as any;
  let t0 = -1, v0 = 0, vClose = 0, gB = 0, ledger = 0, felt = 0, tip = 0, fell = '', z = 0, c = 0, dv = 0, hands: any = null;
  const ke = () => 0.5 * mb * (b.vel.x ** 2 + b.vel.y ** 2) + 0.5 * md * (d.vel.x ** 2 + d.vel.y ** 2);
  let pv = { b: 3, d: 0 };
  for (let k = 0; k < 30; k++) {
    const gap = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - B.radius - D.radius;
    if (t0 < 0 && gap <= 0.15) { t0 = k; v0 = pv.d; vClose = pv.b - pv.d;
      hands = { kind: 'hands', a: b, b: d, extension: B.radius + D.radius, push: S.supportParams(B).armForce, hold: 0, steer: 0 }; w.joints.push(hands); }
    pv = { b: b.vel.x, d: d.vel.x }; const e0 = ke(); const rep = w.step([bi, di], 0.05);
    if (t0 < 0) continue; const n = k - t0;
    if (n < 6) { gB += rep.groundImpulse[0].x;
      const gw = rep.groundWork[0] + rep.groundWork[1]; ledger += ke() - e0 - gw - rep.work.hands - rep.work.strikes - rep.work.grasps; }
    const sup = d.support, fl = Math.hypot(sup.felt.x, sup.felt.y) / (md * G); felt = Math.max(felt, fl);
    tip = Math.max(tip, (sup.tipAccel?.x ?? 0)); if (n === 5) dv = d.vel.x - v0;
    const sp = S.supportParams(D); c = S.comHeightAt(sp, sup.posture); z = Math.min(S.padHeightAt(S.supportParams(B), 0.8), S.padHeightAt(sp, sup.posture));
    if (!fell && sup.state !== 'up') fell = `fell at +${((n + 1) * 0.05).toFixed(2)} s, ${sup.fall.x > 0.5 ? 'along the push' : sup.fall.x < -0.5 ? 'toward the blocker' : 'across'}`;
  }
  const bound = mb / (mb + md) * vClose + gB / md;
  return `${arm.padEnd(9)} closing ${vClose.toFixed(2)} yd/s; z ${z.toFixed(2)} vs c ${c.toFixed(2)} yd; peak felt ${felt.toFixed(2)} mg, tip ${tip.toFixed(1)} yd/s^2; defender dv(0.3 s) ${dv.toFixed(2)} yd/s vs bound ${bound.toFixed(2)} (collision ${(mb / (mb + md) * vClose).toFixed(2)} + blocker ground ${(gB / md).toFixed(2)}); energy excess ${ledger.toFixed(1)} J-equiv; ${fell || 'stayed up'}`;
}
console.log(`masses: OG ${OG.massKg.toFixed(0)} kg, LB ${LB.massKg.toFixed(0)} kg, LB2 ${LB2.massKg.toFixed(0)} kg`);
for (const a of ['unbraced', 'crossing-3', 'braced', 'square-upright', 'mirrored', 'equal']) console.log(run(a));
