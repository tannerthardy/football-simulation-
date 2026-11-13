import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { previewFreeMovement } from '../src/physics/movement-preview.js';
import { PassRusher } from '../src/sim/behaviors/defense.js';
import { runThrough } from '../src/sim/behaviors/common.js';
import { traits } from '../src/sim/engagement.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Constructed approach/control, not an ordinary-game film ID. Own contact is
 * created and ended through the existing engagement interface. Opponent
 * evidence is explicit and fixed; the World still executes finite movement. */
function stage(side: number, worked: boolean, plan = 'speed', gap: 'D' | 'B' = 'D', blockerSlot = 'RT') {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'rush finish control' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.wide9, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'rush finish control' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19,
  });
  const d = sim.slot('DE_S')!, b = sim.slot(blockerSlot)!;
  const rush = new PassRusher(d, sim, gap, side);
  // Installed speed-rush plan, independent of this fixture's random selection.
  Object.defineProperty(rush, 'plan', { value: plan });
  const recognition = d.recog!;
  d.behavior = rush; sim.t = 2;
  d.recog = null; d.readAt = 0;
  if (worked) {
    d.body.pos = { x: 37, y: CENTER_Y + side * 4 };
    b.body.pos = { x: 37, y: d.pos.y - side * .7 };
    expect(sim.engage(b, d, 'pass')).toMatchObject({ type: 'pass', blocker: b, defender: d });
    expect(rush.update(d, sim).vel).toEqual({ x: 0, y: 0 });
    sim.disengage(d.engagement!);
  }
  d.body.pos = { x: 36.5, y: CENTER_Y + side * 4 };
  d.body.vel = { x: -6, y: -side * 2 };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  const cue: Perceived = { pos: { x: 33, y: CENTER_Y }, vel: { x: .8, y: 0 },
    facing: 0, stance: null, pose: 'up', carrying: true, age: .15 };
  const see = vi.spyOn(sim, 'see').mockImplementation((_observer, target) => target === sim.qb
    ? structuredClone(cue)
    : { pos: { ...target.pos }, vel: { ...target.vel }, facing: target.body.facing,
      stance: null, pose: 'up', carrying: false, age: .15 });
  return { sim, d, rush, cue, see, recognition };
}

describe('finishing a pass rush after own contact', () => {
  it.each([-1, 1])('leaves the pre-block arc and redirects toward the acquired QB, side %s', side => {
    const old = stage(side, false), finish = stage(side, true);
    try {
      const before = structuredClone(finish.d.body), rng = { ...finish.sim.rng };
      const original = old.rush.update(old.d, old.sim), command = finish.rush.update(finish.d, finish.sim);
      expect(command.vel.x).toBeGreaterThan(original.vel.x);
      expect(-side * command.vel.y).toBeGreaterThan(-side * original.vel.y);
      expect(finish.d.body).toEqual(before);
      expect(finish.sim.rng).toEqual(rng);
      const baseline = previewFreeMovement(before, original, finish.sim.t, 12);
      const achieved = previewFreeMovement(before, command, finish.sim.t, 12);
      const distance = (p: typeof achieved[number]) => Math.hypot(p.pos.x - finish.cue.pos.x - finish.cue.vel.x * p.t,
        p.pos.y - finish.cue.pos.y - finish.cue.vel.y * p.t);
      expect(Math.min(...achieved.map(distance))).toBeLessThan(Math.min(...baseline.map(distance)));
      // The same World must brake/turn the residual velocity over time.
      expect(achieved[0].vel.x).toBeLessThan(0);
      expect(achieved[0].vel).not.toEqual(command.vel);
      expect(achieved.every(p => p.support === 'up')).toBe(true);
    } finally { old.see.mockRestore(); finish.see.mockRestore(); }
  });

  it('keeps the installed arc for a rusher who has not worked a block', () => {
    const { sim, d, rush, cue, see } = stage(1, false);
    try {
      const command = rush.update(d, sim);
      expect(command).toEqual(runThrough(d, { x: cue.pos.x - 1, y: cue.pos.y + 1.3 },
        { speed: 1, cutSkill: .8 + .45 * traits(d).bend }));
    } finally { see.mockRestore(); }
  });

  it('preserves a power rusher\'s existing finish without adding a proximity slowdown', () => {
    const old = stage(1, false, 'power'), finish = stage(1, true, 'power');
    try {
      expect(finish.rush.update(finish.d, finish.sim)).toEqual(old.rush.update(old.d, old.sim));
    } finally { old.see.mockRestore(); finish.see.mockRestore(); }
  });

  it('preserves the interior rush family, whose opening was not the edge-arc witness', () => {
    const old = stage(1, false, 'finesse', 'B'), finish = stage(1, true, 'finesse', 'B');
    try {
      for (const r of [old, finish]) r.d.body.pos.x = r.sim.los + .4;
      expect(finish.rush.update(finish.d, finish.sim)).toEqual(old.rush.update(old.d, old.sim));
    } finally { old.see.mockRestore(); finish.see.mockRestore(); }
  });

  it('does not turn an ongoing own block into a free rush request', () => {
    const { sim, d, rush, see } = stage(1, true);
    try {
      const b = sim.slot('RT')!;
      b.body.pos = { x: d.pos.x, y: d.pos.y - .7 };
      expect(sim.engage(b, d, 'pass')).toMatchObject({ type: 'pass', blocker: b, defender: d });
      const before = structuredClone(d.body);
      expect(rush.update(d, sim).vel).toEqual({ x: 0, y: 0 });
      expect(d.body).toEqual(before);
    } finally { see.mockRestore(); }
  });

  it('keeps the finish invariant to an unseen QB move until a new picture is acquired', () => {
    const { sim, d, rush, cue, see } = stage(1, true);
    try {
      const first = rush.update(d, sim);
      sim.qb.body.pos = { x: 20, y: CENTER_Y + 12 };
      sim.qb.body.vel = { x: -7, y: 4 };
      expect(rush.update(d, sim)).toEqual(first);
      cue.pos = { x: 35, y: CENTER_Y + 1 };
      expect(rush.update(d, sim)).not.toEqual(first);
    } finally { see.mockRestore(); }
  });
});


