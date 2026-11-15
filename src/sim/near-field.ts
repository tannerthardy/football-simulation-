/**
 * PERCEPTION PRODUCER: NEAR_FIELD (experimental, off; `NEAR_FIELD=1` felt contact, `=2` peripheral quality, `=3` both; docs/reviews/2026-11-15-near-field.md).
 * Stage 1, for the players whose pictures are already gated by `sighted()` (the ball carrier, man and zone defenders): what a gated player knows of a body at the edge of
 * his field or touching him. It reads the physics contact (touch is sensing) and the delayed perception record; it never gives a body's true state now.
 *
 * bit 1 FELT: a non-teammate's body in contact with his, after TOUCH_LATENCY (0.15 s, a STATED CHOICE anchored on a secondhand 155 ms simple reaction time to touch,
 *   Robinson 1934 as cited by a review of factors affecting reaction time, unverified at the source) is a picture of that man at the contact: the man's position then,
 *   with a 0.3 yd error (a bearing of the contact on his body is about 15 deg, so at arm's length about 0.3 yd), no velocity beyond the last picture. It holds HOLD (0.5 s) and is
 *   used by `see` only where it is FRESHER than the picture he otherwise has (a stale, occluded or remembered one); never over a picture inside his field that is newer.
 * bit 2 PERIPHERAL (rebuilt 2026-11-15 after Integration's objection to the first form, which dropped velocity past 30 deg and added +3 yd of YAC): inside the field the gated picture is full quality to the field's
 *   edge (1.8 rad); the periphery is good at motion and poor at detail, identity and exact position. Every error is a smooth function of the eccentricity e off his head (his key; his body facing for the carrier), out to
 *   the field's edge (95 deg), and time-correlated (the same hashed noise bins, no random stream): position bearing sd 2 deg + 0.1 deg per deg (Coverage's form, built for first detection of the ball), range sd 10% x e/95;
 *   velocity KEPT, direction sd 5 deg + 0.2 deg per deg, speed sd 25% x e/95 (stated choices: no clean source for peripheral motion error was found; read at half and double); and what is lost outright is recognition:
 *   stance, `carrying`, carry posture, head and arm are each unknown with probability (e/95)^2 (smoothly flickering), his hips shown by his direction of travel. What he attends is central quality by construction: his key
 *   (the man a man defender covers, the QB for a zone defender, `eyes.keys`), and for any defender the ball carrier. No step at any angle.
 * No detection test is coded: inside the field a body that crosses at near range moves at tens of degrees per second, far over Coverage's threshold M T(e) anywhere in the field,
 * so the field and the latency decide (their own arithmetic); the existing delay stands for the latency.
 *
 * Why it exists: the gated view is already the whole field at full quality (a generosity, and the outer field is where the error should be), and a man behind or touching him is
 * known only by the last picture ageing. Bit 1 adds the bump; bit 2 removes exactness from the outer field. Both flagged and separate.
 */
import type { Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

const BITS = Number(process.env.NEAR_FIELD ?? 0);
export const NEAR_FELT = (BITS & 1) !== 0;
export const NEAR_PERIPHERAL = (BITS & 2) !== 0;   // with 4: the carrier's pictures only; with 8: the defenders' only
export const NEAR_ON = BITS !== 0;

const TOUCH_LATENCY = 0.15, HOLD = 0.5, FELT_POS_SD = 0.3;
const BEARING_SD0 = 2, BEARING_SD_PER_DEG = 0.1;
const RANGE_ERR = 0.1;
/** The edge of the visual field (Coverage's half-width, 95 deg); every peripheral error is a smooth function of eccentricity out to it. Velocity error: direction sd 5 deg + 0.2 deg per deg of eccentricity, speed sd 25% at the edge (stated choices; read at half and double). */
const EDGE = (95 * Math.PI) / 180, VEL_DIR_SD0 = 5, VEL_DIR_SD_PER_DEG = 0.2, VEL_SPEED_SD_EDGE = 0.25;
const normalCdf = (z: number) => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z)));
const NOISE_BIN = 0.25;

