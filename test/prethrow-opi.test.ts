import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { HandJoint } from '../src/physics/world.js';
import { assessPrethrowBlocksOnPass } from '../src/sim/pass-interference.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** A controlled native act, not a whole-play outcome claim: ordinary bodies,
 * the real engagement/World step, and the production pass-release caller.
 * Recording is deliberately disabled. Bystanders are parked away from the
 * act so neither a hidden collision nor an execution outcome awards a foul. */
function scene({ slot = 'X', x = 44, contact = true, covered = false } = {}) {
  const ace = FORMATION_BY_ID.ace_11;
  const formation = covered ? { ...ace, id: 'covered_te_opi_control',
    slots: { ...ace.slots, Z: { ...ace.slots.Z!, depth: .6 } } } : ace;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'OPI act' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.qb.body.pos = { x: 37, y: CENTER_Y - 8 };
  const blocker = sim.slot(slot)!, defender = sim.slot('CB_S')!;
  blocker.body.pos = { x, y: CENTER_Y };
  defender.body.pos = { x: x + blocker.profile.radius + defender.profile.radius + .1, y: CENTER_Y };
  blocker.body.facing = 0; defender.body.facing = Math.PI;
  sim.t = .5;
  let hands: HandJoint | undefined;
  if (contact) {
    const rep = sim.engage(blocker, defender, 'run', { x: 1, y: 0 });
    expect(rep).not.toBeNull();
    rep!.control = .8;
    hands = rep!.hands;
  }
  return { sim, blocker, defender, hands };
}

function throwForward(sim: PlaySim, velocityX = 15, passer = sim.qb): void {
  sim.throwBall(passer, sim.slot('Z')!, { x: velocityX, y: 0, z: 5 },
    { x: 52, y: CENTER_Y - 8, z: 1.5 }, sim.t + 1);
}

const opi = (sim: PlaySim) => sim.buildResult().penalties?.filter(f => f.kind === 'opi') ?? [];

