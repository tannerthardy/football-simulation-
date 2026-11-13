/** FIT_BLITZ_SLIDE (run-fits.ts; experimental, off) and FIT_TE_GAP
 * (alignment.ts; experimental, off), ported from #396.
 * A called blitzer takes his gap; the lineman in it moves at most one gap to the
 * nearest open neighbour, or with none open stays as a two-gap player
 * (technique 'control'). His pass-rush lane is the same gap, as on a called
 * slant (Defense decisions on #396, 2026-11-02). Installed jobs and assigned
 * rushers only; no ticks. I-Jumbo vs base 3-4 Bear Cover 0 (nose 0-tech). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { DefSlot } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const LINE = ['NT', 'DT_S', 'DT_W', 'DE_S', 'DE_W'] as const;

async function load(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { pressureIsInstallable } = await import('../src/playbook/call-integrity.js');
  const { PASS_BY_ID, RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { Blitzer, PassRusher } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(51), 'Slide offense', 'SO', { strength: .55 });
  const defense = generateTeam(new Rng(52), 'Slide defense', 'SD', { strength: .55 });
  function make(pressure: string | null, kind: 'run' | 'pass', flip: boolean, front = 'bear34', personnel: 'base34' | 'base43' = 'base34', formationId = 'i_jumbo_22') {
    const defCall = { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover0,
      pressure: pressure ? PRESSURE_BY_ID[pressure] : null, label: 'Slide' };
    if (defCall.pressure) expect(pressureIsInstallable(personnel, defCall.front, defCall.coverage, defCall.pressure)).toBe(true);
    const formation = FORMATION_BY_ID[formationId];
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
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
  return { make, Blitzer };
}

describe('FIT_BLITZ_SLIDE: called blitzer and the lineman in his gap', () => {
  it('off: the nose keeps strong A under a Mike blitzing it (both own the gap)', async () => {
    const { make } = await load({ FIT_BLITZ_SLIDE: '0' });
    const m = make('mike_a', 'run', false);
    expect(m.job('NT')).toEqual({ gap: 'A', side: 'S', technique: 'attack' });
    expect(m.job('LB_M')).toMatchObject({ gap: 'A', side: 'S' });
  });

  for (const flip of [false, true]) {
    it(`no pressure: no lineman moves, and each rushes his installed gap (flip=${flip})`, async () => {
      const { make } = await load({ FIT_BLITZ_SLIDE: '1' });
      for (const kind of ['run', 'pass'] as const) {
        const m = make(null, kind, flip);
        for (const slot of LINE) {
          expect(m.job(slot)).toMatchObject({ ...m.installed(slot), technique: 'attack' });
          if (kind === 'pass') expect(m.lane(slot)).toEqual(m.installed(slot));
        }
      }
    });

    it(`Mike A strong: the nose takes weak A (one gap), and rushes weak A while the Mike has strong A (flip=${flip})`, async () => {
      const { make, Blitzer } = await load({ FIT_BLITZ_SLIDE: '1' });
      for (const kind of ['run', 'pass'] as const) {
        const m = make('mike_a', kind, flip);
        expect(m.installed('NT')).toEqual({ gap: 'A', side: 'S' });
        expect(m.job('NT')).toEqual({ gap: 'A', side: 'W', technique: 'attack' });
        expect(m.job('LB_M')).toMatchObject({ gap: 'A', side: 'S' });
        for (const slot of ['DT_S', 'DT_W', 'DE_S', 'DE_W']) expect(m.job(slot)).toMatchObject(m.installed(slot));
        if (kind === 'pass') {
          expect(m.lane('NT')).toEqual({ gap: 'A', side: 'W' });
          for (const slot of ['DE_S', 'DE_W']) expect(m.lane(slot)).toEqual(m.installed(slot));
          // The blitzer has the nose's old lane (Defense review).
          const mike = m.sim.slot('LB_M')!.behavior as unknown as { gap: string; gapSign: number };
          expect(mike).toBeInstanceOf(Blitzer);
          expect({ gap: mike.gap, side: mike.gapSign === m.sim.offAlign.strongSign ? 'S' : 'W' }).toEqual({ gap: 'A', side: 'S' });
        }
      }
    });

    it(`Double A: neither neighbour is open, so the nose stays in his gap as a two-gap player and rushes his own lane (flip=${flip})`, async () => {
      const { make } = await load({ FIT_BLITZ_SLIDE: '1' });
      for (const kind of ['run', 'pass'] as const) {
        const m = make('double_a', kind, flip);
        expect(m.job('NT')).toEqual({ ...m.installed('NT'), technique: 'control' });
        expect(Math.abs(m.sim.slot('NT')!.pos.y - m.sim.ballY)).toBeLessThan(.5);
        expect(m.job('LB_M')).toMatchObject({ gap: 'A', side: 'S' });
        expect(m.job('LB_W')).toMatchObject({ gap: 'A', side: 'W' });
        for (const slot of ['DT_S', 'DT_W', 'DE_W']) expect(m.job(slot)).toMatchObject({ ...m.installed(slot), technique: 'attack' });
        // DE_S is out of this line check: Double A's Cover 0 drops him into man coverage, so he is no rusher here.
        expect(m.sim.defAlign.spots.DE_S!.role.kind).toBe('man');
        if (kind === 'pass') {
          expect(m.lane('NT')).toEqual(m.installed('NT'));
          expect(m.lane('DE_W')).toEqual(m.installed('DE_W'));
        }
      }
    });
  }
});

describe('FIT_TE_GAP: the end on an attached tight end', () => {
  it('on: the 4-3 Over end head-up on the TE owns C and rushes outside him; the Sam takes D', async () => {
    const { make } = await load({ FIT_TE_GAP: '1' });
    for (const kind of ['run', 'pass'] as const) {
      const m = make(null, kind, false, 'over', 'base43', 'ace_11');
      expect(m.installed('DE_S')).toEqual({ gap: 'C', side: 'S' });
      expect(m.installed('LB_S')).toEqual({ gap: 'D', side: 'S' });
      if (kind === 'pass') expect(m.lane('DE_S')).toEqual({ gap: 'D', side: 'S' });
    }
  });

  it('off: the end owns D beside the Sam and C has no front owner', async () => {
    const { make } = await load({ FIT_TE_GAP: '0' });
    const m = make(null, 'run', false, 'over', 'base43', 'ace_11');
    expect(m.installed('DE_S')).toEqual({ gap: 'D', side: 'S' });
  });
});

