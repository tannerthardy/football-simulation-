import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { ScreenBlocker } from '../src/sim/behaviors/screen.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });

function screen(id: string, form: string, seed = 1) {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: SCREEN_BY_ID[id], label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over 3' },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
}
const runTo = (sim: PlaySim, t: number, each?: () => void) => { while (sim.phase === 'live' && sim.t < t - 1e-9) { sim.tick(); each?.(); } };
const isDL = (d: Agent | null) => !!d && /^(DE|DT|NT)/.test(d.slot);

describe('screen install (docs/football-handbook/screens.md)', () => {
  it('released linemen sell the pass until the count, then go block; a screen caught behind the line draws no 8-3-1 flag', () => {
    const sim = screen('rb_slip_screen', 'gun_doubles_11');
    sim.event('snap', sim.slot('C'));
    runTo(sim, 0.7);
    const line = sim.offense.filter(a => /^(LT|LG|C|RG|RT)$/.test(a.slot));
    expect(line.every(a => a.behavior.kind === 'pass-pro')).toBe(true);
    runTo(sim, 2.1);
    const released = line.filter(a => a.behavior instanceof ScreenBlocker);
    expect(released.map(a => (a.behavior as ScreenBlocker).job).sort()).toEqual(['in', 'out', 'up']);
    // The rule, over several reps: a screen caught behind the line draws no
    // ineligible-downfield flag, however far the released linemen have gone.
    let behind = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const rep = screen('rb_slip_screen', 'gun_doubles_11', seed);
      rep.event('snap', rep.slot('C'));
      runTo(rep, 8);
      if (!rep.events.some(e => e.type === 'catch') || rep.catchX > rep.los) continue;
      behind++;
      expect(rep.penalties.some(p => p.kind === 'ineligible_downfield')).toBe(false);
    }
    expect(behind).toBeGreaterThan(0);
  });

  it('perimeter blockers leave the rush alone before the throw and keep their job through the catch', () => {
    // The first completed snap among a few seeds (completion itself is not the contract).
    let caughtSnaps = 0;
    for (let seed = 1; seed <= 4 && caughtSnaps === 0; seed++) {
      const sim = screen('bunch_now_screen', 'gun_bunch_11', seed);
      sim.event('snap', sim.slot('C'));
      const blockers = sim.offense.filter(a => a.behavior instanceof ScreenBlocker);
      expect(blockers.length).toBe(2);
      let dlTarget = false, caught = false;
      runTo(sim, 3, () => {
        // The rush is the pass rush until the ball is out; a lineman who then
        // turns to chase the screen is a man to block like any other.
        if (sim.ball.kind === 'held' && sim.carrier === sim.qb)
          for (const a of blockers) if (a.behavior instanceof ScreenBlocker && isDL(a.behavior.target)) dlTarget = true;
        if (!caught && sim.events.some(e => e.type === 'catch')) {
          caught = true;
          expect(blockers.every(a => a.behavior instanceof ScreenBlocker)).toBe(true);
        }
      });
      expect(dlTarget).toBe(false);
      if (caught) caughtSnaps++;
    }
    expect(caughtSnaps).toBe(1);
  });
});