describe('native prethrow downfield-block OPI, NFL2026 8-5-4(a)', () => {
  it('retains an achieved loaded block and calls it only after a later qualifying pass', () => {
    const f = scene();
    f.sim.tick();
    expect(Math.hypot(f.hands!.normalForce ?? 0, f.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(f.sim.events.some(e => e.type === 'block_contact' && e.a === f.blocker.idx)).toBe(true);
    expect(opi(f.sim)).toEqual([]);
    f.sim.tick(); // First known act now lies clearly before release.
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([expect.objectContaining({ kind: 'opi', against: 'O',
      playerId: f.blocker.player.id, yards: 10, autoFirst: false, rule: '8-5-4(a)' })]);
    expect(f.sim.frames).toEqual([]);
    expect(f.sim.events.filter(e => e.type === 'opi')).toHaveLength(1);
  });

  it('preserves the same physical block on a no-throw run or backward pitch', () => {
    const f = scene(); f.sim.tick(); f.sim.tick();
    expect(Math.hypot(f.hands!.normalForce ?? 0, f.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(opi(f.sim)).toEqual([]);
    expect(f.sim.pitchBall(f.sim.qb, f.sim.slot('RB')!)).toBe(true);
    expect(opi(f.sim)).toEqual([]);
  });

  it('does not turn nearby players or a requested engagement into achieved blocking', () => {
    const f = scene();
    // The request was acquired in reach, but the opponent leaves before
    // execution. No World interval ever achieves that requested block.
    f.defender.body.pos.x += 5;
    f.sim.tick(); f.sim.tick();
    expect(f.sim.events.some(e => e.type === 'block_contact' && e.a === f.blocker.idx)).toBe(false);
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('does not infer an offensive block from an incidental body encounter', () => {
    const f = scene({ contact: false });
    f.defender.body.pos.x = f.blocker.pos.x + .45;
    f.sim.tick();
    const touched = f.sim.lastStep!.contacts.some(c => [c.i, c.j].includes(f.blocker.idx)
      && [c.i, c.j].includes(f.defender.idx));
    f.sim.tick();
    expect(touched).toBe(true);
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('leaves ineligible initial-charge/numbering branches unqualified instead of treating downfield OL as OPI', () => {
    const f = scene({ slot: 'LT' }); f.sim.tick(); f.sim.tick();
    expect(Math.hypot(f.hands!.normalForce ?? 0, f.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('does not lose a possible ineligible initial-charge exception when the same skill-player contact later moves downfield', () => {
    const f = scene({ slot: 'Y', x: 40.8, covered: true }); f.sim.tick(); f.sim.tick();
    expect(f.sim.snapEligibility.get(f.blocker.player.id)?.eligible).toBe(false);
    expect(Math.hypot(f.hands!.normalForce ?? 0, f.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    // Stage a common translation of the still-intact contact to isolate its
    // remembered origin. This is a provenance counterfactual, not a claim
    // that either player actually travelled three yards within one tick.
    f.blocker.body.pos.x += 3; f.defender.body.pos.x += 3;
    f.sim.tick(); f.sim.tick();
    expect(f.blocker.engagement?.hands).toBe(f.hands);
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('calls the known eligible receiver whose continuous line-origin block moves downfield before the pass', () => {
    const f = scene({ x: 40.8 });
    expect(f.sim.snapEligibility.get(f.blocker.player.id)?.eligible).toBe(true);
    f.sim.tick(); f.sim.tick();
    f.blocker.body.pos.x += 3; f.defender.body.pos.x += 3;
    f.sim.tick(); f.sim.tick(); throwForward(f.sim);
    expect(opi(f.sim)).toHaveLength(1);
  });

  it('preserves unknown snap eligibility as an unresolved possible initial-charge exception', () => {
    const f = scene({ x: 40.8 }); f.sim.snapEligibility.delete(f.blocker.player.id);
    f.sim.tick(); f.sim.tick();
    f.blocker.body.pos.x += 3; f.defender.body.pos.x += 3;
    f.sim.tick(); f.sim.tick(); throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('keeps possible initial-line contact provenance across release and a new hand joint on the same pair', () => {
    const f = scene({ slot: 'Y', x: 40.8, covered: true }); f.sim.tick(); f.sim.tick();
    expect(f.sim.snapEligibility.get(f.blocker.player.id)?.eligible).toBe(false);
    expect(Math.hypot(f.hands!.normalForce ?? 0, f.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    f.sim.disengage(f.blocker.engagement!);
    // A different HandJoint alone does not prove that body contact broke.
    // Common translation stages the later held state, as above.
    f.blocker.body.pos.x += 3; f.defender.body.pos.x += 3;
    const rep = f.sim.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 })!;
    expect(rep).not.toBeNull(); expect(rep.hands).not.toBe(f.hands);
    rep.control = .8;
    f.sim.tick(); f.sim.tick();
    expect(Math.hypot(rep.hands!.normalForce ?? 0, rep.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it.each([false, true])('retains initial-line torso contact before any grip, backward pitch=%s', pitch => {
    const f = scene({ slot: 'Y', x: 40.8, contact: false, covered: true });
    expect(f.sim.snapEligibility.get(f.blocker.player.id)?.eligible).toBe(false);
    f.defender.body.pos.x = f.blocker.pos.x + .45;
    const back = f.sim.slot('RB')!;
    if (pitch) {
      back.body.pos = { x: 35.6, y: f.sim.qb.pos.y };
      expect(f.sim.pitchBall(f.sim.qb, back)).toBe(true);
    }
    f.sim.tick();
    expect(f.sim.lastStep!.contacts.some(c => [c.i, c.j].includes(f.blocker.idx)
      && [c.i, c.j].includes(f.defender.idx))).toBe(true);
    if (pitch) {
      // This contact happened during real backward-pitch flight, while no
      // offensive player held the ball. Complete the native receipt before
      // staging the later downfield grip and halfback forward release.
      expect(f.sim.ball.kind).toBe('pitch');
      while (f.sim.ball.kind === 'pitch' && f.sim.t < .9) f.sim.tick();
      expect(f.sim.carrier).toBe(back);
      expect(f.sim.events.some(e => e.type === 'pitch_catch' && e.a === back.idx)).toBe(true);
      back.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: back.facing }) };
    }
    expect(f.blocker.engagement).toBeNull();
    f.blocker.body.pos.x += 3; f.defender.body.pos.x += 3;
    const rep = f.sim.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 })!;
    expect(rep).not.toBeNull(); rep.control = .8;
    f.sim.tick(); f.sim.tick();
    expect(Math.hypot(rep.hands!.normalForce ?? 0, rep.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    throwForward(f.sim, 15, pitch ? back : f.sim.qb);
    expect(opi(f.sim)).toEqual([]);
  });

  it('still calls a genuinely new downfield pair after the blocker contacted another defender at the line', () => {
    const f = scene({ x: 40.8 }); f.sim.tick(); f.sim.tick();
    f.sim.disengage(f.blocker.engagement!);
    f.defender.body.pos = { x: 75, y: CENTER_Y };
    const next = f.sim.slot('CB_W')!;
    f.blocker.body.pos.x += 3;
    next.body.pos = { x: f.blocker.pos.x + f.blocker.profile.radius + next.profile.radius + .1, y: CENTER_Y };
    next.body.vel = { x: 0, y: 0 }; next.body.facing = Math.PI;
    const rep = f.sim.engage(f.blocker, next, 'run', { x: 1, y: 0 })!;
    expect(rep).not.toBeNull(); rep.control = .8;
    f.sim.tick(); f.sim.tick();
    throwForward(f.sim);
    expect(opi(f.sim)).toHaveLength(1);
    expect(f.sim.buildResult().foulRecords?.find(r => r.kind === 'opi')?.evidence.victimId).toBe(next.player.id);
  });

  it('preserves near-line contact when its represented torso location cannot establish the one-yard condition', () => {
    const f = scene({ x: 41.1 }); f.sim.tick(); f.sim.tick();
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('does not guess act ordering in the same unresolved contact/release interval', () => {
    const f = scene(); f.sim.tick();
    throwForward(f.sim);
    expect(opi(f.sim)).toEqual([]);
  });

  it('qualifies a native straddling release when part of the passer remains behind the line', () => {
    const f = scene(); f.sim.tick(); f.sim.tick();
    f.sim.qb.body.pos.x = 40.1;
    throwForward(f.sim);
    expect(opi(f.sim)).toHaveLength(1);
    expect(f.sim.penalties.some(p => p.kind === 'illegal_forward_pass')).toBe(false);
  });

  it('requires a supported behind-line forward release, with no officiating RNG draws', () => {
    const f = scene(); f.sim.tick(); f.sim.tick();
    const before = JSON.stringify(f.sim.rng);
    assessPrethrowBlocksOnPass(f.sim, f.sim.qb, 37.3, f.sim.t, -15);
    f.sim.qb.body.pos.x = 41.1;
    assessPrethrowBlocksOnPass(f.sim, f.sim.qb, 41.4, f.sim.t, 15);
    expect(opi(f.sim)).toEqual([]);
    expect(JSON.stringify(f.sim.rng)).toBe(before);
    f.sim.qb.body.pos.x = 37;
    assessPrethrowBlocksOnPass(f.sim, f.sim.qb, 37.3, f.sim.t, 15);
    assessPrethrowBlocksOnPass(f.sim, f.sim.qb, 37.3, f.sim.t, 15);
    expect(opi(f.sim)).toHaveLength(1);
    expect(JSON.stringify(f.sim.rng)).toBe(before);
  });
});
