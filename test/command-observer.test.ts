import { describe, expect, it } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import { observeCommand, observeCommands, type CommandObservation } from '../src/sim/command-observer.js';
import type { PlaySim } from '../src/sim/playsim.js';

const actor = (idx: number) => ({ idx, behavior: { kind: 'man' } }) as Agent;
describe('opt-in command attribution', () => {
  it('does not inspect a payload or emit when no observer is installed', () => {
    const a = actor(21), data = { get command(): unknown { throw Error('Unexpected observation'); } };
    expect(() => observeCommand(a, 'behavior', data)).not.toThrow();
  });
  it('detaches nested values from the command and consumed picture', () => {
    const a = actor(21), sim = { t: 2.25 } as PlaySim;
    const command = { vel: { x: 1, y: -5 } }, seen = { pos: { x: 40, y: 25 }, age: .3 };
    const remove = observeCommands(sim, [a], e => {
      (e.command as typeof command).vel.y = 100;
      (e.seen as typeof seen).pos.y = 100;
    });
    observeCommand(a, 'objective', { command, seen }); remove();
    expect(command.vel.y).toBe(-5); expect(seen.pos.y).toBe(25);
  });
  it('limits registration to chosen actors and retains a newer registration on old cleanup', () => {
    const a = actor(21), other = actor(15), sim = { t: 2.25 } as PlaySim;
    const old: CommandObservation[] = [], current: CommandObservation[] = [];
    const removeOld = observeCommands(sim, [a], e => old.push(e));
    const removeCurrent = observeCommands(sim, [a], e => current.push(e));
    removeOld(); observeCommand(other, 'behavior', {}); observeCommand(a, 'behavior', {});
    sim.t = 2.30; observeCommand(a, 'world-input', {}); removeCurrent(); observeCommand(a, 'behavior', {});
    expect(old).toEqual([]);
    expect(current.map(e => [e.actor, e.t, e.stage])).toEqual([[21, 2.25, 'behavior'], [21, 2.30, 'world-input']]);
  });
});
