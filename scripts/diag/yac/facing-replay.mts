/** Lone-body replay of the turn from a slow start: a defender-profile body at 3 yd/s (backpedal, or shuffling), asked for full speed 110 degrees off his facing; his facing request held
 * on the quarterback (as the coverage controller holds it) or opened to the way he is asked to run. World path, 0.1 s rows for 0.8 s: speed, angle between facing and travel, how far the
 * facing has turned. Run with TURN_SPLIT=0 and 1.
 *   [TURN_SPLIT=1] node --import tsx scripts/diag/yac/facing-replay.mts */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
const deg = (r: number) => r * 180 / Math.PI, wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log(`TURN_SPLIT=${process.env.TURN_SPLIT ?? '0'}  (12 CB bodies, medians; turn asked: 110 degrees off facing, full speed)`);
for (const [startName, v0] of [['backpedal 3 yd/s', { x: -3, y: 0 }], ['shuffle 3 yd/s', { x: 0, y: 3 }]] as const) for (const hold of [true, false]) {
  const spd: number[][] = Array.from({ length: 9 }, () => []), ang: number[][] = Array.from({ length: 9 }, () => []), fac: number[][] = Array.from({ length: 9 }, () => []);
  for (const P of Ps) {
    const b: any = { pos: { x: 0, y: 0 }, vel: { ...v0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    const req = { x: Math.cos(110 * Math.PI / 180), y: Math.sin(110 * Math.PI / 180) }, dir = Math.atan2(req.y, req.x);
    for (let k = 0; k <= 8; k++) {
      const sp = Math.hypot(b.vel.x, b.vel.y); spd[k].push(sp); fac[k].push(Math.abs(deg(wrap(b.facing))));
      ang[k].push(sp > 0.3 ? Math.abs(deg(wrap(Math.atan2(b.vel.y, b.vel.x) - b.facing))) : NaN);
      for (let j = 0; j < 2; j++) { w.step([{ vel: { x: req.x * P.vmax, y: req.y * P.vmax }, facing: hold ? 0 : dir, effort: 1 } as any], 0.05); b.energy = 1; }
    }
  }
  console.log(`${startName.padEnd(17)} facing request ${hold ? 'held on the QB' : 'opened to travel'}:`);
  console.log('   t         ' + [...Array(9)].map((_, k) => (k / 10).toFixed(1).padStart(5)).join(' '));
  console.log('   speed     ' + spd.map((v) => q(v).toFixed(2).padStart(5)).join(' '));
  console.log('   trv-face  ' + ang.map((v) => q(v).toFixed(0).padStart(5)).join(' '));
  console.log('   fac turned' + fac.map((v) => q(v).toFixed(0).padStart(5)).join(' '));
}
