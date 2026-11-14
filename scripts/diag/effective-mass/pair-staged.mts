// PAIR_HANDS staged pairs (attempt 1's first step; design note section 4). contactFixture's two bodies, the engagement's
// own hands law run each tick (syncJoints -> setHands -> punch; the World stepped after). Fits forced per scenario
// (inside / outside for each man), both directions (the mirror is the same staging with the side flipped).
//   - pass set: the blocker sets (holds his ground), the defender drives into him (a bull) for 0.6 s;
//   - drive block: the blocker drives the defender (run), the defender stacks;
//   - stalk: the defender crosses at 3 and 4 yd/s past a standing blocker;
//   - the hand-over: the total normal force across the gap (hands + torso) through the closing, per tick.
// Reported: separation (centre to centre) at 0.2 / 0.4 / 0.6 s, the joints' normal force and the torso's, the largest
// tick-to-tick change in the total (a spike or a dip), and for the stalk the joint life and the crosser's speed after.
// usage: PAIR_HANDS=1 node --import tsx scripts/diag/effective-mass/pair-staged.mts
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { syncJoints } = await import('../../../src/sim/engagement.js');
type Fit = 'inside' | 'outside';
function run(name: string, type: 'pass' | 'run', fitB: Fit, fitD: Fit, bv: { x: number; y: number }, dv: { x: number; y: number }, side = 1, secs = 0.6) {
  const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: type === 'pass' ? 'pass' : 'run', runBlock: 60, passBlock: 60, side });
  e.type = type;
  Object.assign(d.profile, structuredClone(b.profile));
  const R = b.profile.radius + d.profile.radius + 0.3;
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { ...dv }; d.body.facing = Math.PI;
  syncJoints(sim, e);
  if (e.hands) e.hands.fit = fitB; if (e.defHands) e.defHands.fit = fitD;
  const out: string[] = []; let prevTot: number | null = null, maxJump = 0, life = 0; const tot: number[] = [];
  for (let k = 0; k < Math.round(secs / sim.dt); k++) {
    syncJoints(sim, e);
    if (e.hands) e.hands.fit = fitB; if (e.defHands) e.defHands.fit = fitD;
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { ...bv }, facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), push: 1, posture: 0.75 };
    intents[d.idx] = { vel: { ...dv }, facing: Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x), push: 1, posture: 0.75 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
    const hN = Math.max(0, e.hands?.normalForce ?? 0) + Math.max(0, e.defHands?.normalForce ?? 0);
    const c = (sim.world.report?.contacts ?? []).find((c: any) => (c.i === b.idx && c.j === d.idx) || (c.i === d.idx && c.j === b.idx));
    const tN = c ? c.impulse / sim.dt : 0, total = hN + tN; tot.push(total);
    if (prevTot !== null) maxJump = Math.max(maxJump, Math.abs(total - prevTot));
    prevTot = total;
    const sep = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y);
    if (sep <= (e.hands?.extension ?? 0) + 0.15) life = (k + 1) * sim.dt;
    if ([4, 8, 12].includes(k + 1)) out.push(`${((k + 1) * sim.dt).toFixed(1)} s sep ${sep.toFixed(2)} hands ${hN.toFixed(0)} torso ${tN.toFixed(0)}`);
  }
  const v = Math.hypot(d.body.vel.x, d.body.vel.y);
  console.log(`${name.padEnd(60)} ${out.join(' | ')} | largest tick change in the total ${maxJump.toFixed(0)} N | joint life ${life.toFixed(2)} s | his speed after ${v.toFixed(2)}`);
}
for (const side of [1, -1]) {
  console.log(`== side ${side}`);
  for (const [fb, fd] of [['inside', 'outside'], ['outside', 'inside'], ['inside', 'inside'], ['outside', 'outside']] as [Fit, Fit][]) {
    run(`pass set, a bull: blocker ${fb}, rusher ${fd}`, 'pass', fb, fd, { x: 0, y: 0 }, { x: -3, y: 0 }, side);
    run(`drive block: blocker ${fb}, defender's stack ${fd}`, 'run', fb, fd, { x: 2, y: 0 }, { x: -1, y: 0 }, side);
  }
  for (const v of [3, 4]) run(`stalk: a crosser at ${v} yd/s (blocker inside)`, 'run', 'inside', 'outside', { x: 0, y: 0 }, { x: 0, y: v }, side, 0.5);
}
