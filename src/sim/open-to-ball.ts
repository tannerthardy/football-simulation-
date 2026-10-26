/**
 * Which way a defender turns. A defender reversing direction near the ball
 * plants and opens toward the ball he sees: he turns through the side that
 * keeps the carrier in front of him, not the shortest arc through his back.
 * The requested facing is unchanged; only the rotation path is chosen, so a
 * longer turn costs real time. Turns that end facing away (turn and run with
 * a vertical, chase a carrier who is past) keep the shortest arc.
 */
import { angleDiff } from '../core/vec.js';
import { commandFacing, type MoveCommand } from '../physics/kinematics.js';
import type { Agent } from './agent.js';
import { believesRun } from './behaviors/defense.js';
import type { PlaySim } from './playsim.js';
import { observedHolder, qbRunning } from './possession-read.js';

/** A turn endpoint further than this from the ball is facing away. */
const AWAY = 5 * Math.PI / 6;
/** Waypoint step: under half a turn, so the motor follows the chosen side. */
const STEP = 2 * Math.PI / 3;
/** Beyond this the carrier is not the defender's immediate key. */
const RANGE = 10;

export function openToBall(a: Agent, sim: PlaySim, command: MoveCommand): MoveCommand {
  if (sim.ball.kind !== 'held' || a.engagement || a.isDown(sim.t)) return command;
  if (sim.bond?.tacklers.includes(a)) return command;
  // He opens to the ball he has seen, not to the true possession: a fake or
  // a handoff he hasn't picked up leaves his turn as requested.
  const read = observedHolder(a, sim);
  if (!read) return command;
  const { target: c, cue: seen } = read;
  // Run phase only: a pocket QB is not the threat a coverage player turns on.
  if (c === sim.qb && !believesRun(sim, a) && !qbRunning(a, sim)) return command;
  const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
  if (Math.hypot(dx, dy) > RANGE) return command;
  const ball = Math.atan2(dy, dx);
  const facing = a.body.facing;
  const wanted = commandFacing(a.body, command);
  const from = angleDiff(ball, facing), to = angleDiff(ball, wanted);
  if (Math.abs(from) > AWAY || Math.abs(to) > AWAY) return command;
  // Relative to the ball, the unwrapped difference never crosses his back.
  const open = to - from;
  if (Math.abs(open) <= Math.PI) return command;
  return { ...command, facing: facing + Math.sign(open) * Math.min(Math.abs(open), STEP) };
}
