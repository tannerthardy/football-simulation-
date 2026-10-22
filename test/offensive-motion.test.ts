/**
 * Offensive pre-snap motion (MOTION=1): each kind ends where it should, is
 * legal at the snap under the installed snap law, renumbers the offense, and
 * lets the secondary check against the final formation. Off by default:
 * without the flag a call's motion changes nothing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assessScrimmageSnap, type SnapPlayerFacts } from '../src/game/presnap-rules.js';
import { sceneSim } from '../src/lab/coverage-scene.js';
import { formationStructure } from '../src/playbook/structure.js';
import type { MotionCall } from '../src/playbook/types.js';
import type { PlaySim } from '../src/sim/playsim.js';

const scene = (formation: string, coverage: string, motion?: MotionCall) => sceneSim({ formation, coverage, motion });
const at = (sim: PlaySim, slot: string) => sim.slot(slot)!;

/** Snap-law facts from the actual bodies at the snap, including who is moving and how. */
function snapFouls(sim: PlaySim) {
  const players: SnapPlayerFacts[] = sim.agents.map(a => {
    const depth = sim.los - a.pos.x;
    const speed = Math.hypot(a.vel.x, a.vel.y);
    return { playerId: a.player.id, team: a.team, number: a.player.jersey, y: a.pos.y,
      line: a.team === 'D' ? undefined : depth < 0.9 ? 'line' : 'backfield',
      moving: a.team === 'O' && speed > 0.5, movingTowardLine: a.team === 'O' && a.vel.x > 0.3 };
  });
  return assessScrimmageSnap({ players, readyForPlay: true, snapOccurred: true, allSetSeconds: 1, hadFullSet: true })
    .fouls.filter(f => f.kind === 'illegal_motion' || f.kind === 'illegal_shift');
}

describe('offensive motion', () => {
  const was = process.env.MOTION;
  beforeEach(() => { process.env.MOTION = '1'; });
  afterEach(() => { if (was === undefined) delete process.env.MOTION; else process.env.MOTION = was; });

  it('is off by default: a called motion changes nothing without the flag', () => {
    delete process.env.MOTION;
    const plain = scene('gun_doubles_11', 'cover4'), called = scene('gun_doubles_11', 'cover4', { slot: 'H', kind: 'across' });
    expect(called.motion).toBeNull();
    expect(called.agents.map(a => a.pos)).toEqual(plain.agents.map(a => a.pos));
    expect(called.defCall.coverage.id).toBe(plain.defCall.coverage.id);
  });

  it('across: the slot sets on the far side, 2x2 becomes trips and Quarters checks to its trips answer', () => {
    const sim = scene('gun_doubles_11', 'cover4', { slot: 'H', kind: 'across' });
    const h = at(sim, 'H');
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(0.6);
    expect(Math.sign(h.pos.y - sim.ballY)).toBe(sim.offAlign.strongSign);
    expect(formationStructure(sim.offAlign).tags).toContain('trips');
    expect(sim.defCall.coverage.id).toBe('cover4_poach');
    expect(sim.defCall.check?.from).toBe('cover4');
    expect(snapFouls(sim)).toEqual([]);
  });

  it('jet: still running parallel to the line at the snap, just past the ball, and legal', () => {
    const sim = scene('gun_trips_11', 'cover3_match', { slot: 'Y', kind: 'jet' });
    const y = at(sim, 'Y');
    expect(Math.abs(y.vel.x)).toBeLessThan(0.3);
    expect(Math.abs(y.vel.y)).toBeGreaterThan(4);
    expect(sim.los - y.pos.x).toBeGreaterThan(1.5);
    // Trips at the call; the jet man has crossed the ball, so the snap is 2x2 and Mable is not needed.
    expect(sim.offAlign.refOf.Y?.[0]).toBe('W');
    expect(sim.defCall.coverage.id).toBe('cover3_match');
    expect(snapFouls(sim)).toEqual([]);
  });

  it('empty: the back motions out and becomes a receiver; Quarters checks to Book/Read', () => {
    const sim = scene('gun_trips_11', 'cover4', { slot: 'RB', kind: 'empty' });
    expect(sim.offAlign.numbering.B).toBeUndefined();
    expect(sim.offAlign.refOf.RB?.[0]).toBe('W');
    expect(formationStructure(sim.offAlign).tags).toContain('empty_3x2');
    expect(sim.defCall.coverage.id).toBe('cover4_book_read');
    expect(snapFouls(sim)).toEqual([]);
  });

  it('return: he comes back to his spot and the structure is unchanged', () => {
    const plain = scene('gun_doubles_11', 'cover3_match');
    const sim = scene('gun_doubles_11', 'cover3_match', { slot: 'H', kind: 'return' });
    expect(Math.abs(at(sim, 'H').pos.y - at(plain, 'H').pos.y)).toBeLessThan(0.6);
    expect(sim.offAlign.numbering).toEqual(plain.offAlign.numbering);
    expect(snapFouls(sim)).toEqual([]);
  });

  it('a player on the line cannot be put in motion', () => {
    const sim = scene('gun_doubles_11', 'cover4', { slot: 'X', kind: 'across' });
    expect(sim.motion).toBeNull();
  });

  it('the secondary bumps with the motion but never crosses the line', () => {
    const plain = scene('gun_doubles_11', 'cover1');
    const sim = scene('gun_doubles_11', 'cover1', { slot: 'H', kind: 'across' });
    for (const d of sim.defense) expect(d.pos.x).toBeGreaterThan(sim.los);
    // Someone went with H: a man defender now stands over him on the far side.
    const h = at(sim, 'H');
    expect(sim.defense.some(d => Math.abs(d.pos.y - h.pos.y) < 2 && Math.abs(at(plain, d.slot).pos.y - h.pos.y) > 6)).toBe(true);
  });
});
