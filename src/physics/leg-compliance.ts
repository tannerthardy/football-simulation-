/** Shared reduced leg material law. Units: kg, yd, s.
 *
 * The spring is compression-only and has a finite ELASTIC force ceiling.
 * The parallel dashpot has its own finite force ceiling. These are explicit
 * research capabilities, not measured NFL capacities or technique bonuses.
 * The configuration is persistent; changing it requires configuration work.
 */
export interface AxialLegCompliance {
  restLength: number;
  /** Elastic stiffness, kg/s². */
  stiffness: number;
  /** Maximum conservative spring force, kg*yd/s². */
  forceCap: number;
  /** Parallel axial dashpot, kg/s. It can resist extension as well as compression. */
  damping: number;
  dampingCap: number;
}

export function validateAxialLeg(config: AxialLegCompliance): void {
  if (![config.restLength, config.stiffness].every(x => x > 0 && Number.isFinite(x))
    || ![config.forceCap, config.damping, config.dampingCap].every(x => x >= 0 && Number.isFinite(x)))
    throw new RangeError('Finite positive leg length/stiffness and nonnegative force/damping limits required');
}
function validateLength(length: number): void {
  if (!(length >= 0 && Number.isFinite(length))) throw new RangeError('Finite nonnegative leg length required');
}
function compressionDiscreteForce(before: number, after: number, config: AxialLegCompliance): number {
  if (before === after) return Math.min(config.forceCap, config.stiffness * Math.max(0, before));
  const lo = Math.min(before, after), hi = Math.max(before, after), saturation = config.forceCap / config.stiffness;
  const saturatedSpan = Math.max(0, hi - Math.max(lo, saturation));
  const elasticLo = Math.max(0, lo), elasticHi = Math.min(hi, saturation);
  const elasticSpan = Math.max(0, elasticHi - elasticLo);
  const elasticMean = .5 * config.stiffness * (elasticLo + elasticHi);
  return (config.forceCap * saturatedSpan + (elasticSpan > 0 ? elasticMean * elasticSpan : 0)) / (hi - lo);
}

/** Stored elastic energy. The linear saturated branch matches the capped force. */
export function axialLegPotential(length: number, config: AxialLegCompliance): number {
  validateLength(length); validateAxialLeg(config);
  const q = Math.max(0, config.restLength - length);
  const elastic = Math.min(q, config.forceCap / config.stiffness);
  return .5 * config.stiffness * elastic * elastic + config.forceCap * (q - elastic);
}

/** Positive force points from the hip towards the foot and pushes them apart. */
export function axialLegForce(length: number, config: AxialLegCompliance): number {
  validateLength(length); validateAxialLeg(config);
  return Math.min(config.forceCap, config.stiffness * Math.max(0, config.restLength - length));
}

/** Conservative discrete-gradient force: F*(lengthAfter-lengthBefore) = -ΔU.
 * Direct integration across the slack/elastic/saturated branches avoids
 * subtracting almost equal energies for a tiny stroke.
 */
export function axialLegDiscreteForce(lengthBefore: number, lengthAfter: number,
  config: AxialLegCompliance): number {
  validateLength(lengthBefore); validateLength(lengthAfter); validateAxialLeg(config);
  return compressionDiscreteForce(config.restLength - lengthBefore, config.restLength - lengthAfter, config);
}

/** Simultaneous physical stroke and rest-length change, with fixed stiffness/cap.
 * F*Δlength + ΔU = F*ΔrestLength. The right side is configuration actuator
 * work and must share the positive-work budget with other active channels.
 * Equal compression does NOT mean zero force or free raising of the body.
 */
export function axialLegChangingRestForce(lengthBefore: number, lengthAfter: number,
  before: AxialLegCompliance, restLengthAfter: number): number {
  validateLength(lengthBefore); validateLength(lengthAfter); validateAxialLeg(before);
  if (!(restLengthAfter > 0 && Number.isFinite(restLengthAfter))) throw new RangeError('Finite positive rest length required');
  return compressionDiscreteForce(before.restLength - lengthBefore, restLengthAfter - lengthAfter, before);
}

/** Signed passive force; its product with the actual axial rate is never positive.
 * A dashpot remains attached in flight. A gait phase cannot switch it off.
 */
export function axialLegDamping(lengthRate: number, config: AxialLegCompliance): number {
  if (!Number.isFinite(lengthRate)) throw new RangeError('Finite axial rate required');
  validateAxialLeg(config);
  return -Math.max(-config.dampingCap, Math.min(config.dampingCap, config.damping * lengthRate));
}

/** Mechanical work needed to change a material configuration at fixed geometry.
 * This is signed work, not permission to exceed an actuator force/power budget.
 */
export function axialLegConfigurationWork(length: number, before: AxialLegCompliance,
  after: AxialLegCompliance): number {
  return axialLegPotential(length, after) - axialLegPotential(length, before);
}
