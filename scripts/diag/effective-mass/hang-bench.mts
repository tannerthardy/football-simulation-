// A holder going to the ground with his arms round the runner's legs (Integration, 2026-11-12, wrap-at-speed (ii)). The
// World alone: a WR runner at v0 along +x asking to keep running; a CB holder behind him, just off his feet ('falling',
// moving with the runner at 0.9 v0), with a rear grasp on the legs (legs share, lock; the games' capacity law). Per 0.05 s:
// runner speed and state, the holder's state, the grip's drag on the runner, the runner's own ground force, the stride
// bound the World applies, and the World's hanging moment on the held legs against the runner's hip torque.
// Reference load over time (plain statics, estimated): while the holder is airborne (his fall, before he lands) none of
// his weight is on the turf, so all of it hangs on the hold: W = m_h g at the hold height, a moment W x lever about the
// runner's hip (lever = the hold's depth below the hip, 0.55 legs x COM height, the World's own lever); after he lands,
// half rests on the turf (HANG_SHARE) and the rest of the load is his sliding friction through the grip (down friction
// 0.75 x m_h g), backward on the legs. Reported side by side with what the World applies.
// usage: [flags] node --import tsx scripts/diag/effective-mass/hang-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const G = 9.81 * 1.0936, f = (x: number, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '-';
const rng = new Rng(61);
const R = derivePhysical(generatePlayer(rng, 'WR')), H = derivePhysical(generatePlayer(rng, 'CB'));
const VERBOSE = process.env.VERBOSE === '1';
console.log(`runner ${R.massKg.toFixed(0)} kg, holder ${H.massKg.toFixed(0)} kg`);
for (const v0 of [5, 7]) for (const legs of [0.5, 0.8]) for (const lock of [0.25, 0.56, 0.9]) {
  const gap = R.radius + H.radius + 0.1;
  const r: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: R, support: S.newSupport(0.3) };
  const h: any = { pos: { x: -gap, y: 0 }, vel: { x: 0.9 * v0, y: 0 }, facing: 0, energy: 1, profile: H, support: S.newSupport(0.5) };
  const w: any = new World([r, h]);
  h.support.state = 'falling'; h.support.since = w.time ?? 0; h.support.fall = { x: 1, y: 0 }; h.support.cause = 'dive';
  const cap = S.supportParams(H as any).armForce * (0.3 + 2.5 * lock * lock) * 0.96;
  const jt: any = { kind: 'grasp', a: h, b: r, reach: gap + H.reach * 0.9 + 0.9, ground: gap + H.reach * 0.9 + 0.9, capacity: cap, lock, legs, pull: 2, hold: gap, origin: 'bench' };
  w.joints.push(jt);
  const com = S.supportParams(R as any).comHeight, lever = 0.55 * legs * com, mh = H.massKg;
  let fell = -1, landed = -1; const lines: string[] = []; let boundEver = 0;
  for (let k = 1; k <= 30; k++) {
    const rep = w.step([{ vel: { x: v0 + 2, y: 0 }, facing: 0, push: 1, posture: 0.3 } as any, { vel: { x: 0, y: 0 }, facing: 0, push: 1 } as any], 0.05);
    const t = k * 0.05;
    if (landed < 0 && h.support.state !== 'falling') landed = t;
    if (fell < 0 && r.support.state !== 'up') fell = t;
    const hip = w.hipTorque ? w.hipTorque(0) : NaN;
    const worldHang = h.support.state === 'up' ? 0 : (process.env.HANG_AIRBORNE === '1' && h.support.state === 'falling' ? 1 : 0.5) * mh * G * lever;
    const refHang = landed < 0 ? mh * G * lever : 0.5 * mh * G * lever;
    const refDrag = landed < 0 ? 0 : 0.75 * mh * G;
    const bound = w.strideHolds?.[0] ?? 0; boundEver = Math.max(boundEver, bound);
    const drag = ((jt.normalForceOnB?.x ?? 0) + (jt.tangentForceOnB?.x ?? 0));
    lines.push(`  ${f(t)}s v ${f(r.vel.x)} ${r.support.state} | holder ${h.support.state} | grip drag ${f(drag, 0)} (ref after landing ${f(-refDrag, 0)}) | runner ground ${f(rep.groundImpulse[0].x / 0.05, 0)} | hang moment World ${f(worldHang, 0)} ref ${f(refHang, 0)} vs hip ${f(hip, 0)} | stride bound ${f(bound)} | legs ${f(jt.legs)}${jt.broken ? ' BROKEN' : ''}`);
    if (fell > 0 && t > fell + 0.2) break;
  }
  const hip = w.hipTorque ? w.hipTorque(0) : NaN;
  console.log(`== v0 ${v0} legs ${legs} lock ${lock} (cap ${f(cap, 0)}, off feet ${f(0.7 * cap, 0)} vs his weight ${f(mh * G, 0)}): ${jt.broken ? 'TORN' : 'held'}, legs at end ${f(jt.legs)} | runner ${fell > 0 ? 'down at ' + f(fell) + ' s' : 'up at 1.5 s'}, travel ${f(r.pos.x)} yd, holder landed ${f(landed)} s, stride bound max ${f(boundEver)} | hang moment while airborne: World ${f((process.env.HANG_AIRBORNE === '1' ? 1 : 0.5) * mh * G * lever, 0)} vs reference ${f(mh * G * lever, 0)}; hip torque ${f(hip, 0)}`);
  if (VERBOSE) console.log(lines.join('\n'));
}
