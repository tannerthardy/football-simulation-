// The mirror loop, staged (Integration, 2026-11-15; hand-fight note section 20): contactFixture's pass pair (the C and
// DT_W, the engine's own stepPassRep for both), the rusher's request replaced each tick by a straight drive at the QB
// (0.55 of his top speed, full push: no lateral request), and both bodies given an initial drift across of v0 (+ and -).
// Does the pair's lateral drift die or grow over 2 s? Report the pair's mean lateral velocity at 0.25 / 0.5 / 1.0 /
// 1.5 / 2.0 s and the blocker's requested lateral at the same times.
// usage: [MIRROR_REF=1] node --import tsx scripts/diag/effective-mass/mirror-staged.mts [v0]
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const v0 = Number(process.argv[2] ?? 0.6);
for (const side of [1, -1]) for (const dir of [0, 1, -1]) {
  // The fixture's own side (the rusher set 0.2 yd off to it) flipped for the true mirror; the drift toward that side
  // (+1), away (-1) or none (0). Reported signed along the fixture's side.
  const sgn = side;
  const { sim, blocker: b, defender: d } = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side }) as any;
  // The fixture does not run the pass protector: his set (as PassProtector sets it each tick in a game: depth, lane,
  // and under SET_SPOT his spot, his alignment) is staged here from his start, or the zone would follow him.
  const { passSetDepth } = await import('../../../src/sim/engagement.js');
  const home = b.pos.y;
  const setPass = () => { b.passSet = { depth: passSetDepth(sim, b), laneY: home, outside: 0, spotY: home }; };
  setPass();
  b.body.vel = { x: 0, y: side * dir * v0 }; d.body.vel = { x: 0, y: side * dir * v0 };
  const step = sim.world.step.bind(sim.world);
  let breq = 0;
  sim.world.step = (intents: any[], dt: number) => {
    const qx = sim.qb.pos.x - d.pos.x, qy = sim.qb.pos.y - d.pos.y, L = Math.hypot(qx, qy) || 1, sp = 0.55 * d.profile.vmax;
    // STAGE_RUSHER_LAT: a real lateral move by the rusher (yd/s across, toward his side), on top of the drive.
    const latMove = Number(process.env.STAGE_RUSHER_LAT ?? 0) * side;
    intents[d.idx] = { ...intents[d.idx], vel: { x: qx / L * sp, y: qy / L * sp + latMove }, push: 1 };
    breq = intents[b.idx]?.vel?.y ?? 0; setPass();
    return step(intents, dt);
  };
  const out: string[] = []; const t0 = sim.t;
  while (sim.t - t0 < Number(process.env.STAGE_T ?? 2.0) + 1e-9 && sim.phase !== 'dead') {
    sim.tick();
    const dt = sim.t - t0;
    for (const m of [0.25, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) if (Math.abs(dt - m) < 0.026)
      out.push(`${m.toFixed(2)} s: pair ${((b.vel.y + d.vel.y) / 2 * sgn).toFixed(2)}, blocker asks ${(breq * sgn).toFixed(2)}, rusher - blocker across ${((d.pos.y - b.pos.y) * sgn).toFixed(2)} yd, engaged ${!!d.engagement}${process.env.STAGE_DEBUG ? `, blocker - spot ${(((b.pos.y - (b.passSet?.spotY ?? NaN))) * sgn).toFixed(2)}, depth ${(sim.los - b.pos.x).toFixed(2)}, setDepth ${b.passSet?.depth?.toFixed(2)}, rusher - qb ${(d.pos.x - sim.qb.pos.x).toFixed(2)}` : ''}`);
  }
  console.log(`MIRROR_REF=${process.env.MIRROR_REF ?? '0'} side ${side > 0 ? '+' : '-'} drift ${dir === 0 ? 'none' : dir > 0 ? 'toward' : 'away'} (signed along the side): ${out.join(' | ')}`);
}
