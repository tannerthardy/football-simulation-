/** Lone-body bench for DOWN_RISE_PLANT: a safety-profile body runs at v and dives; time from the fall's start to being up, time in `down` before `rising`, distance travelled while off his feet,
 * speed when he is up. Also as the ball carrier (World.ballCarrier names him: must equal flag off). Run with DOWN_RISE_PLANT=0 and =1.
 *   [DOWN_RISE_PLANT=1] node --import tsx scripts/diag/body/down-rise-bench.mts */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(91); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'S' as any)));
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log(`DOWN_RISE_PLANT=${process.env.DOWN_RISE_PLANT ?? 0}   (12 safety bodies, medians)`);
for (const carrier of [false, true]) for (const v0 of [3, 4, 6, 8, 9.5]) {
  const rows: any[] = [];
  for (const P of Ps) {
    const b: any = { pos: { x: 0, y: 0 }, vel: { x: Math.min(v0, P.vmax), y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }; const w = new World([b]);
    if (carrier) w.ballCarrier = () => b;
    const dt = 0.05; let tFall = NaN, tDown = NaN, tRise = NaN, tUp = NaN, vDown = NaN, x0 = NaN, vUp = NaN, vFall = NaN;
    for (let k = 0; k < 140; k++) {
      const t = k * dt; (w as any).time = t;
      w.step([{ vel: { x: 12, y: 0 }, dive: k === 2 ? { x: 1, y: 0 } : undefined, effort: 1 } as any], dt); b.energy = 1;
      const st = b.support.state;
      if (st === 'falling' && Number.isNaN(tFall)) { tFall = t; x0 = b.pos.x; vFall = Math.hypot(b.vel.x, b.vel.y); }
      if (st === 'down' && Number.isNaN(tDown)) { tDown = t; vDown = Math.hypot(b.vel.x, b.vel.y); }
      if (st === 'rising' && Number.isNaN(tRise)) tRise = t;
      if (st === 'up' && !Number.isNaN(tFall) && Number.isNaN(tUp)) { tUp = t; vUp = Math.hypot(b.vel.x, b.vel.y); break; }
    }
    rows.push({ off: tUp - tFall, slide: tRise - tDown, dist: b.pos.x - x0, vDown, vUp, vFall });
  }
  console.log(`${carrier ? 'carrier ' : 'free    '} fall speed ${q(rows.map(r => r.vFall)).toFixed(1)}  down at ${q(rows.map(r => r.vDown)).toFixed(1)} yd/s: slide ${q(rows.map(r => r.slide)).toFixed(2)} s  off his feet ${q(rows.map(r => r.off)).toFixed(2)} s  distance ${q(rows.map(r => r.dist)).toFixed(2)} yd  speed when up ${q(rows.map(r => r.vUp)).toFixed(2)} yd/s`);
}
