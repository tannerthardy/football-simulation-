// A lone zone defender held square to the QB (facing fixed) and asked to move 5 yd/s at 0 / 45 / 90 / 135 / 180 deg off his facing, from rest and from 2 yd/s along the request: speed along the request at +0.5 s and at 1.5 s, and the
// steady speed. stepBody alone, 12 generated bodies per position, p50. (Tools, 2026-11-16; the zone-settle isolated check.) usage: node --import tsx scripts/diag/defense/settle-isolated.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const q = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(0.5 * (v.length - 1))]!;
for (const pos of ['LB', 'S', 'CB']) {
  const rng = new Rng(11); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, pos as any)));
  for (const off of [0, 45, 90, 135, 180]) for (const v0 of [0, 2]) {
    const at: Record<string, number[]> = { a: [], b: [], c: [] };
    for (const P of Ps) {
      const th = off * Math.PI / 180, ux = Math.cos(th), uy = Math.sin(th);
      const b: any = { pos: { x: 0, y: 0 }, vel: { x: ux * v0, y: uy * v0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) };
      for (let k = 1; k <= 60; k++) { stepBody(b, { vel: { x: ux * 5, y: uy * 5 }, facing: 0, effort: 1 } as any, 0.05); const s = b.vel.x * ux + b.vel.y * uy; if (k === 10) at.a!.push(s); if (k === 30) at.b!.push(s); if (k === 60) at.c!.push(s); }
    }
    console.log(`${pos} request ${String(off).padStart(3)} deg off facing, from ${v0} yd/s along it: speed along the request +0.5 s ${q(at.a!).toFixed(2)}, +1.5 s ${q(at.b!).toFixed(2)}, +3.0 s ${q(at.c!).toFixed(2)}`);
  }
}
