// Drag-down bench (Integration for Tanner, 2026-11-10: last-man catch tackles from behind are dragged ~5 yd). The World
// only, default options. A DB holder behind a WR runner at 6.5 yd/s with a grasp at a given leg share (0.6 hips, 0.8
// thighs; lock 0.56, games' capacity law). Holder: 'down' (already on the ground, as in 78% of dragged holds), or 'up' (on
// his feet, asking to stop). The runner keeps asking for 6.5 yd/s ahead (push 1). Per 0.1 s for 1.5 s: runner speed, the
// grip's force on him along his travel (x mg), the holder's ground impulse along it (his turf friction, x runner mg), the
// runner's own ground force along it (x mg), the held-stride share (strideHolds), and his support state; then time to his
// fall and yards. HOLDER_POSTURE (default: unset, the World's default) sets the posture the 'up' holder asks for (0.6 is
// what tackle.ts asks while holding; 1.0 a low, wide base). usage: [flags] node --import tsx scripts/diag/effective-mass/drag-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(61);
const R = derivePhysical(generatePlayer(rng, 'WR')), H = derivePhysical(generatePlayer(rng, 'CB'));
const G = 9.81 * 1.0936, v0 = 6.5;
console.log(`runner ${R.massKg.toFixed(0)} kg, holder ${H.massKg.toFixed(0)} kg`);
const PAIRS: Array<[string, number, number]> = [['as generated', 1, 1], ['strong runner, weak tackler', 1.3, 0.75], ['weak runner, strong tackler', 0.75, 1.3]];
const VERBOSE = process.env.VERBOSE === '1';
for (const [pname, rk, hk] of PAIRS) for (const holder of ['down', 'up']) for (const legs of [0.6, 0.8]) {
  const Rp = { ...R, power: (R as any).power * rk, strength: ((R as any).strength ?? 1) * rk }, Hp = { ...H, power: (H as any).power * hk };
  const gap = R.radius + H.radius + 0.1;
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: Rp, support: S.newSupport(0.3) };
  const h: any = { pos: { x: -gap, y: 0 }, vel: { x: holder === 'down' ? 3 : 5.5, y: 0 }, facing: 0, energy: 1, profile: Hp, support: S.newSupport(process.env.HOLDER_POSTURE ? Number(process.env.HOLDER_POSTURE) : 0.5) };
  if (holder === 'down') { h.support.state = 'down'; h.support.since = 0; }
  const w = new World([r, h]); const lock = Number(process.env.LOCK ?? 0.56), cap = S.supportParams(Hp as any).armForce * (0.3 + 2.5 * lock * lock) * 0.96;
  const jt: any = { kind: 'grasp', a: h, b: r, reach: gap + H.reach * 0.9 + (holder === 'down' ? 0.9 : 0), capacity: cap, lock, legs, pull: 2, hold: gap, origin: 'bench', ground: holder === 'down' ? gap + H.reach * 0.9 + 0.9 : undefined };
  w.joints.push(jt);
  const mR = R.massKg; let fell = -1; const lines: string[] = [];
  for (let k = 1; k <= 30; k++) {
    const vb = r.vel.x; const rep = w.step([{ vel: { x: v0, y: 0 }, facing: 0, push: 1, posture: 0.3 } as any, { vel: { x: 0, y: 0 }, facing: 0, push: 1, free: holder === 'down', ...(process.env.HOLDER_POSTURE ? { posture: Number(process.env.HOLDER_POSTURE) } : {}) } as any], 0.05);
    const grip = (jt.normalForceOnB?.x ?? 0) / (mR * G), gR = rep.groundImpulse[0].x / 0.05 / (mR * G), gH = rep.groundImpulse[1].x / 0.05 / (mR * G);
    if (k % 2 === 0) lines.push(`${(k * 0.05).toFixed(1)}s v ${r.vel.x.toFixed(2)} | grip on runner ${grip.toFixed(2)} | runner ground ${gR.toFixed(2)} | holder ground ${gH.toFixed(2)} | strideHold ${((w as any).strideHolds?.[0] ?? 0).toFixed(2)} | runner ${r.support.state}${jt.broken || !w.joints.includes(jt) ? ' | HOLD BROKEN' : ''}`);
    if (fell < 0 && r.support.state !== 'up') fell = k * 0.05;
    if (fell > 0 && k * 0.05 > fell + 0.2) break;
  }
  const released = jt.broken || !w.joints.includes(jt);
  const outcome = fell > 0 ? `TRIP at ${fell.toFixed(2)} s (${r.support.cause})` : released ? `RELEASED (legs ${jt.legs.toFixed(2)})` : 'still dragging at 1.5 s';
  console.log(`== ${pname.padEnd(27)} holder ${holder.padEnd(4)} legs ${legs}: ${outcome}, runner travel ${r.pos.x.toFixed(2)} yd, hold legs share at end ${jt.legs.toFixed(2)}`);
  if (VERBOSE) console.log(lines.join('\n'));
}
