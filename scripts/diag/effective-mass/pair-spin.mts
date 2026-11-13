/** Engaged-pair rotation bench (step 2 re-diagnosis). NFL solo OL-DL pairs turn a median 43 deg from 0.5 to 1.5 s
 * (trench2); ours turn 60, and Run Game's ablations put the excess in the pair's physics, not the OL's requests.
 * A matched OL and DL in latched hands (contactFixture, neutral control), head-up or offset, each pushing into the
 * other; the DL flows laterally at `dl` yd/s and the OL asks to go with him at `ol` yd/s (mirroring) or not. 1.0 s.
 * Reports how far the line from the OL to the DL turns, the separation, each man's lateral travel and facing change,
 * and the hand joint's tangential load against its limit. Settings at load: run per arm (e.g. HANDS_CHEST via
 * DIAG_HAND_PATCH=1 for the World's patch law).
 * usage: node --import tsx scripts/diag/effective-mass/pair-spin.mts */
import { contactFixture } from '../run-contact-technique.js';
const CENTER_Y = 26.65;
type Case = { name: string; dl: number; ol: number; off?: number; press?: number; drive?: number };
function run(c: Case) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, blocker: b, defender: d, engagement: e } = f;
  Object.assign(d.profile, structuredClone(b.profile));
  if (process.env.DIAG_HAND_PATCH === '1') (sim.world as any).handContact = 'patch';
  b.body.pos = { x: 40, y: CENTER_Y }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  const R = b.profile.radius + d.profile.radius + 0.1, o = c.off ?? 0;
  d.body.pos = { x: 40 + Math.sqrt(R * R - o * o), y: CENTER_Y + o }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  e.control = 0; const j: any = e.hands!;
  const ang = () => Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
  const a0 = ang(), y0 = { b: b.pos.y, d: d.pos.y }, f0 = { b: b.body.facing, d: d.body.facing };
  let tl = 0, n = 0;
  for (let k = 0; k < Math.round(1.0 / sim.dt); k++) {
    const intents: any[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: c.drive ?? 1, y: c.ol }, facing: 0, push: 1, posture: 0.85 };
    intents[d.idx] = { vel: { x: -(c.press ?? 1), y: c.dl }, facing: Math.PI, push: 1, posture: 0.85 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
    tl += Math.abs(j.tangentForce ?? j.lt ?? 0); n++;
  }
  const turn = Math.abs(Math.atan2(Math.sin(ang() - a0), Math.cos(ang() - a0))) * 180 / Math.PI;
  console.log(`  ${c.name.padEnd(44)} | line turned ${turn.toFixed(0).padStart(3)} deg | sep ${Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y).toFixed(2)} | lateral OL ${(b.pos.y - y0.b).toFixed(2)} DL ${(d.pos.y - y0.d).toFixed(2)} yd | facing change OL ${((b.body.facing - f0.b) * 180 / Math.PI).toFixed(0)} DL ${((d.body.facing - f0.d) * 180 / Math.PI).toFixed(0)} deg | ${b.body.support?.state}/${d.body.support?.state}`);
}
console.log(`matched OL-DL in latched hands, each pushing into the other, 1.0 s; patch ${process.env.DIAG_HAND_PATCH === '1' ? 'on' : 'off'}`);
for (const c of [
  { name: 'head-up, no flow', dl: 0, ol: 0 },
  { name: 'DL flows 2.5, OL mirrors 2.5', dl: 2.5, ol: 2.5 },
  { name: 'DL flows 2.5, OL mirrors 2.0', dl: 2.5, ol: 2.0 },
  { name: 'DL flows 2.5, OL does not mirror', dl: 2.5, ol: 0 },
  { name: 'DL flows 4.0, OL mirrors 4.0', dl: 4.0, ol: 4.0 },
  { name: 'offset 0.2, DL flows 2.5, OL mirrors 2.5', dl: 2.5, ol: 2.5, off: 0.2 },
  { name: 'offset 0.2, no flow', dl: 0, ol: 0, off: 0.2 },
] as Case[]) run(c);
