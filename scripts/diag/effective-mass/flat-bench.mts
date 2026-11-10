// An OL running flat from his stance in the World alone (Integration, 2026-11-10: the zone backside tackle). Generated
// OT / OG bodies at rest, facing upfield (+x), posture 0.8, request their top speed laterally (+y). Facing: 'square'
// keeps facing upfield (a shuffle or crossover with the shoulders square), 'turn' faces the travel. Read through 0.1 s
// frames at 4 phases, aligned like ol-flat.py (start = first frame displaced 0.25 yd): displacement and speed at
// +0.5 / +1.0 / +1.5 s (medians over 10 bodies). usage: node --import tsx scripts/diag/effective-mass/flat-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(31);
for (const pos of ['OT', 'OG']) for (const mode of ['square', 'turn']) {
  const rows: number[][] = []; let vm = 0, lat = 0;
  for (let n = 0; n < 10; n++) {
    const P = derivePhysical(generatePlayer(rng, pos as any)); vm += P.vmax / 10; lat += (P.lateral ?? NaN) / 10;
    const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.8) } as any;
    const w = new World([b]); const xs: number[][] = [[0, 0]];
    for (let k = 1; k <= 100; k++) { w.step([{ vel: { x: 0, y: P.vmax }, facing: mode === 'turn' ? Math.PI / 2 : 0, push: 0, posture: 0.8 } as any], 0.025); xs.push([b.pos.x, b.pos.y]); }
    for (const ph of [0, 1, 2, 3]) {
      const fr: number[][] = []; for (let j = ph; j < xs.length; j += 4) fr.push(xs[j]);
      const s0 = fr.findIndex(p => Math.hypot(p[0], p[1]) >= 0.25);
      const d = (k: number) => Math.hypot(fr[s0 + k][0] - fr[s0][0], fr[s0 + k][1] - fr[s0][1]);
      const v = (k: number) => Math.hypot(fr[s0 + k + 1][0] - fr[s0 + k - 1][0], fr[s0 + k + 1][1] - fr[s0 + k - 1][1]) / 0.2;
      rows.push([d(5), d(10), d(15), v(5), v(10), v(15)]);
    }
  }
  const med = (j: number) => { const a = rows.map(r => r[j]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)].toFixed(2); };
  console.log(`${pos} ${mode.padEnd(6)} disp +0.5/+1.0/+1.5 ${med(0)} ${med(1)} ${med(2)} | speed ${med(3)} ${med(4)} ${med(5)} | vmax ${vm.toFixed(2)} lateral ${lat.toFixed(2)}`);
}