describe('the finishing phase belongs to worked line protection', () => {
  it('keeps the installed approach after a TE chip, then finishes after the RT block', () => {
    const opening = stage(-1, false), chip = stage(-1, true, 'speed', 'D', 'Y');
    try {
      // Equal bodies are already behind the line: a chip alone still does
      // not announce that the remaining line protection has been beaten.
      expect(chip.rush.update(chip.d, chip.sim)).toEqual(opening.rush.update(opening.d, opening.sim));
      const rt = chip.sim.slot('RT')!;
      rt.body.pos = { x: chip.d.pos.x, y: chip.d.pos.y + .7 };
      const contact = chip.sim.engage(rt, chip.d, 'pass')!;
      expect(contact).toBeTruthy();
      expect(chip.rush.update(chip.d, chip.sim).vel).toEqual({ x: 0, y: 0 });
      chip.sim.disengage(contact);
      expect(chip.rush.update(chip.d, chip.sim)).not.toEqual(opening.rush.update(opening.d, opening.sim));
    } finally { opening.see.mockRestore(); chip.see.mockRestore(); }
  });

  it('keeps the opening lane before the line even after own line contact', () => {
    const opening = stage(-1, false), worked = stage(-1, true);
    try {
      for (const f of [opening, worked]) f.d.body.pos.x = f.sim.los + .4;
      expect(worked.rush.update(worked.d, worked.sim)).toEqual(opening.rush.update(opening.d, opening.sim));
    } finally { opening.see.mockRestore(); worked.see.mockRestore(); }
  });

  it('preserves a newly acquired run read instead of continuing the finish', () => {
    const opening = stage(-1, false), worked = stage(-1, true);
    try {
      for (const f of [opening, worked]) { f.d.recog = f.recognition; f.d.recog.read = 'run'; }
      expect(worked.rush.update(worked.d, worked.sim)).toEqual(opening.rush.update(opening.d, opening.sim));
    } finally { opening.see.mockRestore(); worked.see.mockRestore(); }
  });

  it('preserves the qualified action through a controller-only plain-field round trip', () => {
    const f = stage(-1, true);
    try {
      const resumed = Object.assign(Object.create(PassRusher.prototype), JSON.parse(JSON.stringify(f.rush))) as PassRusher;
      expect(resumed.update(f.d, f.sim)).toEqual(f.rush.update(f.d, f.sim));
    } finally { f.see.mockRestore(); }
  });

  it('does not promote an old unqualified history flag into knowledge of a line block', () => {
    const opening = stage(-1, false), f = stage(-1, true);
    try {
      const saved = JSON.parse(JSON.stringify(f.rush));
      delete saved.workedLineBlock; saved.workedContact = true;
      const legacy = Object.assign(Object.create(PassRusher.prototype), saved) as PassRusher;
      expect(legacy.update(f.d, f.sim)).toEqual(opening.rush.update(opening.d, opening.sim));
    } finally { opening.see.mockRestore(); f.see.mockRestore(); }
  });
});
