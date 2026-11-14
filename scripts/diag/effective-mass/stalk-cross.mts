// What a blocker's hands do to a man running past (Integration / Rules+Coaching, 2026-11-14: the stalk on screens ends by
// separation 14 of 15 times). Two 90 kg bodies from contactFixture. The blocker stands facing +x with his hands joint on
// the defender (working length set as setContactHands would: the default law at a control of +0.4, or CONTROL_HANDS'
// full capacity), not holding. The defender starts at the blocker's hands and runs across him (+y) at 2 / 3 / 4 yd/s,
// requesting to keep that speed. Only the World steps (no engagement update), so "contact" is the joint's own life: the
// time until the bodies are farther apart than the joint's extension plus its slack (where a non-holding joint can no
// longer pull). Reported: the defender's speed lost over the contact (yd/s), his path deflection (deg), the contact
// duration (s), and the steer impulse the joint delivered (N s).
// usage: [BRACE_GAIT=1] node --import tsx scripts/diag/effective-mass/stalk-cross.mts
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { supportParams } = await import('../../../src/physics/support.js');
for (const law of ['default (control +0.4)', 'CONTROL_HANDS (capacity)'] as const) for (const v of [2, 3, 4]) {
  const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  for (const a of [b, d]) { a.profile.massKg = 90; }
  Object.assign(d.profile, structuredClone(b.profile));
  const sep = b.profile.radius + d.profile.radius, arm = b.player.measurables.armIn / 36;
  const sp = supportParams(b.profile), c = 0.4, j = e.hands!;
  if (law.startsWith('default')) {
    j.extension = sep + arm * 0.3 * (0.5 + 0.5 * c); j.push = sp.pressForce * (0.35 + 0.65 * c); j.hold = 0; j.steer = sp.armForce * (0.15 + 0.55 * c);
  } else { j.extension = sep + arm * 0.3; j.push = sp.pressForce; j.hold = 0; j.steer = sp.armForce * 0.7; }
  j.actor = b.body;
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  d.body.pos = { x: 40 + j.extension, y: 26.65 }; d.body.vel = { x: 0, y: v }; d.body.facing = Math.PI / 2;
  e.control = c;
  let t = 0, life = 0, imp = 0; const v0 = v;
  for (let k = 0; k < 30; k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: 0, y: 0 }, facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), push: 1, posture: 0.75 };
    intents[d.idx] = { vel: { x: 0, y: v }, facing: Math.PI / 2, push: 1, posture: 0.75 };
    sim.world.step(intents, sim.dt); t += sim.dt;
    const dist = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y);
    imp += Math.abs(j.tangentForce ?? 0) * sim.dt;
    if (dist <= j.extension + 0.15) life = t;
  }
  const vend = Math.hypot(d.body.vel.x, d.body.vel.y), defl = Math.atan2(d.body.vel.x, d.body.vel.y) * 180 / Math.PI;
  console.log(`${law.padEnd(26)} crossing at ${v} yd/s: joint on for ${life.toFixed(2)} s | his speed ${v0.toFixed(1)} -> ${vend.toFixed(2)} yd/s | path deflected ${defl.toFixed(1)} deg | steer impulse ${imp.toFixed(0)} N s (steer limit ${j.steer.toFixed(0)} N, push ${j.push.toFixed(0)} N)`);
}
