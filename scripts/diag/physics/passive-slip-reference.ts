/** Independent local mechanical reference, not a World contact law.
 * Freeze the force direction and moment arms. A passive grip limits force C;
 * body's material slip v obeys v'=-K F, F=min(C, |v|/M), opposing v.
 * K is body inverse effective mass; M is reduced support mobility. M=0 is
 * bounded dry restraint: the force stops when the material slip reaches zero.
 * Return impulse AND its first temporal moment, needed for position/yaw.
 */
export function passiveSlipReference(slip: number, inverseMass: number,
  mobility: number, capacity: number, duration: number) {
  if (![slip, inverseMass, mobility, capacity, duration].every(Number.isFinite)
    || inverseMass <= 0 || mobility < 0 || capacity < 0 || duration < 0)
    throw new RangeError('Invalid passive-slip reference');
  const sign = Math.sign(slip), speed = Math.abs(slip);
  if (!speed || !capacity || !duration)
    return { impulse: 0, transport: 0, finalSlip: slip, saturatedUntil: 0 };
  const saturatedUntil = Math.min(duration, Math.max(0,
    (speed - mobility * capacity) / (inverseMass * capacity)));
  const remaining = duration - saturatedUntil;
  const afterCap = Math.max(0, speed - inverseMass * capacity * saturatedUntil);
  let impulse = capacity * saturatedUntil;
  let transport = capacity * saturatedUntil * (duration - saturatedUntil / 2);
  let finalSpeed = afterCap;
  if (mobility > 0 && remaining > 0) {
    const rate = inverseMass / mobility, z = rate * remaining;
    const response = -Math.expm1(-z);
    impulse += afterCap / inverseMass * response;
    // Stable integral of (remaining-t)*exp(-rate*t), including tiny loads.
    const shape = z < 1e-3
      ? z * z * (1 / 2 - z / 6 + z * z / 24 - z ** 3 / 120 + z ** 4 / 720)
      : z - response;
    transport += afterCap / inverseMass / rate * shape;
    finalSpeed = afterCap * Math.exp(-z);
  }
  return { impulse: -sign * impulse, transport: -sign * transport,
    finalSlip: finalSpeed === 0 ? 0 : sign * finalSpeed, saturatedUntil };
}
