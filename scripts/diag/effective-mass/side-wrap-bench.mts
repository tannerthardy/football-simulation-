// Side wrap, the World alone (Integration, 2026-11-12, finding 1 of the wrap-at-speed diagnosis: why the holder is tipped
// forward and his feet push him along). A generated WR runner at v0 along +x; a CB holder beside him (his centre 0.75 yd
// to the side, at rest or trailing at vt along +x) with a grasp (legs share, lock, the games' capacity law). The runner
// asks for v0 ahead (push 1). The holder asks to stop (vel 0, push 1, posture P) -- what tackle.ts's HOLD_FINISH asks
// when committed -- or, with HOLDER=run, to keep the runner's velocity (a pursuit request). Per 0.05 s for 1 s: runner
// speed, holder speed, grip force on the runner (x his mg), each one's ground force along +x (x his own mg), the holder's
// COM deviation beyond his base along +x (xi), his lean and felt load along +x, his support state; then the outcome.
// env: V0 (6), VT (0), LEGS (0.5), LOCK (0.75), P (0.6), HOLDER (stop|run).
// usage: node --import tsx scripts/diag/effective-mass/side-wrap-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const env = (k: string, d: number) => Number(process.env[k] ?? d);
const v0 = env('V0', 6), vt = env('VT', 0), legs = env('LEGS', 0.5), lock = env('LOCK', 0.75), P = env('P', 0.6), mode = process.env.HOLDER ?? 'stop';
const rng = new Rng(61);
const R = derivePhysical(generatePlayer(rng, 'WR')), H = derivePhysical(generatePlayer(rng, 'CB'));
const G = 9.81 * 1.0936, f = (x: number, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '-';
const r: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: R, support: S.newSupport(0.3) };
const h: any = { pos: { x: 0, y: 0.75 }, vel: { x: vt, y: 0 }, facing: -Math.PI / 2, energy: 1, profile: H, support: S.newSupport(P) };
const w = new World([r, h]);
const cap = S.supportParams(H as any).armForce * (0.3 + 2.5 * lock * lock) * 0.96;
const jt: any = { kind: 'grasp', a: h, b: r, reach: 0.75 + H.reach * 0.9, capacity: cap, lock, legs, pull: 2, hold: 0.75, origin: 'bench' };
w.joints.push(jt);
console.log(`runner ${R.massKg.toFixed(0)} kg at ${v0}, holder ${H.massKg.toFixed(0)} kg at ${vt} beside, legs ${legs} lock ${lock} cap ${cap.toFixed(0)} | holder asks ${mode} posture ${P}`);
let fell = -1;
for (let k = 1; k <= 20; k++) {
  const hold = mode === 'run' ? { vel: { x: r.vel.x, y: r.vel.y }, facing: -Math.PI / 2, push: 1, posture: P } : { vel: { x: 0, y: 0 }, facing: -Math.PI / 2, push: 1, posture: P };
  const rep = w.step([{ vel: { x: v0, y: 0 }, facing: 0, push: 1, posture: 0.3 } as any, hold as any], 0.05);
  const grip = ((jt.normalForceOnB?.x ?? 0) + (jt.tangentForceOnB?.x ?? 0)) / (R.massKg * G);
  const gR = rep.groundImpulse[0].x / 0.05 / (R.massKg * G), gH = rep.groundImpulse[1].x / 0.05 / (H.massKg * G);
  const s = h.support;
  console.log(`${f(k * 0.05)}s runner v ${f(r.vel.x)} ${r.support.state} | holder v ${f(h.vel.x)} ${s.state} | grip on runner ${f(grip)} | ground runner ${f(gR)} holder ${f(gH)} | holder xi ${f(s.xi?.x ?? 0)} lean ${f(s.lean?.x ?? 0)} felt ${f(s.felt?.x ?? 0)} load ${f(s.load?.x ?? 0)}${jt.broken ? ' | BROKEN' : ''}`);
  if (fell < 0 && r.support.state !== 'up') fell = k * 0.05;
}
console.log(`runner travel ${f(r.pos.x)} yd; runner fell ${fell > 0 ? f(fell) + ' s' : 'no'}; holder ${h.support.state}`);
