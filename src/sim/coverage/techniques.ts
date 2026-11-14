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

const APEX_CUSHION = 9;

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
  /** `insideBy`: yards inside #2 he walls from (0 level, negative outside).
   * `flat`: a committed flat threat under him (APEX_LEVERAGE 2): he stops leading
   * #2 and holds a cushion over the seen back. */
  constructor(target: Agent, reader: ReleaseReader, gap: Gap, gapSign: number,
    private readonly insideBy = 0.8, private readonly flat?: Agent) {
    super(target, reader, gap, gapSign);
  }

  protected move(a: Agent, sim: PlaySim): MoveCommand {
    const rd = this.reader.read(sim, this.target);
    if (!rd) return { vel: { x: 0, y: 0 } };
    const inside = Math.sign(sim.ballY - rd.pos.y) || 1;
    const aim = { x: Math.max(rd.pos.x + 1.2, a.pos.x - 0.4), y: clamp(rd.pos.y + inside * this.insideBy, 0.5, FIELD_WIDTH - 0.5) };
    const back = this.flat ? this.reader.read(sim, this.flat) : null;
    // A committed flat threat under him: the quarters safety has #2 over the top, so he stops leading #2 at once
    // and holds a cushion over the back he sees (never closer to the line than 1 yd, never coming up to make it),
    // from #2's outside. Measured, not coached: the NFL apex sits ~9 yd over a flat back (apex_leverage_nfl.py,
    // 9.1-9.4 at 1.0-2.5 s), stand-in debt. With no flat threat he keeps carrying #2 to the hand-off.
    if (back) aim.x = Math.min(a.pos.x, Math.max(sim.los + 1, back.pos.x + APEX_CUSHION));
    const closing = Math.max(0, rd.vel.x - Math.max(0, a.vel.x));
    const turnTime = Math.PI / a.profile.turnRate;
    // With a flat threat under him he does not turn and run with #2 (the safety has him over the top); he stays
    // square to the quarterback (a choice: the coached apex keeps his eyes in the backfield, HNFL quarters notes).
    if (back) this.opened = false;
    else if (rd.vel.x > a.profile.vmax * a.profile.backpedal && a.pos.x - rd.pos.x < 1.2 + closing * turnTime) this.opened = true;
    const speed = this.opened ? 0.92 + 0.08 * a.r('zoneCoverage') : (0.8 + 0.15 * a.r('zoneCoverage')) * unsureFactor(a);
    const ff = { x: back ? Math.max(0, back.vel.x) : Math.max(0, rd.vel.x), y: rd.vel.y };
    const req = track(a, aim, ff, { facing: this.opened ? undefined : angleTo(a.pos, infoHonest(9) ? sim.see(a, sim.qb).pos : sim.qb.pos), speed, gain: 2 });
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

/**
 * CUT_WALL: wall a shallow crosser from his area. He holds his window: his landmark depth, or just under the deepest
 * route he sees sitting in his window behind him (the dig or curl he robs), never the crosser's depth. Laterally he
 * goes to the crosser's line only within his area, with no lead: square to the quarterback he moves by his shuffle,
 * and his rate across is what that body gives (a witness, not a cap). A crosser who comes to him inside his area and
 * at his window depth he steps into (a collision physics resolves); one that would pull him off his window he walls
 * without contact. Eyes on the quarterback throughout.
 */
export class CrossWall extends Technique {
  constructor(target: Agent, reader: ReleaseReader, gap: Gap, gapSign: number,
    private readonly area: Vec2, private readonly half: number) {
    super(target, reader, gap, gapSign);
  }

  protected move(a: Agent, sim: PlaySim): MoveCommand {
    const rd = this.reader.read(sim, this.target);
    if (!rd) return { vel: { x: 0, y: 0 } };
    const up = sim.attackDir('O');
    // His window depth: the landmark, or 1.5 yd under the deepest receiver he sees in his window behind him (choice:
    // between the QB and that route), never shallower than the landmark.
    let x = this.area.x;
    for (const o of sim.offense) {
      if (o === this.target || o === sim.qb) continue;
      const ro = this.reader.read(sim, o);
      if (!ro || Math.abs(ro.pos.y - this.area.y) > this.half) continue;
      const behind = (ro.pos.x - this.area.x) * up;
      if (behind > 0 && behind < 6) x = up > 0 ? Math.max(x, ro.pos.x - 1.5) : Math.min(x, ro.pos.x + 1.5);
    }
    const y = clamp(rd.pos.y, this.area.y - this.half, this.area.y + this.half);
    const reach = a.profile.reach + a.profile.radius + rd.r.profile.radius;
    // The collision is his choice: only inside his area and at his window depth.
    const contact = Math.abs(rd.pos.y - this.area.y) < this.half && Math.abs(rd.pos.x - x) < 1.2
      && Math.hypot(rd.pos.x - a.pos.x, rd.pos.y - a.pos.y) < reach + 1;
    const aim = contact ? { x: rd.pos.x, y: rd.pos.y } : { x, y: clamp(y, 0.5, FIELD_WIDTH - 0.5) };
    const qb = infoHonest(9) ? sim.see(a, sim.qb).pos : sim.qb.pos;
    const speed = (0.8 + 0.15 * a.r('zoneCoverage')) * unsureFactor(a);
    return withFacingTechnique(track(a, aim, { x: 0, y: 0 }, { facing: angleTo(a.pos, qb), speed, gain: 2 }),
      { label: contact ? 'cross-wall-collide' : 'cross-wall', key: rd.vel });
  }
}
