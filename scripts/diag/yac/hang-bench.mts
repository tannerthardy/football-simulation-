/** Lone pair: a carrier running at 6 yd/s with a holder hanging on his upper body (a grasp, legs 0), the holder 'falling' then 'down'. Reports, per mass pair, the carrier's speed
 * after 0.5 and 1.0 s, whether he stays on his feet, and the holder's turf force along the run, with HANG_LOAD off and on.
 *   [HANG_LOAD=1] node --import tsx scripts/diag/yac/hang-bench.mts */
const W = process.cwd();
const { World } = await import(`${W}/src/physics/world.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const profile = (mass: number) => ({ massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
  shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 }) as any;
const body = (mass: number, x: number, vx: number) => ({ pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1, profile: profile(mass), support: S.newSupport(0.3) }) as any;
console.log(`HANG_LOAD=${process.env.HANG_LOAD ?? '0'}  (carrier mass / holder mass kg)`);
for (const [mc, mh] of [[75, 110], [95, 95], [110, 75], [110, 110], [75, 75]]) for (const start of ['falling', 'down']) {
  const c = body(mc, 0, 6), h = body(mh, -0.9, 6); h.support.state = start; h.support.since = 0; h.support.fall = { x: 1, y: 0 };
  const w = new World([c, h]); w.joints.push({ kind: 'grasp', a: h, b: c, reach: 1.4, capacity: 900, legs: 0, pull: 0, height: 1.2 } as any);
  const DT = 0.05; let v05 = NaN, v10 = NaN, fell = NaN, turf = 0, n = 0, grasped = true;
  for (let k = 1; k <= 20; k++) {
    const ci = { vel: { x: 9, y: 0 }, facing: 0, effort: 1 } as any, hi = { vel: { x: 0, y: 0 }, free: false } as any;
    const rep: any = w.step([ci, hi], DT); c.energy = 1;
    const g = rep?.groundImpulse?.[1]; if (g) { turf += g.x / DT; n++; }
    if (Math.abs(k * DT - 0.5) < 1e-9) v05 = c.vel.x; if (Math.abs(k * DT - 1) < 1e-9) v10 = c.vel.x;
    if (Number.isNaN(fell) && c.support.state !== 'up') fell = k * DT;
    if ((w.joints[0] as any).broken) grasped = false;
  }
  console.log(`carrier ${String(mc).padStart(3)} holder ${String(mh).padStart(3)} ${start.padEnd(7)} | carrier speed 0.5 s ${v05.toFixed(2)}, 1.0 s ${v10.toFixed(2)}, ${Number.isNaN(fell) ? 'stays up' : 'down at ' + fell.toFixed(2) + ' s'}, hold ${grasped ? 'kept' : 'broken'} | holder turf force along the run ${(turf / Math.max(n, 1)).toFixed(0)}`);
}
