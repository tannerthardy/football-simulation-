/** MOTION_CHECK (sim/motion.ts): the defense answers motion as tracked
 * defenses do. Man coverage locks or trades; everyone else bumps (jobs move
 * to the nearest player of a kind: corners keep their sides, a deep job only
 * to a safety, a man job on a receiver never to a backer); the front stays.
 * Off: the provisional bump. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sceneSim } from '../src/lab/coverage-scene.js';
import type { DefSlot } from '../src/playbook/types.js';
import type { PlaySim } from '../src/sim/playsim.js';

// The front's side without a single attached end is FRONT_STRENGTH's call.
vi.hoisted(() => { process.env.FRONT_STRENGTH = '1'; });

const was = { motion: process.env.MOTION, check: process.env.MOTION_CHECK };
afterEach(() => { process.env.MOTION = was.motion; process.env.MOTION_CHECK = was.check; vi.unstubAllEnvs(); });
function scene(check: boolean, coverage: string, seed = 5, motion: { slot: 'H' | 'RB'; kind: 'across' | 'empty' } = { slot: 'H', kind: 'across' }, formation = 'gun_doubles_11') {
  process.env.MOTION = '1';
  process.env.MOTION_CHECK = check ? '1' : '0';
  return { set: sceneSim({ formation, coverage, seed }), snap: sceneSim({ formation, coverage, seed, motion }) };
}
const y = (sim: PlaySim, slot: string) => sim.slot(slot)!.pos.y - sim.ballY;

describe('zone coverage bumps: jobs move, players slide', () => {
  it('Cover 3 vs across motion: the corners keep their sides and nobody runs the width of the field', () => {
    for (const check of [true, false]) {
      const { set, snap } = scene(check, 'cover3');
      for (const cb of ['CB_S', 'CB_W']) expect(Math.sign(y(snap, cb))).toBe(Math.sign(y(set, cb)));
      // A bump slides a backer a gap or two (the weak hook, set 2 yd from the
      // ball, crosses it on a 5-yd slide); running the width is a
      // sideline-to-sideline reassignment.
      const far = snap.defense.filter(d => !['DE_S', 'DE_W', 'DT_S', 'DT_W'].includes(d.slot)
        && y(set, d.slot) * y(snap, d.slot) < 0 && Math.abs(y(snap, d.slot) - y(set, d.slot)) > 8);
      if (check) expect(far.map(d => d.slot)).toEqual([]);
    }
  });
  it('the defender over the motion man at the snap stood nearer to him than the nickel at the set', () => {
    const { set, snap } = scene(true, 'cover3');
    const h = y(snap, 'H');
    const over = snap.defense.filter(d => snap.defAlign.spots[d.slot as DefSlot]!.role.kind === 'zone' && snap.slot(d.slot)!.pos.x - snap.los < 8)
      .sort((a, b) => Math.abs(y(snap, a.slot) - h) - Math.abs(y(snap, b.slot) - h))[0];
    expect(Math.abs(y(snap, over.slot) - h)).toBeLessThan(3);
    expect(over.slot).not.toBe('NB');
    expect(Math.abs(y(set, over.slot) - h)).toBeLessThan(Math.abs(y(set, 'NB') - h));
  });
});

describe('man coverage locks or trades', () => {
  it('Cover 1 vs across motion: both answers occur over seeds; a lock keeps the set defender on him to the snap', () => {
    const outcomes = new Set<string>();
    // Against trips: with the nickel on the slot (not on the attached end),
    // a doubles slot crossing the formation leaves no receiver on his side
    // to trade onto, so his answers there are lock or keep. Against trips a
    // trade hands the motion man to the safety on the new side.
    for (let seed = 1; seed <= 24; seed++) {
      const { set, snap } = scene(true, 'cover1', seed, undefined, 'gun_trips_11');
      const had = Object.values(set.defAlign.spots).find(sp => sp?.role.kind === 'man' && sp.manTarget === 'H')!.slot;
      const has = Object.values(snap.defAlign.spots).find(sp => sp?.role.kind === 'man' && sp.manTarget === 'H')?.slot;
      const locked = (snap.motion as unknown as { lock: DefSlot | null }).lock;
      if (locked) { expect(locked).toBe(had); expect(has).toBe(had); outcomes.add('lock'); }
      else outcomes.add(has === had ? 'same' : 'trade');
    }
    expect(outcomes.has('lock')).toBe(true);
    expect(outcomes.has('trade')).toBe(true);
  });
});

describe('the front stays', () => {
  it('four wide, the slot across flips the receivers\' strength: the linemen keep their spots on; off, the front re-sets at the snap', () => {
    const on = scene(true, 'cover3', 5, { slot: 'H', kind: 'across' }, 'gun_spread_10');
    expect(on.snap.offAlign.strongSign).not.toBe(on.set.offAlign.strongSign);
    for (const s of ['DE_S', 'DE_W', 'DT_S', 'DT_W'] as DefSlot[])
      expect(on.snap.defAlign.spots[s]!.pos.y).toBeCloseTo(on.set.defAlign.spots[s]!.pos.y, 6);
    const off = scene(false, 'cover3', 5, { slot: 'H', kind: 'across' }, 'gun_spread_10');
    expect((['DE_S', 'DE_W', 'DT_S', 'DT_W'] as DefSlot[]).some(s => Math.abs(off.snap.defAlign.spots[s]!.pos.y - off.set.defAlign.spots[s]!.pos.y) > .5)).toBe(true);
  });
});
