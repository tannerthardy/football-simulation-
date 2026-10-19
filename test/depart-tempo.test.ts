/** DEPART_TEMPO (experimental, off): a climber leaving a double team carries
 * the climb's tempo around the old man's hip instead of stopping on each
 * short-arc exit. Requests only; the route and its reads are unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The first departure off a double team in an inside-zone play: the
 * climber's command and the exit he is leaving toward, on that tick. */
async function firstDeparture(on: boolean, flip: boolean) {
  vi.stubEnv('DEPART_TEMPO', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { RunBlocker } = await import('../src/sim/behaviors/blocking.js');
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const cmds = (sim as unknown as { cmds: { vel: { x: number; y: number } }[] }).cmds;
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    for (const a of sim.offense) {
      const b = a.behavior instanceof RunBlocker ? a.behavior : null;
      const read = (b as unknown as { departureRead?: { exit: { x: number; y: number } | null; from?: { x: number; y: number } } } | null)?.departureRead;
      if (b?.plan.departure && read?.exit && read.from) return { t: sim.t, slot: a.slot, cmd: { ...cmds[a.idx].vel }, from: read.from, exit: read.exit };
    }
  }
  return null;
}

describe('DEPART_TEMPO', () => {
  it.each([false, true])('crosses the old man\'s hip at climb tempo, not a stop at each exit, flip=%s', async flip => {
    const off = await firstDeparture(false, flip), on = await firstDeparture(true, flip);
    expect(off).not.toBeNull();
    expect(on).not.toBeNull();
    // The plays are identical until the first departure.
    expect(on!.t).toBe(off!.t);
    expect(on!.slot).toBe(off!.slot);
    const chord = { x: on!.exit.x - on!.from.x, y: on!.exit.y - on!.from.y }, l = Math.hypot(chord.x, chord.y);
    const along = (v: { x: number; y: number }) => (v.x * chord.x + v.y * chord.y) / l;
    expect(along(on!.cmd)).toBeGreaterThan(along(off!.cmd) + 1);
  });
});
