/** Copy public installation once. Never ask a live controller what it is doing. */
import { RunBlocker, playSideSign } from './behaviors/blocking.js';
import { RunnerToMesh } from './assign.js';
import type { PlaySim } from './playsim.js';
import { TEAMMATE_INFORMATION_LIMITS, type InstalledTeammateExpectation } from './teammate-information.js';

export function installTeammateExpectations(sim: PlaySim): Map<number, InstalledTeammateExpectation> {
  const calls = new Map<number, InstalledTeammateExpectation>();
  const run = sim.offCall.run;
  for (const a of sim.offense) {
    const origin = sim.offAlign.spots[a.slot as keyof typeof sim.offAlign.spots]?.pos;
    if (!origin) continue;
    const job = a.behavior;
    if (run && process.env.ZONE_FLOW !== '0' && job instanceof RunBlocker
      && ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)
      && ['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)
      && ['drive', 'reach', 'cutoff', 'combo'].includes(job.plan.kind)) {
      const press = run.scheme === 'insideZone' || run.scheme === 'splitZone' ? .55 : 1;
      calls.set(a.idx, { origin: { ...origin }, velocity: { x: 0, y: playSideSign(sim, run) * a.profile.vmax * .45 * press },
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
