/** Controlled 1v1 bull-rush panel on the shared World.
 *
 * One engaged run rep (real hands, bodies and contact), with the defender
 * requesting a straight bull rush through the blocker for 2 s. The blocker's
 * response, the bodies and fatigue vary. Measures how far the blocker is
 * driven, the effort each spends, and which limit binds. Requests are set
 * directly so the panel tests physics, not the football controllers (except
 * the 'native' arm, which uses the ordinary engaged run-block request).
 *
 * node --import tsx scripts/diag/runblock/bullrush-panel.ts
 */
import { supportParams } from '../../../src/physics/support.js';
import type { Intent } from '../../../src/physics/world.js';
import { updateEngagements } from '../../../src/sim/engagement.js';
import { contactFixture } from '../run-contact-technique.js';

export type Brace = 'native' | 'brace' | 'brace3' | 'drive45' | 'passive';
export interface Arm { brace: Brace; dPosture?: number; bPosture?: number; strength?: number; massScale?: number; energy?: number; blockerEnergy?: number; same?: boolean }

export function run(arm: Arm, seconds = 2) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11 });
  const { sim, blocker: B, defender: D, engagement: e } = f;
  e.nextMoveAt = Infinity; // no rated shed attempts: physics only
  D.recog!.read = 'run';
  if (arm.same) {
    // Identical bodies, so any drive comes from the requests alone.
    Object.assign(D.profile, structuredClone(B.profile));
  }
  if (arm.massScale) { D.profile.massKg *= arm.massScale; D.profile.power *= arm.massScale; }
  if (arm.strength !== undefined) D.profile.power = D.profile.massKg * (0.55 + 0.75 * arm.strength);
  D.body.energy = arm.energy ?? 1;
  B.body.energy = arm.blockerEnergy ?? 1;
  const x0 = B.pos.x, e0 = { b: B.body.energy, d: D.body.energy };
  let limit = { traction: 0, strength: 0, n: 0 };
  for (let k = 0; k < Math.round(seconds / sim.dt); k++) {
    const intents: Intent[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    if (B.engagement) updateEngagements(sim, intents); // keeps native hands; may end the rep
    // Defender: bull rush straight through, toward the offense's backfield.
    intents[D.idx] = { vel: { x: -3, y: 0 }, facing: Math.PI, push: 1, posture: arm.dPosture ?? .85 };
    const toD = Math.atan2(D.pos.y - B.pos.y, D.pos.x - B.pos.x);
    if (arm.brace === 'brace3') intents[B.idx] = { vel: { x: 3 * Math.cos(toD), y: 3 * Math.sin(toD) }, facing: toD, push: 1, posture: arm.bPosture ?? .85 };
    else if (arm.brace === 'brace') intents[B.idx] = { vel: { x: Math.cos(toD), y: Math.sin(toD) }, facing: toD, push: 1, posture: .85 };
    else if (arm.brace === 'drive45') intents[B.idx] = { vel: { x: 2.4 * Math.SQRT1_2, y: 2.4 * Math.SQRT1_2 }, facing: 0, push: 1, posture: .85 };
    else if (arm.brace === 'passive') intents[B.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 0, posture: .85 };
    const report = sim.world.step(intents, sim.dt);
    const g = Math.hypot(report.groundImpulse[D.idx].x, report.groundImpulse[D.idx].y) / sim.dt;
    const sp = supportParams(D.profile);
    limit.traction += g >= .98 * sp.traction ? 1 : 0; limit.strength += g >= .98 * sp.pushForce ? 1 : 0; limit.n++;
    sim.t += sim.dt; sim.world.time = sim.t;
    sim.perception.record(sim.agents);
  }
  return {
    driven: x0 - B.pos.x, speed: -B.vel.x, engaged: !!B.engagement,
    dEnergy: e0.d - D.body.energy, bEnergy: e0.b - B.body.energy,
    dTractionBound: limit.traction / limit.n, dStrengthBound: limit.strength / limit.n,
    mass: { b: B.profile.massKg, d: D.profile.massKg },
    push: { b: supportParams(B.profile).pushForce / (B.profile.massKg * 9.81 * 1.0936), d: supportParams(D.profile).pushForce / (D.profile.massKg * 9.81 * 1.0936) },
  };
}

function main() {
  const arms: Array<[string, Arm]> = [
    ['identical bodies, blocker braces', { brace: 'brace', same: true }],
    ['identical bodies, blocker braces at full effort', { brace: 'brace3', same: true }],
    ['identical bodies, full brace, DL strength 0.9', { brace: 'brace3', same: true, strength: .9 }],
    ['identical bodies, full brace, tired DL 0.3', { brace: 'brace3', same: true, energy: .3 }],
    ['identical bodies, full brace, DL 15% heavier', { brace: 'brace3', same: true, massScale: 1.15 }],
    ['identical, full brace, OL stands up (posture .4)', { brace: 'brace3', same: true, bPosture: .4 }],
    ['identical, full brace, DL stands up (posture .4)', { brace: 'brace3', same: true, dPosture: .4 }],
    ['15% heavier DL, but DL stands up (.4)', { brace: 'brace3', same: true, massScale: 1.15, dPosture: .4 }],
    ['identical, full brace, tired OL (energy .3)', { brace: 'brace3', same: true, blockerEnergy: .3 }],
    ['identical bodies, native run-block request', { brace: 'native', same: true }],
    ['identical bodies, blocker drives a 45-degree line', { brace: 'drive45', same: true }],
    ['identical bodies, blocker passive', { brace: 'passive', same: true }],
    ['native rosters (C vs DT), braces', { brace: 'brace' }],
    ['native rosters, native request', { brace: 'native' }],
    ['native rosters, 45-degree drive', { brace: 'drive45' }],
    ['DL strength 0.9 vs braced OL', { brace: 'brace', same: true, strength: .9 }],
    ['DL strength 0.3 vs braced OL', { brace: 'brace', same: true, strength: .3 }],
    ['DL 15% heavier vs braced OL', { brace: 'brace', same: true, massScale: 1.15 }],
    ['tired DL (energy 0.3) vs braced OL', { brace: 'brace', same: true, energy: .3 }],
    ['tired OL (energy 0.3) braces', { brace: 'brace', same: true, blockerEnergy: .3 }],
  ];
  console.log('arm | blocker driven back in 2 s (yd) | blocker speed at 2 s | still engaged | DL energy spent | OL energy spent | DL at traction / strength limit');
  for (const [name, arm] of arms) {
    const r = run(arm);
    console.log(`${name.padEnd(48)} ${r.driven.toFixed(2).padStart(6)} ${r.speed.toFixed(2).padStart(6)} ${String(r.engaged).padStart(6)}  ${r.dEnergy.toFixed(3)} ${r.bEnergy.toFixed(3)}  ${r.dTractionBound.toFixed(2)}/${r.dStrengthBound.toFixed(2)}  push/bodyweight OL ${r.push.b.toFixed(2)} DL ${r.push.d.toFixed(2)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
