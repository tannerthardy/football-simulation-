/** Lone body, hip yaw: (1) planted, a facing request 180 and 90 deg off: time to come within 10 deg; (2) carrying SPEED yd/s a velocity request 90 deg off: time to turn the hips within 10 deg of the request and the speed at 0.5 / 1.0 s;
 * (3) the largest yaw rate reached. 12 CB profiles, medians. Run with and without YAW_CAP=1 [YAW_CAP_PCT=n].
 *   node --import tsx scripts/diag/body/yaw-bench.mts */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const K = await import(`${W}/src/physics/kinematics.ts`);
const q = (v: number[]) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
console.log(`YAW_CAP ${K.YAW_CAP ? 'on' : 'off'}; hip yaw rate capacity (rad/s) median ${q(Ps.map((p: any) => K.hipYawRate(p))).toFixed(2)} = ${(q(Ps.map((p: any) => K.hipYawRate(p))) * 57.3).toFixed(0)} deg/s`);
const ang = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
for (const turn of [180, 90]) {
  const T: number[] = [], R: number[] = [];
  for (const P of Ps) {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    const to = turn * Math.PI / 180; let t10 = NaN, mx = 0, prev = 0; const dt = .05;
    for (let k = 1; k <= 60; k++) { (w as any).time = k * dt; w.step([{ vel: { x: 0, y: 0 }, facing: to, effort: 1 }], dt); b.energy = 1; mx = Math.max(mx, Math.abs(b.spin ?? 0)); if (Number.isNaN(t10) && ang(b.facing, to) < 10) t10 = k * dt; prev = b.facing; }
    T.push(t10); R.push(mx * 57.3);
  }
  console.log(`planted ${String(turn).padEnd(3)} deg turn: within 10 deg at ${q(T).toFixed(2)} s; peak spin ${q(R).toFixed(0)} deg/s`);
}
for (const speed of [4, 7]) {
  const T: number[] = [], V5: number[] = [], V10: number[] = [], R: number[] = [];
  for (const P of Ps) {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: speed, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    let t10 = NaN, mx = 0; const dt = .05; const to = Math.PI / 2;
    for (let k = 1; k <= 40; k++) { (w as any).time = k * dt; w.step([{ vel: { x: 0, y: Math.min(speed, P.vmax) }, effort: 1 }], dt); b.energy = 1; mx = Math.max(mx, Math.abs(b.spin ?? 0)); if (Number.isNaN(t10) && ang(b.facing, to) < 10) t10 = k * dt; if (k === 10) V5.push(Math.hypot(b.vel.x, b.vel.y)); if (k === 20) V10.push(Math.hypot(b.vel.x, b.vel.y)); }
    T.push(t10); R.push(mx * 57.3);
  }
  console.log(`carrying ${speed} yd/s, request 90 deg off: hips within 10 deg at ${q(T.filter((x) => !Number.isNaN(x))).toFixed(2)} s (${T.filter((x) => Number.isNaN(x)).length} never); speed at 0.5 / 1.0 s ${q(V5).toFixed(2)} / ${q(V10).toFixed(2)}; peak spin ${q(R).toFixed(0)} deg/s`);
}
