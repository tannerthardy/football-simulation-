/** The actor's own already-computed steering goal, carried with this command.
 * This is a plan, not a new observation or a promise about future movement.
 * Symbols survive ordinary command spreads, but are not physics/record data.
 */
import type { Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';

export type MovementObjective =
  | { kind: 'fixed'; point: Vec2 }
  | { kind: 'moving'; point: Vec2; velocity?: Vec2 };

const objective = Symbol('own movement objective');
type PlannedCommand = MoveCommand & { [objective]?: MovementObjective };

export function withMovementObjective<T extends MoveCommand>(command: T, goal: MovementObjective): T {
  const snapshot: MovementObjective = goal.kind === 'fixed'
    ? { kind: 'fixed', point: { ...goal.point } }
    : { kind: 'moving', point: { ...goal.point }, velocity: goal.velocity && { ...goal.velocity } };
  return { ...command, [objective]: snapshot };
}

export function movementObjective(command: MoveCommand): MovementObjective | undefined {
  return (command as PlannedCommand)[objective];
}
