/** LOOSE_SEEN (experimental, off; LOOSE_SEEN=1 turns it on): a fumble, a recovery and an interception are recognized
 * player by player from what each one perceives, not announced to all 22 on the tick they happen.
 *
 * Before: `onLooseBall` gave every player a scramble for the ball on the fumble's tick and dissolved every block;
 * the scramble ran at the ball's true position (`sim.ball.flight.pos`); a recovery or interception turned everyone
 * into a pursuer or blocker the same tick. A defender with his back to the play reacted to a ball he never saw.
 *
 * With it:
 * - Loose ball. Each player keeps his job until he recognizes it. He recognizes it when he sees the ball loose: a
 *   sample of the ball's flight, at the time his observation delay puts it, in his view and with a clear line
 *   (release-evidence's `sawAt`, the same rule the ball cue uses), or when he hears a teammate's call ('ball!'):
 *   a teammate who has recognized it within CALL_RANGE calls it, and he takes it in after his own observation delay.
 *   The man who lost it knows at once. His block, if he is in one, ends when he recognizes (either party releases
 *   it; the other is left standing in an engagement that is gone).
 * - The scramble runs to the ball as he last saw it, led by its seen velocity for LEAD s, and re-samples whenever the
 *   ball is in his view again (a bounce he did not see is chased where he last saw it). Called but not yet seen, he
 *   goes to where he last saw the man who lost it and looks.
 * - Recovery and interception. A player switches to pursuit (opponents) or blocking (teammates) when his delayed
 *   picture shows the new holder carrying the ball (the perception record's held possession, as ConvoyCue on a
 *   catch), or when he hears the call from a teammate who has (the interception's 'oskie'). Until then he plays the
 *   ball or his job as he sees it.
 * Stated choices: CALL_RANGE 20 yd (a shout carries across the play, not the field), LEAD 0.2 s (as the old scramble).
 */
import type { Vec2, Vec3 } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { sawAt } from '../release-evidence.js';
import { goTo, runThrough } from './common.js';
import { Pursuit } from './defense.js';
import { DownfieldBlocker } from './receiver.js';

export const LOOSE_SEEN = process.env.LOOSE_SEEN !== '0';
/** LOOSE_OWN (experimental, off; LOOSE_OWN=1 turns it on; docs/reviews/2026-11-16-loose-own.md): two reads of the
 * truth left in LOOSE_SEEN, removed. (1) Recognition and re-sighting were gated on the true ball state, so a player
 * whose delayed picture still showed the ball loose stopped recognizing it the tick someone else picked it up; with
 * it, his sighting alone decides (the true state stays in the producer, `recordLoose`, which only stores the flight he
 * samples). (2) A player who heard 'ball!' but had not seen it ran to where he saw the true fumbler; a shout tells him
 * a ball is loose and where the shout came from, not who lost it, so he runs toward the teammate who called. The man
 * who lost it still knows at once (he felt it leave). */
export const LOOSE_OWN = process.env.LOOSE_OWN === '1';
const CALL_RANGE = 20;
const LEAD = 0.2;

interface Sighting { at: number; pos: Vec3; vel: Vec3 }
interface LooseState {
  /** One sample of the loose ball a tick (it is not in the perception record). */
  flight: { t: number; pos: Vec3; vel: Vec3 }[];
  /** When each player (by index) recognized the loose ball, or the new holder's possession. */
  recognized: Map<number, number>;
  /** Each player's last sighting of the loose ball. */
  seen: Map<number, Sighting>;
  /** The man who lost it (for where a called player looks first). */
  lostBy: Agent | null;
}
const states = new WeakMap<PlaySim, LooseState>();

/** For tests: the loose-ball state (each player's sightings and recognitions, the man who lost it). */
export function looseStateForTest(sim: PlaySim): Readonly<LooseState> | undefined { return states.get(sim); }

function state(sim: PlaySim): LooseState {
  let s = states.get(sim);
  if (!s) { s = { flight: [], recognized: new Map(), seen: new Map(), lostBy: null }; states.set(sim, s); }
  return s;
}

function recordLoose(sim: PlaySim, s: LooseState): void {
  if (sim.ball.kind !== 'loose') return;
  const h = s.flight;
  if (!h.length || h[h.length - 1].t < sim.t - 1e-9) h.push({ t: sim.t, pos: { ...sim.ball.flight.pos }, vel: { ...sim.ball.flight.vel } });
  while (h.length > 64) h.shift();
}

/** His sighting of the loose ball this tick, if the sample his delay puts him at was in view and unobstructed. */
function sightLoose(sim: PlaySim, a: Agent, s: LooseState): Sighting | null {
  const delay = a.mind.observationDelay(a.profile.reactionTime);
  const back = Math.round(delay / sim.dt), at = sim.t - back * sim.dt;
  const b = s.flight.find((f) => Math.abs(f.t - at) < sim.dt / 2);
  if (!b || !sawAt(sim, a, back, { pos: { x: b.pos.x, y: b.pos.y } }, Math.max(0.1, b.pos.z))) return null;
  return { at, pos: b.pos, vel: b.vel };
}

