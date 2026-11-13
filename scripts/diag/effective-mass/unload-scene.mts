// Staged unload (Flex, 2026-11-13, protector falls): a rusher bull-presses a protector who asks to hold his ground
// (velocity 0, push 1), through a hands joint, for PRESS s; then the rusher's press ends in one tick (the joint goes,
// he steps aside: a swim or a pull). Traces the protector's lean, felt load, capture point (xi, base radii) and support
// state per tick through the unload. Two bodies in the World, no controller.
// usage: node --import tsx scripts/diag/effective-mass/unload-scene.mts [press s=1.0] [rusher push=1] [blocker kg=140] [rusher drive yd/s=1.5]
const W = process.cwd();
const { World } = await import(`${W}/src/physics/world.ts`);
const { newSupport, supportParams } = await import(`${W}/src/physics/support.ts`);
const PRESS = Number(process.argv[2] ?? 1.0), PUSH = Number(process.argv[3] ?? 1), MB = Number(process.argv[4] ?? 140), DRIVE = Number(process.argv[5] ?? 1.5);
const body = (mass: number, pos: { x: number; y: number }, facing: number) => {
  const profile: any = { massKg: mass, radius: 0.3, reach: 0.25 + 0.95 * 0.85, heightYd: 2.05, vmax: 7.5, tau: 1.3, brake: 6, lateral: 6,
    turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5,
    bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
  return { pos, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(0.5) } as any;
};
const b = body(MB, { x: 0, y: 0 }, 0), d = body(130, { x: 1.2, y: 0 }, Math.PI);
const w = new World([b, d], { substeps: 12 });
const joint: any = { kind: 'hands', a: b, b: d, actor: b, extension: 1.2, push: 1500, hold: 0, steer: 600 };
w.joints.push(joint);
const dt = 0.05, base = supportParams(b.profile).baseRadius;
console.log(`blocker ${MB} kg, base radius ${base.toFixed(3)} yd; rusher presses (push ${PUSH}) for ${PRESS} s, then unloads`);
for (let k = 0; k * dt < PRESS + 1.0; k++) {
  const t = k * dt, pressing = t < PRESS;
  if (!pressing && w.joints.includes(joint)) w.joints = w.joints.filter((j: any) => j !== joint);
  const intents = [
    { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.55 },
    pressing ? { vel: { x: -DRIVE, y: 0 }, facing: Math.PI, push: PUSH, posture: 0.6 } : { vel: { x: 0, y: 3 }, facing: Math.PI / 2, push: 0, posture: 0.6 },
  ];
  w.step(intents as any, dt);
  const s = b.support;
  if (k % 2 === 0 || Math.abs(t - PRESS) < 0.31)
    console.log(`t ${t.toFixed(2)} ${pressing ? 'press ' : 'UNLOAD'} | blocker vx ${b.vel.x.toFixed(2)} | felt ${s.felt.x.toFixed(0)} load ${s.load.x.toFixed(0)} | lean ${s.lean.x.toFixed(0)}`
      + ` | xi ${(s.xi.x / base).toFixed(2)} base | ${s.state}${s.state !== 'up' ? ` (${s.cause}, fall ${s.fall.x.toFixed(2)})` : ''} | posture ${s.posture.toFixed(2)}`);
}
