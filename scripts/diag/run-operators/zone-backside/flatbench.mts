// flat-bench variant: speed (yd/s) at 0.2/0.4/0.6/0.8/1.0 s from rest (no start alignment), OT/OG, square vs turned, posture 0.7 and 0.8.
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
for (const post of [0.7, 0.8]) for (const pos of ['OT', 'OG']) for (const mode of ['square', 'turn', 'turn15']) {
  const rng = new Rng(31); const rows: number[][] = [];
  for (let n = 0; n < 10; n++) {
    const P = derivePhysical(generatePlayer(rng, pos as any));
    const b = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(post) } as any;
    const w = new World([b]); const sp: number[] = [];
    const fac = mode === 'square' ? 0 : mode === 'turn' ? Math.PI / 2 : Math.PI / 2 - 15 * Math.PI / 180;
    for (let k = 1; k <= 40; k++) { w.step([{ vel: { x: 0, y: P.vmax }, facing: fac, push: 0, posture: post } as any], 0.025); if (k % 8 === 0) sp.push(Math.hypot(b.vel.x, b.vel.y)); }
    rows.push(sp);
  }
  const med = (j: number) => { const a = rows.map(r => r[j]).sort((x, y) => x - y); return a[5].toFixed(2); };
  console.log(`posture ${post} ${pos} ${mode.padEnd(6)} speed at 0.2/0.4/0.6/0.8/1.0 s: ${[0,1,2,3,4].map(med).join(' / ')}`);
}
