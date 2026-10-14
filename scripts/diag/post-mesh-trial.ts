/** Diagnostic-only coordination trial. Never installed by production PlaySim.
 * Question: does the call's nominal mesh-to-aim track supply useful advance
 * spacing, while acquired evidence still overrides it? No live execution input.
 */
import { RunnerToMesh } from '../../src/sim/assign.js';
import type { Agent } from '../../src/sim/agent.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { InstalledTeammateExpectation, TeammatePicture } from '../../src/sim/teammate-information.js';

export function installPostMeshTrial(sim: PlaySim): Map<number, InstalledTeammateExpectation> {
  const calls = new Map<number, InstalledTeammateExpectation>();
  if (sim.offCall.run?.scheme !== 'wideZone') return calls;
  for (const a of sim.offense) {
    const job = a.behavior;
    if (!(job instanceof RunnerToMesh) || !job.ride || job.meshTime <= 0) continue;
    const dx = job.aim.x - job.mesh.x, dy = job.aim.y - job.mesh.y;
    const distance = Math.hypot(dx, dy), speed = a.profile.vmax * .55;
    if (distance <= 1e-9 || speed <= 0) continue;
    calls.set(a.idx, { origin: { ...job.mesh }, velocity: { x: dx / distance * speed, y: dy / distance * speed },
      startsAt: job.meshTime, until: job.meshTime + distance / speed,
      label: 'trial installed nominal post-mesh track' });
  }
  return calls;
}

/** Copy at installation. Neither values nor availability read private motion.
 * Keep tactile/observed/remembered and existing call priority unchanged.
 */
export function postMeshFallback(calls: ReadonlyMap<number, InstalledTeammateExpectation>,
  acquired: (observer: Agent, target: Agent) => TeammatePicture,
  clock: () => number): (observer: Agent, target: Agent) => TeammatePicture {
  const installed = new Map([...calls].map(([idx, call]) => [idx,
    { ...call, origin: { ...call.origin }, velocity: { ...call.velocity } }]));
  return (observer, target) => {
    const picture = acquired(observer, target), call = installed.get(target.idx), now = clock();
    if (picture.source !== 'unavailable' || observer === target || observer.team !== target.team
      || !call || now < call.startsAt - 1e-9 || now > call.until + 1e-9) return picture;
    const age = Math.max(0, Math.min(now, call.until) - call.startsAt);
    return { source: 'called', pos: { x: call.origin.x + call.velocity.x * age,
      y: call.origin.y + call.velocity.y * age }, vel: { ...call.velocity }, sampledAt: call.startsAt,
      availableAt: call.startsAt, age, predictedFor: age, label: call.label };
  };
}
