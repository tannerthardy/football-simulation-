/** Reduced corrective support placement, not an anatomical swing foot.
 * Nominal gait transport is separate from the bounded correction speed.
 * A massless force/velocity motor avoids adding mass to the existing COM.
 * Its mobility is a stated model assumption, not a measured muscle law.
 */
import { clamp, type Vec2 } from '../core/vec.js';

export interface VirtualFoot {
  /** Averaged support anchor, yd; body transport plus achieved corrections.
   * This is not the position of an anatomical planted sole. */
  anchor: Vec2;
  /** Corrective displacement relative to the body's averaged gait frame. */
  offset: Vec2;
  /** Requested next corrective support location, yd. */
  target: Vec2;
  /** Desired and achieved corrective velocity relative to nominal gait, yd/s. */
  desired: Vec2;
  achieved: Vec2;
  /** Actual aggregate external load on this single support motor, kg·yd/s². */
  force: Vec2;
  /** Active motor command capacity, shared with stance drive. External
   * passive loads may exceed it and drag support; no tissue-load limit is
   * claimed for this unvalidated viscous reduction. */
  capacity: number;
  /** Velocity/force mobility, yd/s per kg·yd/s². */
  mobility: number;
  state: 'supported' | 'placing' | 'unloaded';
}

export function newVirtualFoot(position: Vec2): VirtualFoot {
  return { anchor: { ...position }, offset: { x: 0, y: 0 }, target: { ...position }, desired: { x: 0, y: 0 },
    achieved: { x: 0, y: 0 }, force: { x: 0, y: 0 }, capacity: 0, mobility: 0, state: 'supported' };
}

/** Exact mean of the existing linear recovery response ramp. */
export function recoveryRamp(outsideFor: number, latency: number, h: number): number {
  const start = clamp(outsideFor / latency, 0, 1);
  const ramp = Math.min(h, Math.max(0, latency - outsideFor));
  return (ramp * (start + clamp((outsideFor + ramp) / latency, 0, 1)) * .5 + h - ramp) / h;
}

/** Quasi-static motor u = u0 + mobility*F. The fixed free-speed ceiling,
 * rather than the current requested speed, sets the force/velocity slope. */
export function supportVelocity(foot: VirtualFoot, force: Vec2): Vec2 {
  return { x: foot.desired.x + foot.mobility * force.x,
    y: foot.desired.y + foot.mobility * force.y };
}

/** Required sticking impulse including both COMs and one support motor.
 * share is the contact's geometric coupling to correction (torso 0, legs 1).
 * All grips on a body must use the same aggregate foot force/mobility. */
export function supportInverseMass(inverseBodyMass: number, foot: VirtualFoot, share: number, h: number): number {
  return inverseBodyMass + share * share * foot.mobility / h;
}

/** Change in net motor work while a numerical impulse updates its aggregate
 * load. Wmotor = -P·u_achieved; passive grip work is Wbody - Wmotor.
 * This does not claim closure of unrepresented vertical/limb energy. */
export function supportWorkChange(foot: VirtualFoot, before: Vec2, change: Vec2, h: number): { linear: number; quadratic: number } {
  return { linear: -change.x * foot.desired.x - change.y * foot.desired.y
      - 2 * foot.mobility / h * (before.x * change.x + before.y * change.y),
    quadratic: -foot.mobility / h * (change.x * change.x + change.y * change.y) };
}
