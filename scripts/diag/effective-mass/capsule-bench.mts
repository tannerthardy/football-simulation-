// TORSO_CAPSULE bench (docs/reviews/2026-11-10-torso-shape-plan.md). A runner driving at speed v into a hitter at lateral
// offset `off`, the hitter facing square to him or 45 deg off, standing (holding his ground, push 1); torso only, and with
// the hitter's grasp at first proximity (centres <= 1.0 yd, as in games). Arm by flags (ref.mjs): the disc, TORSO_CAPSULE,
// CONTACT_LAYER, both. The runner's speed along his path kept (share of his speed before proximity) at first torso touch
// + 0.1 / + 0.2 s, and at first proximity + 0.3 / + 0.5 s (the capsule lets centres get closer before touching, so a fixed
// time after proximity mixes approach and hit); the hitter's speed gained along that path, the peak contact force on the
// runner (kN), the centre distance at first torso touch, the pair's relative tangential slip at first torso touch and 0.1 s later, and both men's yaw by +0.5 s.
// Then pair momentum with free intents (exact) and a world without contact bit-identical (digest).
// usage: node scripts/ref.mjs [--flag TORSO_CAPSULE=1] [--flag CONTACT_LAYER=1] -- node --import tsx .../capsule-bench.mts
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
const dt = 0.05;
function hit(v: number, off: number, hface: number, grasp: boolean) {
  const r = body(R, 0, 0, 0, v), h = body(H, 2.2, off, Math.PI + hface, 0), w: any = new World([r, h]); w.capsulePair = () => true;
  let tp = -1, v0 = v, kept1 = NaN, kept2 = NaN, k3 = NaN, k5 = NaN, tdist = NaN, hg = NaN, peak = 0, slip0 = NaN, slip1 = NaN, touch = -1, f0r = 0, f0h = 0, yr = 0, yh = 0;
  for (let k = 0; k < 40; k++) {
    const pv = r.vel.x;
    const rep = w.step([{ vel: { x: v, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI + hface, push: 1 } as any], dt);
    const gx = rep.groundImpulse[0].x, f = Math.abs(r.vel.x * R.massKg - pv * R.massKg - gx) / dt * 0.9144; peak = Math.max(peak, f);
    const d = Math.hypot(h.pos.x - r.pos.x, h.pos.y - r.pos.y);
    const relSlip = () => { const nx = (h.pos.x - r.pos.x) / d, ny = (h.pos.y - r.pos.y) / d; return Math.abs(-(r.vel.x - h.vel.x) * ny + (r.vel.y - h.vel.y) * nx); };
    if (tp < 0 && d <= 1.0) { tp = k; v0 = pv; f0r = r.facing; f0h = h.facing;
      if (grasp) w.joints.push({ kind: 'grasp', a: h, b: r, reach: R.radius + H.radius + H.reach * 0.9, capacity: supportParams(H).armForce * 0.96 * (0.3 + 2.5 * 0.25), legs: 0.25, pull: 2.2, hold: d, lock: 0.5 }); }
    if (tp >= 0 && touch < 0 && rep.contacts?.some((c: any) => c.impulse > 0)) { touch = k; slip0 = relSlip(); tdist = d; }
    if (touch >= 0 && k - touch === 2) slip1 = relSlip();
    if (touch >= 0 && k - touch === 2) kept1 = r.vel.x / v0;
    if (touch >= 0 && k - touch === 4) { kept2 = r.vel.x / v0; hg = h.vel.x - 0; }
    if (tp >= 0 && k - tp === 6) k3 = r.vel.x / v0;
    if (tp >= 0 && k - tp === 10) k5 = r.vel.x / v0;
    if (tp >= 0 && k - tp === 10) { yr = Math.abs(r.facing - f0r) * 57.3; yh = Math.abs(h.facing - f0h) * 57.3; }
  }
  return { kept1, kept2, k3, k5, tdist, hg, peak: peak / 1000, slip0, slip1, yr, yh };
}
const pct = (x: number) => Number.isFinite(x) ? `${(100 * x).toFixed(0)}%` : '  -';
for (const grasp of [false, true]) for (const hface of [0, Math.PI / 4]) {
  console.log(`== ${grasp ? 'grasp at proximity' : 'torso only'}, hitter ${hface ? '45 deg off square' : 'square'}`);
  console.log('   closing \\ offset |          0.00          |          0.15          |          0.30          |          0.45          |  (speed kept at touch +0.1 / +0.2 s ; proximity +0.3 / +0.5 s)');
  for (const v of [3, 4, 5, 6]) console.log(`   ${v} yd/s           | ${[0, 0.15, 0.3, 0.45].map(o => { const x = hit(v, o, hface, grasp); return `${pct(x.kept1).padStart(4)} / ${pct(x.kept2).padStart(4)} ; ${pct(x.k3).padStart(4)} / ${pct(x.k5).padStart(4)}`; }).join('   | ')}`);
  for (const o of [0, 0.3]) { const x = hit(4, o, hface, grasp); console.log(`   at 4 yd/s, offset ${o.toFixed(2)}: centres at first touch ${x.tdist.toFixed(2)} yd; hitter speed gained by touch +0.2 s ${x.hg.toFixed(2)} yd/s; peak force ${x.peak.toFixed(1)} kN; slip at touch ${x.slip0.toFixed(2)} -> +0.1 s ${x.slip1.toFixed(2)} yd/s; yaw by +0.5 s runner ${x.yr.toFixed(0)}, hitter ${x.yh.toFixed(0)} deg`); }
}
{ let err = 0; const r = body(R, 0, 0, 0, 4.5), h = body(H, 0.9, 0.2, Math.PI, 0), w: any = new World([r, h]); w.capsulePair = () => true;
  for (let k = 0; k < 30; k++) { const p0x = r.vel.x * R.massKg + h.vel.x * H.massKg, p0y = r.vel.y * R.massKg + h.vel.y * H.massKg;
    const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], dt);
    err = Math.max(err, Math.hypot(r.vel.x * R.massKg + h.vel.x * H.massKg - p0x - rep.groundImpulse[0].x - rep.groundImpulse[1].x, r.vel.y * R.massKg + h.vel.y * H.massKg - p0y - rep.groundImpulse[0].y - rep.groundImpulse[1].y)); }
  const path = () => { const r = body(R, 0, 0, 0, 4.5), h = body(H, 1.5, 3, Math.PI, 0), w: any = new World([r, h]); w.capsulePair = () => true; const p: number[] = [];
    for (let k = 0; k < 30; k++) { w.step([{ vel: { x: 4.5, y: 0 }, facing: 0, push: 1 } as any, { vel: { x: 0, y: 0 }, facing: Math.PI, push: 1 } as any], dt); p.push(r.pos.x, r.pos.y, h.pos.x, h.pos.y, r.facing, h.facing); }
    return p.map(x => x.toFixed(12)).join(','); };
  console.log(`momentum error with free intents ${err.toExponential(1)} kg yd/s; no-contact path digest ${(await import('node:crypto')).createHash('sha256').update(path()).digest('hex').slice(0, 12)}`); }
