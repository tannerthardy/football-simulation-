import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { pressureIsInstallable } from '../src/playbook/call-integrity.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefSlot } from '../src/playbook/types.js';
import { PassRusher } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

// A called blitzer takes his gap; the lineman in it moves at most one gap to the
// nearest open neighbour, or with none open stays as a two-gap player
// (technique 'control'). His pass-rush lane is the same gap, as on a called
// slant (Defense decisions on #396, 2026-11-02). Installed jobs and assigned
// rushers only; no ticks. I-Jumbo vs base 3-4 Bear Cover 0 (nose 0-tech).
const offense = generateTeam(new Rng(51), 'Slide offense', 'SO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Slide defense', 'SD', { strength: .55 });
const LINE = ['NT', 'DT_S', 'DT_W', 'DE_S', 'DE_W'] as const;

function make(pressure: string | null, kind: 'run' | 'pass', flip: boolean) {
  const defCall = { personnel: 'base34' as const, front: FRONT_BY_ID.bear34, coverage: COVERAGE_BY_ID.cover0,
    pressure: pressure ? PRESSURE_BY_ID[pressure] : null, label: 'Slide' };
  if (defCall.pressure) expect(pressureIsInstallable('base34', defCall.front, defCall.coverage, defCall.pressure)).toBe(true);
  const formation = FORMATION_BY_ID.i_jumbo_22;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base34'),
    offCall: kind === 'run' ? { formation, flip, kind, run: RUN_BY_ID.iz_strong, label: 'IZ' }
      : { formation, flip, kind, pass: Object.values(PASS_BY_ID)[0], label: 'Pass' },
    defCall, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const S = sim.offAlign.strongSign;
  const job = (slot: string) => { const j = sim.slot(slot as DefSlot)!.runFit!; return { gap: j.gap, side: j.side === S ? 'S' : 'W', technique: j.technique }; };
  const installed = (slot: string) => { const s = sim.defAlign.spots[slot as DefSlot]!; return { gap: s.gap, side: s.gapSign === S ? 'S' : 'W' }; };
  const lane = (slot: string) => {
    const b = sim.slot(slot as DefSlot)!.behavior as unknown as { laneGap: string; gapSign: number };
    expect(b).toBeInstanceOf(PassRusher);
    return { gap: b.laneGap, side: b.gapSign === S ? 'S' : 'W' };
  };
  return { sim, job, installed, lane };
}

describe('called blitzer and the lineman in his gap', () => {
  for (const flip of [false, true]) {
    it(`no pressure: no lineman moves, and each rushes his installed gap (flip=${flip})`, () => {
      for (const kind of ['run', 'pass'] as const) {
        const m = make(null, kind, flip);
        for (const slot of LINE) {
          expect(m.job(slot)).toMatchObject({ ...m.installed(slot), technique: 'attack' });
          if (kind === 'pass') expect(m.lane(slot)).toEqual(m.installed(slot));
        }
      }
    });

    it(`Mike A strong: the nose takes weak A (one gap), and rushes weak A while the Mike has strong A (flip=${flip})`, () => {
      for (const kind of ['run', 'pass'] as const) {
        const m = make('mike_a', kind, flip);
        expect(m.installed('NT')).toEqual({ gap: 'A', side: 'S' });
        expect(m.job('NT')).toEqual({ gap: 'A', side: 'W', technique: 'attack' });
        expect(m.job('LB_M')).toMatchObject({ gap: 'A', side: 'S' });
        for (const slot of ['DT_S', 'DT_W', 'DE_S', 'DE_W']) expect(m.job(slot)).toMatchObject(m.installed(slot));
        if (kind === 'pass') {
          expect(m.lane('NT')).toEqual({ gap: 'A', side: 'W' });
          for (const slot of ['DE_S', 'DE_W']) expect(m.lane(slot)).toEqual(m.installed(slot));
        }
      }
    });

    it(`Double A: neither neighbour is open, so the nose stays in his gap as a two-gap player and rushes his own lane (flip=${flip})`, () => {
      for (const kind of ['run', 'pass'] as const) {
        const m = make('double_a', kind, flip);
        expect(m.job('NT')).toEqual({ ...m.installed('NT'), technique: 'control' });
        expect(Math.abs(m.sim.slot('NT')!.pos.y - m.sim.ballY)).toBeLessThan(.5);
        expect(m.job('LB_M')).toMatchObject({ gap: 'A', side: 'S' });
        expect(m.job('LB_W')).toMatchObject({ gap: 'A', side: 'W' });
        for (const slot of ['DT_S', 'DT_W', 'DE_W']) expect(m.job(slot)).toMatchObject({ ...m.installed(slot), technique: 'attack' });
        if (kind === 'pass') {
          expect(m.lane('NT')).toEqual(m.installed('NT'));
          expect(m.lane('DE_W')).toEqual(m.installed('DE_W'));
        }
      }
    });
  }
});
