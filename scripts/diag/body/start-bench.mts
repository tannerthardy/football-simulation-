/** Lone-body start from rest in the World: an LB profile, facing held on +x, a constant request ASK yd/s at effort 1 toward 0 (forward), 90 (lateral) and 180 (backpedal) degrees off his facing.
 * Speed at 0.2 / 0.4 / 0.8 s, 12 bodies, medians. node --import tsx scripts/diag/body/start-bench.mts [ASK ...] */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'LB' as any)));
const q = (v: number[]) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
const asks = process.argv.slice(2).map(Number); if (!asks.length) asks.push(3.5, 5, 8);
console.log(`LB profiles (12): vmax ${q(Ps.map((p: any) => p.vmax)).toFixed(2)} backpedal share ${q(Ps.map((p: any) => p.backpedal)).toFixed(2)} shuffle ${q(Ps.map((p: any) => p.shuffle)).toFixed(2)}`);
for (const ask of asks) for (const [name, deg] of [['forward', 0], ['lateral', 90], ['backpedal', 180]] as const) {
  const rows: number[][] = [];
  for (const P of Ps) {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    const d = deg * Math.PI / 180; const got: number[] = [];
    for (let k = 1; k <= 16; k++) { (w as any).time = k * .05; w.step([{ vel: { x: Math.cos(d) * Math.min(ask, P.vmax), y: Math.sin(d) * Math.min(ask, P.vmax) }, facing: process.env.TURN ? d : 0, effort: 1 } as any], .05); b.energy = 1; if (k === 4 || k === 8 || k === 16) got.push(Math.hypot(b.vel.x, b.vel.y)); }
    rows.push(got);
  }
  console.log(`ask ${String(ask).padEnd(4)} ${name.padEnd(10)} speed at 0.2 / 0.4 / 0.8 s: ${[0, 1, 2].map(i => q(rows.map(r => r[i])).toFixed(2)).join(' / ')}`);
}