/** Whether a teammate who recognized it (by `t - his delay`) is close enough for his call to be heard. */
function heardCall(sim: PlaySim, a: Agent, s: LooseState): boolean {
  return caller(sim, a, s) !== null;
}

/** The nearest teammate whose call he has heard (recognized by `t - his delay`, within CALL_RANGE), if any. */
export function caller(sim: PlaySim, a: Agent, s: LooseState): Agent | null {
  const delay = a.mind.observationDelay(a.profile.reactionTime);
  let best: Agent | null = null, bd = CALL_RANGE;
  for (const [idx, t] of s.recognized) {
    const o = sim.agents[idx];
    if (o === a || o.team !== a.team || t > sim.t - delay) continue;
    const d = Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y);
    if (d <= bd) { bd = d; best = o; }
  }
  return best;
}

function release(sim: PlaySim, a: Agent): void {
  const e = a.engagement;
  if (e) sim.disengage(e);
}

/** A loose ball: start each player's own recognition; nobody is told. */
export function looseSeenStart(sim: PlaySim): void {
  const s = state(sim);
  s.flight = []; s.seen.clear(); s.recognized.clear();
  s.lostBy = sim.ball.kind === 'loose' ? (sim.ball as { fumbledBy?: Agent }).fumbledBy ?? null : null;
  recordLoose(sim, s);
  for (const a of sim.agents) a.behavior = new LooseCue(a.behavior);
  if (s.lostBy) s.recognized.set(s.lostBy.idx, sim.t);
}

/** Keeps his job until he recognizes the loose ball himself, then scrambles for it on his own picture. */
export class LooseCue implements Behavior {
  constructor(private readonly prev: Behavior) {}
  get kind(): Behavior['kind'] { return this.prev.kind; }
  update(a: Agent, sim: PlaySim): MoveCommand {
    const s = state(sim);
    recordLoose(sim, s);
    if (LOOSE_OWN || sim.ball.kind === 'loose') {
      const sight = sightLoose(sim, a, s);
      if (sight) s.seen.set(a.idx, sight);
      if (s.recognized.has(a.idx) || sight || heardCall(sim, a, s)) {
        if (!s.recognized.has(a.idx)) s.recognized.set(a.idx, sim.t);
        release(sim, a);
        a.behavior = new LooseScramble();
        return a.behavior.update(a, sim);
      }
    }
    return this.prev.update(a, sim);
  }
}

/** Scramble for the ball as he last saw it; once someone has it, wait to see who before he pursues or blocks. */
export class LooseScramble implements Behavior {
  readonly kind = 'scramble-ball';
  update(a: Agent, sim: PlaySim): MoveCommand {
    const s = state(sim);
    recordLoose(sim, s);
    if (LOOSE_OWN || sim.ball.kind === 'loose') {
      const sight = sightLoose(sim, a, s);
      if (sight) s.seen.set(a.idx, sight);
    }
    const last = s.seen.get(a.idx);
    const shout = LOOSE_OWN && s.lostBy !== a ? caller(sim, a, s) : null;
    let spot: Vec2;
    if (last) spot = { x: last.pos.x + last.vel.x * LEAD, y: last.pos.y + last.vel.y * LEAD };
    else if (LOOSE_OWN) { if (s.lostBy === a) spot = a.pos; else if (shout) spot = sim.see(a, shout).pos; else return goTo(a, a.pos, { speed: 0.3 }); }
    else if (s.lostBy) spot = sim.see(a, s.lostBy).pos;
    else return goTo(a, a.pos, { speed: 0.3 });
    const d = Math.hypot(spot.x - a.pos.x, spot.y - a.pos.y);
    if (d > 12) return goTo(a, spot, { speed: 0.7 });
    return runThrough(a, spot, { speed: 1 });
  }
}

/** A recovery or an interception: the holder carries; everyone else switches when he sees it, or hears it called. */
export function possessionSeenStart(sim: PlaySim, holder: Agent): void {
  const s = state(sim);
  s.recognized.clear();
  s.recognized.set(holder.idx, sim.t);
  for (const a of sim.agents) if (a !== holder) a.behavior = new PossessionCue(a.behavior, holder);
}

/** Plays on until his picture shows the holder with the ball (or a teammate's call), then pursues or blocks. */
export class PossessionCue implements Behavior {
  constructor(private readonly prev: Behavior, private readonly holder: Agent) {}
  get kind(): Behavior['kind'] { return this.prev.kind; }
  update(a: Agent, sim: PlaySim): MoveCommand {
    const s = state(sim);
    const seen = sim.perception.perceive(this.holder.idx, a.mind.observationDelay(a.profile.reactionTime));
    if (seen.carrying === true || heardCall(sim, a, s)) {
      if (!s.recognized.has(a.idx)) s.recognized.set(a.idx, sim.t);
      release(sim, a);
      a.behavior = a.team === this.holder.team ? new DownfieldBlocker() : new Pursuit();
      return a.behavior.update(a, sim);
    }
    return this.prev.update(a, sim);
  }
}
