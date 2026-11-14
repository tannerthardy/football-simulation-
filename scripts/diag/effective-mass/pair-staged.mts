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
function run(name: string, type: 'pass' | 'run', fitB: Fit, fitD: Fit, bv: { x: number; y: number }, dv: { x: number; y: number }, side = 1, secs = 0.6, gap0 = 0.3, dMass = 0, move?: string, bMass = 0) {
  const { sim, blocker: b, defender: d, engagement: e0 } = contactFixture({ type: type === 'pass' ? 'pass' : 'run', runBlock: 60, passBlock: 60, side });
  const e: any = e0;
  e.type = type;
  Object.assign(d.profile, structuredClone(b.profile));
  if (dMass) d.profile.massKg = dMass;
  if (bMass) b.profile.massKg = bMass;
  const R = b.profile.radius + d.profile.radius + gap0;
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { ...dv }; d.body.facing = Math.PI;
  if (move) e.move = move as any;
  // A fresh hands joint after the bodies are placed (the fixture's was set up at its own positions).
  e.hands = undefined; e.defHands = undefined;
  syncJoints(sim, e);
  if (e.hands) e.hands.fit = fitB; if (e.defHands) e.defHands.fit = fitD;
  const fb0 = b.body.facing, fd0 = d.body.facing, dy0 = d.body.pos.y;
  const out: string[] = []; let prevTot: number | null = null, maxJump = 0, life = 0, overJump = 0, torsoOn = false, minSep = Infinity; const tot: number[] = [];
  for (let k = 0; k < Math.round(secs / sim.dt); k++) {
    if (move) e.move = move as any;
    syncJoints(sim, e);
    if (e.hands) e.hands.fit = fitB; if (e.defHands) e.defHands.fit = fitD;
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { ...bv }, facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), push: 1, posture: 0.75 };
    intents[d.idx] = { vel: { ...dv }, facing: Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x), push: 1, posture: 0.75 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
    const hN = Math.max(0, e.hands?.normalForce ?? 0) + Math.max(0, e.defHands?.normalForce ?? 0);
    const c = ((sim.world as any).report?.contacts ?? []).find((c: any) => (c.i === b.idx && c.j === d.idx) || (c.i === d.idx && c.j === b.idx));
    const tN = c ? c.impulse / sim.dt : 0, total = hN + tN; tot.push(total);
    if (prevTot !== null) { maxJump = Math.max(maxJump, Math.abs(total - prevTot)); if (torsoOn || tN > 0) overJump = Math.max(overJump, Math.abs(total - prevTot)); }
    if (tN > 0) torsoOn = true;
    prevTot = total;
    const sep = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y); minSep = Math.min(minSep, sep);
    if (sep <= (e.hands?.extension ?? 0) + 0.15) life = (k + 1) * sim.dt;
    if ([4, 8, 12].includes(k + 1)) out.push(`${((k + 1) * sim.dt).toFixed(1)} s sep ${sep.toFixed(2)} hands ${hN.toFixed(0)} torso ${tN.toFixed(0)}`);
  }
  const v = Math.hypot(d.body.vel.x, d.body.vel.y);
  const turn = (f1: number, f0: number) => (Math.atan2(Math.sin(f1 - f0), Math.cos(f1 - f0)) * 180 / Math.PI).toFixed(0);
  out.push(`turned: defender ${turn(d.body.facing, fd0)} deg, blocker ${turn(b.body.facing, fb0)} deg; defender lateral ${(d.body.pos.y - dy0).toFixed(2)} yd`);
  console.log(`${name.padEnd(60)} ${out.join(' | ')} | largest tick change in the total ${maxJump.toFixed(0)} N, in the hand-over ${torsoOn ? overJump.toFixed(0) + ' N' : 'not reached'} | closest ${minSep.toFixed(2)} (bodies ${(b.profile.radius + d.profile.radius).toFixed(2)}) | joint life ${life.toFixed(2)} s | his speed after ${v.toFixed(2)}`);
}
for (const side of [1, -1]) {
  console.log(`== side ${side}`);
  for (const [fb, fd] of [['inside', 'outside'], ['outside', 'inside'], ['inside', 'inside'], ['outside', 'outside']] as [Fit, Fit][]) {
    run(`pass set, a bull: blocker ${fb}, rusher ${fd}`, 'pass', fb, fd, { x: 0, y: 0 }, { x: -3, y: 0 }, side);
    run(`drive block: blocker ${fb}, defender's stack ${fd}`, 'run', fb, fd, { x: 2, y: 0 }, { x: -1, y: 0 }, side);
  }
  for (const fb of ['outside', 'inside'] as Fit[]) run(`turn: a rusher crossing upfield past him, blocker ${fb}`, 'pass', fb, 'outside', { x: 0, y: 0 }, { x: -1.5, y: 2.5 }, side, 0.6, 0.3, 0, 'speed');
  for (const fd of ['outside', 'inside'] as Fit[]) run(`turn: a power rusher, his hand ${fd} on the blocker`, 'pass', 'inside', fd, { x: 0, y: 0 }, { x: -2, y: 0.5 }, side, 0.6, 0.3, 0, 'bull');
  for (const fd of ['inside', 'outside'] as Fit[]) run(`gap: a reach block on a run defender, his stack ${fd}`, 'run', 'outside', fd, { x: 0.5, y: 2 }, { x: -0.5, y: 0 }, side, 0.6);
  run('hand-over forced: a 150 kg man driving a 90 kg one (run), both inside', 'run', 'inside', 'inside', { x: -0.5, y: 0 }, { x: -3, y: 0 }, side, 0.8, 0.05, 150, undefined, 90);
  run('hand-over forced: a 150 kg bull on a 90 kg pass-setter, both inside', 'pass', 'inside', 'inside', { x: 0, y: 0 }, { x: -3, y: 0 }, side, 0.8, 0.1, 150, 'bull', 90);
  run('hand-over: a heavy bull (150 kg) at 3 yd/s, blocker outside', 'pass', 'outside', 'inside', { x: 0, y: 0 }, { x: -3, y: 0 }, side, 0.8, 0.3, 150);
  run('hand-over: a drive started inside the base, both inside', 'run', 'inside', 'inside', { x: 1, y: 0 }, { x: -1.5, y: 0 }, side, 0.6, 0.05);
  for (const v of [3, 4]) for (const fb of ['inside', 'outside'] as Fit[]) run(`stalk: a crosser at ${v} yd/s (blocker ${fb})`, 'run', fb, 'outside', { x: 0, y: 0 }, { x: 0, y: v }, side, 0.5);
}
