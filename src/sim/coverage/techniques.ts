/**
 * Coverage techniques that are neither a landmark zone nor man coverage:
 * trapping a quick out, walling a vertical, and robbing an in-breaker's
 * window. Each keeps the common transitions every coverage player has: play
 * the ball once he sees the throw, fit the run once he reads it, pursue once
 * the ball is past the line.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, lerp } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { Gap } from '../../playbook/types.js';
import type { Vec2 } from '../../core/vec.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { angleTo, track } from '../behaviors/common.js';
import { believesRun, infoHonest, ManCoverage, OPEN_CARRY, openCarryFacing, playBall, pursueIfLive, runFit, sawThrow, unsureFactor } from '../behaviors/defense.js';
import type { ReleaseReader } from './reads.js';
import { withFacingTechnique } from './orientation.js';

abstract class Technique implements Behavior {
  readonly kind = 'zone';
  readonly zoneEyes = true;
  readonly style = 'match' as const;
  constructor(
    readonly target: Agent,
    protected readonly reader: ReleaseReader,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {}

  update(a: Agent, sim: PlaySim): MoveCommand {
    const live = pursueIfLive(sim, a);
    if (live) return live;
    if (sim.ball.kind === 'air' && sawThrow(a, sim, null)) return playBall(a, sim, null);
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);
    return this.move(a, sim);
  }

  protected abstract move(a: Agent, sim: PlaySim): MoveCommand;
}

/** Preserve release cushion on the installed #2 while his route declares.
 * This remains a zone read, with ordinary support/ball priority. It is not
 * knowledge of a vertical or permission to carry a declared shallow forever. */
export class ReadRelease extends Technique {
  private readonly movement: ManCoverage;

  constructor(a: Agent, sim: PlaySim, target: Agent, reader: ReleaseReader,
    gap: Gap, gapSign: number, initialPosition: Vec2) {
    super(target, reader, gap, gapSign);
    this.movement = new ManCoverage(a, sim, target, false, gap, gapSign,
      { lev: 'inside', initialPosition: { ...initialPosition } });
  }

  recordedTechnique() { return this.movement.recordedTechnique(); }

  /** Completing the same inside match does not restart the release picture,
   * cushion, hip turn or stem confidence at an arbitrary depth boundary. */
  match(): ManCoverage { return this.movement; }

  protected move(a: Agent, sim: PlaySim): MoveCommand {
    return this.movement.trackReceiver(a, sim);
  }
}

/**
 * Trap: drive downhill on a quick out or flat (the Palms/cloud corner on #2,
 * the trap corner under #1). He attacks the catch point from outside-in so the
 * receiver can't turn upfield inside him; a sharper read leads it more.
 */
export class Trap extends Technique {
  protected move(a: Agent, sim: PlaySim): MoveCommand {
    const rd = this.reader.read(sim, this.target);
    if (!rd) return { vel: { x: 0, y: 0 } };
    const lead = 0.3 + 0.35 * a.r('anticipation') * a.mind.focus;
    const aim = {
      x: Math.min(rd.pos.x + rd.vel.x * lead + 0.6, Math.max(a.pos.x, rd.pos.x + 0.6)),
      y: clamp(rd.pos.y + rd.vel.y * lead + rd.outSign * 0.6, 0.5, FIELD_WIDTH - 0.5),
    };
    return withFacingTechnique(track(a, aim, { x: rd.vel.x * 0.8, y: rd.vel.y }, { speed: 1, gain: 2.4 }), { label: 'trap', key: rd.vel });
  }
}

/**
 * Wall: an underneath defender gets in front of a vertical release on its
 * inside, collisions it and rides it to a handoff depth without turning his
 * back to the quarterback (the apex on #2's seam, the hook on #3).
 */
export class Wall extends Technique {
  private opened = false;
  protected move(a: Agent, sim: PlaySim): MoveCommand {
    const rd = this.reader.read(sim, this.target);
    if (!rd) return { vel: { x: 0, y: 0 } };
    const inside = Math.sign(sim.ballY - rd.pos.y) || 1;
    const aim = { x: Math.max(rd.pos.x + 1.2, a.pos.x - 0.4), y: clamp(rd.pos.y + inside * 0.8, 0.5, FIELD_WIDTH - 0.5) };
    const closing = Math.max(0, rd.vel.x - Math.max(0, a.vel.x));
    const turnTime = Math.PI / a.profile.turnRate;
    if (rd.vel.x > a.profile.vmax * a.profile.backpedal && a.pos.x - rd.pos.x < 1.2 + closing * turnTime) this.opened = true;
    const speed = this.opened ? 0.92 + 0.08 * a.r('zoneCoverage') : (0.8 + 0.15 * a.r('zoneCoverage')) * unsureFactor(a);
    const req = track(a, aim, { x: Math.max(0, rd.vel.x), y: rd.vel.y }, { facing: this.opened ? undefined : angleTo(a.pos, infoHonest(9) ? sim.see(a, sim.qb).pos : sim.qb.pos), speed, gain: 2 });
    // OPEN_CARRY: an opened wall rides the vertical as square to the QB as the run allows.
    if (OPEN_CARRY && this.opened) {
      a.tags.add('open-carry');
      return withFacingTechnique({ ...req, facing: openCarryFacing(a, sim, this.target, req, true) }, { label: 'open-carry-wall', key: rd.vel });
    }
    return withFacingTechnique(req, { label: this.opened ? 'wall-open' : 'wall', key: rd.vel });
  }
}

/**
 * Rob: sit in the throwing window of a receiver's in-breaking route at
 * intermediate depth (a robber on the dig, a quarters safety robbing #1's
 * curl, a poach safety in the middle). Eyes on the quarterback.
 */
export class Rob extends Technique {
  protected move(a: Agent, sim: PlaySim): MoveCommand {
    const rd = this.reader.read(sim, this.target);
    if (!rd) return { vel: { x: 0, y: 0 } };
    const ahead = { x: rd.pos.x + rd.vel.x * 0.5, y: rd.pos.y + rd.vel.y * 0.5 };
    const lane = lerp(infoHonest(9) ? sim.see(a, sim.qb).pos : sim.qb.pos, ahead, 0.85);
    const floor = sim.los + Math.min(7, Math.max(1, rd.depth - 0.5));
    const aim = { x: clamp(lane.x, floor, Math.max(floor, rd.pos.x + 1)), y: clamp(lane.y, 0.5, FIELD_WIDTH - 0.5) };
    const carry = Math.abs(rd.vel.y) > 3 && Math.abs(rd.vel.y) > Math.abs(rd.vel.x);
    const speed = carry ? 1 : (0.75 + 0.2 * a.r('zoneCoverage')) * unsureFactor(a);
    return withFacingTechnique(track(a, aim, { x: rd.vel.x * 0.5, y: rd.vel.y * 0.7 }, { facing: carry ? Math.atan2(rd.vel.y, rd.vel.x) : angleTo(a.pos, infoHonest(9) ? sim.see(a, sim.qb).pos : sim.qb.pos), speed, gain: 1.8 }),
      { label: carry ? 'rob-carry' : 'rob', key: rd.vel });
  }
}
