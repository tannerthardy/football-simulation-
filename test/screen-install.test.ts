import { bodyRadius } from '../src/physics/bodyshape.js';
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID, SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { ScreenBlocker } from '../src/sim/behaviors/screen.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });

function screen(id: string, form: string, seed = 1, coverage = 'cover3', audibles = false) {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: SCREEN_BY_ID[id], label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7, audibles });
}
const runTo = (sim: PlaySim, t: number, each?: () => void) => { while (sim.phase === 'live' && sim.t < t - 1e-9) { sim.tick(); each?.(); } };
const isDL = (d: Agent | null) => !!d && /^(DE|DT|NT)/.test(d.slot);

function rpo(coverage: string, seed: number) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID.iz_strong, rpo: SCREEN_BY_ID.wide_now_screen, label: 'iz_now_rpo' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
}

describe('screen install (docs/football-handbook/screens.md)', () => {
  it('a run-pass option hands off against press and throws two-on-two off coverage, the line run-blocking within a yard until the throw', () => {
    for (const seed of [1, 2]) expect(rpo('cover1', seed).offCall.kind).toBe('run');
    const thrown = rpo('cover3', 2);
    expect(thrown.offCall.kind).toBe('pass');
    expect(thrown.offCall.pass?.id).toBe('wide_now_screen');
    expect(thrown.offense.filter(a => /^(LT|LG|C|RG|RT)$/.test(a.slot)).every(a => a.behavior.kind === 'run-block')).toBe(true);
    // Cover 2 seed 12: the center climbs 1.9 yd past the line before the
    // throw if nothing holds him within a yard (RpoRunBlocker).
    for (const [coverage, seed] of [['cover3', 2], ['cover2', 12]] as const) {
      const rep = rpo(coverage, seed);
      expect(rep.offCall.kind).toBe('pass');
      const ol = rep.offense.filter(a => /^(LT|LG|C|RG|RT)$/.test(a.slot));
      rep.event('snap', rep.slot('C'));
      let past = false;
      runTo(rep, 6, () => {
        if (rep.ball.kind === 'held' && rep.carrier === rep.qb)
          for (const a of ol) if (!a.engagement && a.pos.x - bodyRadius(a.body, 1, 0) > rep.los + 1) past = true;
      });
      expect(past).toBe(false);
      expect(rep.penalties.some(p => p.kind === 'ineligible_downfield')).toBe(false);
    }
  });

  it('a now screen with a press kill is checked out of against press, and run against off coverage', () => {
    for (const seed of [1, 2]) {
      expect(screen('wide_now_screen', 'gun_doubles_11', seed, 'cover1', true).offCall.pass?.id).not.toBe('wide_now_screen');
      expect(screen('wide_now_screen', 'gun_doubles_11', seed, 'cover1_off', true).offCall.pass?.id).toBe('wide_now_screen');
      expect(screen('wide_now_screen', 'gun_doubles_11', seed, 'cover3', true).offCall.pass?.id).toBe('wide_now_screen');
    }
  });

  it('released linemen sell the pass, stay within a yard of the line until the throw (8-3-1), then block the screen', () => {
    const sim = screen('rb_slip_screen', 'gun_doubles_11');
    sim.event('snap', sim.slot('C'));
    runTo(sim, 0.7);
    const line = sim.offense.filter(a => /^(LT|LG|C|RG|RT)$/.test(a.slot));
    expect(line.every(a => a.behavior.kind === 'pass-pro')).toBe(true);
    runTo(sim, 2.1);
    const released = line.filter(a => a.behavior instanceof ScreenBlocker);
    expect(released.map(a => (a.behavior as ScreenBlocker).job).sort()).toEqual(['in', 'out', 'up']);
    // The rule, over several reps: before the throw no released lineman's
    // whole body is more than a yard past the line (his rearmost point past
    // LOS + 1), and no rep draws the ineligible-downfield flag.
    // Slip reps, and TE screens vs Cover 3 whose linemen went downfield early
    // (flagged) when nothing held them within a yard before the throw.
    const reps: [string, string, number][] = [1, 2, 3].map(sd => ['rb_slip_screen', 'gun_doubles_11', sd]);
    for (const sd of [5, 9, 10, 14]) reps.push(['te_screen', 'gun_trey_11', sd]);
    for (const [id, form, seed] of reps) {
      const rep = screen(id, form, seed);
      rep.event('snap', rep.slot('C'));
      const ol = rep.offense.filter(a => /^(LT|LG|C|RG|RT)$/.test(a.slot));
      let past = false;
      runTo(rep, 8, () => {
        if (rep.ball.kind === 'held' && rep.carrier === rep.qb)
          for (const a of ol) if (a.behavior instanceof ScreenBlocker && !a.engagement
            && a.pos.x - bodyRadius(a.body, 1, 0) > rep.los + 1) past = true;
      });
      expect(past).toBe(false);
      expect(rep.penalties.some(p => p.kind === 'ineligible_downfield')).toBe(false);
    }
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
