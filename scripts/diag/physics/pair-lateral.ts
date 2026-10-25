/** Can two engaged bodies that both want to go sideways actually go?
 * Identical bodies, production hand joint and World; both players' requests
 * are scripted (controllers do not choose), so the result is physics only.
 * node --import tsx scripts/diag/physics/pair-lateral.ts
 */
import type { Intent } from '../../../src/physics/world.js';
import { contactCommands, contactFixture } from '../run-contact-technique.js';

type Arm = { name: string; engaged: boolean; hands?: boolean; bFace: number; dFace: number; bV: number; dV: number; bX?: number; dX?: number };
const deg = Math.PI / 180;
const SERIES = process.env.SERIES === '1';
function run(arm: Arm, v: number) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11 });
  const { sim, blocker: B, defender: D, engagement: e } = f;
  Object.assign(D.profile, structuredClone(B.profile));
  e.nextMoveAt = Infinity;
  D.body.vel = { x: 0, y: 0 };
  if (!arm.engaged) { sim.disengage(e); D.body.pos = { x: B.pos.x + 3, y: B.pos.y }; }
  if (arm.engaged && arm.hands === false) sim.world.joints = sim.world.joints.filter((j) => j.kind !== 'hands');
  B.body.facing = arm.bFace; D.body.facing = arm.dFace;
  const samples: { b: number; d: number; sep: number }[] = [];
  let lost = -1;
  const series: string[] = [];
  for (let k = 0; k < 40; k++) {
    const intents: Intent[] = arm.engaged && arm.hands !== false && B.engagement ? contactCommands(f)
      : sim.agents.map((a) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    if (arm.engaged && !B.engagement && lost < 0) lost = sim.t - 1;
    intents[B.idx] = { vel: { x: arm.bX ?? 0, y: arm.bV * v }, facing: arm.bFace, push: 1, posture: .85 };
    intents[D.idx] = { vel: { x: arm.dX ?? 0, y: arm.dV * v }, facing: arm.dFace, push: 1, posture: .85 };
    sim.world.step(intents, sim.dt);
    sim.t += sim.dt; sim.world.time = sim.t;
    sim.perception.record(sim.agents);
    if (SERIES && k % 2 === 1) series.push(`${(sim.t).toFixed(2)}:${B.vel.y.toFixed(2)}/${D.vel.y.toFixed(2)}`);
    if (k >= 10 && k < 30) samples.push({ b: B.vel.y, d: D.vel.y, sep: Math.hypot(B.pos.x - D.pos.x, B.pos.y - D.pos.y) });
  }
  const m = (g: (s: typeof samples[0]) => number) => samples.reduce((a, s) => a + g(s), 0) / samples.length;
  if (SERIES) console.log(`    ${arm.name}: ${series.join(' ')}`);
  return { b: m((s) => s.b), d: m((s) => s.d), sep: m((s) => s.sep), lost, facing: [B.facing / deg, D.facing / deg] };
}
const arms: Arm[] = [
  { name: 'free, apart, squared (facing downfield)', engaged: false, bFace: 0, dFace: Math.PI, bV: 1, dV: 1 },
  { name: 'free, apart, hips open 45', engaged: false, bFace: 45 * deg, dFace: 135 * deg, bV: 1, dV: 1 },
  { name: 'free, apart, running (facing the motion)', engaged: false, bFace: 90 * deg, dFace: 90 * deg, bV: 1, dV: 1 },
  { name: 'engaged, squared, both request it', engaged: true, bFace: 0, dFace: Math.PI, bV: 1, dV: 1 },
  { name: 'engaged, hips open 45, both request it', engaged: true, bFace: 45 * deg, dFace: 135 * deg, bV: 1, dV: 1 },
  { name: 'engaged, torso contact only (no hands)', engaged: true, hands: false, bFace: 0, dFace: Math.PI, bV: 1, dV: 1 },
  { name: 'engaged, squared, both lean in (B x+0.5, D x-1.5)', engaged: true, bFace: 0, dFace: Math.PI, bV: 1, dV: 1, bX: .5, dX: -1.5 },
  { name: 'engaged, squared, defender stands', engaged: true, bFace: 0, dFace: Math.PI, bV: 1, dV: 0 },
  { name: 'engaged, squared, blocker stands', engaged: true, bFace: 0, dFace: Math.PI, bV: 0, dV: 1 },
];
for (const v of [2, 3, 4]) {
  console.log(`\nrequested lateral ${v} yd/s (achieved mean 0.5-1.5 s)`);
  for (const arm of arms) {
    const r = run(arm, v);
    console.log(`  ${arm.name.padEnd(44)} blocker ${r.b.toFixed(2).padStart(5)}  defender ${r.d.toFixed(2).padStart(5)}  sep ${r.sep.toFixed(2)}${r.lost >= 0 ? `  rep ended ${r.lost.toFixed(2)} s` : ''}  facing ${r.facing.map((x) => x.toFixed(0)).join('/')}`);
  }
}
