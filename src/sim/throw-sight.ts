/**
 * When each defender could first have seen a pass (INFO-1 leftover after
 * #280). Recognizing a throw used to key off the exact release time for
 * every defender, so a corner running with his back to the quarterback
 * still broke on the ball one reaction time after it left the hand.
 *
 * A defender sees the throw when the ball is in his field of view, from its
 * first tick out of the hand through the rest of its flight. Body
 * facing approximates his eyes, with the same view cones the throw read
 * already used: zone eyes can look over the shoulder, a man defender keys
 * his man. Sensing writes once per tick from recorded bodies and the live
 * ball; readers only ask when he first saw it. No route, target or
 * catch-point knowledge.
 */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

/** Cosine of the widest angle off his facing that he sees the ball at. */
export function viewCone(a: Agent): number {
  const b = a.behavior as { zoneEyes?: boolean; kind: string };
  const zoneEyes = b.zoneEyes === true || (b.zoneEyes === undefined && b.kind === 'zone');
  return zoneEyes ? -0.2 : 0.1;
}

export class ThrowSight {
  private flight: unknown = null;
  private lastSenseAt = -Infinity;
  private readonly firstSeen = new Map<number, number>();
  private readonly handsSeen = new Map<number, number>();

  sense(sim: PlaySim): void {
    if (sim.t <= this.lastSenseAt) return;
    this.lastSenseAt = sim.t;
    const ball = sim.ball;
    if (ball.kind !== 'air') return;
    // A new flight (a tip is a new flight) is a new thing to see.
    if (ball.flight !== this.flight) {
      this.flight = ball.flight;
      this.firstSeen.clear();
      this.handsSeen.clear();
    }
    const { x, y } = ball.flight.pos;
    for (const a of sim.defense) {
      if (this.firstSeen.has(a.idx) || a.isDown(sim.t)) continue;
      const dx = x - a.pos.x, dy = y - a.pos.y, d = Math.hypot(dx, dy);
      const cos = d < 1e-6 ? 1 : (Math.cos(a.facing) * dx + Math.sin(a.facing) * dy) / d;
      if (cos > viewCone(a)) this.firstSeen.set(a.idx, sim.t);
    }
  }

  /** A staged scene (tests, lab): every defender watched the current flight
   * leave the quarterback's hand at `at`. */
  stageRelease(sim: PlaySim, at: number): void {
    if (sim.ball.kind !== 'air') throw new Error('Staging a release needs a flight');
    this.flight = sim.ball.flight;
    this.firstSeen.clear();
    this.handsSeen.clear();
    for (const a of sim.defense) this.firstSeen.set(a.idx, at);
  }

  /** A trailing man defender saw his receiver look back for the ball at `t`
   * (from his own picture); keeps the first such sighting. */
  sawHands(a: Agent, t: number): number {
    const first = this.handsSeen.get(a.idx);
    if (first !== undefined && first <= t) return first;
    this.handsSeen.set(a.idx, t);
    return t;
  }

  /** When he first saw his receiver look back for this flight, if he has. */
  handsAt(a: Agent): number | undefined {
    return this.handsSeen.get(a.idx);
  }

  /** When he first had this flight in view, if he has. */
  seenAt(a: Agent): number | undefined {
    return this.firstSeen.get(a.idx);
  }
}
