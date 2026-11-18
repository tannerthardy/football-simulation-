/** Lone body, hips flip into a crossover run: a CB profile backpedals at SPEED yd/s (facing +x, travelling -x... i.e. downfield for a corner who faces the line) for 1.0 s, then turns his hips to his travel and
 * asks for top speed along the same line (or 45 deg off it). Speed every 0.25 s after the flip, medians of 12 CB profiles. A reference number only (Integration, 2026-11-18): the body's side of the off-man open-and-run.
 *   node --import tsx scripts/diag/body/flip-bench.mts [SPEED=3] */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const speed = Number(process.argv[2] ?? 3);
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
const q = (v: number[]) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
console.log(`CB profiles (12): vmax median ${q(Ps.map((p: any) => p.vmax)).toFixed(2)} backpedal share ${q(Ps.map((p: any) => p.backpedal)).toFixed(2)} turnRate ${q(Ps.map((p: any) => p.turnRate)).toFixed(1)}`);
for (const [label, off] of [['same line', 0], ['45 deg off the line', 45], ['90 deg off the line', 90]] as const) {
  const rows: number[][] = [];
  for (const P of Ps) {
    // travel direction: -x for the pedal (hips face +x: facing 0). After the flip: hips to the travel (facing = travel).
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: -speed, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    const got: number[] = []; const dt = .05; let k = 0;
    for (; k < 20; k++) { (w as any).time = (k + 1) * dt; w.step([{ vel: { x: -speed, y: 0 }, facing: 0, effort: 1 }], dt); b.energy = 1; }
    const dir = Math.PI + off * Math.PI / 180;
    for (let j = 1; j <= 40; j++, k++) { (w as any).time = (k + 1) * dt; w.step([{ vel: { x: Math.cos(dir) * P.vmax, y: Math.sin(dir) * P.vmax }, facing: dir, effort: 1 }], dt); b.energy = 1; if (j % 5 === 0) got.push(Math.hypot(b.vel.x, b.vel.y)); }
    rows.push(got);
  }
  console.log(`${label.padEnd(20)} speed after the flip at 0.25 / 0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 1.75 / 2.0 s: ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => q(rows.map((r) => r[i])).toFixed(2)).join(' / ')}`);
}
