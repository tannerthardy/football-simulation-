// Engaged leg contest, mirrored (Integration, 2026-11-10): equal bodies in a run engagement (the HANDS_CHEST test's
// fixture), one man driving into the other who holds his ground (requests zero velocity, pushes), then the roles
// swapped, and both driving. Pair displacement along the line over 1.0 s (+ = toward the defender's side: the blocker
// winning), and each man's ground force share of his traction limit. The outcome should depend on the bodies and
// requests, not on which one is labelled blocker. usage (arm via ref.mjs): node --import tsx .../contest-mirror.mts
const W = process.cwd();
const { contactFixture } = await import(`${W}/scripts/diag/run-contact-technique.ts`);
for (const [label, bReq, dReq] of [['blocker drives, defender holds', 1, 0], ['defender drives, blocker holds', 0, 1], ['both drive', 1, 1], ['blocker drives 2, defender drives 1', 2, 1]] as const) {
  const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  Object.assign(d.profile, structuredClone(b.profile));
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  const R = b.profile.radius + d.profile.radius + 0.05;
  d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI; e.control = 0;
  const x0 = (b.pos.x + d.pos.x) / 2; let shB = 0, shD = 0, n = 0;
  for (let k = 0; k < 20; k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: bReq, y: 0 }, facing: 0, push: 1, posture: 0.85 };
    intents[d.idx] = { vel: { x: -dReq, y: 0 }, facing: Math.PI, push: 1, posture: 0.85 };
    const rep = sim.world.step(intents, sim.dt);
    const lim = (i: number) => rep.groundImpulseLimit[i] || 1;
    shB += Math.hypot(rep.groundImpulse[b.idx].x, rep.groundImpulse[b.idx].y) / lim(b.idx); shD += Math.hypot(rep.groundImpulse[d.idx].x, rep.groundImpulse[d.idx].y) / lim(d.idx); n++;
  }
  console.log(`${label.padEnd(38)} pair moved ${((b.pos.x + d.pos.x) / 2 - x0).toFixed(2)} yd (+ = toward the defender's side) | ground share of traction: blocker ${(shB / n).toFixed(2)}, defender ${(shD / n).toFixed(2)}`);
}
