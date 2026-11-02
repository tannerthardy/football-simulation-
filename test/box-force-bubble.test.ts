import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { pressureIsInstallable } from '../src/playbook/call-integrity.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';
import { buildRunFits } from '../src/sim/run-fits.js';

// A force player aligned in the box gets an open inside bubble on his side
// (PR #398), but never in place of an inside duty he already has: a
// pressure's dropping end keeps the front's run gap he was installed with
// (Integration review of #398, comment 6589088018). Installed jobs only; no ticks.
const offense = generateTeam(new Rng(51), 'Bubble offense', 'BO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Bubble defense', 'BD', { strength: .55 });

/** Presentation only (as run-force-ownership): installed roles and landmarks stay. */
function present(sim: PlaySim, slot: string, lateral: number) {
  const a = sim.slot(slot as 'DE_W')!, side = Math.sign(a.pos.y - sim.ballY) || 1, y = sim.ballY + side * lateral;
  a.body.pos = { ...a.pos, y };
  sim.defAlign.spots[slot as 'DE_W']!.pos = { ...sim.defAlign.spots[slot as 'DE_W']!.pos, y };
}

function fits(formation: string, front: string, coverage: string, pressure: string | null, flip: boolean, at?: [string, number]) {
  const defCall: DefensivePlayCall = { personnel: 'nickel', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage],
    pressure: pressure ? PRESSURE_BY_ID[pressure] : null, label: 'Box force bubble' };
  if (pressure) expect(pressureIsInstallable('nickel', defCall.front, defCall.coverage, defCall.pressure!)).toBe(true);
  const sim = new PlaySim({ offense: pickOffense(offense, FORMATION_BY_ID[formation].personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID[formation], flip, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  if (at) present(sim, ...at);
  return { sim, jobs: buildRunFits(sim) };
}

describe('box force bubble', () => {
  for (const flip of [false, true]) {
    // At 5.4 yd (Integration's installed spot) he is inside the box filter; at
    // his own spot here too.
    it.each([['under', 'cover3', 'slug', 5.4], ['under', 'cover4', 'sting', 5.4], ['under', 'cover3', 'slug', 0], ['under', 'cover4', 'sting', 0]])(
      'a dropping end keeps his installed edge duty: ace_11 nickel %s %s %s at %s yd (0 = his own spot)', (front, coverage, pressure, at) => {
        const { sim, jobs } = fits('ace_11', front as string, coverage as string, pressure as string, flip, at ? ['DE_W', at as number] : undefined);
        const de = sim.slot('DE_W')!, job = jobs.get(de)!;
        expect(sim.defAlign.spots.DE_W!.role).toMatchObject({ kind: 'zone', zone: 'curl_flat_w' });
        expect(job.kind).toBe('force');
        expect(job.inside).toEqual({ gap: 'D', side: job.side, kind: 'edge' });
      });

    it(`opposing control: Over nickel cover3 slug keeps the dropper's inside C edge, flip=${flip}`, () => {
      const { sim, jobs } = fits('ace_11', 'over', 'cover3', 'slug', flip, ['DE_W', 5.4]);
      const de = sim.defense.find(d => sim.defAlign.spots[d.slot as 'DE_W']!.role.kind === 'zone' && d.slot.startsWith('DE'))!;
      expect(jobs.get(de)!.inside).toMatchObject({ gap: 'C', kind: 'edge' });
    });

    it(`positive control: a nickel forcing on the attached end still takes the open C inside him (Wide 9 Cover 1 vs Gun Doubles), flip=${flip}`, () => {
      const { sim, jobs } = fits('gun_doubles_11', 'wide9', 'cover1', null, flip);
      const nb = jobs.get(sim.slot('NB')!)!;
      expect(nb.kind).toBe('force');
      expect(nb.inside).toEqual({ gap: 'C', side: nb.side });
    });
  }
});
