import { calledDrop } from './qbv2/call.js';
import type { DropType } from '../playbook/types.js';
import type { PlaySim } from './playsim.js';
import { GUN_SNAP, snapSecured } from './ball-transfer.js';

/** PA_DROP (on; PA_DROP=0 restores one drop for both alignments). Also read in qb.ts and assign.ts. */
const PA_DROP = process.env.PA_DROP !== '0';

/** CONCEPT_DROPS (experimental, off; CONCEPT_DROPS=1; Rules+Coaching mark the concepts in concepts.ts, the QB lane
 * owns this depth and time): the five-step class is the NFL's deeper drop, not the same set as 'gun5'. Measured on
 * tracking by scripts/diag/escape/drop-time.py (BDB 2025, finished non-designed drops): from the gun 28% of drops set
 * 3.5-5 yd behind the snap spot, ending at 2.2 s (p25-75 2.0-2.4), the ball out at 3.0; under center 46% set 6.5-8.5
 * yd behind it, ending at 2.4 s (2.3-2.6), the ball out at 3.5. Ours set 3.4 yd (gun, 68% of drops in the 2-3.5 bin)
 * and 6.4 yd (under center) on every five-step call. Depths are the middle of those NFL bins from our snap spots
 * (4.6 yd behind the line in the gun, 1.6 under center); `time` is the measured end less the 0.4 s by which our
 * measured end trails the spec's time on the existing drops (1.4 -> 1.8 s gun, 1.8 -> 2.2 s under center). */
const CONCEPT_DROPS = process.env.CONCEPT_DROPS !== '0';
const FIVE_GUN = (los: number) => ({ x: los - 8.8, time: 1.8 });
const FIVE_UNDER = (los: number) => ({ x: los - 8.9, time: 2.0 });
/** QB_QUICK_DRIFT (QB lane; 3 since engine-108, QB_QUICK_DRIFT=0 restores; bits: 1 = the drift's shape, 2 = V2 reads from the secure, the set is the throwing step,
 * read in qb.ts): the gun quick game is a short slow drift, not a two-yard step. Measured, not taught (Rules' qb_plant.py on
 * rules/route-chart d20d02418, 2022 BDB non-PA quick/flat throws released under 2.0 s, gun, n 437): he retreats 1.57 yd
 * (p25-75 1.14-2.03) from his snap depth at a peak of 1.65 yd/s and sets 1.60 s after the snap (1.50-1.70), the set being
 * the throwing step 0.2 s before the release; ours retreated 2.5 yd at 3.15 yd/s. 1.6 yd over 1.1 s from the secure
 * (0.49 s): the measured set less the secure. Under center unchanged. */
export const QB_QUICK_DRIFT = Number(process.env.QB_QUICK_DRIFT ?? 3) | 0;
const QUICK_DRIFT_YD = 1.6, QUICK_DRIFT_S = 1.1;

/** Where and when the called drop puts the QB (los-relative x, seconds). */
/** `screen`: a screen is thrown off the catch, not from a dropback, so QB_QUICK_DRIFT's shape (measured on quick and
 * flat throws from a dropback) does not apply to it; its quick drop stays the two-yard step (with the drift on, the now
 * and bunch screens left 0.3 s later and the tunnel's yards fell 10.3 -> 3.1 on the screen-lab panel). */
