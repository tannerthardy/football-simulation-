import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_WIDTH } from '../src/core/field.js';
import { clamp } from '../src/core/vec.js';
import { alignDefense, alignOffense, fitPressStances, type DefensiveStanceBody } from '../src/playbook/alignment.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefSlot } from '../src/playbook/types.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';

const witness = JSON.parse(readFileSync(new URL('./fixtures/press-front-stance.json', import.meta.url), 'utf8')) as {
  los: number; bodies: DefensiveStanceBody[];
};
const panel = JSON.parse(readFileSync(new URL('../config/roster-screen.json', import.meta.url), 'utf8')) as {
  matchups: Array<Pick<PlaySetup, 'offense' | 'defense'>>;
};

function alignment(flip = false) {
  const off = alignOffense(FORMATION_BY_ID.ace_11, flip, witness.los, FIELD_WIDTH / 2);
  return alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover1,
    pressure: null, label: 'Under Cover 1' }, off, witness.bodies.map(b => b.slot));
}

function distance(a: DefensiveStanceBody, b: DefensiveStanceBody) {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
}

describe('initial pressed man stance around the fixed front', () => {
  it.each([false, true])('clears the saved A002 overlap while retaining lateral shade and duty, flip=%s', flip => {
    const bodies = structuredClone(witness.bodies);
    if (flip) for (const b of bodies) b.pos.y = FIELD_WIDTH - b.pos.y;
    const before = structuredClone(bodies), jobs = alignment(flip), originalJobs = structuredClone(jobs);
    const nb = bodies.find(b => b.slot === 'NB')!, end = bodies.find(b => b.slot === 'DE_S')!;
    expect(distance(nb, end)).toBeLessThan(nb.radius + end.radius);
    fitPressStances(jobs, bodies, witness.los);
    expect(jobs).toEqual(originalJobs);
    for (const [i, b] of bodies.entries()) {
      expect(b.radius).toBe(before[i].radius);
      expect(b.pos.y).toBe(before[i].pos.y);
      if (b !== nb) expect(b).toEqual(before[i]);
      else expect(b.pos.x).toBeCloseTo(end.pos.x + Math.sqrt((nb.radius + end.radius) ** 2 - (nb.pos.y - end.pos.y) ** 2), 12);
    }
    for (const other of bodies) if (other !== nb)
      expect(distance(nb, other)).toBeGreaterThanOrEqual(nb.radius + other.radius - 1e-12);
    expect(nb.pos.x - nb.radius).toBeGreaterThanOrEqual(witness.los);
    const once = structuredClone(bodies);
    fitPressStances(jobs, bodies, witness.los);
    expect(bodies).toEqual(once);
  });

  it('takes the closer forward stance when the teammate is behind the marker', () => {
    const bodies: DefensiveStanceBody[] = [
      { slot: 'NB', pos: { x: 36.2, y: 23.4 }, radius: .3 },
      { slot: 'DE_S', pos: { x: 36.5, y: 23.4 }, radius: .3 },
    ];
    fitPressStances(alignment(), bodies, 35);
    expect(bodies[0].pos).toEqual({ x: 35.9, y: 23.4 });
    expect(bodies[1].pos).toEqual({ x: 36.5, y: 23.4 });
  });

  it('does not resolve the front overlap by entering a nearby backfield teammate', () => {
    const bodies: DefensiveStanceBody[] = [
      { slot: 'NB', pos: { x: 36.2, y: 23.4 }, radius: .3 },
      { slot: 'DE_S', pos: { x: 35.9, y: 23.4 }, radius: .3 },
      { slot: 'LB_M', pos: { x: 36.9, y: 23.4 }, radius: .3 },
    ];
    const before = structuredClone(bodies);
    fitPressStances(alignment(), bodies, 35);
    expect(bodies[0].pos.x).toBeCloseTo(35.3, 12);
    expect(bodies.slice(1)).toEqual(before.slice(1));
    for (const other of bodies.slice(1)) expect(distance(bodies[0], other)).toBeGreaterThanOrEqual(.6 - 1e-12);
  });

  it('keeps the whole body on the defensive side when the forward escape would cross the LOS', () => {
    const bodies: DefensiveStanceBody[] = [
      { slot: 'NB', pos: { x: 35.4, y: 23.4 }, radius: .3 },
      { slot: 'DE_S', pos: { x: 35.6, y: 23.4 }, radius: .4 },
    ];
    fitPressStances(alignment(), bodies, 35);
    expect(bodies[0].pos.x).toBeCloseTo(36.3, 12);
  });

  it('leaves an already clear pressed layout exact', () => {
    const bodies = structuredClone(witness.bodies);
    bodies.find(b => b.slot === 'NB')!.pos.y += 2;
    const before = structuredClone(bodies);
    fitPressStances(alignment(), bodies, witness.los);
    expect(bodies).toEqual(before);
  });

  it.each(['off', 'zone', 'unassigned', 'front'] as const)('does not relocate a %s player', kind => {
    const bodies = structuredClone(witness.bodies), jobs = alignment();
    if (kind === 'off') jobs.spots.NB!.press = false;
    if (kind === 'zone') jobs.spots.NB!.role = { kind: 'zone', zone: 'hook_s' };
    if (kind === 'unassigned') delete jobs.spots.NB!.manTarget;
    if (kind === 'front') { jobs.spots.DE_S!.press = true; jobs.spots.DE_S!.role = { kind: 'man' }; jobs.spots.DE_S!.manTarget = 'Y'; jobs.spots.NB!.press = false; }
    const before = structuredClone(bodies);
    fitPressStances(jobs, bodies, witness.los);
    expect(bodies).toEqual(before);
  });
});

