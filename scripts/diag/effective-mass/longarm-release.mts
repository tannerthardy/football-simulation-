// Staged long-arm release (Flex, 2026-11-13: rusher falls under RUSH_HANDS are long-arm releases, not leans). A 130 kg
// rusher holds a 140 kg blocker off with a locked arm (a hands joint, the rusher its actor, extension = bodies + 0.9
// arm) while asking to run at him at ASK yd/s with push PUSH; the blocker holds (velocity 0, push 1). After 1.0 s the
// joint ends in one tick. Traces the rusher's capture point (xi, base radii), lean, felt load, velocity and state.
// usage: node --import tsx scripts/diag/effective-mass/longarm-release.mts [ask yd/s=4.5] [push=1]
const W = process.cwd();
const { World } = await import(`${W}/src/physics/world.ts`);
const { newSupport, supportParams } = await import(`${W}/src/physics/support.ts`);
const ASK = Number(process.argv[2] ?? 4.5), PUSH = Number(process.argv[3] ?? 1);
const body = (mass: number, x: number, facing: number) => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, support: newSupport(0.6),
  profile: { massKg: mass, radius: 0.3, reach: 1.06, heightYd: 2.05, vmax: 7.5, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
    shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 } }) as any;
const b = body(140, 0, 0), d = body(130, 1.45, Math.PI);
const w = new World([b, d], { substeps: 12 });
const joint: any = { kind: 'hands', a: d, b, actor: d, extension: 1.45, push: 1600, hold: 0, steer: 400 };
w.joints.push(joint);
const base = supportParams(d.profile).baseRadius;
console.log(`rusher asks ${ASK} yd/s at the blocker (push ${PUSH}); arm released at 1.0 s`);
for (let k = 0; k < 36; k++) {
  const t = k * 0.05;
  if (t >= 1.0 && w.joints.includes(joint)) w.joints = w.joints.filter((j: any) => j !== joint);
  w.step([{ vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.6 }, { vel: { x: -ASK, y: 0 }, facing: Math.PI, push: PUSH, posture: 0.7 }] as any, 0.05);
  const s = d.support;
  if (t >= 0.8 && t <= 1.4 || k % 4 === 0)
    console.log(`t ${t.toFixed(2)} ${t < 1.0 ? 'held ' : 'FREE '} | rusher vx ${d.vel.x.toFixed(2)} | felt ${s.felt.x.toFixed(0)} | lean ${s.lean.x.toFixed(0)} | xi ${(s.xi.x / base).toFixed(2)} base | ${s.state}${s.state !== 'up' ? ` (${s.cause})` : ''} | causes c/l/o ${(s.causes?.contact ?? 0).toFixed(3)}/${(s.causes?.legs ?? 0).toFixed(3)}/${(s.causes?.overspeed ?? 0).toFixed(3)}`);
}
