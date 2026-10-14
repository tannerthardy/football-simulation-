/** Copy public installation once. Never ask a live controller what it is doing. */
import { RunBlocker, playSideSign } from './behaviors/blocking.js';
import { RunnerToMesh } from './assign.js';
import type { PlaySim } from './playsim.js';
import { TEAMMATE_INFORMATION_LIMITS, type InstalledTeammateExpectation } from './teammate-information.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { newSupport } from '../physics/support.js';
import type { Body } from '../physics/kinematics.js';

export function installTeammateExpectations(sim: PlaySim): Map<number, InstalledTeammateExpectation> {
  const calls = new Map<number, InstalledTeammateExpectation>();
  const run = sim.offCall.run;
  // Players know installed alignment landmarks before the snap, even where
  // their first post-snap visual picture has not arrived. This is a bounded
  // expectation, not a fabricated sighting or a claim the teammate stayed put.
  // In particular defensive scatter/late staging is not copied from reality.
  for (const a of sim.agents) {
    const spots = a.team === 'O' ? sim.offAlign.spots : sim.defAlign.spots;
    const origin = (spots as Record<string, { pos: { x: number; y: number } } | undefined>)[a.slot]?.pos;
    if (origin) calls.set(a.idx, { origin: { ...origin }, velocity: { x: 0, y: 0 },
      startsAt: 0, until: TEAMMATE_INFORMATION_LIMITS.alignmentExpectation, label: 'installed alignment landmark' });
  }
  for (const a of sim.offense) {
    const origin = sim.offAlign.spots[a.slot as keyof typeof sim.offAlign.spots]?.pos;
    if (!origin) continue;
    const job = a.behavior;
    if (run && process.env.ZONE_FLOW !== '0' && job instanceof RunBlocker
      && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)
      && ['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)
      && ['drive', 'reach', 'cutoff', 'combo'].includes(job.plan.kind)) {
      const press = run.scheme === 'insideZone' || run.scheme === 'splitZone' ? .55 : 1;
      const velocity = { x: 0, y: playSideSign(sim, run) * a.profile.vmax * .45 * press };
      // Nominal public snap conditions, not the teammate's private live body,
      // fatigue, reaction delay, support, engagement or next controller branch.
      const nominal: Body = { pos: { ...origin }, vel: { x: 0, y: 0 }, facing: 0,
        energy: 1, profile: { ...a.profile }, support: newSupport(.7) };
      const trajectory = [{ at: 0, pos: { ...origin }, vel: { x: 0, y: 0 } },
        ...previewFreeMovement(nominal, { vel: velocity, posture: .7 }, 0,
          Math.round(TEAMMATE_INFORMATION_LIMITS.zoneExpectation / sim.dt))
          .map(s => ({ at: s.t, pos: { ...s.pos }, vel: { ...s.vel } }))];
      calls.set(a.idx, { origin: { ...origin }, velocity, trajectory,
        startsAt: 0, until: TEAMMATE_INFORMATION_LIMITS.zoneExpectation, label: 'installed nominal zone track' });
    } else if (job instanceof RunnerToMesh && job.meshTime > 0) {
      const dx = job.mesh.x - origin.x, dy = job.mesh.y - origin.y;
      const scale = Math.min(1, a.profile.vmax * job.meshTime / Math.max(1e-9, Math.hypot(dx, dy)));
      calls.set(a.idx, { origin: { ...origin }, velocity: { x: dx / job.meshTime * scale, y: dy / job.meshTime * scale },
        startsAt: 0, until: job.meshTime, label: 'installed approximate mesh arrival' });
    }
  }
  return calls;
}
