// GRASP_ARM_MOMENT bench (Integration, 2026-11-10). Generated RB / LB bodies, 0.05 s steps, the World only (default
// options, as the run set uses them; GRASP_PATCH as the stack has it). Holder rotation (deg) at +0.5 / +1.0 s and the
// runner's travel by +1.0 s, per case; the arm-swing yaw the flag left unpassed (report.armSwingYaw, summed).
//   side:    a leg hold (legs 0.5, lock 0.5) from beside a runner crossing at 4 yd/s; the holder asks to keep his facing.
//   behind:  a leg hold from behind a runner cutting away (4, 1.5 yd/s); the holder asks to keep his facing.
//   adverse: a strong holder (power x1.3) square in front in a tight two-arm wrap (lock 1, legs 0) on a runner at 1 yd/s
//            who spins (facing request turning 1 turn/s): the holder must still be turned.
// Then momentum with free intents and a no-grasp digest. usage: [GRASP_ARM_MOMENT=1] node --import tsx .../arm-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(41);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'LB'));
const HS = { ...H, power: (H as any).power * 1.3 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const body = (p: any, x: number, y: number, facing: number, vx: number, vy: number) => ({ pos: { x, y }, vel: { x: vx, y: vy }, facing, energy: 1, profile: p, support: S.newSupport(0.4) } as any);
const grasp = (h: any, r: any, legs: number, lock: number, prof: any) => ({ kind: 'grasp', a: h, b: r, reach: R.radius + prof.radius + prof.reach * 0.9,
  capacity: S.supportParams(prof).armForce * (0.3 + 2.5 * lock * lock) * 0.96, lock, legs, pull: 2, hold: Math.hypot(h.pos.x - r.pos.x, h.pos.y - r.pos.y) } as any);
function run(kind: string) {
  const hp = kind === 'adverse' ? HS : H;
  const r = kind === 'side' ? body(R, 0, 0, 0, 4, 0) : kind === 'behind' ? body(R, 0, 0, Math.atan2(1.5, 4), 4, 1.5) : body(R, 0, 0, 0, 1, 0);
  const h = kind === 'side' ? body(hp, 0, R.radius + hp.radius + 0.1, -Math.PI / 2, 0, 0) : kind === 'behind' ? body(hp, -(R.radius + hp.radius + 0.1), 0, 0, 3, 0) : body(hp, R.radius + hp.radius, 0, Math.PI, 1, 0);
  const w = new World([r, h]); const jt = kind === 'adverse' ? grasp(h, r, 0, 1, hp) : grasp(h, r, 0.5, 0.5, hp); w.joints.push(jt);
  const f0 = h.facing; let turn = 0, prev = h.facing, at5 = 0, swing = 0; const x0 = r.pos.x;
  for (let k = 1; k <= 20; k++) {
    const ri = kind === 'adverse' ? { vel: { x: 1, y: 0 }, facing: r.facing + 2 * Math.PI * 0.05 * 3, push: 1 } : { vel: { x: r.vel.x >= 0 ? (kind === 'behind' ? 4 : 4) : 4, y: kind === 'behind' ? 1.5 : 0 }, push: 1 };
    const hi = { vel: { x: kind === 'adverse' ? 0 : 0, y: 0 }, facing: f0, push: 1 };
    const rep = w.step([ri as any, hi as any], 0.05); swing += rep.armSwingYaw ?? 0;
    turn += wrap(h.facing - prev); prev = h.facing; if (k === 10) at5 = turn;
  }
  return `${kind.padEnd(7)} holder turn +0.5 ${(Math.abs(at5) * 57.3).toFixed(0)} deg, +1.0 ${(Math.abs(turn) * 57.3).toFixed(0)} deg | runner travel ${(r.pos.x - x0).toFixed(2)} yd | hold ${jt.broken || !w.joints.includes(jt) ? 'broken' : 'held'} | arm-swing yaw unpassed ${swing.toFixed(1)}`;
}
for (const k of ['side', 'behind', 'adverse']) console.log(run(k));
{
  let err = 0; const r = body(R, 0, 0, 0, 4, 0), h = body(H, 0, R.radius + H.radius + 0.1, -Math.PI / 2, 0, 0), w = new World([r, h]); w.joints.push(grasp(h, r, 0.5, 0.5, H));
  for (let k = 0; k < 30; k++) { const px = r.vel.x * R.massKg + h.vel.x * H.massKg, py = r.vel.y * R.massKg + h.vel.y * H.massKg;
    const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], 0.05);
    err = Math.max(err, Math.hypot(r.vel.x * R.massKg + h.vel.x * H.massKg - px - rep.groundImpulse[0].x - rep.groundImpulse[1].x,
      r.vel.y * R.massKg + h.vel.y * H.massKg - py - rep.groundImpulse[0].y - rep.groundImpulse[1].y)); }
  const path = () => { const r = body(R, 0, 0, 0, 4, 0), h = body(H, 3, 0.4, Math.PI, 0, 0), w = new World([r, h]); const q: number[] = [];
    for (let k = 0; k < 30; k++) { w.step([{ vel: { x: 4, y: 0 }, push: 1 } as any, { vel: { x: -1, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05); q.push(r.pos.x, r.pos.y, h.pos.x, h.pos.y, r.facing, h.facing); }
    return q.map(v => v.toFixed(12)).join(','); };
  console.log(`linear momentum error with free intents ${err.toExponential(1)} kg yd/s; no-grasp path digest ${(await import('node:crypto')).createHash('sha256').update(path()).digest('hex').slice(0, 12)}`);
}
