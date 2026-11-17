/** Lone-body laws for DIR_CURVE / TURN_CARRY (Tools lane 2026-11-17): a CB-profile body in the World, hips opened to the request, at the entry speed asked for a stop,
 * a reversal, and 45/90/135 degree cuts (full-speed request). Per case, 12 bodies, medians: distance to stop / to reverse, speed dip (min speed over the first 0.8 s as share of entry),
 * time until the velocity is within 30 degrees of the request, speed 0.5 s after, peak lateral acceleration vs the envelope. Flags by env.
 *   [DIR_CURVE=1] [TURN_CARRY=1] node --import tsx scripts/diag/yac/turn-arc-bench.mts */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const K = await import(`${W}/src/physics/kinematics.ts`);
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const rad = (d: number) => d * Math.PI / 180;
console.log(`DIR_CURVE=${process.env.DIR_CURVE ?? 0} TURN_CARRY=${process.env.TURN_CARRY ?? 0}`);
const row = (name: string, f: (P: any) => Record<string, number>) => {
  const rs = Ps.map(f); const keys = Object.keys(rs[0]);
  console.log(name.padEnd(26) + keys.map((k) => `${k} ${q(rs.map((r) => r[k])).toFixed(3)}`).join('  '));
};
const dt = 0.05;
for (const v0 of [3, 6]) for (const [name, ang, mag] of [['stop', 0, 0], ['reversal 180', 180, 1], ['cut 45', 45, 1], ['cut 90', 90, 1], ['cut 135', 135, 1]] as const) {
  row(`entry ${v0} yd/s ${name}`, (P) => {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    const dir = rad(ang), rx = Math.cos(dir), ry = Math.sin(dir);
    let minSp = v0, tTurn = NaN, sp05 = NaN, peakLat = 0, dist = 0, tStop = NaN, prev = { x: b.vel.x, y: b.vel.y }, x0 = 0, rev = NaN;
    for (let k = 1; k <= 40; k++) {
      const face = mag ? dir : 0;
      w.step([{ vel: { x: rx * P.vmax * mag, y: ry * P.vmax * mag }, facing: face, effort: 1 } as any], dt); b.energy = 1;
      const sp = Math.hypot(b.vel.x, b.vel.y), t = k * dt;
      if (t <= 0.8) minSp = Math.min(minSp, sp);
      if (mag && Number.isNaN(tTurn) && sp > 0.3) { const d = Math.acos(Math.max(-1, Math.min(1, (b.vel.x * rx + b.vel.y * ry) / sp))); if (d < rad(30)) tTurn = t; }
      if (Math.abs(t - 0.5) < 1e-6) sp05 = sp;
      const tx = prev.x, ty = prev.y, ps = Math.hypot(tx, ty);
      if (ps > 0.35) { const ax = (b.vel.x - prev.x) / dt, ay = (b.vel.y - prev.y) / dt; const lat = Math.abs(-ax * ty / ps + ay * tx / ps); peakLat = Math.max(peakLat, lat / K.lateralEnvelope(b, ps)); }
      prev = { x: b.vel.x, y: b.vel.y };
      if (!mag && Number.isNaN(tStop) && sp < 0.2) { tStop = t; dist = b.pos.x; }
      if (ang === 180 && Number.isNaN(rev) && b.vel.x < 0) rev = b.pos.x;
    }
    const out: Record<string, number> = { minSp: minSp / v0, 'sp@.5': sp05 };
    if (!mag) { out.stopDist = dist; out.tStop = tStop; } else { out.t30 = tTurn; out.peakLat_over_env = peakLat; if (ang === 180) out.revDist = rev; }
    return out;
  });
}
