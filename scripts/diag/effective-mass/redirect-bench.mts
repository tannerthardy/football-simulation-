// Redirect from a slow state (Defense / Integration, 2026-11-11: unengaged defenders within 6 yd of the catcher request
// ~7.4 yd/s at him but reach only 3.0 -> 4.2 yd/s over -0.6..+0.3 s). The World alone: a generated CB moving at v0
// (0 / 3 yd/s) with his body facing his travel, the target at an angle off his travel (0 / 60 / 80 / 120 deg). From t = 0
// he asks for full speed at the target, facing it (push 0), at a support posture (0.3 running / 1.0 low, wide base).
// Reported: total speed and speed toward the target at +0.2 / +0.4 / +0.6 / +0.9 s, the facing error, and his support
// state. usage: [flags] node --import tsx scripts/diag/effective-mass/redirect-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(31); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const posture of [0.3, 1.0]) for (const v0 of [0, 3]) for (const deg of [0, 60, 80, 120]) {
  if (v0 === 0 && deg > 0) continue;
  const th = deg * Math.PI / 180, ux = Math.cos(th), uy = Math.sin(th);
  const at: Record<string, number[]> = {}; let down = 0; const vmaxs: number[] = [];
  for (const P of Ps) {
    const b = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(posture) } as any;
    const w = new World([b]); vmaxs.push(P.vmax);
    for (let k = 1; k <= 36; k++) {
      w.step([{ vel: { x: ux * P.vmax, y: uy * P.vmax }, facing: th, push: 0, posture } as any], 0.025);
      const t = +(k * 0.025).toFixed(3);
      for (const T of [0.2, 0.4, 0.6, 0.9]) if (Math.abs(t - T) < 1e-6) {
        (at[`v${T}`] ??= []).push(Math.hypot(b.vel.x, b.vel.y)); (at[`u${T}`] ??= []).push(b.vel.x * ux + b.vel.y * uy);
        (at[`f${T}`] ??= []).push(Math.abs(Math.atan2(Math.sin(b.facing - th), Math.cos(b.facing - th))) * 180 / Math.PI); }
      if (b.support.state !== 'up') { down++; break; }
    }
  }
  const row = [0.2, 0.4, 0.6, 0.9].map(T => `+${T}: ${at[`v${T}`] ? med(at[`v${T}`]).toFixed(2) : '-'} / ${at[`u${T}`] ? med(at[`u${T}`]).toFixed(2) : '-'} (face err ${at[`f${T}`] ? med(at[`f${T}`]).toFixed(0) : '-'})`).join(' | ');
  console.log(`posture ${posture} v0 ${v0} target ${String(deg).padStart(3)} deg | speed / toward ${row} | fell ${down} of ${Ps.length} | vmax p50 ${med(vmaxs).toFixed(2)}`);
}
