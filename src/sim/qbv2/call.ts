/** Which calls QB_V2 takes, and the drop a call runs: one source for the passer, the line and the scorecard. */
import { planFor } from '../../playbook/read-plans.js';
import type { DropType, PassConcept } from '../../playbook/types.js';

/** QB_V2 (on since engine-107; QB_V2=0 restores; QB lane, 2026-11-24, docs/reviews/2026-11-24-qb-decision-plan.md): on a
 * concept with an authored read plan for the call (planFor), the read and throw decision is the rebuilt cycle
 * (src/sim/qbv2/): the look, the judgment, the cycle on his feet. The drop, pocket movement and the throw's mechanics are
 * kept. Other concepts run the old controller unchanged. */
export const QB_V2 = process.env.QB_V2 !== '0';
/** QB_V2 runs V2 on the concepts it was staged and calibrated on (the quick game, 2026-11-24); widening it to the other
 * plans is a later change, after they are staged. */
export const QB_V2_STAGED = new Set(['quick_outs', 'slant_flat', 'stick']);
/** Whether QB_V2 would take this call's read: a staged concept whose read plan fits the call (planFor). A property of the
 * call alone, so a scorecard can label the same calls in an arm with V2 off. */
export function qbV2Call(call: PassConcept): boolean { return QB_V2_STAGED.has(call.id) && planFor(call) !== null; }
/** The drop the call runs: the read plan's drop on a call V2 takes (Rules: stick is one step from the gun though the
 * installed concept's drop says gun3), else the concept's. The QB's feet and the line's pocket depth (engagement.ts
 * pocketDropDepth) both read it, so the line sets for the drop he takes. */
export function calledDrop(call: PassConcept): DropType {
  if (!QB_V2 || !QB_V2_STAGED.has(call.id)) return call.drop;
  return planFor(call)?.drop ?? call.drop;
}
