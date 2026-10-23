/**
 * Offensive pre-snap motion (MOTION=1): each kind ends where it should, is
 * legal at the snap under the installed snap law, renumbers the offense, and
 * lets the secondary check against the final formation. Off by default:
 * without the flag a call's motion changes nothing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// The across motion on the tracked line: motion-line-clear.test.ts.
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

  it('with MOTION=0 a called motion changes nothing', () => {
    process.env.MOTION = '0';
    const plain = scene('gun_doubles_11', 'cover4'), called = scene('gun_doubles_11', 'cover4', { slot: 'H', kind: 'across' });
    expect(called.motion).toBeNull();
    expect(called.agents.map(a => a.pos)).toEqual(plain.agents.map(a => a.pos));
    expect(called.defCall.coverage.id).toBe(plain.defCall.coverage.id);
  });

  it('across: the slot sets on the far side, 2x2 becomes trips and Quarters checks to its trips answer', () => {
    const sim = scene('gun_doubles_11', 'cover4', { slot: 'H', kind: 'across' });
    const h = at(sim, 'H');
    // Tight inside the lone #1 (tracked across motion: median 5.4 yd from the ball).
    expect(Math.abs(h.pos.y - sim.ballY)).toBeLessThan(7);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(0.6);
    expect(Math.sign(h.pos.y - sim.ballY)).toBe(sim.offAlign.strongSign);
    expect(formationStructure(sim.offAlign).tags).toContain('trips');
    expect(sim.defCall.coverage.id).toBe('cover4_poach');
    expect(sim.defCall.check?.from).toBe('cover4');
    expect(snapFouls(sim)).toEqual([]);
  });

  it('jet: still running parallel to the line at the snap, timed short of the ball, and legal', () => {
    const plain = scene('gun_doubles_11', 'cover3_match');
    const sim = scene('gun_doubles_11', 'cover3_match', { slot: 'Z', kind: 'jet' });
    const z = at(sim, 'Z');
    expect(Math.abs(z.vel.x)).toBeLessThan(0.3);
    expect(Math.abs(z.vel.y)).toBeGreaterThan(4);
    expect(sim.los - z.pos.x).toBeGreaterThan(1.5);
    // Snapped a few yards short of the ball, running toward it (tracked jets:
    // median 5 yd from the ball at the snap): still counted on his own side.
    // Receivers are numbered outside-in by where they are at the snap, so
    // with the tracked splits a jet inside the inline end is that side's #2.
    const lateral = (z.pos.y - sim.ballY) * Math.sign(at(plain, 'Z').pos.y - sim.ballY);
    expect(lateral).toBeGreaterThan(2.5);
    expect(lateral).toBeLessThan(7);
    expect(z.vel.y * Math.sign(sim.ballY - z.pos.y)).toBeGreaterThan(0);
    expect(sim.offAlign.refOf.Z?.[0]).toBe(plain.offAlign.refOf.Z?.[0]);
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
    // H crossed the formation and someone answers him there (inside leverage
    // allowed). Who depends on the check: a lock carries his set defender
    // across; a trade or bump hands him to whoever stands nearest, who may
    // already be there (DEF_ALIGN's nickel sets 2 yd from where H now stops).
    const h = at(sim, 'H');
    expect(Math.abs(h.pos.y - at(plain, 'H').pos.y)).toBeGreaterThan(6);
    expect(sim.defense.some(d => Math.abs(d.pos.y - h.pos.y) < 2.5 && d.pos.x - sim.los < 8)).toBe(true);
  });
});
