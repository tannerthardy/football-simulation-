// DIR_CAP lone-body gate: a generated WR at full effort holds a straight sprint for 9 s; steady speed (mean over 7-9 s) as a share of the same body running with hips and shoulders on the line.
//   (a) hips on the line, trunk twisted by `look` 0 / 22 / 45 / 55 deg: the trunk price alone;  (b) hips turned off the line (no look), 0..180 deg: the hips' curve.
// usage: [DIR_CAP=1] node --import tsx scripts/diag/dir-cap-lone.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(21);
const P: any[] = []; for (let i = 0; i < 6; i++) P.push(derivePhysical(generatePlayer(rng, (['WR', 'CB', 'WR', 'CB', 'S', 'TE'] as const)[i] as any)));
function run(facing: number, look: number | undefined): number {
  let acc = 0;
  for (const prof of P) {
    const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, profile: prof, support: S.newSupport(0.4) } as any;
    const w = new World([b]); let n = 0, sum = 0;
    for (let k = 1; k <= 360; k++) { w.step([{ vel: { x: prof.vmax, y: 0 }, facing, push: 0, look } as any], 0.025); if (k > Number(process.env.K0 ?? 280) && k <= Number(process.env.K1 ?? 360)) { sum += Math.hypot(b.vel.x, b.vel.y); n++; } }
    acc += sum / n / prof.vmax;
  }
  return acc / P.length;
}
const rad = (d: number) => (d * Math.PI) / 180;
const base = run(0, undefined);
console.log(`DIR_CAP=${process.env.DIR_CAP ?? '0'}  (a) hips on the line, trunk twist (steady speed / untwisted)`);
for (const t of [0, 22, 45, 55]) console.log(`   twist ${String(t).padStart(2)} deg: ${(run(0, t === 0 ? undefined : rad(t)) / base).toFixed(3)}   (price 1 - 0.0018*t = ${(1 - 0.0018 * t).toFixed(3)})`);
console.log('(b) hips off the line, no twist: ' + [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 180].map(a => `${a}:${(run(rad(a), undefined) / base).toFixed(2)}`).join('  '));
