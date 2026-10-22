import { describe, expect, it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { PassConcept, ReceiverRef } from '../src/playbook/types.js';
import { QBPass } from '../src/sim/behaviors/qb.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(21), 'Home', 'HOM');
const away = generateTeam(new Rng(22), 'Away', 'AWY');

function installed(concept: PassConcept): PlaySim {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return new PlaySim({
    offense: pickOffense(home, formation.personnel), defense: pickDefense(away, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: concept.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'control' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5,
  });
}

function firstRead(sim: PlaySim): string | null {
  const qb = sim.qb.behavior as QBPass;
  const index = qb.recordedState().read;
  return index == null ? null : sim.agents[index].slot;
}

describe('installed offensive contracts', () => {
  it('every catalog formation has seven on the line and uncovered skill ends at either hash and flip', () => {
    // Our formation notation calls depth <= .6 on and > .6 off. This checks
    // that declared install, not anatomical NFL head/waist alignment.
    for (const formation of FORMATIONS) for (const flip of [false, true])
      for (const ballY of [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y]) {
        const aligned = alignOffense(formation, flip, 40, ballY);
        const onSkills = Object.entries(formation.slots).filter(([, spot]) => spot!.depth <= .6).map(([slot]) => slot);
        const onLine = ['LT', 'LG', 'C', 'RG', 'RT', ...onSkills]
          .sort((a, b) => aligned.spots[a].pos.y - aligned.spots[b].pos.y);
        expect(Object.keys(aligned.spots), formation.id).toHaveLength(11);
        expect(onLine, formation.id).toHaveLength(7);
        expect(onSkills.every(slot => slot === onLine[0] || slot === onLine.at(-1)), formation.id).toBe(true);
      }
  });

  it('keeps the dual attached TE surface when its exterior X is moved off the line', () => {
    for (const id of ['ace_12', 'pistol_12', 'i_jumbo_22', 'heavy_13']) {
      const formation = FORMATION_BY_ID[id];
      const aligned = alignOffense(formation, false, 40, CENTER_Y);
      expect(formation.slots.X!.depth).toBeGreaterThan(.6);
      expect(aligned.hasTE).toEqual({ S: true, W: true });
      // The edge is each attached end (3.9 yd from the ball on the installed line).
      const ends = Object.values(aligned.spots).filter(s => s.inline).map(s => Math.abs(s.pos.y - CENTER_Y));
      expect(ends).toHaveLength(2);
      expect(Math.abs(aligned.coreEdge.S - CENTER_Y)).toBeCloseTo(ends[0], 12);
      expect(Math.abs(aligned.coreEdge.W - CENTER_Y)).toBeCloseTo(ends[1], 12);
    }
  });

  it('does not put a permanently protecting inline TE first in PA Shot', () => {
    const sim = installed(PASS_BY_ID.pa_shot);
    expect(sim.offAlign.numbering.S2).toBe('Y');
    expect(sim.slot('Y')!.behavior.kind).toBe('pass-pro');
    expect(firstRead(sim)).not.toBe('Y');
  });

  it('retains a back who checks protection before releasing', () => {
    const sim = installed({ ...PASS_BY_ID.curl_flat, progression: ['B'] });
    expect(sim.slot('RB')!.behavior.kind).toBe('pass-pro');
    expect(firstRead(sim)).toBe('RB');
  });

  it('preserves receiving responsibility through a play-action fake wrapper', () => {
    for (const back of ['check', 'swing'] as const) {
      const sim = installed({ ...PASS_BY_ID.pa_shot, back, progression: ['B'] });
      expect(sim.slot('RB')!.behavior.kind).toBe('pa-fake');
      expect(firstRead(sim)).toBe('RB');
    }
  });

  it('a permanently blocking back is not a receiving option even through a fake', () => {
    const sim = installed({ ...PASS_BY_ID.pa_shot, progression: ['B', 'S1'] as ReceiverRef[] });
    expect(sim.slot('RB')!.behavior.kind).toBe('pa-fake');
    expect(firstRead(sim)).not.toBe('RB');
  });
});
