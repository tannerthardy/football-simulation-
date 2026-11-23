/** PASS_ROLES (experimental, off; PASS_ROLES=1 turns it on): pass-play pursuit roles after the catch, as taught.
 *
 * Taught rule (docs/reviews/2026-11-17-zone-coached-rules.md, "Rally", [shared]): aim where the carrier will be; corner
 * and force outside-in, safeties and alley inside-out on the cutback; deeper and farther defenders take deeper angles
 * and never trail a teammate. Handbook §10 failure row: "Force and alley converge ... both aim at the same current point".
 *
 * Why (docs/reviews/2026-11-23-pursuit-diagnosis.md; CARRIER_ACCEL on F09): every pursuer took the same inside shade
 * (`leverage()`), so the NB and CB_S aimed at one spot ahead of the carrier, the spacing stage cut the NB's upfield turn
 * for 0.4 s, and he trailed.
 *
 * What each defender does, from his own seat and what he sees:
 *  - Role, decided once per carrier when he starts pursuing him (held for that carrier: commit rule):
 *    - force (the carrier's outside shoulder; he turns the carrier in) if he is outside the carrier at that moment, or if
 *      his seat is a force seat (a corner, or a flat zone) and he is on the carrier's side of the field: within FORCE_IN
 *      yd inside him;
 *    - alley (the carrier's inside shoulder, inside-out) otherwise.
 *  - The shade: the same magnitude as the existing pursuit leverage (leverage magnitude by distance to the sideline and
 *    his pursuit rating, fading near contact as before), signed by his role instead of always inside.
 *  - Never trail a teammate: a pursuer who sees a teammate of the same shoulder ahead of him on his way to the carrier
 *    (nearer the carrier, within LANE yd of his line to him) takes the other shoulder. If he sees one there too, he
 *    takes the cutback lane, inside by LANE more. Enter at LANE, leave past LANE_EXIT (commit rule).
 *    He reads the teammate's position and velocity he sees, never the teammate's role or aim.
 *
 *  - Deeper angle (attempt 2, from F74: CB_S and FS 12 yd downfield and 16-19 yd inside aimed for the carrier's 5 yd/s,
 *    ran downhill toward that spot, reached him level as he hit 7.8 yd/s, and CB_S slid behind and missed): a farther
 *    pursuer assumes a faster carrier. His meeting-spot forecast runs at least at his seen speed raised toward
 *    DEEP_SPEED, by a weight rising from 0 at DEEP_NEAR yd to 1 at DEEP_FAR yd of distance. The angle is deeper; if the
 *    carrier does not reach that speed, the earlier meeting the pursuer then sees releases the held spot and he comes up
 *    (adjust back upfield only). Continuous in distance: no mode switch.
 *
 * Stated choices (not fitted): DEEP_SPEED 7.3 yd/s (a carrier in the open: BDB 2025 completions caught at 6+ yd/s,
 * p50 of the carrier's top speed over the play, pursuit operator); DEEP_NEAR 5 yd, DEEP_FAR 15 yd. FORCE_IN 5 yd (a corner within five yards inside a receiver on his side still has the
 * outside); LANE 1.5 yd (one body plus reach); LANE_EXIT 2.5 yd. */
import { FIELD_WIDTH } from '../core/field.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { hasObservedFlight } from './possession-read.js';

export const PASS_ROLES = process.env.PASS_ROLES === '1';
const FORCE_IN = 5, LANE = 1.5, LANE_EXIT = 2.5;
const DEEP_SPEED = 7.3, DEEP_NEAR = 5, DEEP_FAR = 15;

type Held = { target: Agent; force: boolean; lane: 0 | 1 | 2 };
const held = new WeakMap<Agent, Held>();

function forceSeat(a: Agent): boolean {
  const zone = (a.behavior as { zone?: string } | undefined)?.zone;
  return a.slot.startsWith('CB') || zone === 'flat_s' || zone === 'flat_w';
}

/** +1 = toward larger y. The carrier's outside is toward his nearer sideline. */
const outsideSign = (y: number) => (y < FIELD_WIDTH / 2 ? -1 : 1);

/** The signed lateral shade (yd along y) this pursuer keeps on the carrier, or null when no pass role applies.
 * `magnitude` is the existing leverage magnitude; `seenPos` is his picture of the carrier. */
export function passRoleShade(sim: PlaySim, a: Agent, target: Agent, seenPos: { x: number; y: number }, magnitude: number): number | null {
  // A pass he has seen thrown, and a carrier other than the QB (run fits are assigned on every snap; the flight he saw
  // says the play is a pass).
  if (!PASS_ROLES || target === sim.qb || !hasObservedFlight(a)) return null;
  const out = outsideSign(seenPos.y);
  let h = held.get(a);
  if (!h || h.target !== target) {
    const lateral = (a.pos.y - seenPos.y) * out;  // > 0: he is outside the carrier
    h = { target, force: lateral > 0 || (forceSeat(a) && lateral > -FORCE_IN), lane: 0 };
    held.set(a, h);
  }
  // Never trail a teammate he sees on the same shoulder, ahead of him on his way to the carrier.
  const dx = seenPos.x - a.pos.x, dy = seenPos.y - a.pos.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
  const ahead = (shoulderForce: boolean, width: number) => sim.defense.some(m => {
    if (m === a || m.isDown(sim.t)) return false;
    const mh = sim.see(a, m).pos;
    const t = ((mh.x - a.pos.x) * dx + (mh.y - a.pos.y) * dy) / Math.max(1e-6, d2);
    if (t <= 0 || t >= 1) return false;
    const off = Math.abs((mh.x - a.pos.x) * dy - (mh.y - a.pos.y) * dx) / Math.max(1e-6, d);
    const mForce = (mh.y - seenPos.y) * out > 0;
    return off < width && mForce === shoulderForce;
  });
  const mine = h.force;
  if (h.lane === 0 && ahead(mine, LANE)) h.lane = 1;
  else if (h.lane >= 1 && !ahead(mine, LANE_EXIT)) h.lane = 0;
  if (h.lane >= 1) {
    if (h.lane === 1 && ahead(!mine, LANE)) h.lane = 2;
    else if (h.lane === 2 && !ahead(!mine, LANE_EXIT)) h.lane = 1;
  }
  const force = h.lane === 1 ? !mine : mine;
  if (h.lane === 2) return -out * (magnitude + LANE);
  return (force ? out : -out) * magnitude;
}

/** Deeper angle: the speed this pursuer assumes for a carrier he sees at `seenSpeed`, `dist` yd away, or null when no
 * pass role applies. */
export function deepAngleSpeed(sim: PlaySim, a: Agent, target: Agent, dist: number, seenSpeed: number): number | null {
  if (!PASS_ROLES || target === sim.qb || !hasObservedFlight(a)) return null;
  const w = Math.min(1, Math.max(0, (dist - DEEP_NEAR) / (DEEP_FAR - DEEP_NEAR)));
  return seenSpeed + w * Math.max(0, DEEP_SPEED - seenSpeed);
}
