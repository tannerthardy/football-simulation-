// A standing start in the World alone (Integration, 2026-11-10): one generated player per position, at rest, asks for his
// top speed straight ahead (facing it, push 0) from t = 0; displacement at +0.3 / +0.5 / +0.8 / +1.0 s and speed at +0.8 s.
// Compare with start.py's NFL curves aligned to each player's own start (and their upper percentiles, near max effort).
// usage: node --import tsx scripts/diag/effective-mass/sprint-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(21);
for (const pos of ['WR', 'TE', 'RB', 'DT', 'EDGE', 'LB', 'CB', 'OG']) {
  const rows: number[][] = [];
  for (let n = 0; n < 12; n++) {
    const P = derivePhysical(generatePlayer(rng, pos as any));
    const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.4) } as any;
    const w = new World([b]); const xs: number[] = [0];
    for (let k = 1; k <= 80; k++) { w.step([{ vel: { x: P.vmax, y: 0 }, facing: 0, push: 0 } as any], 0.025); xs.push(b.pos.x); }
    // Align as start.py does: his start is the first sample displaced 0.25 yd; read 0.3 / 0.5 / 0.8 / 1.0 s after it.
    // As tracking sees it: 0.1 s frames at a random phase to his first push (4 phases averaged).
    for (const ph of [0, 1, 2, 3]) {
      const fr: number[] = []; for (let j = ph; j < xs.length; j += 4) fr.push(xs[j]);
      const s0 = fr.findIndex(x => x >= 0.25), at = (k: number) => fr[Math.min(fr.length - 1, s0 + k)] - fr[s0];
      rows.push([at(3), at(5), at(8), (fr[s0 + 9] - fr[s0 + 7]) / 0.2, at(10), P.vmax, P.tau, (s0 * 4 + ph) * 0.025]);
    }
  }
  const med = (j: number) => { const a = rows.map(r => r[j]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)].toFixed(2); };
  console.log(`${pos.padEnd(4)} aligned in 0.1 s frames (0.25 yd reached at ${med(7)} s from rest): +0.3 ${med(0)}  +0.5 ${med(1)}  +0.8 ${med(2)}  +1.0 ${med(4)} yd | v(+0.8) ${med(3)} yd/s | vmax ${med(5)} tau ${med(6)}`);
}
