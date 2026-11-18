// Plant-and-drive bench (Coverage, 2026-11-18): the World alone. Twelve generated LBs and twelve CBs, facing 0, asked to
// run at 8.5 yd/s along their facing from (1) set (at rest) and (2) a backpedal at 1 / 2.5 / 4 yd/s (moving -x, facing +x),
// and (3) a turned run away at 4 yd/s (facing -x) asked to come back +x. Reported: forward speed at 0.1 / 0.2 / 0.3 s and
// distance gained toward +x by 0.3 s (p50). usage: node --import tsx <this>
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const q = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(0.5 * (s.length - 1))]; };
for (const pos of ['LB', 'CB']) {
  const rng = new Rng(41); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, pos as any)));
  for (const [name, v0, f0] of [['set', 0, 0], ['backpedal 1', -1, 0], ['backpedal 2.5', -2.5, 0], ['backpedal 4', -4, 0], ['turned away 4', -4, Math.PI]] as const) {
    const sp: Record<number, number[]> = { 0.1: [], 0.2: [], 0.3: [] }, gain: number[] = [];
    for (const P of Ps) {
      const b = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: f0, energy: 1, profile: P, support: S.newSupport(0.3) } as any;
      const w = new World([b]);
      for (let k = 1; k <= 12; k++) {
        w.step([{ vel: { x: 8.5, y: 0 }, facing: 0 } as any], 0.025);
        const t = +(k * 0.025).toFixed(3);
        if (sp[t]) sp[t].push(b.vel.x);
      }
      gain.push(b.pos.x);
    }
    console.log(`${pos} ${name.padEnd(14)} | speed +x at 0.1/0.2/0.3 s ${[0.1, 0.2, 0.3].map((t) => q(sp[t]).toFixed(2)).join(' / ')} | gained by 0.3 s ${q(gain).toFixed(2)} yd (avg ${(q(gain) / 0.3).toFixed(2)} yd/s)`);
  }
}