export function dropSpec(drop: DropType, qbStartX: number, los: number, gun: boolean, screen = false): { x: number; time: number } {
  switch (drop) {
    // Depths at the throw match tracking (median 7.9 yd behind the line).
    case 'quick':
      // From the line (the gun snap spot 4.6 yd behind it), not qbStartX: the linemen ask with his live spot.
      if (gun && !screen && (QB_QUICK_DRIFT & 1)) return { x: los - 4.6 - QUICK_DRIFT_YD, time: QUICK_DRIFT_S };
      return gun ? { x: los - 6.6, time: 0.75 } : { x: los - 5.0, time: 1.05 };
    case 'gun3':
      return gun ? { x: los - 7.3, time: 1.0 } : { x: los - 6.2, time: 1.3 };
    case 'gun5':
      return gun ? { x: los - 8.0, time: 1.4 } : { x: los - 8.0, time: 1.75 };
    case 'five':
      // CONCEPT_DROPS: the deeper set (FIVE_GUN, FIVE_UNDER), measured.
      if (CONCEPT_DROPS) return gun ? FIVE_GUN(los) : FIVE_UNDER(los);
      return { x: los - 8.0, time: gun ? 1.4 : 1.8 };
    case 'seven':
      return { x: los - 9.5, time: gun ? 1.8 : 2.3 };
    case 'pa':
    case 'boot':
      // PA_DROP: play action by alignment, from tracking (BDB 2025 traditional drop-backs with play action, weeks 1-3,
      // nfl_pa_drop.py): from the gun a mesh and a shallow set (deepest 6.0 yd behind the snap at 2.1 s, the pass at
      // 2.3 s); under center the fake and the full drop (8.1 yd at 2.6 s, the pass at 3.2 s). Off: one drop for both.
      if (PA_DROP) return gun ? { x: los - 6.0, time: 1.8 } : { x: los - 8.1, time: 2.1 };
      return { x: los - 8.3, time: 1.95 };
  }
  // His start is not read: every depth is from the line. (Callers pass his snap alignment, a fact of the call, never his
  // live spot, which the information guard counts as a true-state read.)
  void qbStartX;
}

/** The launch point every lineman knows from the call: the depth of the called
 * drop (null when the call has no pass concept). Not the QB's live spot. */
export function calledLaunchX(sim: PlaySim): number | null {
  const concept = sim.offCall.pass;
  if (!concept) return null;
  // The drop the call runs (calledDrop: V2's plan drop on a call V2 takes), the one his feet take.
  return dropSpec(calledDrop(concept), sim.snapX[sim.qb.idx] ?? sim.los, sim.los, sim.offCall.formation.qb !== 'under', concept.family === 'screen').x;
}

/** When the quarterback has the ball and starts his drop (s after the snap), from the call: from the gun, when the
 * snap is secured at his alignment (GUN_SNAP; off, 0.3 s); under center, 0.1 s. The QB's own drop clock reads this. */
export function plannedSnapAt(gun: boolean, qbSnap: { x: number; y: number }, ballSpot: { x: number; y: number }): number {
  return gun ? (GUN_SNAP ? snapSecured(qbSnap, ballSpot) : 0.3) : 0.1;
}

/** The quarterback's planned depth (field x) at t seconds after the snap for the called drop: what a lineman knows of
 * the drop from practice, never the live QB. At his snap spot until he has the ball, then even over the drop's time to
 * the set point (dropSpec, under the running flags: CONCEPT_DROPS, PA_DROP), then there. This is the QB's own plan: his
 * drop is timed to arrive at the set point at snap + the drop's time (QB_FOOTWORK bit 2 paces it evenly, the distance
 * left over the time left; without it he may get there sooner), and his hitches re-set his base at that depth (bit 1)
 * without moving it. Monotone in t. Play action's fake (a mesh, then the drop) is not modelled within the window. */
export function plannedDropX(drop: DropType, gun: boolean, qbSnap: { x: number; y: number }, ballSpot: { x: number; y: number }, t: number, screen = false): number {
  const los = ballSpot.x, spec = dropSpec(drop, qbSnap.x, los, gun, screen), t0 = plannedSnapAt(gun, qbSnap, ballSpot);
  const f = Math.min(1, Math.max(0, (t - t0) / Math.max(spec.time, 0.1)));
  return qbSnap.x + (spec.x - qbSnap.x) * f;
}

/** When the play-action fake ends (s after the snap), from the call: what the back, the QB and the line's run look
 * share (Flex's PA_HINGE reads it). QB_FOOTWORK bit 16 holds it to the measured mesh plus half its ride (BDB 2025 play
 * action, scripts/diag/eyes/nfl_pa_ride.py: gun mesh at 1.2 s after the snap, ridden 0.5 s; under center at 1.4 s,
 * ridden 0.2 s); off, 0.7 s. */
const FW_PA_FAKE = (Number(process.env.QB_FOOTWORK ?? 3) & 16) !== 0;
export function plannedFakeEnd(gun: boolean): number {
  return FW_PA_FAKE ? (gun ? 1.2 + 0.25 : 1.4 + 0.1) : 0.7;
}
