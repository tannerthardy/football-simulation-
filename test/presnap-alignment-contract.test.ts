import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { alignDefense, alignOffense, type DefenseAlignment, type OffenseAlignment } from '../src/playbook/alignment.js';
import { coverageHasNamedZonePlayers } from '../src/playbook/call-integrity.js';
import { COVERAGES, COVERAGE_BY_ID, FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefPersonnelId, type DefSlot } from '../src/playbook/types.js';

// Pre-snap alignment contract (docs/FORMATION_CATALOG_PLAN.md, phase 0): every
// installable personnel × front × coverage (no pressure) against every
// formation, both flips, three ball spots.
const LOS = 40;
const BALL = [HASH_LEFT_Y, 26.67, 53.33 - HASH_LEFT_Y];
const present = (p: DefPersonnelId) => Object.keys(DEF_PERSONNEL[p]) as DefSlot[];

function* everyAlignment(): Generator<{ off: OffenseAlignment; d: DefenseAlignment; tag: string; look: string }> {
  for (const f of FORMATIONS) for (const flip of [false, true]) for (const ball of BALL) {
    const off = alignOffense(f, flip, LOS, ball);
    for (const personnel of Object.keys(DEF_PERSONNEL) as DefPersonnelId[]) {
      for (const front of FRONTS.filter((x) => x.personnel.includes(personnel))) for (const coverage of COVERAGES) {
        if (!coverageHasNamedZonePlayers(personnel, coverage)) continue;
        const d = alignDefense({ personnel, front, coverage, pressure: null, label: '' }, off, present(personnel));
        yield { off, d, tag: `${personnel}/${front.id}/${coverage.id} vs ${f.id}${flip ? ' flip' : ''} @${ball}`, look: coverage.look ?? coverage.shell };
      }
    }
  }
}

describe('pre-snap alignment contract', () => {
  it('never puts two defenders on one spot or in contact, and every shell shows its deep players', () => {
    const stacked: string[] = [], close: string[] = [], shell: string[] = [];
    let lineClose = 0;
    for (const { d, tag, look } of everyAlignment()) {
      const ds = Object.values(d.spots);
      for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
        const gap = Math.hypot(ds[i]!.pos.x - ds[j]!.pos.x, ds[i]!.pos.y - ds[j]!.pos.y);
        if (gap < 0.05) stacked.push(`${tag}: ${ds[i]!.slot}-${ds[j]!.slot}`);
        const offBall = ds[i]!.pos.x - LOS > 2 && ds[j]!.pos.x - LOS > 2;
        if (gap < 0.7 && offBall) close.push(`${tag}: ${ds[i]!.slot}-${ds[j]!.slot} ${gap.toFixed(2)}`);
        else if (gap < 0.7) lineClose++;
      }
      const deep = ds.filter((s) => s!.pos.x - LOS > 8).length;
      if (look !== 'zero' && deep < (look === 'two-high' ? 2 : 1)) shell.push(`${tag}: ${deep} deep`);
    }
    expect(stacked.slice(0, 5)).toEqual([]);
    expect(shell.slice(0, 5)).toEqual([]);
    // Inside 0.7 yd two bodies touch (0.9 of their radii). Off the ball nobody
    // starts in contact.
    expect(close.slice(0, 5)).toEqual([]);
    // At the line, a ratchet: a DB pressing an attached end or wing beside the
    // end man (man calls; fitPressStances fits his stance when the play is
    // staged). Each fix lowers this ceiling (1,986 before the tracked wing width).
    expect(lineClose).toBeLessThanOrEqual(897);
  });

  it('a backer with a back in man keeps his front spot; the two I backs get two defenders', () => {
    const off = alignOffense(FORMATION_BY_ID.i_pro_21, false, LOS, 26.67);
    const d = alignDefense({ personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: '' }, off, present('base43'));
    const onBacks = (Object.values(d.spots)).filter((s) => s!.manTarget && off.spots[s!.manTarget].backfield);
    expect(onBacks.length).toBe(2);
    const [a, b] = onBacks;
    expect(Math.hypot(a!.pos.x - b!.pos.x, a!.pos.y - b!.pos.y)).toBeGreaterThan(1);
    for (const s of onBacks) expect(s!.slot.startsWith('LB')).toBe(true);
  });

  it('Cover 1 Lurk shows its post safety deep before the snap', () => {
    const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, LOS, 26.67);
    const d = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_lurk, pressure: null, label: '' }, off, present('nickel'));
    expect(d.spots.SS!.pos.x - LOS).toBeGreaterThan(12);
  });
});
