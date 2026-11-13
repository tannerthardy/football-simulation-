/**
 * How a coverage defender's hips follow his technique (COV-6).
 *
 * Coverage techniques ask for a facing every tick: square to the QB while he
 * pedals, open with a crosser, turn and run with a vertical. Those requests
 * used to flip whenever a threshold was crossed (a crosser's lateral speed,
 * a vertical's depth rate, a hip-open flag a fresh match technique resets),
 * and the motor turned at its ceiling each time, so DBs and LBs swung through
 * 90°+ in 0.2 s about eight times as often as NFL defenders do.
 *
 * This owns the facing he actually requests while a coverage technique is in
 * charge. The technique still decides what he wants; this decides how he
 * gets there:
 * - a change of state (square, open with a receiver, run) is committed for a
 *   minimum hold, longer for a less anticipative player, unless he sees a new
 *   break by the receiver he is playing;
 * - a turn he makes from a cue (cushion consumed, a crosser, a vertical to
 *   run with) moves his request around at a technique rate, a rounded hip
 *   turn; only a break he has just seen gets a speed turn at the body's
 *   ceiling, so a double move he reads can still be played;
 * - running, the hips follow his smoothed travel, not every stem.
 * The body's turn-rate ceiling is unchanged: this changes what is asked, not
 * what the body can do. Commands from pursuit, run fits and the ball carry
 * no technique and pass through; he starts fresh from his body when coverage
 * resumes.
 */
import { angleDiff, angleOf, clamp, type Vec2 } from '../../core/vec.js';
import { commandFacing, turnRateOf, type MoveCommand } from '../../physics/kinematics.js';
import type { Agent } from '../agent.js';

export interface FacingTechnique {
  /** Which technique branch asked for this facing (diagnostics). */
  readonly label: string;
  /** Acquired velocity of the receiver he is playing, if any. */
  readonly key?: Vec2;
}

const technique = Symbol('coverage facing technique');
type TechniqueCommand = MoveCommand & { [technique]?: FacingTechnique };

export function withFacingTechnique<T extends MoveCommand>(command: T, request: FacingTechnique): T {
  return { ...command, [technique]: request };
}

export function facingTechnique(command: MoveCommand): FacingTechnique | undefined {
  return (command as TechniqueCommand)[technique];
}

/** A requested facing this far from the committed one is a new state. */
const TRANSITION = Math.PI / 3;
/** A key heading change this large is a break he can react to. */
const BREAK = Math.PI / 3;
/** Below this speed a receiver's heading is not a break cue. */
const BREAK_SPEED = 1.5;
/** Memory of the key's stem heading that a break is measured against. */
const KEY_TAU = 0.3;
/** Smoothing time of the travel facing while running. */
const TRAVEL_TAU = 0.25;
/** Rounded hip turn, as a fraction of the body's turn-rate ceiling. */
const ROUNDED = 0.5;

type Mode = 'face' | 'travel';

/** Seconds a rounded hip turn through `angle` takes this body now: a
 * technique starts its re-square this early to be square on arrival. */
export function roundedTurnTime(a: Agent, angle: number): number {
  return Math.abs(angle) / (ROUNDED * turnRateOf(a.body));
}

export class CoverageOrientation {
  private facing: number | null = null;
  private mode: Mode = 'face';
  private faceTarget = 0;
  private travel = 0;
  private since = -Infinity;
  private keyHeading: number | null = null;
  private fast = false;
  private last = -Infinity;
  /** The branch whose facing is being followed (diagnostics). */
  label = '';

  steer(a: Agent, now: number, dt: number, command: MoveCommand): MoveCommand {
    const request = facingTechnique(command);
    if (!request || a.engagement || a.isDown(now)) {
      this.facing = null;
      this.label = '';
      return command;
    }
    // A gap (another controller ran in between) starts again from his body.
    if (now - this.last > 1.5 * dt) this.facing = null;
    this.last = now;
    const mode: Mode = command.facing === undefined ? 'travel' : 'face';
    const wanted = commandFacing(a.body, command);
    if (this.facing === null) {
      this.facing = a.body.facing;
      this.travel = mode === 'travel' ? wanted : angleOf(command.vel);
      this.mode = mode;
      this.faceTarget = wanted;
      this.since = now;
      this.keyHeading = null;
    }
    const travelWanted = mode === 'travel' ? wanted
      : Math.hypot(command.vel.x, command.vel.y) > 0.4 ? angleOf(command.vel) : this.travel;
    this.travel += angleDiff(this.travel, travelWanted) * (1 - Math.exp(-dt / TRAVEL_TAU));

    const committed = this.mode === 'travel' ? this.travel : this.faceTarget;
    const proposed = mode === 'travel' ? this.travel : wanted;
    const transition = mode !== this.mode || Math.abs(angleDiff(committed, proposed)) > TRANSITION;
    const key = request.key && Math.hypot(request.key.x, request.key.y) > BREAK_SPEED
      ? Math.atan2(request.key.y, request.key.x) : null;
    const broke = key !== null && this.keyHeading !== null && Math.abs(angleDiff(this.keyHeading, key)) > BREAK;
    // A break is a sudden change against his recent picture of the stem.
    const recent = this.keyHeading;
    if (key !== null) this.keyHeading = recent === null ? key
      : recent + angleDiff(recent, key) * (1 - Math.exp(-dt / KEY_TAU));
    if (transition) {
      const hold = 0.3 + 0.2 * (1 - a.r('anticipation') * a.mind.focus);
      if (broke || now - this.since >= hold) {
        this.mode = mode;
        this.since = now;
        this.fast = broke;
        if (broke) this.keyHeading = key;
        this.label = request.label;
        if (mode === 'face') this.faceTarget = wanted;
      }
    } else {
      // Same state: follow the technique's own target as it drifts.
      if (mode === 'face') this.faceTarget = wanted;
      this.label = request.label;
    }
    const target = this.mode === 'travel' ? this.travel : this.faceTarget;
    const rate = turnRateOf(a.body) * (this.fast ? 1 : ROUNDED);
    // Never ask the hips to lead the body further than the motor can follow.
    const lead = angleDiff(a.body.facing, this.facing);
    let facing = a.body.facing + clamp(lead, -2 * rate * dt, 2 * rate * dt);
    const off = angleDiff(facing, target);
    facing += clamp(off, -rate * dt, rate * dt);
    if (Math.abs(off) <= rate * dt) this.fast = false;
    this.facing = facing;
    return { ...command, facing: this.facing };
  }
}

const orientations = new WeakMap<Agent, CoverageOrientation>();

/** The defender's own orientation technique, kept across coverage jobs. */
export function coverageOrientation(a: Agent): CoverageOrientation {
  let o = orientations.get(a);
  if (!o) { o = new CoverageOrientation(); orientations.set(a, o); }
  return o;
}
