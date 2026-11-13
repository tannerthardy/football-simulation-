// How long the World takes to turn a set QB's shoulders (SHOULDERS_SET bench, 2026-11-11). Twelve generated QBs at rest,
// posture 0.3, facing 0; from t = 0 each asks to face an angle off his facing (30 / 60 / 90 / 135 / 180 deg) and stand still.
// Reported: time to within 10 and 5 deg (p25 / p50 / p75) and the facing error at 0.3 / 0.5 / 0.7 s. NFL (qb-release.py,
// the turn into the throw): 15-45 deg ~0.3 s, 45-90 ~0.5 s, 90-180 ~0.7 s. usage: [flags] node --import tsx <this>
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(37); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'QB' as any)));
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))]; };
console.log(`turnRate p50 ${(q(Ps.map((P: any) => P.turnRate), .5) * 180 / Math.PI).toFixed(0)} deg/s`);
for (const deg of [30, 60, 90, 135, 180]) {
  const th = deg * Math.PI / 180; const t10: number[] = [], t5: number[] = []; const at: Record<number, number[]> = {};
  for (const P of Ps) {
    const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) } as any;
    const w = new World([b]); let a10 = NaN, a5 = NaN;
    for (let k = 1; k <= 60; k++) {
      w.step([{ vel: { x: 0, y: 0 }, facing: th, push: 0, posture: 0.3 } as any], 0.025);
      const t = k * 0.025, err = Math.abs(Math.atan2(Math.sin(b.facing - th), Math.cos(b.facing - th))) * 180 / Math.PI;
      if (Number.isNaN(a10) && err <= 10) a10 = t; if (Number.isNaN(a5) && err <= 5) a5 = t;
      for (const T of [0.3, 0.5, 0.7]) if (Math.abs(t - T) < 1e-6) (at[T] ??= []).push(err);
    }
    t10.push(a10); t5.push(a5);
  }
  const f = (a: number[]) => [.25, .5, .75].map(x => q(a, x).toFixed(2)).join(' / ');
  console.log(`${String(deg).padStart(3)} deg | to 10 deg ${f(t10)} s | to 5 deg ${f(t5)} s | error at 0.3/0.5/0.7 s ${[0.3, 0.5, 0.7].map(T => q(at[T], .5).toFixed(0)).join(' / ')} deg`);
}
