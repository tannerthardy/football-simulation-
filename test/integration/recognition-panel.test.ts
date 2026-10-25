import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../../src/playbook/types.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { CoverageScouting } from '../../src/sim/qbmind.js';
import { ScoutingReport, gameSense, leaguePassLogOdds, type SnapContext } from '../../src/sim/recognition.js';

const home = generateTeam(new Rng(31), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(32), 'Away', 'AWY', { strength: 0.6 });
const formation = FORMATION_BY_ID.ace_12;
const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, 'base43');
const defCall: DefensivePlayCall = { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'c3' };

/** Linebackers over `plays` snaps: mean time of a first read that was right, and share who read it wrong first. */
function linebackers(playId: string, down: number, dist: number, plays = 24): { readAt: number; fooled: number } {
  const isRun = !!RUN_BY_ID[playId];
  const offCall: OffensivePlayCall = isRun ? { formation, flip: false, kind: 'run', run: RUN_BY_ID[playId], label: playId } : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[playId], label: playId };
  let t = 0;
  let n = 0;
  let wrong = 0;
  let all = 0;
  for (let seed = 1; seed <= plays; seed++) {
    const sim = new PlaySim({ offense, defense, offCall, defCall, los: 50, ballY: HASH_LEFT_Y, firstDownX: 50 + dist, seed, down });
    sim.run();
    for (const d of sim.defense.filter((x) => x.slot.startsWith('LB'))) {
      const r = d.recog!;
      all++;
      const truth = isRun ? 'run' : 'pass';
      if (r.changedMind || (r.read !== 'unsure' && r.read !== truth)) wrong++;
      else if (r.read === truth) {
        t += r.readAt;
        n++;
      }
    }
  }
  return { readAt: n ? t / n : Infinity, fooled: wrong / all };
}

describe('reading run and pass', () => {
  it('anticipates from the situation: pass reads come sooner on 3rd and long, run reads later', () => {
    const pass1 = linebackers('curl_flat', 1, 10);
    const pass3 = linebackers('curl_flat', 3, 10);
    expect(pass3.readAt).toBeLessThan(pass1.readAt - 0.2);
    const run1 = linebackers('iz_strong', 1, 10);
    const run3 = linebackers('iz_strong', 3, 10);
    expect(run3.readAt).toBeGreaterThan(run1.readAt + 0.2);
    // Plain reads on early downs are quick and right.
    expect(run1.fooled).toBeLessThan(0.1);
    expect(run1.readAt).toBeLessThan(0.6);
    expect(pass1.readAt).toBeLessThan(1.3);
  });

  it('play action fools linebackers when they expect run, not on 3rd and long', () => {
    const early = linebackers('pa_post_dig', 1, 10);
    const late = linebackers('pa_post_dig', 3, 10);
    expect(early.fooled).toBeGreaterThan(0.5);
    expect(late.fooled).toBeLessThan(0.2);
  });
});

