/**
 * CONCEPT_FIT (experimental, off; Integration's ruling 2026-11-16): a concept is installed from the formations it is
 * drawn for. The caller offers a pass concept only when the receivers its read names (`PassConcept.needs`) are on the
 * field at the snap, after the called motion, as the offense numbers them (`realignOffense`, the same numbering the play
 * runs on). Off, `choosePass` weighted every concept from every formation: in 8 league games (seeds 101-108, develop
 * e90c204c) 125 of 699 concept calls (18%) came from a structure without a receiver the read names (verts_hitch 18 of
 * 36, mesh 14 of 20, trips_outs 10 of 24, flood 10 of 22, ...), and those compiled into other plays (mesh from trips:
 * one crosser; trips_outs from 2x2: no #3). docs/reviews/2026-11-16-concept-fit.md.
 *
 * The weights of the concepts that fit are kept as they are and renormalize among themselves by the draw (no CALL_MIX
 * refit). The motion is drawn first, as today: the fit is judged on what it leaves.
 */
import { alignOffense, type AlignContext } from '../playbook/alignment.js';
import type { Formation, MotionCall, OffSlot, PassConcept, ReceiverRef } from '../playbook/types.js';
import type { PhysicalProfile } from '../players/physical.js';
import { planMotion, realignOffense } from '../sim/motion.js';

export const CONCEPT_FIT = process.env.CONCEPT_FIT === '1';

/**
 * BACK_AS_THREE (experimental, off; with CONCEPT_FIT; Integration's ruling 2026-11-16): stick, flood and pa_flood from a
 * field with no #3 send the back to the flat as #3, as they are taught from 2x2, instead of leaving the menu. Sources:
 * Y-stick "Out of 2x2": "The running back runs one of two routes: a flare ... or a shoot route"; "The running back's shoot
 * or flare route is the outside route" (Emory Wilhite, Learning to teach Y-Stick); flood's "flat route who is normally a
 * Tight End or Running Back" (Youth Football Online, Flood Passing Concept); our pa_flood already sends the back to the
 * flat (`back: 'back_flat'`). A back who is #3 in the route is not in the protection: the call says so (`backIsThree`),
 * and the protection is the line (and a blocking inline end) alone; one more rusher than that is the quarterback's hot.
 */
export const BACK_AS_THREE = process.env.BACK_AS_THREE === '1';

type Body = Pick<PhysicalProfile, 'vmax' | 'tau' | 'brake' | 'lateral' | 'radius'>;
/** A nominal body for a slot the caller has no player for. */
const NOMINAL: Body = { vmax: 9.4, tau: 0.75, brake: 6, lateral: 6, radius: 0.35 };

/** What the caller knows of the snap: the alignment's own context (the concept's room, the line's splits by down and
 * distance, the team's style) and the bodies it will put there (the motion man's path, and the lanes his teammates leave
 * him). The play aligns and plans the motion the same way (playsim.ts), so the numbering here is the one it runs on. */
export interface FieldContext { los: number; ctx: AlignContext; bodies: Partial<Record<OffSlot, Body>> }

/** The receiver references on the field at the snap: the formation as aligned, then the called motion's set spot. A
 * motion the planner would not run (illegal, no lane, too long) leaves the formation as aligned, as the play does. */
export function fieldRefs(f: Formation, flip: boolean, ballY: number, motion: MotionCall | undefined, at: FieldContext): Set<ReceiverRef> {
  let off = alignOffense(f, flip, at.los, ballY, at.ctx);
  const body = (slot: string) => at.bodies[slot as OffSlot] ?? NOMINAL;
  const plan = motion ? planMotion(off, motion, body(motion.slot),
    Object.values(off.spots).map((sp) => ({ slot: sp.slot, pos: sp.pos, radius: body(sp.slot).radius }))) : null;
  if (plan) off = realignOffense(off, (slot) => (slot === plan.slot ? plan.snapPos : undefined));
  return new Set((Object.keys(off.numbering) as ReceiverRef[]).filter((r) => off.numbering[r]));
}

/** Whether the field has every receiver the concept's read names (an inner list: any one of them). */
export function conceptFits(c: PassConcept, refs: Set<ReceiverRef>): boolean {
  const has = (r: ReceiverRef) => refs.has(r) || (r === 'S3' && backIsThree(c, refs));
  return (c.needs ?? []).every((n) => (typeof n === 'string' ? has(n) : n.some(has)));
}

/** BACK_AS_THREE: the back is #3 on this field (the concept installs it, there is no #3, and there is a back). */
export function backIsThree(c: PassConcept, refs: Set<ReceiverRef>): boolean {
  return BACK_AS_THREE && !!c.backThree && !refs.has('S3') && refs.has('B');
}

/** The call with the back as #3: he runs #3's role on the flat (the plan resolves #3's route to him), he is read where
 * #3 is read, and he is out of the protection. */
export function asBackThree(c: PassConcept): PassConcept {
  const progression = [...new Set(c.progression.map((r) => (r === 'S3' ? 'B' : r)))] as ReceiverRef[];
  return { ...c, id: `${c.id}+b3`, back: c.backThree!, strong: { ...c.strong, 3: c.backThree! }, progression, backIsThree: true };
}
