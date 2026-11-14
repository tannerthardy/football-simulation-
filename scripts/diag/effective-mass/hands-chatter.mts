// Integration/Tools 2026-11-14 item 6: the blocker's hands joint force alternates 2,032 N / 0 on even / odd ticks in the
// staged "power rusher" pair. Per tick: the staging's own call order (syncJoints then World.step) and, per joint, the
// normal force, the extension it holds, the separation, the punch state and the control; then whether calling syncJoints
// once per two ticks or not at all changes the pattern (staging) or not (the hands law / the solver).
// usage: PAIR_HANDS=1 node --import tsx scripts/diag/effective-mass/hands-chatter.mts [mode: each|none]
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { syncJoints } = await import('../../../src/sim/engagement.js');
const mode = process.argv[2] ?? 'each', fd = (process.argv[3] ?? 'outside') as any;
const { sim, blocker: b, defender: d, engagement: e0 } = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side: 1 });
const e: any = e0; e.type = 'pass';
Object.assign(d.profile, structuredClone(b.profile));
const R = b.profile.radius + d.profile.radius + 0.3;
b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { x: -2, y: 0.5 }; d.body.facing = Math.PI;
e.move = 'bull'; e.hands = undefined; e.defHands = undefined; syncJoints(sim, e);
if (e.hands) e.hands.fit = 'inside'; if (e.defHands) e.defHands.fit = fd;
const f = (x: any) => (typeof x === 'number' ? x.toFixed(2) : String(x));
for (let k = 0; k < 16; k++) {
  e.move = 'bull';
  if (mode === 'each') syncJoints(sim, e);
  if (e.hands) e.hands.fit = 'inside'; if (e.defHands) e.defHands.fit = fd;
  const pre = e.hands ? { ext: e.hands.extension, push: e.hands.pushLimit ?? e.hands.maxPush, ctl: e.hands.control, actor: e.hands.actor, st: e.hands.punch?.state ?? e.hands.punchState } : {};
  const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  intents[b.idx] = { vel: { x: 0, y: 0 }, facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), push: 1, posture: 0.75 };
  intents[d.idx] = { vel: { x: -2, y: 0.5 }, facing: Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x), push: 1, posture: 0.75 };
  sim.world.step(intents, sim.dt); sim.t += sim.dt;
  const sep = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y);
  console.log(`tick ${k} | blk N ${f(e.hands?.normalForce)} ext ${f(pre.ext)} push ${f(pre.push)} ctl ${f(pre.ctl)} actor ${pre.actor} punch ${pre.st} | def N ${f(e.defHands?.normalForce)} | sep ${f(sep)} | rel v ${f(d.body.vel.x - b.body.vel.x)}`);
}
