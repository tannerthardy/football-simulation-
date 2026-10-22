/**
 * G3: a pattern-match underneath defender carries a seam from its declared
 * vertical stem. He used to start only once the seam was 2 yd deep at 4.5
 * yd/s; until then the lane logic pulled him downhill toward the stem, and
 * the seam ran past him while he was slow (the wide slot's curl/flat
 * finished 6 yd behind). A spot dropper sits at his landmark and is the
 * control. Rule-driven seats keep their rules' carries
 * (coverage-rules.test.ts, cover6-half-side.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { ZoneStyle } from '../src/playbook/types.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(21), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(22), 'Away', 'AWY', { strength: 0.6 });
const LOS = 35;

/** Plain Cover 3 against four verticals, the QB holding the ball: the nearest
 * underneath zone defender's distance from each inside seam when it reaches
 * 14 yd, averaged over `plays` reps. */
function seamGap(style: ZoneStyle, plays: number): number {
  let sum = 0, n = 0;
  for (let seed = 1; seed <= plays; seed++) {
    const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'seams' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: style, label: 'seams' },
      los: LOS, ballY: HASH_LEFT_Y, firstDownX: LOS + 10, seed });
    sim.qb.behavior = { kind: 'qb-hold', update: (a) => goTo(a, { x: LOS - 7, y: HASH_LEFT_Y }, { facing: 0, speed: 0.5 }) };
    const under = sim.defense.filter(d => d.behavior instanceof ZoneCoverage && !d.behavior.zone.startsWith('deep'));
    const seams = ['Y', 'H'].map(s => sim.slot(s)!), done = new Set<string>();
    const step = sim as unknown as { tick(): void };
    while (sim.phase === 'live' && sim.t < 3.2 && done.size < seams.length) {
      step.tick();
      for (const w of seams) if (!done.has(w.slot) && w.pos.x - LOS >= 14) {
        done.add(w.slot);
        sum += Math.min(...under.map(d => Math.hypot(d.pos.x - w.pos.x, d.pos.y - w.pos.y)));
        n++;
      }
    }
  }
  return sum / Math.max(1, n);
}

describe('pattern-match underneath defenders carry the seams', () => {
  it('end nearer the seams at 14 yd than spot droppers sitting at their landmarks', () => {
    expect(seamGap('match', 6)).toBeLessThan(seamGap('spot', 6) - 0.4);
  });
});
