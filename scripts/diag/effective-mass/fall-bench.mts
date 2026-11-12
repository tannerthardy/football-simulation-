// A fall at running speed, the World alone vs plain rigid-body toppling (Integration, 2026-11-12, census finding: a
// falling body has almost no ground force, so a tripped runner, or a holder going down with his arms round the legs,
// travels on at the runner's pace for the whole fall). A generated RB moving at v0 along +x starts a forward fall
// (state 'falling', fall direction +x, the World's own fall path). Reported: horizontal distance and time while
// falling, then to rest, and the mean horizontal deceleration while falling (x g).
// Reference, plain physics: a rigid body (COM height H = his COM height, pitch radius of gyration^2 k^2 = the World's
// pitchRadiusSq) whose foot is caught on the turf while his COM moves at v0. Angular momentum about the foot is kept
// through the catch (omega0 = v0 H / (k^2 + H^2)); he then rotates over the foot under gravity with Coulomb friction
// at the foot (static/kinetic mu 0.6, estimated for cleats on turf; the foot slides when the needed friction exceeds
// it) until his COM is at 0.25 H (landed), then slides on the ground with the World's own down friction (0.75).
// usage: [flags] node --import tsx scripts/diag/effective-mass/fall-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const G = 9.81 * 1.0936, f = (x: number, d = 2) => x.toFixed(d);
const P = derivePhysical(generatePlayer(new Rng(71), 'RB' as any));
const sp = S.supportParams(P as any);
console.log(`RB ${P.massKg.toFixed(0)} kg, COM ${f(sp.comHeight)} yd, pitch k^2 ${f(sp.pitchRadiusSq, 3)} yd^2, fall time ${f(S.fallTime(sp, 0.3))} s`);
for (const v0 of [3, 5, 7]) {
  // The World
  const b: any = { pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy: 1, profile: P, support: S.newSupport(0.3) };
  const w = new World([b]);
  b.support.state = 'falling'; b.support.since = (w as any).time ?? 0; b.support.fall = { x: 1, y: 0 }; b.support.cause = 'legs';
  let tFall = NaN, xFall = NaN, t = 0;
  for (let k = 1; k <= 120; k++) {
    w.step([{ vel: { x: 0, y: 0 }, facing: 0 } as any], 0.025); t = k * 0.025;
    if (Number.isNaN(tFall) && b.support.state !== 'falling') { tFall = t; xFall = b.pos.x; }
    if (b.support.state !== 'falling' && Math.hypot(b.vel.x, b.vel.y) < 0.05) break;
  }
  const worldFall = { d: xFall, t: tFall, dec: (v0 - (xFall - 0) / tFall * 0) };
  // Rigid toppling over a caught foot
  const H = sp.comHeight, k2 = sp.pitchRadiusSq, mu = 0.6, muDown = 0.75, dt = 1e-4;
  let th = 0, om = v0 * H / (k2 + H * H), px = 0, pv = 0, tt = 0, slid = false;
  let cx = 0, cvx = v0;
  while (H * Math.cos(th) > 0.25 * H && tt < 2) {
    // about the foot (pivot): (k^2 + H^2) th'' = g H sin th (for a fixed pivot)
    const al = G * H * Math.sin(th) / (k2 + H * H);
    // COM acceleration, horizontal and vertical, for a fixed pivot
    const ax = H * (al * Math.cos(th) - om * om * Math.sin(th)), ay = -H * (al * Math.sin(th) + om * om * Math.cos(th));
    const N = G + ay, Ff = ax;                                       // per unit mass: ground normal and friction needed
    let a2 = al;
    if (N <= 0 || Math.abs(Ff) > mu * N) {
      // The foot slides: kinetic friction against the foot's motion; keep the rotation from gravity (approximation).
      slid = true; const fr = -Math.sign(cvx - om * H * Math.cos(th) || 1) * mu * Math.max(N, 0);
      cvx += fr * dt; pv = cvx - om * H * Math.cos(th);
    } else { cvx += ax * dt; pv = 0; }
    om += a2 * dt; th += om * dt; cx += cvx * dt; tt += dt;
  }
  const dLand = cx, tLand = tt, vLand = Math.max(0, cvx);
  const slide = vLand * vLand / (2 * muDown * G), tSlide = vLand / (muDown * G);
  console.log(`v0 ${v0}: World falling ${f(xFall)} yd in ${f(tFall)} s (mean decel ${f((v0 - (b.vel.x + 0)) / 1)} n/a) then to rest ${f(b.pos.x)} yd at ${f(t)} s | toppling over a caught foot: lands ${f(dLand)} yd in ${f(tLand)} s, horizontal speed at landing ${f(vLand)}${slid ? ' (foot slid)' : ''}, slides ${f(slide)} yd more in ${f(tSlide)} s: to rest ${f(dLand + slide)} yd at ${f(tLand + tSlide)} s`);
}
