/** Lone-body gates for TURN_SPLIT (docs/reviews/2026-11-16-turn-split.md): a body moving at speed v on a circle of radius R (the request rotates at v_req / R),
 * a 90-degree cut and a reversal, through stepBody (the sim's kinematic path) with energy held. Reports speed kept on the circle, the peak lateral acceleration
 * against the ellipse's lateral limit, the time and distance of the cuts. Twelve generated bodies, medians.
 *   [TURN_SPLIT=1] node --import tsx scripts/diag/route-speed/turn_split_bench.mts */
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const rng = new Rng(78); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'CB' as any)));
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const DT = 0.05;
const fresh = (P: any, v: number) => ({ pos: { x: 0, y: 0 }, vel: { x: v, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) }) as any;
const hold = (b: any) => { b.energy = 1; };
console.log(`TURN_SPLIT=${process.env.TURN_SPLIT ?? '0'}`);
// 1. circle: entry speed 7, request speed = 1.0 x vmax-ish (full), rotating at w = v/R; read the last 2 s of 4 s
for (const R of [4, 6, 9, 14]) {
  const sp: number[] = [], an: number[] = [], lim: number[] = [];
  for (const P of Ps) {
    const b = fresh(P, 7); let th = 0, prev = { ...b.vel }; const ans: number[] = [];
    for (let k = 0; k < 80; k++) {
      const v = Math.hypot(b.vel.x, b.vel.y), w = Math.max(v, 3) / R; th += w * DT;
      const tgt = Math.min(P.vmax, 8.5);
      stepBody(b, { vel: { x: tgt * Math.cos(th), y: tgt * Math.sin(th) }, facing: th, effort: 1 } as any, DT); hold(b);
      const ax = (b.vel.x - prev.x) / DT, ay = (b.vel.y - prev.y) / DT, vm = Math.hypot(b.vel.x, b.vel.y) || 1;
      if (k >= 40) { ans.push(Math.abs(-ay * b.vel.x + ax * b.vel.y) / vm); }
      prev = { ...b.vel };
    }
    sp.push(Math.hypot(b.vel.x, b.vel.y)); an.push(Math.max(...ans)); lim.push(P.lateral * (1 - 0.2 * Math.min(1, Math.hypot(b.vel.x, b.vel.y) / P.vmax)));
  }
  console.log(`circle R=${String(R).padEnd(2)} speed kept p50 ${q(sp).toFixed(2)} (p25 ${q(sp, .25).toFixed(2)})  peak lateral accel p50 ${q(an).toFixed(2)} vs limit lateral*(1-0.2 v/vmax) p50 ${q(lim).toFixed(2)} (ratio p50 ${q(an.map((a, i) => a / lim[i])).toFixed(2)}, max ${Math.max(...an.map((a, i) => a / lim[i])).toFixed(2)})`);
}
// 2. cuts at 7 yd/s: request turns at once by 45, 90, 135 and 180 degrees at full speed; time to be within 20 deg of it, speed at +0.5 s, distance to turn, peak lateral accel
for (const deg of [45, 90, 135, 180]) {
  const T: number[] = [], s5: number[] = [], D: number[] = [], an: number[] = [], lim: number[] = [];
  for (const P of Ps) {
    const b = fresh(P, 7); const a0 = deg * Math.PI / 180, tgt = Math.min(P.vmax, 8.5); let hit = NaN, dist = NaN, prev = { ...b.vel }; const ans: number[] = [];
    for (let k = 1; k <= 30; k++) {
      stepBody(b, { vel: { x: tgt * Math.cos(a0), y: tgt * Math.sin(a0) }, facing: a0, effort: 1 } as any, DT); hold(b);
      const h = Math.atan2(b.vel.y, b.vel.x), vm = Math.hypot(b.vel.x, b.vel.y);
      const ax = (b.vel.x - prev.x) / DT, ay = (b.vel.y - prev.y) / DT; ans.push(Math.abs(-ay * b.vel.x + ax * b.vel.y) / (vm || 1)); prev = { ...b.vel };
      if (Number.isNaN(hit) && Math.abs(((h - a0) * 180 / Math.PI + 540) % 360 - 180) <= 20 && vm > 2) { hit = k * DT; dist = Math.hypot(b.pos.x - 0, b.pos.y); }
      if (k === 10) s5.push(vm);
    }
    T.push(hit); D.push(dist); an.push(Math.max(...ans)); lim.push(P.lateral);
  }
  console.log(`cut ${String(deg).padStart(3)} deg: within 20 deg and >2 yd/s at p50 ${q(T).toFixed(2)} s (p25 ${q(T, .25).toFixed(2)}, p75 ${q(T, .75).toFixed(2)}), path ${q(D).toFixed(1)} yd, speed at +0.5 s ${q(s5).toFixed(2)}, peak lateral accel p50 ${q(an).toFixed(2)} (limit p50 ${q(lim).toFixed(2)}, max ratio ${Math.max(...an.map((a, i) => a / lim[i])).toFixed(2)})`);
}
// 3. stop: full-speed run at 7 yd/s then request 0: distance and time to under 0.5 yd/s
{ const D: number[] = [], T: number[] = [];
  for (const P of Ps) { const b = fresh(P, 7); let t = NaN; for (let k = 1; k <= 60; k++) { stepBody(b, { vel: { x: 0, y: 0 }, facing: 0, effort: 1 } as any, DT); hold(b); if (Number.isNaN(t) && Math.hypot(b.vel.x, b.vel.y) < 0.5) { t = k * DT; break; } } T.push(t); D.push(b.pos.x); }
  console.log(`stop from 7 yd/s: ${q(T).toFixed(2)} s, ${q(D).toFixed(2)} yd (p50)`); }
