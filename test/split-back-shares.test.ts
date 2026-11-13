/** Split-back gun is called at its 2022 share of each personnel group, for
 * runs and passes, whichever formation pick the engine uses for runs. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { OffensiveCoordinator } from '../src/game/playcaller.js';
import { generateTeam } from '../src/league/team.js';
import type { Formation, PersonnelId } from '../src/playbook/types.js';

// 2022 weeks 1-9: split-back share of the group's snaps and of its runs.
const TRACKED: Partial<Record<PersonnelId, number[]>> = { '11': [.013, .012], '12': [.011, .014], '21': [.074, .063] };

describe('split-back formation shares', () => {
  for (const scheme of ['spread', 'power'] as const) for (const isPass of [false, true]) {
    it(`${scheme} ${isPass ? 'passes' : 'runs'} call split backs at the tracked share`, () => {
      const team = generateTeam(new Rng(3), 'Share', 'SHR');
      team.offScheme = scheme;
      const oc = new OffensiveCoordinator(team, new Rng(9)) as unknown as { chooseFormation(p: PersonnelId, pass: boolean): Formation };
      for (const [personnel, shares] of Object.entries(TRACKED) as Array<[PersonnelId, number[]]>) {
        const n = 20000;
        let split = 0;
        for (let i = 0; i < n; i++) if (oc.chooseFormation(personnel, isPass).tags.includes('split-backs')) split++;
        // Within sampling error of the tracked shares (of all snaps, or of runs).
        expect(split / n, `${scheme} ${personnel}`).toBeGreaterThan(Math.min(...shares) * .7);
        expect(split / n, `${scheme} ${personnel}`).toBeLessThan(Math.max(...shares) * 1.3);
      }
    });
  }
});