/** A smooth, deterministic standard-normal-ish value for (a, b, t): linear between hashed bin values, so no jump and no random stream is drawn. */
function noise(a: number, b: number, salt: number, t: number): number {
  const k = Math.floor(t / NOISE_BIN), w = t / NOISE_BIN - k;
  const h = (n: number) => { let x = (Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(n, 83492791) ^ Math.imul(salt + 1, 2654435761)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    // two uniforms from the 32 bits -> one normal (Box-Muller on the halves)
    const u1 = ((x & 0xffff) + 0.5) / 65536, u2 = ((x >>> 16) + 0.5) / 65536; return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
  return h(k) * (1 - w) + h(k + 1) * w;
}
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

interface Touch { at: number; pos: Vec2; }

export class NearField {
  private readonly touches = new Map<string, Touch>();
  private static key(o: Agent, t: Agent) { return `${o.idx}>${t.idx}`; }

  /** After the World step: a contact between opposing bodies is a touch for each of them. */
  recordContacts(sim: PlaySim): void {
    if (!NEAR_FELT) return;
    for (const c of sim.lastStep?.contacts ?? []) {
      const a = sim.agents[c.i], b = sim.agents[c.j];
      if (!a || !b || a.team === b.team) continue;
      this.touches.set(NearField.key(a, b), { at: sim.t, pos: { x: b.pos.x, y: b.pos.y } });
      this.touches.set(NearField.key(b, a), { at: sim.t, pos: { x: a.pos.x, y: a.pos.y } });
    }
  }

  /** The gated observer's picture of `target`, `seen` being what the gated path gave. */
  apply(sim: PlaySim, observer: Agent, target: Agent, seen: Perceived, headDir: number | null): Perceived {
    const t = sim.t;
    if (NEAR_FELT) {
      const rec = this.touches.get(NearField.key(observer, target));
      if (rec && t >= rec.at + TOUCH_LATENCY && t <= rec.at + TOUCH_LATENCY + HOLD && rec.at > t - (seen.age ?? 0) + 1e-9) {
        const n = (s: number) => noise(observer.idx, target.idx, s, rec.at) * FELT_POS_SD;
        return { ...seen, pos: { x: rec.pos.x + n(1), y: rec.pos.y + n(2) }, vel: { x: seen.vel.x, y: seen.vel.y }, age: t - rec.at, pose: seen.pose ?? 'up' };
      }
    }
    if (NEAR_PERIPHERAL && (seen.age ?? 0) < 0.6) {
      const isCarrier = observer === sim.carrier;
      if ((isCarrier && (BITS & 8) !== 0) || (!isCarrier && (BITS & 4) !== 0)) return seen;   // 4: the carrier only; 8: the defenders only (to report whose reads moved the yards)
      const dx = seen.pos.x - observer.pos.x, dy = seen.pos.y - observer.pos.y, r = Math.hypot(dx, dy);
      // His head: HEAD's where modelled; else on his key if he has one (a man defender's eyes are on his man, a zone defender's on the QB, by coaching), else his body facing (the carrier looks where he runs).
      // What he attends is central quality by construction: his key, and for any defender the ball carrier (a pursuer's eyes are on the man he chases).
      const keys: Agent[] = observer.eyes?.keys.length ? observer.eyes.keys
        : observer.behavior?.kind === 'man' && (observer.behavior as unknown as { target?: Agent }).target ? [(observer.behavior as unknown as { target: Agent }).target]
        : observer.behavior?.kind === 'zone' && sim.qb ? [sim.qb] : [];
      if (keys.includes(target) || (observer.team === 'D' && target === sim.carrier)) return seen;
      let dir = headDir ?? observer.body.facing;
      if (headDir == null && keys.length) { const kp = sim.perception.perceive(keys[0].idx, 0.2).pos; dir = Math.atan2(kp.y - observer.pos.y, kp.x - observer.pos.x); }
      if (r > 1e-6) {
        const brg = Math.atan2(dy, dx), e = Math.abs(angDiff(brg, dir)), eDeg = (e * 180) / Math.PI;
        const f = Math.min(1, e / EDGE);                              // 0 at the fovea to 1 at the edge of the field; every error below is a smooth function of it
        const n = (salt: number) => noise(observer.idx, target.idx, salt, t);
        const sdB = ((BEARING_SD0 + BEARING_SD_PER_DEG * eDeg) * Math.PI) / 180, rr = r * (1 + n(4) * RANGE_ERR * f), bb = brg + n(3) * sdB;
        // Velocity is KEPT at every eccentricity (motion is what the periphery is good at): direction and speed both noisy, the error growing with eccentricity and correlated in time (the same smooth noise as the position).
        const sp = Math.hypot(seen.vel.x, seen.vel.y), vd = Math.atan2(seen.vel.y, seen.vel.x) + n(5) * ((VEL_DIR_SD0 + VEL_DIR_SD_PER_DEG * eDeg) * Math.PI) / 180, vs = sp * Math.max(0, 1 + n(6) * VEL_SPEED_SD_EDGE * f);
        const out: Perceived = { ...seen, pos: { x: observer.pos.x + rr * Math.cos(bb), y: observer.pos.y + rr * Math.sin(bb) }, vel: sp > 1e-6 ? { x: vs * Math.cos(vd), y: vs * Math.sin(vd) } : { x: 0, y: 0 } };
        // What the periphery loses outright is recognition: who he is and what he is doing with hips, hands, pads and the ball. Each is known with probability 1 - f^2 (the same smooth noise, so it flickers slowly, not per tick);
        // unknown, a consumer gets what it gets for an unknown cue (`null` / absent), and his hips are shown by his direction of travel.
        const known = normalCdf(n(7)) < 1 - f * f;
        if (!known) { out.stance = null; out.carrying = null; out.carryPosture = null; out.head = null; out.arm = undefined; if (sp > 0.5) out.facing = Math.atan2(seen.vel.y, seen.vel.x); }
        return out;
      }
    }
    return seen;
  }
}
