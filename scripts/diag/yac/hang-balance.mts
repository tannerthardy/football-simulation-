/** Capture-point trace of a carrier with a full-weight hang on an upper hold (bench only; no constant changed). Carrier 95 kg at 6 yd/s asked for 9, holder `holderKg`
 * falling (HANG_AIRBORNE=1: a falling holder hangs his whole weight), 0.6 yd behind. Prints, every 0.1 s: |xi| (the capture point's offset from his base), the base radius, the
 * critical deviation (base + recovery speed / omega0), the recovery speed the model applies, the carrier's speed and support state. Then the holder mass at which he goes down.
 *   HANG_LOAD=1 HANG_AIRBORNE=1 node --import tsx scripts/diag/yac/hang-balance.mts */
const W = process.cwd();
const { World } = await import(`${W}/src/physics/world.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const profile = (mass: number) => ({ massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
  shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 }) as any;
const body = (mass: number, x: number, vx: number) => ({ pos: { x, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1, profile: profile(mass), support: S.newSupport(0.3) }) as any;
function trace(holderKg: number, print: boolean) {
  const c = body(95, 0, 6), h = body(holderKg, -0.6, 6); h.support.state = 'falling'; h.support.since = 0; h.support.fall = { x: 1, y: 0 };
  const w = new World([c, h]); w.joints.push({ kind: 'grasp', a: h, b: c, reach: 1.4, capacity: 9000, legs: 0, pull: 0, height: 1.2 } as any);
  const sp = S.supportParams(c.profile), DT = 0.05; let down = NaN, peak = 0;
  if (print) console.log(`omega0 ${S.omega0(sp, 0.3).toFixed(2)} /s, base radius ${S.baseRadiusAt(sp, 0.3).toFixed(3)} yd, step speed ${sp.stepSpeed} yd/s, critical deviation at rest ${S.criticalDeviation(sp, 0.3, 0, 1).toFixed(3)} yd, COM height ${sp.comHeight.toFixed(2)} yd`);
  for (let k = 1; k <= 40; k++) {
    w.step([{ vel: { x: 9, y: 0 }, facing: 0, effort: 1 } as any, { vel: { x: 6, y: 0 }, facing: 0 } as any], DT); c.energy = 1; h.energy = 1; h.support.state = k * DT < 0.4 ? 'falling' : h.support.state;
    const xi = Math.hypot(c.support.xi.x, c.support.xi.y); peak = Math.max(peak, c.support.peak ?? 0);
    if (Number.isNaN(down) && c.support.state !== 'up') down = k * DT;
    if (print && k % 2 === 0) console.log(`t ${(k * DT).toFixed(2)}  |xi| ${xi.toFixed(3)} yd  base ${S.baseRadiusAt(sp, c.support.posture).toFixed(3)}  outside-base ${c.support.out.toFixed(2)} s  peak/crit ${(c.support.peak ?? 0).toFixed(2)}  speed ${Math.hypot(c.vel.x, c.vel.y).toFixed(2)}  ${c.support.state}`);
  }
  return { down, peak };
}
console.log(`HANG_LOAD=${process.env.HANG_LOAD ?? '0'} HANG_AIRBORNE=${process.env.HANG_AIRBORNE ?? '0'}`);
trace(95, true);
console.log('holder mass (kg) -> carrier down at, peak xi / critical deviation (he falls at 1):');
for (const m of (process.env.MASSES ?? "95,190,285,380,570,760").split(",").map(Number)) { const r = trace(m, false); console.log(`  ${String(m).padStart(3)} kg (${(m / 95).toFixed(0)}x body weight)  ${Number.isNaN(r.down) ? 'stays up' : 'down at ' + r.down.toFixed(2) + ' s'}  peak ${r.peak.toFixed(2)}`); }
