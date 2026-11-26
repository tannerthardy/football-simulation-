import { describe, expect, it, vi } from 'vitest';

// The dual-force scene is staged on the installed seats (the Will as the Buzz
// curl-flat player); BOX_ALIGN deals seats after its walk-outs (PR #194).
vi.hoisted(() => { process.env.BOX_ALIGN = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { alignOffense, gapY } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, DefSlot, ZoneId } from '../src/playbook/types.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { describeDefense } from '../src/playbook/ir/describe.js';
import { runFitJobs } from '../src/playbook/ir/fits.js';
import { buildRunFits, FIT_RULES, FOLD_HOLD, executeRunFit, type RunFitJob } from '../src/sim/run-fits.js';

const offense = generateTeam(new Rng(51), 'Force offense', 'FO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Force defense', 'FD', { strength: .55 });

function make(coverage: string, flip = false, patch: Partial<DefensivePlayCall> = {}) {
  const formation = FORMATION_BY_ID.ace_11;
  const defCall: DefensivePlayCall = { personnel: 'nickel', front: FRONT_BY_ID.over,
    coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'Force ownership',
    runPolicy: { edge: 'spill', linebacker: 'stack' }, ...patch };
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, defCall.personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
}

function seat(sim: PlaySim, zone: ZoneId): Agent {
  const seats = sim.defense.filter(a => {
    const role = sim.defAlign.spots[a.slot as DefSlot]!.role;
    return role.kind === 'zone' && role.zone === zone;
  });
  expect(seats.map(a => a.slot), `installed ${zone}`).toHaveLength(1);
  return seats[0];
}

function forces(jobs: Map<Agent, RunFitJob>) {
  return [...jobs].filter(([, job]) => job.kind === 'force')
    .map(([a, job]) => ({ slot: a.slot, side: job.side, gap: job.gap }))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

/** Change presentation only. Actual installed roles and landmarks stay intact. */
function present(sim: PlaySim, a: Agent, y: number) {
  a.body.pos = { ...a.pos, y };
  sim.defAlign.spots[a.slot as DefSlot]!.pos = { ...sim.defAlign.spots[a.slot as DefSlot]!.pos, y };
}

describe('force ownership belongs to installed coverage jobs', () => {
  const calls: Array<{ id: string; strong: ZoneId; weak: ZoneId }> = [
    { id: 'cover2', strong: 'flat_s', weak: 'flat_w' },
    { id: 'cover6', strong: 'curl_flat_s', weak: 'flat_w' },
    { id: 'cover6_rev', strong: 'flat_s', weak: 'curl_flat_w' },
    { id: 'cover2_invert', strong: 'flat_s', weak: 'flat_w' },
  ];

  describe.each(calls)('$id', ({ id, strong, weak }) => {
    it.each([false, true])('retains its support sides through disguise and crossed presentation, flip=%s', flip => {
      const plain = make(id, flip), s = seat(plain, strong), w = seat(plain, weak);
      const expected = [{ slot: s.slot, side: plain.offAlign.strongSign, gap: 'D' },
        { slot: w.slot, side: -plain.offAlign.strongSign, gap: 'D' }]
        .sort((a, b) => a.slot.localeCompare(b.slot));
      expect(forces(buildRunFits(plain))).toEqual(expected);

      const shown = make(id, flip, { shown: COVERAGE_BY_ID.cover1_off });
      expect(shown.defCall.coverage.id).toBe(id);
      expect(forces(buildRunFits(shown))).toEqual(expected);

      // These are deliberately difficult presentations, not new zone jobs.
      // The old +/-2-yard filter either lost the owners or swapped their sides.
      for (const offset of [1.5, -5.5]) {
        const staged = make(id, flip), actual = structuredClone(staged.defAlign.spots);
        present(staged, seat(staged, strong), staged.ballY + staged.offAlign.strongSign * offset);
        present(staged, seat(staged, weak), staged.ballY - staged.offAlign.strongSign * offset);
        expect(forces(buildRunFits(staged))).toEqual(expected);
        for (const a of staged.defense) {
          expect(staged.defAlign.spots[a.slot as DefSlot]!.role).toEqual(actual[a.slot as DefSlot]!.role);
        }
      }
    });
  });

  it.each([false, true])('uses an actual fire-zone dropper and preserves both explicit blitz gaps, flip=%s', flip => {
    const sim = make('cover3', flip, { personnel: 'base43', pressure: PRESSURE_BY_ID.fire_zone, shown: COVERAGE_BY_ID.cover4 });
    const dropper = seat(sim, 'curl_flat_w'), jobs = buildRunFits(sim);
    expect(dropper.slot).toBe('DE_W');
    expect(jobs.get(dropper)).toMatchObject({ kind: 'force', gap: 'D', side: -sim.offAlign.strongSign,
      inside: { gap: 'C', side: -sim.offAlign.strongSign, kind: 'edge' } });
    for (const [slot, gap, side] of [['SS', 'C', sim.offAlign.strongSign], ['LB_W', 'B', -sim.offAlign.strongSign]] as const) {
      const blitzer = sim.slot(slot)!;
      expect(sim.defAlign.spots[slot]!.role.kind).toBe('blitz');
      expect(jobs.get(blitzer)).toMatchObject({ gap, side });
      expect(jobs.get(blitzer)!.kind).not.toBe('force');
    }
    for (const slot of ['DE_S', 'DT_S', 'DT_W'] as const) {
      expect(sim.defAlign.spots[slot]!.role.kind).toBe('rush');
      expect(jobs.get(sim.slot(slot)!)!.kind).not.toBe('force');
    }
    // SS already owns strong C on this pressure. Sam cannot steal Mike's only
    // primary A bubble or receive an opposite-side conditional assignment.
    expect(jobs.get(sim.slot('LB_S')!)!.inside).toBeUndefined();
    expect(jobs.get(sim.slot('LB_M')!)).toMatchObject({ kind: 'insert', gap: 'A', side: sim.offAlign.strongSign });
    for (const [, job] of jobs) if (job.inside) expect(job.inside.side).toBe(job.side);
    const primary = sim.defense.flatMap(a => {
      const job = jobs.get(a)!, role = sim.defAlign.spots[a.slot as DefSlot]!.role;
      if (job.kind === 'force') return job.inside ? [`${job.inside.side}:${job.inside.gap}`] : [];
      return role.kind === 'rush' || role.kind === 'blitz' || job.kind === 'insert' || job.kind === 'interior' || job.kind === 'edge'
        ? [`${job.side}:${job.gap}`] : [];
    });
    expect(new Set(primary).size).toBe(primary.length);
  });

  it.each([false, true])('keeps a dropping end on his boxed C edge before an outside runner declares, flip=%s', flip => {
    const patch = { personnel: 'base43' as const, pressure: PRESSURE_BY_ID.fire_zone };
    const one = make('cover3', flip, patch), reference = make('cover3', flip, patch);
    for (const sim of [one, reference]) {
      const a = sim.slot('DE_W')!, side = -sim.offAlign.strongSign;
      a.body.pos = { x: sim.los + .5, y: gapY(sim.offAlign, 'C', side) + side * .3 };
      a.body.vel = { x: 0, y: 0 }; Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
    }
    const actor = one.slot('DE_W')!, control = reference.slot('DE_W')!, side = -one.offAlign.strongSign;
    expect(actor.runFit).toMatchObject({ kind: 'force', inside: { kind: 'edge', gap: 'C', side } });
    control.runFit = { ...control.runFit!, kind: 'edge', gap: 'C', side, edge: 'box' };
    const job = structuredClone(actor.runFit);
    expect(executeRunFit(actor, one, 'C', side)).toEqual(executeRunFit(control, reference, 'C', side));
    expect(actor.tags.has('fit-spill')).toBe(false);
    expect(actor.runFit).toEqual(job);
  });

  it.each([false, true])('does not treat designated deep flat support as immediate spill help, flip=%s', flip => {
    const sim = make('cover2_invert', flip), jobs = buildRunFits(sim);
    for (const [slot, support] of [['DE_S', 'SS'], ['DE_W', 'FS']] as const) {
      expect(sim.slot(support)!.pos.x - sim.los).toBeGreaterThan(8);
      expect(jobs.get(sim.slot(support)!)!.kind).toBe('force');
      expect(jobs.get(sim.slot(slot)!)).toMatchObject({ edge: 'box', partner: support });
    }
  });

  it.each([false, true])('reserves an explicit exchange backer and uses the remaining support, flip=%s', flip => {
    const sim = make('cover3', flip, { personnel: 'base43', gapExchange: { edge: 'DE_W', backer: 'LB_W' } });
    expect(seat(sim, 'curl_flat_w').slot).toBe('LB_W');
    const backer = sim.slot('LB_W')!, end = sim.slot('DE_W')!, fallback = sim.slot('CB_W')!;
    // Isolate the existing deep-corner fallback. The exchange owns the backer
    // even though his nominal curl-flat would otherwise rank ahead of it.
    for (const a of sim.defense) if (a !== backer && a !== fallback) {
      const role = sim.defAlign.spots[a.slot as DefSlot]!.role;
      if (role.kind !== 'rush' && role.kind !== 'blitz') present(sim, a, sim.ballY);
    }
    present(sim, fallback, sim.ballY - sim.offAlign.strongSign * 5.5);
    const jobs = buildRunFits(sim), side = -sim.offAlign.strongSign;
    expect(jobs.get(backer)).toMatchObject({ kind: 'cutback', gap: 'C', side, partner: 'DE_W' });
    expect(jobs.get(end)).toMatchObject({ kind: 'interior', gap: 'B', side, partner: 'LB_W' });
    expect(jobs.get(fallback)).toMatchObject({ kind: 'force', gap: 'D', side });
  });

  it.each([false, true])('preserves the geometric man fallback without changing markers, flip=%s', flip => {
    const sim = make('cover0', flip, { pressure: PRESSURE_BY_ID.zero_6 });
    const markers = structuredClone(sim.defAlign.spots);
    // No installed outside zone seat: retain the old physical fallback, not
    // an invented flat or a converted coverage assignment.
    for (const a of sim.defense) {
      const role = sim.defAlign.spots[a.slot as DefSlot]!.role;
      if (role.kind !== 'rush' && role.kind !== 'blitz') present(sim, a, sim.ballY);
    }
    present(sim, sim.slot('CB_S')!, sim.ballY + sim.offAlign.strongSign * 5.5);
    present(sim, sim.slot('CB_W')!, sim.ballY - sim.offAlign.strongSign * 5.5);
    // FIT_RULES (Integration's step-3c ruling 3): a man defender on a detached receiver follows his receiver and is
    // never the force; with no zone seat to supply one, there is no force and the edges box.
    if (FIT_RULES) {
      const jobs = buildRunFits(sim);
      expect(forces(jobs)).toEqual([]);
      for (const slot of ['DE_S', 'DE_W'] as const) if (jobs.get(sim.slot(slot)!)!.kind === 'edge') expect(jobs.get(sim.slot(slot)!)).toMatchObject({ edge: 'box' });
    } else expect(forces(buildRunFits(sim))).toEqual([
      { slot: 'CB_S', side: sim.offAlign.strongSign, gap: 'D' },
      { slot: 'CB_W', side: -sim.offAlign.strongSign, gap: 'D' },
    ]);
    for (const a of sim.defense) {
      const spot = sim.defAlign.spots[a.slot as DefSlot]!, original = markers[a.slot as DefSlot]!;
      expect(spot.role).toEqual(original.role);
      expect(spot.manTarget).toBe(original.manTarget);
    }
  });

  it.each([
    { front: 'odd', coverage: 'cover0', pressure: 'zero_6' },
    { front: 'tite', coverage: 'cover0', pressure: 'zero_6' },
    { front: 'odd', coverage: 'cover1', pressure: 'mike_a' },
    { front: 'tite', coverage: 'cover1', pressure: 'mike_a' },
  ])('retains the existing front fit when $front/$coverage converts an end to man', ({ front, coverage, pressure }) => {
    for (const flip of [false, true]) {
      const sim = make(coverage, flip, { personnel: 'base34', front: FRONT_BY_ID[front], pressure: PRESSURE_BY_ID[pressure] });
      const end = sim.slot('DE_S')!, spot = sim.defAlign.spots.DE_S!;
      expect(spot.role.kind).toBe('man'); expect(spot.manTarget).toBeTruthy();
      const role = structuredClone(spot.role), target = spot.manTarget;
      if (!FIT_RULES) {
        // Compatibility, not a new man controller: only an explicit pressure
        // dropper leaves this existing first-level run-front contract.
        expect(buildRunFits(sim).get(end)).toMatchObject({ kind: 'edge', gap: 'D', side: sim.offAlign.strongSign });
      } else {
        // FIT_RULES (Integration's step-3c ruling 3): an end converted to man and aligned off the line is assigned by
        // job, at the second level; the edge he vacated is owned by someone by rule, or reported unowned.
        const jobs = buildRunFits(sim), j = jobs.get(end)!, side = sim.offAlign.strongSign;
        expect(spot.pos.x - sim.los).toBeGreaterThan(2);
        // On an attached end or a back he fits off his man (insert, or the force by seat); on a detached receiver he
        // follows him (alley; ruling 3).
        const detachedMan = !sim.offAlign.spots[target!]!.inline && !sim.offAlign.spots[target!]!.backfield;
        expect(detachedMan ? ['alley'] : ['insert', 'force']).toContain(j.kind);
        const full = describeDefense(sim.defCall);
        const r = runFitJobs({ ...full, players: full.players.filter((p) => sim.slot(p.who.slot)) }, sim.defAlign, sim.offAlign,
          { labelFree: true, pos: Object.fromEntries(sim.defense.map((a) => [a.slot, a.pos])) });
        const owned = [...jobs.values()].some((x) => x.side === side && (x.kind === 'force' || (x.kind === 'edge' && (x.gap === 'C' || x.gap === 'D'))));
        expect(owned || r.unowned.some((g) => g.side === side && (g.gap === 'C' || g.gap === 'D'))).toBe(true);
      }
      expect(spot.role).toEqual(role); expect(spot.manTarget).toBe(target);
    }
  });

  it('keeps an unsupported edge boxed instead of inventing an outside support player', () => {
    const sim = make('cover0', false, { pressure: PRESSURE_BY_ID.zero_6 });
    for (const a of sim.defense) {
      const role = sim.defAlign.spots[a.slot as DefSlot]!.role;
      if (role.kind !== 'rush' && role.kind !== 'blitz') present(sim, a, sim.ballY);
    }
    const jobs = buildRunFits(sim);
    expect(forces(jobs)).toEqual([]);
    for (const slot of ['DE_S', 'DE_W'] as const) {
      expect(jobs.get(sim.slot(slot)!)).toMatchObject({ kind: 'edge', edge: 'box' });
      expect(jobs.get(sim.slot(slot)!)!.partner).toBeUndefined();
    }
  });

  it('allocates without observing opponents, moving bodies, changing capabilities or drawing RNG', () => {
    const sim = make('cover6', true, { shown: COVERAGE_BY_ID.cover3 });
    const before = structuredClone({ bodies: sim.agents.map(a => a.body), profiles: sim.agents.map(a => a.profile),
      alignment: sim.defAlign, installed: sim.defense.map(a => a.runFit), rng: sim.rng });
    const see = vi.spyOn(sim, 'see'), draws = vi.spyOn(Rng.prototype, 'nextU32'), normals = vi.spyOn(Rng.prototype, 'gaussian');
    try {
      const first = forces(buildRunFits(sim));
      expect(forces(buildRunFits(sim))).toEqual(first);
      expect(see).not.toHaveBeenCalled(); expect(draws).not.toHaveBeenCalled(); expect(normals).not.toHaveBeenCalled();
      expect(structuredClone({ bodies: sim.agents.map(a => a.body), profiles: sim.agents.map(a => a.profile),
        alignment: sim.defAlign, installed: sim.defense.map(a => a.runFit), rng: sim.rng })).toEqual(before);
    } finally { see.mockRestore(); draws.mockRestore(); normals.mockRestore(); }
  });
});

/** Explicitly acquired runner/core picture; this does not claim natural gaze
 * acquisition. A promoted inside backer still has one assigned bubble. */
function dualStage(flip = false, location: 'inside' | 'outside' = 'inside', carrying: Perceived['carrying'] = true, deep = false) {
  const sim = make('cover3_buzz', flip, { personnel: 'base43' }), a = sim.slot('LB_W')!, r = sim.slot('RB')!, side = -sim.offAlign.strongSign;
  expect(seat(sim, 'curl_flat_w').slot).toBe(a.slot);
  expect(a.runFit).toMatchObject({ kind: 'force', side, gap: 'D', inside: { gap: 'B', side } });
  // Mirror each same-profile opponent, rather than merely flipping the call:
  // native LT/RT have different radii and do not exchange bodies on a flip.
  // Their stances are mirrored with their pictures, so each body is seen at home.
  const nominal = alignOffense(FORMATION_BY_ID.ace_11, false, sim.los, sim.ballY);
  if (flip) for (const [slot, spot] of Object.entries(nominal.spots)) { const own = sim.offAlign.spots[slot as keyof typeof nominal.spots];
    if (own && spot) own.pos = { x: spot.pos.x, y: 2 * sim.ballY - spot.pos.y }; }
  const gy = gapY(sim.offAlign, 'B', side);
  a.body.pos = { x: sim.los + 4, y: gy + side }; a.body.vel = { x: -1.5, y: side * .2 }; a.body.facing = Math.PI;
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  sim.t = 1.3; sim.handoffAt = 1; sim.ball = { kind: 'held', carrier: r };
  const pictures = new Map<Agent, Perceived>(sim.offense.map(o => [o, { pos: { x: nominal.spots[o.slot].pos.x,
    y: flip ? 2 * sim.ballY - nominal.spots[o.slot].pos.y : nominal.spots[o.slot].pos.y }, vel: { x: 0, y: 0 },
    stance: o.stance, facing: o.facing, pose: 'up', carrying: o === r, age: .2 }]));
  const core = sim.offense.filter(o => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline);
  const surface = side > 0 ? Math.max(...core.map(o => pictures.get(o)!.pos.y + o.profile.radius))
    : Math.min(...core.map(o => pictures.get(o)!.pos.y - o.profile.radius));
  const picture: Perceived = { pos: { x: sim.los - (deep ? 6 : 1.9), y: location === 'inside' ? gy : surface + side * 1.5 },
    vel: { x: 3, y: 0 }, stance: null, facing: 0, pose: 'up', carrying, age: .2 };
  if (location === 'outside' && !deep) picture.pos.x = sim.los - 1.2;
  pictures.set(r, picture);
  const oldSee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => observer === a && pictures.has(target) ? pictures.get(target)! : oldSee(observer, target, delay);
  return { sim, a, r, side, gy, picture, update: () => executeRunFit(a, sim, 'B', side, { target: r, cue: picture }) };
}

describe('inside force backers retain their bubble until an observed outside threat', () => {
  it.each([false, true])('keeps the unique B bubble and fits inside before the mesh declares, flip=%s', flip => {
    const one = dualStage(flip), reference = dualStage(flip);
    // FOLD_HOLD (Integration's step-3c ruling 2): before the mesh declares the ball inside, the force holds his outside
    // leverage (his force request), not the fold; off, he fitted the bubble inside.
    reference.a.runFit = FOLD_HOLD ? { ...reference.a.runFit!, inside: undefined }
      : { ...reference.a.runFit!, gap: 'B', side: reference.side, kind: 'insert' };
    const job = structuredClone(one.a.runFit), command = one.update();
    expect(command).toEqual(reference.update());
    if (!FOLD_HOLD) expect(command.vel.y * one.side).toBeLessThan(0);
    expect(one.a.runFit).toEqual(job);
    const inserts = one.sim.defense.flatMap(a => a.runFit?.inside ? [a.runFit.inside]
      : a.runFit?.kind === 'insert' ? [{ gap: a.runFit.gap, side: a.runFit.side }] : []);
    expect(inserts.filter(fit => fit.gap === 'B' && fit.side === one.side)).toHaveLength(1);
  });

  it.each([false, true])('keeps the outside shoulder for positive outside possession, flip=%s', flip => {
    const one = dualStage(flip, 'outside'), inside = dualStage(flip);
    const job = structuredClone(one.a.runFit), command = one.update();
    expect(command.vel.y * one.side).toBeGreaterThan(0);
    // FOLD_HOLD: before the ball declares inside, the inside picture also keeps outside leverage (no fold yet).
    if (FOLD_HOLD) expect(inside.update().vel.y * inside.side).toBeGreaterThan(0);
    else expect(command.vel.y * one.side).toBeGreaterThan(inside.update().vel.y * inside.side);
    expect(one.a.runFit).toEqual(job);
  });

  it.each([false, null, undefined])('does not invent an outside possession cue with carrying=%s', carrying => {
    const one = dualStage(false, 'outside', null), reference = dualStage(false, 'outside', null);
    one.picture.carrying = carrying; reference.picture.carrying = carrying;
    // FOLD_HOLD: with no possession cue the ball has not declared inside, so he holds the force.
    reference.a.runFit = FOLD_HOLD ? { ...reference.a.runFit!, inside: undefined }
      : { ...reference.a.runFit!, gap: 'B', side: reference.side, kind: 'insert' };
    expect(one.update()).toEqual(reference.update());
  });

  it('keeps its inside responsibility at a deep mesh even with positive outside possession', () => {
    const one = dualStage(false, 'outside', true, true), reference = dualStage(false, 'outside', true, true);
    // FOLD_HOLD: at a deep mesh the ball has not declared inside; he holds the force.
    reference.a.runFit = FOLD_HOLD ? { ...reference.a.runFit!, inside: undefined }
      : { ...reference.a.runFit!, gap: 'B', side: reference.side, kind: 'insert' };
    expect(one.update()).toEqual(reference.update());
  });

  it.each([false, true])('FOLD_HOLD: folds to his bubble when the flow goes away from him, flip=%s', flip => {
    if (!FOLD_HOLD) return;
    const one = dualStage(flip), reference = dualStage(flip);
    one.picture.vel = { x: 1, y: -one.side * 3 }; reference.picture.vel = { x: 1, y: -reference.side * 3 };
    reference.a.runFit = { ...reference.a.runFit!, gap: 'B', side: reference.side, kind: 'insert' };
    expect(one.update()).toEqual(reference.update());
  });

  it.each(['inside', 'outside'] as const)('mirrors the %s request with identical capabilities', location => {
    const left = dualStage(false, location), right = dualStage(true, location), l = left.update(), r = right.update();
    expect(left.a.profile).toEqual(right.a.profile);
    expect(l.vel.x).toBeCloseTo(r.vel.x, 10); expect(l.vel.y).toBeCloseTo(-r.vel.y, 10);
  });

  it.each(['inside', 'outside'] as const)('uses the held %s picture rather than the live carrier position', location => {
    const one = dualStage(false, location), command = one.update(), profiles = structuredClone(one.sim.agents.map(a => a.profile));
    one.r.body.pos = { x: 70, y: 3 }; one.r.body.vel = { x: 9, y: -5 };
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try { expect(one.update()).toEqual(command); expect(draws).not.toHaveBeenCalled(); }
    finally { draws.mockRestore(); }
    expect(one.sim.agents.map(a => a.profile)).toEqual(profiles);
  });
});
