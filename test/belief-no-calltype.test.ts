/** A defender's run/pass belief is his own read (recognition.ts), never the offense's play type. Without a recognition
 * he is unsure: believesRun and knowsPass are both false whatever the call, however late in the play. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { believesRun, knowsPass } from '../src/sim/behaviors/defense.js';

function sim(kind: 'run' | 'pass') {
  const f = FORMATION_BY_ID.ace_12;
  return new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), f.personnel),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'base43'),
    offCall: { formation: f, flip: false, kind, run: kind === 'run' ? RUN_BY_ID.iz_strong : undefined, pass: kind === 'pass' ? PASS_BY_ID.pa_flood : undefined, label: 't' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 't' },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 7 } as never);
}

describe('defensive belief comes from the defender, not the play call', () => {
  it('without a recognition a defender is unsure on a run call and on a pass call', () => {
    for (const kind of ['run', 'pass'] as const) {
      const s = sim(kind);
      while (s.t < 1.0) s.tick();
      for (const d of s.defense) {
        d.recog = null;
        expect(believesRun(s, d), `${kind} ${d.slot} believesRun`).toBe(false);
        expect(knowsPass(s, d), `${kind} ${d.slot} knowsPass`).toBe(false);
      }
    }
  });
  it('with a recognition, the belief is his read', () => {
    const s = sim('run');
    while (s.t < 1.5) s.tick();
    for (const d of s.defense) {
      expect(believesRun(s, d)).toBe(d.recog!.read === 'run');
      expect(knowsPass(s, d)).toBe(d.recog!.read === 'pass');
    }
  });
});
