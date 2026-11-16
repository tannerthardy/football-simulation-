import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.SIGHT_PURE = '0'; }); // engine-72: fixture recorded on the query-order picture, before the per-pair sight history; the lane that owns it re-records with SIGHT_PURE on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(91), 'Memory offense', 'MOF');
const away = generateTeam(new Rng(92), 'Memory defense', 'MDF');
function fixture() {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'verts' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'match', label: 'Over Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  sim.qb.body.pos = { x: 35, y: 26 };
  return { sim, d: sim.slot('CB_S')! };
}
function pictures(f: ReturnType<typeof fixture>, x: number, y: number, vx = 0, vy = 0) {
  f.d.body.pos = { x, y }; f.d.body.vel = { x: vx, y: vy };
  for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
}
const middle = { x: 60, y: 26 };
function hideAll(f: ReturnType<typeof fixture>) {
  for (const d of f.sim.defense) { d.body.pos = { x: 20, y: 26 }; d.body.vel = { x: 0, y: 0 }; }
  for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
}

describe('QB acquired memory and coverage confirmation', () => {
  it('does not acquire a stale off-screen defender because only his hidden current position enters the cone', () => {
    const held = fixture(), hidden = fixture();
    for (const f of [held, hidden]) { pictures(f, 30, 46); f.sim.t = .2; }
    hidden.d.body.pos = { x: 50, y: 26 };
    expect(held.sim.see(held.sim.qb, held.d)).toEqual(hidden.sim.see(hidden.sim.qb, hidden.d));
    for (const f of [held, hidden]) f.sim.qbMind.observe(middle);
    expect(held.sim.qbMind.estimate(held.d)).toEqual(hidden.sim.qbMind.estimate(hidden.d));
    expect(held.sim.qbMind.postFeaturesObserved()).toEqual(hidden.sim.qbMind.postFeaturesObserved());
    expect(held.sim.rng.next()).toBe(hidden.sim.rng.next());
  });

  it('retains an in-cone delayed acquisition when the hidden current body has already left', () => {
    const held = fixture(), hidden = fixture();
    for (const f of [held, hidden]) { pictures(f, 50, 26); f.sim.t = .2; }
    hidden.d.body.pos = { x: 30, y: 46 };
    for (const f of [held, hidden]) f.sim.qbMind.observe(middle);
    expect(held.sim.qbMind.estimate(held.d)).toEqual(hidden.sim.qbMind.estimate(hidden.d));
    expect(hidden.sim.qbMind.estimate(hidden.d).pos).toEqual({ x: 50, y: 26 });
  });

  it('does not let the coverage signature refresh a defender absent from the look', () => {
    const shallow = fixture(), deep = fixture();
    pictures(shallow, 41, 50, -4); pictures(deep, 58, 50, 4);
    for (const f of [shallow, deep]) { f.sim.t = .2; f.sim.qbMind.observe({ x: 60, y: 8 }); }
    expect(shallow.sim.qbMind.estimate(shallow.d)).toEqual(deep.sim.qbMind.estimate(deep.d));
    expect(shallow.sim.qbMind.postFeaturesObserved()).toEqual(deep.sim.qbMind.postFeaturesObserved());
  });

  it('uses a real reacquisition to change the coverage picture, without consuming a random draw', () => {
    const f = fixture();
    pictures(f, 58, 50, 4); f.sim.t = .2;
    f.sim.qbMind.observe({ x: 60, y: 8 });
    const unseen = f.sim.qbMind.postFeaturesObserved();
    const rng = { ...f.sim.rng };
    f.sim.t = .3; f.sim.qbMind.observe({ x: 58, y: 50 });
    expect(f.sim.qbMind.postFeaturesObserved()[0]).toBeGreaterThan(unseen[0] + .8);
    expect({ ...f.sim.rng }).toEqual(rng);
  });

  it('retains the older peripheral picture and its existing memory-age allowance', () => {
    const f = fixture();
    pictures(f, 48, 39);
    for (let i = 0; i < 8; i++) {
      f.d.body.pos.x += .25;
      f.sim.perception.record(f.sim.agents);
    }
    f.sim.t = .2;
    const clear = f.sim.see(f.sim.qb, f.d), peripheral = f.sim.see(f.sim.qb, f.d, 1.7);
    expect(clear.pos).not.toEqual(peripheral.pos);
    f.sim.qbMind.observe(middle);
    expect(f.sim.qbMind.estimate(f.d).pos).toEqual(peripheral.pos);
    const memory = (f.sim.qbMind as unknown as { memory: Map<typeof f.d, { t: number }> }).memory.get(f.d)!;
    expect(memory.t).toBeCloseTo(.1);
  });

  it('uses pre-snap memory for a defender never reobserved rather than the live rotation', () => {
    const f = fixture();
    const preSnap = f.sim.qbMind.postFeaturesObserved();
    pictures(f, 75, 48, 5); f.sim.t = 1.5;
    expect(f.sim.qbMind.postFeaturesObserved()).toEqual(preSnap);
    expect(f.sim.qbMind.identified).toBe(false);
  });

  it('keeps the coverage signature independent of the coverage expectation used to fill old throw estimates', () => {
    const f = fixture();
    pictures(f, 50, 26, 4); f.sim.t = .2; f.sim.qbMind.observe(middle);
    f.sim.t = 1;
    f.sim.qbMind.belief = { cover1: 1 };
    const man = f.sim.qbMind.postFeaturesObserved();
    f.sim.qbMind.belief = { cover3: 1 };
    expect(f.sim.qbMind.postFeaturesObserved()).toEqual(man);
  });

  it('caps memory coasting instead of extrapolating an unobserved moving defender forever', () => {
    const f = fixture();
    pictures(f, 45, 26, 3); f.sim.t = .2; f.sim.qbMind.observe(middle);
    f.sim.t = 1;
    const held = f.sim.qbMind.postFeaturesObserved();
    f.sim.t = 3;
    expect(f.sim.qbMind.postFeaturesObserved()).toEqual(held);
  });

  it('classifies a look acquired at the processing milestone, not an unrelated fresh scan', () => {
    const f = fixture();
    pictures(f, 58, 50, 4); f.sim.t = f.sim.qbMind.identifyAt;
    const visible = f.sim.qbMind.postFeaturesObserved.bind(f.sim.qbMind);
    let classified: number[] | null = null;
    f.sim.qbMind.postFeaturesObserved = () => (classified = visible());
    f.sim.qbMind.observe({ x: 58, y: 50 });
    expect(classified).toEqual(visible());
    expect(f.sim.qbMind.identified).toBe(true);
    expect(f.sim.qbMind.justIdentified).toBe(true);
  });

  it('does not strengthen a coverage belief across processing milestones without acquiring a new picture', () => {
    const f = fixture();
    hideAll(f);
    const belief = { ...f.sim.qbMind.belief }, rng = { ...f.sim.rng };
    const held = f.sim.qbMind.postFeaturesObserved();
    for (const t of [f.sim.qbMind.identifyAt, f.sim.qbMind.identifyAt + .5, f.sim.qbMind.identifyAt + 1]) {
      f.sim.t = t; f.sim.qbMind.observe(middle);
      expect(f.sim.qbMind.postFeaturesObserved()).toEqual(held);
      expect(f.sim.qbMind.belief).toEqual(belief);
      expect(f.sim.qbMind.report.post).toBeUndefined();
      expect(f.sim.qbMind.identified).toBe(false);
      expect(f.sim.qbMind.justIdentified).toBe(false);
    }
    expect({ ...f.sim.rng }).toEqual(rng);
  });

  it.each(['clear', 'peripheral'] as const)('can process a real %s reacquisition after an earlier look supplied no new evidence', (mode) => {
    const f = fixture();
    hideAll(f);
    f.sim.t = f.sim.qbMind.identifyAt; f.sim.qbMind.observe(middle);
    const before = { ...f.sim.qbMind.belief }, rng = { ...f.sim.rng };
    pictures(f, 58, mode === 'clear' ? 26 : 43, 4);
    f.sim.t += .2; f.sim.qbMind.observe(middle);
    expect(f.sim.qbMind.identified).toBe(true);
    expect(f.sim.qbMind.justIdentified).toBe(true);
    expect(f.sim.qbMind.report.post).toBe(f.sim.qbMind.top());
    expect(f.sim.qbMind.belief).not.toEqual(before);
    expect({ ...f.sim.rng }).toEqual(rng);
  });

  it('does not reclassify an already consumed new look when the next processing opportunity has no reacquisition', () => {
    const f = fixture();
    hideAll(f); pictures(f, 58, 26, 4);
    f.sim.t = f.sim.qbMind.identifyAt; f.sim.qbMind.observe(middle);
    expect(f.sim.qbMind.identified).toBe(true);
    const belief = { ...f.sim.qbMind.belief }, report = { ...f.sim.qbMind.report };
    hideAll(f);
    f.sim.t = f.sim.qbMind.identifyAt + .5; f.sim.qbMind.observe(middle);
    expect(f.sim.qbMind.belief).toEqual(belief);
    expect(f.sim.qbMind.report).toEqual(report);
    expect(f.sim.qbMind.justIdentified).toBe(false);
    pictures(f, 58, 26, 4);
    f.sim.t += .2; f.sim.qbMind.observe(middle);
    expect(f.sim.qbMind.justIdentified).toBe(true);
  });

  it('keeps standard memory estimates and the classifier read-only between deliberate looks', () => {
    const f = fixture();
    pictures(f, 50, 26, 3); f.sim.t = .2; f.sim.qbMind.observe(middle);
    const snapshot = () => JSON.stringify({ belief: f.sim.qbMind.belief, report: f.sim.qbMind.report,
      identified: f.sim.qbMind.identified, justIdentified: f.sim.qbMind.justIdentified,
      memory: [...(f.sim.qbMind as unknown as { memory: Map<typeof f.d, unknown> }).memory.entries()]
        .map(([a, m]) => ({ slot: a.slot, memory: m })) });
    const state = snapshot(), rng = { ...f.sim.rng };
    f.sim.qbMind.estimate(f.d); f.sim.qbMind.postFeaturesObserved();
    f.sim.qbMind.estimate(f.d); f.sim.qbMind.postFeaturesObserved();
    expect(snapshot()).toBe(state);
    expect({ ...f.sim.rng }).toEqual(rng);
  });
});
