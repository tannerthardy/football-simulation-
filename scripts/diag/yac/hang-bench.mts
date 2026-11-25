/** Lone-pair statics benches for HANG_LOAD (docs/reviews/2026-11-17-hang-load.md): a carrier at 6 yd/s asked for 9, a holder on an upper hold (a grasp, legs 0).
 *   [HANG_LOAD=1] node --import tsx scripts/diag/yac/hang-bench.mts */
const W = process.cwd();
const { World } = await import(`${W}/src/physics/world.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const profile = (mass: number) => ({ massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
  shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 }) as any;
const body = (mass: number, x: number, y: number, vx: number) => ({ pos: { x, y }, vel: { x: vx, y: 0 }, facing: 0, energy: 1, profile: profile(mass), support: S.newSupport(0.3) }) as any;
function run(label: string, mc: number, mh: number, state: string, dx: number, dy: number, capacity: number, reach: number) {
  const c = body(mc, 0, 0, 6), h = body(mh, -dx, dy, 6); h.support.state = state; h.support.since = 0; h.support.fall = { x: 1, y: 0 };
  const w = new World([c, h]); const jt: any = { kind: 'grasp', a: h, b: c, reach, capacity, legs: 0, pull: 0, height: 1.2 }; w.joints.push(jt);
  const DT = 0.05; let v05 = NaN, v10 = NaN, fell = NaN, tore = NaN;
  for (let k = 1; k <= 20; k++) {
    const ci = { vel: { x: 9, y: 0 }, facing: 0, effort: 1 } as any, hi = { vel: { x: 6, y: 0 }, facing: 0, free: false } as any;
    w.step([ci, hi], DT); c.energy = 1; h.energy = 1;
    if (Math.abs(k * DT - 0.5) < 1e-9) v05 = c.vel.x; if (Math.abs(k * DT - 1) < 1e-9) v10 = c.vel.x;
    if (Number.isNaN(fell) && c.support.state !== 'up') fell = k * DT;
    if (Number.isNaN(tore) && jt.broken) tore = k * DT;
  }
  console.log(`${label.padEnd(38)} ${state.padEnd(7)} carrier speed 0.5 s ${v05.toFixed(2)}, 1.0 s ${v10.toFixed(2)}, ${Number.isNaN(fell) ? 'stays up' : 'down at ' + fell.toFixed(2) + ' s'}, hold ${Number.isNaN(tore) ? 'kept' : 'torn at ' + tore.toFixed(2) + ' s'}`);
}
console.log(`HANG_LOAD=${process.env.HANG_LOAD ?? '0'}`);
for (const st of ['falling', 'down']) run('(i) 95 carrier, 95 holder, 0.6 yd behind', 95, 95, st, 0.6, 0, 900, 1.4);
for (const st of ['falling', 'down']) run('(ii) 110 carrier, 75 holder', 110, 75, st, 0.6, 0, 900, 1.4);
for (const st of ['falling', 'down']) run('(ii) 75 carrier, 110 holder', 75, 110, st, 0.6, 0, 900, 1.4);
for (const st of ['falling', 'down']) run('(iii) arm-length low grip, 1.3 yd, cap 150', 95, 95, st, 1.3, 0, 150, 1.4);
run('(iv) upright holder alongside, no hang', 95, 95, 'up', 0, 0.8, 900, 1.4);