function setup(front: string, coverage: string): PlaySetup {
  return { ...panel.matchups[0],
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'OZ' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'stance setup' },
    los: 35, ballY: FIELD_WIDTH / 2, firstDownX: 45, seed: coverage === 'cover1' ? 71002 : 71001, audibles: false,
    // Declared matchup: the nickel presses the inline Y beside the end (the default gives him the slot).
    manPrefs: { overrides: { NB: 'Y', SS: 'H' } } };
}

describe('initial PlaySim staging hook', () => {
  it('fits A002 actual scattered bodies before installing blocking and priming observation history', () => {
    const sim = new PlaySim(setup('under', 'cover1'));
    const nb = sim.slot('NB')!, end = sim.slot('DE_S')!;
    expect(Math.hypot(nb.pos.x - end.pos.x, nb.pos.y - end.pos.y)).toBeGreaterThanOrEqual(nb.profile.radius + end.profile.radius - 1e-12);
    expect(sim.defAlign.spots.NB!.manTarget).toBe('Y');
    expect(sim.defAlign.spots.NB!.press).toBe(true);
    expect(sim.defAlign.spots.NB!.role.kind).toBe('man');
    for (const d of sim.defense) {
      const spot = sim.defAlign.spots[d.slot as DefSlot]!;
      expect(d.pos.y).toBe(clamp(spot.pos.y + d.mind.alignmentError, .5, FIELD_WIDTH - .5));
      if (d !== nb) expect(d.pos.x).toBe(spot.pos.x);
      expect(d.vel).toEqual({ x: 0, y: 0 });
      expect(d.facing).toBe(Math.PI);
    }
    // The first legitimate picture must reflect the installed physical stance.
    expect(sim.see(sim.slot('RT')!, nb).pos.x).toBeCloseTo(nb.pos.x, 12);
    expect(sim.snapX[nb.idx]).toBe(nb.pos.x);
    const endPosition = { ...end.pos }, nbPosition = { ...nb.pos };
    sim.tick();
    // Neither player has reacted: no initial overlap should move the front
    // through positional contact correction before either requests a step.
    expect(sim.intents[end.idx].vel).toEqual({ x: 0, y: 0 });
    expect(sim.intents[nb.idx].vel).toEqual({ x: 0, y: 0 });
    expect(end.pos).toEqual(endPosition);
    expect(nb.pos).toEqual(nbPosition);
  });

  it('keeps every clear Wide9/Quarters body at its original scattered stance', () => {
    const sim = new PlaySim(setup('wide9', 'cover4'));
    for (const d of sim.defense) {
      const spot = sim.defAlign.spots[d.slot as DefSlot]!;
      expect(d.pos).toEqual({ x: spot.pos.x, y: clamp(spot.pos.y + d.mind.alignmentError, .5, FIELD_WIDTH - .5) });
    }
  });
});
