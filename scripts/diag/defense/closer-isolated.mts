// What a lone defender can do from the closer's onset state (Tools, 2026-11-16): a generated CB / S / LB body at 1.3 yd/s along +x (his speed at the onset p50, in play), asked to run at 5.6 yd/s along +x (the request's p50),
// with his facing 0 / 20 / 45 / 70 deg off the line he is asked to run (in play it is 43 to 50 deg off the line to the target). stepBody alone, speed along +x at 0.1 s steps to 0.8 s, p50 over 12 bodies per position.
// usage: node --import tsx scripts/diag/defense/closer-isolated.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const q = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(0.5 * (v.length - 1))]!;
for (const pos of ['CB', 'S', 'LB']) {
  const rng = new Rng(9); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, pos as any)));
  for (const off of [0, 20, 45, 70]) {
    const row: number[][] = Array.from({ length: 9 }, () => []);
    for (const P of Ps) {
      const b: any = { pos: { x: 0, y: 0 }, vel: { x: 1.3, y: 0 }, facing: off * Math.PI / 180, energy: 1, profile: P, support: S.newSupport(0.3) };
      for (let k = 1; k <= 16; k++) { stepBody(b, { vel: { x: 5.6, y: 0 }, facing: off * Math.PI / 180, effort: 1 } as any, 0.05); if (k % 2 === 0) row[k / 2]!.push(b.vel.x); }
      row[0]!.push(1.3);
    }
    console.log(`${pos.padEnd(2)} facing ${String(off).padStart(2)} deg off the run line | speed along it, p50 at 0.0..0.8 s: ${row.map((v) => q(v).toFixed(2)).join(' ')}`);
  }
}
