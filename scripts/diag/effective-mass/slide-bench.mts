// GRASP_SLIDE / GRASP_CLOSURE bench (Integration, 2026-11-10). Same bodies as test/contact-layer.test.ts, 0.05 s steps.
// 1) Arrival: a runner driving at 4.5 yd/s into a standing hitter offset `off`; the grasp forms at first proximity
//    (centres 1.0 yd, before the pads meet, as slip-split.mts finds in games) with an arriving grip (lock 0.5).
//    Relative tangential slip at +0.1 / +0.3 s, turn of the line of centres by +0.3 s, the runner's travel by +1.0 s.
// 2) Settled wrap: the pair held chest to chest for 0.5 s with a closed two-arm wrap (lock 1), then the runner cuts
//    sideways (4 yd/s across). His sideways travel relative to the hitter by +0.5 s, and whether the hold breaks.
// 3) Pair momentum with free intents (no ground force), and a world without a grasp bit-identical.
// usage (arm via ref.mjs flags): node --import tsx scripts/diag/effective-mass/slide-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const { newSupport, supportParams } = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(3);
const R = derivePhysical(generatePlayer(rng, 'RB')), H = derivePhysical(generatePlayer(rng, 'LB'));
const body = (profile: any, x: number, y: number, facing: number, v: number) =>
  ({ pos: { x, y }, vel: { x: v, y: 0 }, facing, energy: 1, profile, support: newSupport(0.2) } as any);
const cap = (l: number) => supportParams(H).armForce * (0.3 + 2.5 * l * l) * 0.96;   // gripForce at tackling 0.6
const grasp = (h: any, r: any, d: number, l: number) => ({ kind: 'grasp', a: h, b: r, reach: R.radius + H.radius + H.reach * 0.9,
  capacity: cap(l), lock: l, legs: 0.25, pull: 2, hold: d } as any);
const rel = (r: any, h: any) => { const dx = h.pos.x - r.pos.x, dy = h.pos.y - r.pos.y, d = Math.hypot(dx, dy) || 1;
  return { d, a: Math.atan2(dy, dx), vt: Math.abs(-(r.vel.x - h.vel.x) * dy / d + (r.vel.y - h.vel.y) * dx / d) }; };
const out: string[] = [];
for (const off of [0.1, 0.2, 0.3]) {
  const r = body(R, 0, 0, 0, 4.5), h = body(H, 2.0, off, Math.PI, 0), w = new World([r, h]);
  let t0 = -1, a0 = 0, x0 = 0; const s: Record<string, string> = {}; let jt: any = null;
  for (let k = 0; k < 60; k++) {
    w.step([{ vel: { x: 4.5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05);
    const q = rel(r, h);
    if (t0 < 0 && q.d <= 1.0) { t0 = k; a0 = q.a; x0 = r.pos.x; jt = grasp(h, r, q.d, 0.5); w.joints.push(jt); continue; }
    if (t0 < 0) continue; const n = k - t0;
    if (n === 2) s.s1 = q.vt.toFixed(2);
    if (n === 6) { s.s3 = q.vt.toFixed(2); s.turn = (Math.abs(Math.atan2(Math.sin(q.a - a0), Math.cos(q.a - a0))) * 180 / Math.PI).toFixed(0); }
    if (n === 20) { s.x1 = (r.pos.x - x0).toFixed(2); s.down = r.support.state; s.broken = jt.broken || !w.joints.includes(jt) ? 'broken' : 'held'; }
  }
  out.push(`arrival off ${off.toFixed(1)}: slip +0.1 ${s.s1} +0.3 ${s.s3} yd/s, turn +0.3 ${s.turn} deg | runner +1.0 s ${s.x1} yd, ${s.down}, ${s.broken}`);
}
{
  const r = body(R, 0, 0, 0, 0), h = body(H, R.radius + H.radius, 0, Math.PI, 0), w = new World([r, h]);
  const jt = grasp(h, r, R.radius + H.radius, 1); w.joints.push(jt);
  for (let k = 0; k < 10; k++) w.step([{ vel: { x: 0, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05);
  const y0 = r.pos.y - h.pos.y; let side = '';
  for (let k = 1; k <= 10; k++) {
    w.step([{ vel: { x: 0, y: 4 }, facing: Math.PI / 2, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05);
    if (k === 4 || k === 10) side += ` +${(k * 0.05).toFixed(1)} s ${(r.pos.y - h.pos.y - y0).toFixed(2)} yd (runner ${r.vel.y.toFixed(2)} yd/s)`;
  }
  out.push(`settled wrap, runner cuts across: sideways travel relative to the hitter${side}; hold ${jt.broken || !w.joints.includes(jt) ? 'broken' : 'held'}`);
}
{
  let err = 0; const r = body(R, 0, 0, 0, 4.5), h = body(H, 1.0, 0.2, Math.PI, 0), w = new World([r, h]); w.joints.push(grasp(h, r, Math.hypot(1, 0.2), 0.5));
  for (let k = 0; k < 30; k++) { const p0x = r.vel.x * R.massKg + h.vel.x * H.massKg, p0y = r.vel.y * R.massKg + h.vel.y * H.massKg;
    const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], 0.05);
    err = Math.max(err, Math.hypot(r.vel.x * R.massKg + h.vel.x * H.massKg - p0x - rep.groundImpulse[0].x - rep.groundImpulse[1].x,
      r.vel.y * R.massKg + h.vel.y * H.massKg - p0y - rep.groundImpulse[0].y - rep.groundImpulse[1].y)); }
  const path = () => { const r = body(R, 0, 0, 0, 4.5), h = body(H, 1.5, 0.2, Math.PI, 0), w = new World([r, h]); const p: number[] = [];
    for (let k = 0; k < 30; k++) { w.step([{ vel: { x: 4.5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05); p.push(r.pos.x, r.pos.y, h.pos.x, h.pos.y, r.facing, h.facing); }
    return p.map(v => v.toFixed(12)).join(','); };
  out.push(`momentum error with free intents ${err.toExponential(1)} kg yd/s; no-grasp path digest ${(await import('node:crypto')).createHash('sha256').update(path()).digest('hex').slice(0, 12)}`);
}
console.log(out.join('\n'));
