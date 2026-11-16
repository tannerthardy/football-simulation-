import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.SIGHT_PURE = '0'; }); // engine-72: fixture recorded on the query-order picture, before the per-pair sight history; the lane that owns it re-records with SIGHT_PURE on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { gapY } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { linePicture, liveGap, liveGapY } from '../src/sim/live-gaps.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(1), 'O', 'O'), defense = generateTeam(new Rng(2), 'D', 'D');
function setup(flip = false) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'gaps' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'gaps' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 1 });
  const observer = sim.defense.find((d) => d.slot.startsWith('LB'))!;
  const settle = () => { sim.t += 1; for (let k = 0; k < 30; k++) sim.perception.record(sim.agents); };
  return { sim, observer, settle };
}
const GAPS = ['A', 'B', 'C', 'D'] as const;

describe('live gaps move with the offensive bodies that form them', () => {
  it('equal the alignment landmarks at the snap', () => {
    const { sim, observer, settle } = setup();
    settle();
    for (const side of [1, -1]) for (const g of GAPS)
      expect(liveGapY(sim, observer, g, side)).toBeCloseTo(gapY(sim.offAlign, g, side), 6);
  });

  it('flow with a line that steps laterally, and only where it moved', () => {
    const { sim, observer, settle } = setup();
    const line = sim.offense.filter((o) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline);
    for (const o of line) o.body.pos = { x: o.pos.x, y: o.pos.y + 2 };
    settle();
    for (const side of [1, -1]) for (const g of GAPS)
      expect(liveGapY(sim, observer, g, side)).toBeCloseTo(gapY(sim.offAlign, g, side) + 2, 6);
    // Only the right guard moves: the gaps beside him shift half as far.
    const s = setup(), rg = s.sim.slot('RG')!, sign = Math.sign(rg.pos.y - CENTER_Y);
    rg.body.pos = { x: rg.pos.x, y: rg.pos.y + sign * 1 };
    s.settle();
    expect(liveGapY(s.sim, s.observer, 'A', sign) - gapY(s.sim.offAlign, 'A', sign)).toBeCloseTo(sign * .5, 6);
    expect(liveGapY(s.sim, s.observer, 'A', -sign)).toBeCloseTo(gapY(s.sim.offAlign, 'A', -sign), 6);
  });

  it('is mirror symmetric', () => {
    const a = setup(false), b = setup(true);
    // The strong-side tackle steps out in both; the flip mirrors the formation.
    const strongTackle = (s: typeof a) => ['LT', 'RT'].map((k) => s.sim.slot(k)!)
      .find((t) => Math.sign(t.pos.y - CENTER_Y) === s.sim.offAlign.strongSign)!;
    for (const s of [a, b]) {
      const t = strongTackle(s);
      t.body.pos = { x: t.pos.x, y: t.pos.y + s.sim.offAlign.strongSign * .8 };
      s.settle();
    }
    expect(a.sim.offAlign.strongSign).toBe(-b.sim.offAlign.strongSign);
    const sideOf = (s: typeof a) => s.sim.offAlign.strongSign;
    for (const g of GAPS) {
      const da = liveGapY(a.sim, a.observer, g, sideOf(a)) - CENTER_Y, db = liveGapY(b.sim, b.observer, g, sideOf(b)) - CENTER_Y;
      expect(Math.abs(da)).toBeCloseTo(Math.abs(db), 6);
    }
  });

  it('drops a puller from the surface so his neighbours bound the gap', () => {
    const { sim, observer, settle } = setup();
    const lg = sim.slot('LG')!, side = Math.sign(lg.pos.y - CENTER_Y), dir = sim.attackDir(lg.team);
    lg.body.pos = { x: lg.pos.x - dir * 1.2, y: lg.pos.y - side * 2.5 };
    settle();
    const picture = linePicture(sim, observer);
    expect(picture.departed.map((b) => b.agent.slot)).toEqual(['LG']);
    // The A gap on his side now lies between the center and the tackle, unmoved.
    expect(liveGapY(sim, observer, 'A', side)).toBeCloseTo(gapY(sim.offAlign, 'A', side), 6);
  });

  it('keeps a body he sees on a defender on the surface, whatever the engagement record says', () => {
    // Back and across, short of a pull's depth: a guard driven off his spot
    // or a puller on his first step. The same picture, with and without a
    // hidden block record, gives the same line.
    const pictured = (engaged: boolean, onDefender: boolean) => {
      const { sim, observer, settle } = setup();
      const lg = sim.slot('LG')!, side = Math.sign(lg.pos.y - CENTER_Y), dir = sim.attackDir(lg.team);
      lg.body.pos = { x: lg.pos.x - dir * .8, y: lg.pos.y - side * 1.5 };
      if (engaged) (lg as unknown as { engagement: unknown }).engagement = {};
      const dt = sim.defense.find((d) => d.slot.startsWith('DT'))!;
      dt.body.pos = onDefender ? { x: lg.pos.x + dir * .9, y: lg.pos.y } : { x: lg.pos.x + dir * 6, y: lg.pos.y + 8 };
      settle();
      const p = linePicture(sim, observer);
      return { departed: p.departed.map((b) => b.agent.slot), a: liveGapY(sim, observer, 'A', side) };
    };
    expect(pictured(true, false)).toEqual(pictured(false, false));
    expect(pictured(false, false).departed).toEqual(['LG']);
    expect(pictured(true, true)).toEqual(pictured(false, true));
    expect(pictured(false, true).departed).toEqual([]);
  });

  it('uses the observer\'s delayed picture, not the live bodies', () => {
    const { sim, observer, settle } = setup();
    settle();
    for (const o of sim.offense) o.body.pos = { x: o.pos.x, y: o.pos.y + 3 };
    sim.t += .05; // not yet perceived
    expect(liveGapY(sim, observer, 'B', 1)).toBeCloseTo(gapY(sim.offAlign, 'B', 1), 6);
  });

  it('describe a gap by its opening and its motion, from the bodies that bound it', () => {
    const { sim, observer, settle } = setup();
    const c = sim.slot('C')!, g = ['LG', 'RG'].map((k) => sim.slot(k)!).find((a) => Math.sign(a.pos.y - CENTER_Y) === 1)!;
    settle();
    const open = liveGap(sim, observer, 'A', 1);
    // The installed center-guard split (1.3 yd; wider under OL_SPLITS).
    const split = Math.abs(sim.offAlign.spots[g.slot].pos.y - sim.offAlign.spots.C.pos.y);
    expect(open.width).toBeCloseTo(split - c.profile.radius - g.profile.radius, 6);
    expect(open.vel).toBeCloseTo(0, 6);
    // The guard steps toward the center: the opening narrows.
    g.body.pos = { x: g.pos.x, y: g.pos.y - .4 };
    settle();
    expect(liveGap(sim, observer, 'A', 1).width).toBeCloseTo(open.width - .4, 6);
    // Both drift play side: the gap moves at its bounding bodies' mean speed.
    g.body.vel = { x: 0, y: 2 }; c.body.vel = { x: 0, y: 1 };
    settle();
    expect(liveGap(sim, observer, 'A', 1).vel).toBeCloseTo(1.5, 6);
    expect(liveGap(sim, observer, 'D', 1).width).toBe(Infinity);
  });
});
