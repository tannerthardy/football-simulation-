// LEAN_PITCH bench (Integration, 2026-11-10). Generated OL / DL / RB / LB bodies, 0.05 s steps, the World only.
// A 'pusher' drives into a 'bracer' through a hands row (push limit = pusher's arm force, no hold or steer) or, for the
// tackler, through the torsos alone. Cases:
//   sag:       the push limit halves at 0.8 s (pass blocker anchoring against a rusher whose push sags);
//   sustained: no change, 2.0 s (bracing against a load is legitimate: he must still hold it);
//   removed:   the hands come off at 0.8 s (a snatch / pull: he should stumble forward, by the lean he really had);
//   drive:     the blocker is the pusher, the DL anchors, and the DL's resistance halves at 0.8 s;
//   tackler:   a runner drives into a braced tackler (torso contact) and cuts away at 0.8 s.
// Per case, for the man whose lean is tested: peak lean (x mg) and its offset (yd) and when it peaked, his COM offset
// growth (yd/s, fastest tick), his peak capture-point deviation over the fall threshold, whether he fell and which way
// (into = toward the other man), and how far he was driven back by 0.8 s. Then momentum with free intents and a
// no-contact world digest. usage (arm via env): LEAN_PITCH=1 node --import tsx scripts/diag/effective-mass/lean-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(5);
const OL = derivePhysical(generatePlayer(rng, 'OG')), DL = derivePhysical(generatePlayer(rng, 'DT'));
const RB = derivePhysical(generatePlayer(rng, 'RB')), LB = derivePhysical(generatePlayer(rng, 'LB'));
const G = 9.81 * 1.0936;
const body = (profile: any, x: number, facing: number) => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: S.newSupport(0.6) } as any);
function run(kind: string) {
  const tackler = kind === 'tackler', drive = kind === 'drive', kick = kind.startsWith('kick');
  const P = tackler ? RB : drive ? OL : DL, B = tackler ? LB : drive ? DL : OL;      // pusher, bracer
  const gap = P.radius + B.radius + (tackler ? 0 : 0.3);
  const p = body(P, 0, 0), b = body(B, gap, Math.PI), w = new World([p, b]);
  const arm = S.supportParams(P).armForce;
  const hands: any = tackler ? null : { kind: 'hands', a: p, b, extension: gap, push: arm, hold: 0, steer: 0 };
  if (hands) w.joints.push(hands);
  // The tested man: the bracer (sag / sustained / removed / tackler) or the driving blocker (drive).
  const T = drive ? p : b, O = drive ? b : p, Ti = drive ? 0 : 1, m = T.profile.massKg, sp = S.supportParams(T.profile);
  const steps = kind === 'sustained' || kind === 'kick-hold' ? 40 : 30; let peak = 0, peakT = 0, rate = 0, prevOff = 0, xiPeak = 0, fell = '', back = 0; const x0 = T.pos.x;
  for (let k = 0; k < steps; k++) {
    const t = k * 0.05;
    if (Math.abs(t - 0.8) < 1e-9) {
      if (kind === 'sag' || kind === 'drive' || kind === 'kick-sag') hands.push = arm * 0.5;
      if (kind === 'removed' || kind === 'kick-removed') w.joints.splice(w.joints.indexOf(hands), 1);
    }
    const cut = tackler && t >= 0.8;
    const pi = { vel: cut ? { x: 0, y: 4 } : { x: kick ? 5 : 3, y: 0 }, facing: cut ? Math.PI / 2 : 0, push: 1, posture: 0.6 } as any;
    const bi = { vel: { x: kick ? 2.5 : 0, y: 0 }, facing: Math.PI, push: 1, posture: 0.6 } as any;   // kick: setting back at 2.5 yd/s
    // The driving blocker wants to move the DL; the DL anchors (the pusher roles swap for 'drive' only in who is tested).
    w.step([pi, bi], 0.05);
    const sup = T.support, w0 = S.omega0(sp, sup.posture), lean = Math.hypot(sup.lean.x, sup.lean.y), off = lean / (m * w0 * w0);
    if (lean / (m * G) > peak) { peak = lean / (m * G); peakT = t + 0.05; }
    rate = Math.max(rate, (off - prevOff) / 0.05); prevOff = off;
    const crit = S.baseRadiusAt(sp, sup.posture) + S.recoverySpeed(sp, 0, 1) / w0;
    if (sup.state === 'up') xiPeak = Math.max(xiPeak, Math.hypot(sup.xi.x, sup.xi.y) / crit);
    if (!fell && sup.state !== 'up') { const tox = O.pos.x - T.pos.x; fell = `${sup.fall.x * Math.sign(tox) > 0.5 ? 'into' : sup.fall.x * Math.sign(tox) < -0.5 ? 'with push' : 'across'} at ${(t + 0.05).toFixed(2)} s`; }
    if (Math.abs(t + 0.05 - 0.8) < 1e-9) back = Math.abs(T.pos.x - x0);
  }
  const w0 = S.omega0(sp, 0.6);
  return `${kind.padEnd(9)} peak lean ${peak.toFixed(2)} mg (${(peak * G / (w0 * w0)).toFixed(2)} yd) at ${peakT.toFixed(2)} s; fastest offset growth ${rate.toFixed(1)} yd/s; peak deviation ${xiPeak.toFixed(2)} of threshold; ${fell ? 'FELL ' + fell : 'stayed up'}; moved ${back.toFixed(2)} yd by 0.8 s`;
}
for (const k of ['sag', 'sustained', 'removed', 'kick-sag', 'kick-hold', 'kick-removed', 'drive', 'tackler']) console.log(run(k));
{
  let err = 0; const p = body(DL, 0, 0), b = body(OL, DL.radius + OL.radius + 0.3, Math.PI); p.vel.x = 3; const w = new World([p, b]);
  w.joints.push({ kind: 'hands', a: p, b, extension: DL.radius + OL.radius + 0.3, push: S.supportParams(DL).armForce, hold: 0, steer: 0 } as any);
  for (let k = 0; k < 30; k++) { const px = p.vel.x * DL.massKg + b.vel.x * OL.massKg, py = p.vel.y * DL.massKg + b.vel.y * OL.massKg;
    const rep = w.step([{ vel: { x: 0, y: 0 }, free: true } as any, { vel: { x: 0, y: 0 }, free: true } as any], 0.05);
    err = Math.max(err, Math.hypot(p.vel.x * DL.massKg + b.vel.x * OL.massKg - px - rep.groundImpulse[0].x - rep.groundImpulse[1].x,
      p.vel.y * DL.massKg + b.vel.y * OL.massKg - py - rep.groundImpulse[0].y - rep.groundImpulse[1].y)); }
  const path = () => { const a = body(DL, 0, 0), c = body(OL, 6, Math.PI), w = new World([a, c]); const q: number[] = [];
    for (let k = 0; k < 40; k++) { w.step([{ vel: { x: 4, y: 0.5 }, facing: 0, push: 1 } as any, { vel: { x: -2, y: 0 }, facing: Math.PI, push: 1 } as any], 0.05);
      if (k === 20) break; q.push(a.pos.x, a.pos.y, c.pos.x, c.pos.y, a.facing, c.facing, a.support.xi.x, c.support.xi.y); }
    return q.map(v => v.toFixed(12)).join(','); };
  console.log(`momentum error with free intents ${err.toExponential(1)} kg yd/s; no-contact path digest ${(await import('node:crypto')).createHash('sha256').update(path()).digest('hex').slice(0, 12)}`);
}
