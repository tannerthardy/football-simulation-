import { supportParams } from '../../../src/physics/support.js';
import type { Intent } from '../../../src/physics/world.js';
import { updateEngagements } from '../../../src/sim/engagement.js';
import { contactFixture } from '../run-contact-technique.js';
const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11 });
const { sim, blocker: B, defender: D, engagement: e } = f;
e.nextMoveAt = Infinity; Object.assign(D.profile, structuredClone(B.profile));
const W: any = sim.world, tr = supportParams(B.profile).traction;
for (let k = 0; k < 40; k++) {
  const intents: Intent[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  if (B.engagement) updateEngagements(sim, intents);
  intents[D.idx] = { vel: { x: -3, y: 0 }, facing: Math.PI, push: 1, posture: .85 };
  const toD = Math.atan2(D.pos.y - B.pos.y, D.pos.x - B.pos.x);
  intents[B.idx] = { vel: { x: 3 * Math.cos(toD), y: 3 * Math.sin(toD) }, facing: toD, push: 1, posture: .85 };
  const r = sim.world.step(intents, sim.dt);
  if (k % 4 === 3) {
    const gb = r.groundImpulse[B.idx].x / sim.dt / tr, gd = r.groundImpulse[D.idx].x / sim.dt / tr;
    console.log(`t=${(k*.05+.05).toFixed(2)} Bx ${(B.pos.x-40).toFixed(2)} vB ${B.vel.x.toFixed(2)} vD ${D.vel.x.toFixed(2)} | ground x / traction: B ${gb.toFixed(2)} D ${gd.toFixed(2)} | avail B ${W.alpha[B.idx].toFixed(2)} D ${W.alpha[D.idx].toFixed(2)} | posture B ${B.body.support!.posture.toFixed(2)} D ${D.body.support!.posture.toFixed(2)} | xi B ${B.body.support!.xi.x.toFixed(2)} D ${D.body.support!.xi.x.toFixed(2)} | facing B ${B.facing.toFixed(2)} D ${D.facing.toFixed(2)} | hands actor ${e.hands?.actor === B.body ? 'B' : 'D'} normal ${(e.hands?.normalForce ?? 0).toFixed(0)}`);
  }
  sim.t += sim.dt; sim.world.time = sim.t; sim.perception.record(sim.agents);
}
