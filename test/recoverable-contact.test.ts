import { beforeAll, describe, expect, it } from 'vitest';
import { recoverableContactWitness } from '../scripts/diag/physics/recoverable-contact.js';

describe('a torso glance can disrupt running without ending it', () => {
  let witness: ReturnType<typeof recoverableContactWitness>;
  beforeAll(() => { witness = recoverableContactWitness({ seconds: 2, refinementSubsteps: 48 }); });

  it('preserves attained contact and recovers through ordinary bounded ground actuation', () => {
    const run = witness.arms.find(a => a.name === 'glancing-run')!;
    const passive = witness.arms.find(a => a.name === 'glancing-free')!;
    const clear = witness.arms.find(a => a.name === 'clear-run')!;
    expect(run.firstContactBodies).toEqual(passive.firstContactBodies);
    expect(run.samples.slice(0, witness.identicalGlancingPrefixThroughTick))
      .toEqual(passive.samples.slice(0, witness.identicalGlancingPrefixThroughTick));
    expect(run.samples.every(s => s.state === 'up')).toBe(true);
    expect(run.samples.some((s, i) => s.vel.x < .95 * clear.samples[i].vel.x
      && s.availability < .99)).toBe(true);
    expect(run.samples.some(s => Math.abs(s.spin) > .1)).toBe(true);
    const final = run.samples.at(-1)!, untouched = clear.samples.at(-1)!;
    expect(final.availability).toBeGreaterThanOrEqual(.99);
    expect(final.vel.x).toBeGreaterThanOrEqual(.95 * untouched.vel.x);
    expect(Math.abs(final.vel.y)).toBeLessThanOrEqual(.1);
    expect(Math.abs(final.facing)).toBeLessThanOrEqual(.05);
    // Recovery does not undo the achieved contact's speed and distance cost.
    expect(final.vel.x).toBeLessThan(untouched.vel.x);
    expect(final.pos.x).toBeLessThan(untouched.pos.x);
  });

  it('retains a clear miss, loss of passive balance, and the square contact fall', () => {
    for (const name of ['clear-run', 'clear-free']) {
      const clear = witness.arms.find(a => a.name === name)!;
      expect(clear.firstContactTick).toBeNull();
      for (const s of clear.samples) {
        expect(s.normalContactImpulse).toBe(0);
        expect(s.internalImpulse).toEqual({ x: 0, y: 0 });
        expect(s.xiMagnitude).toBe(0);
        expect(s.state).toBe('up');
      }
    }
    const passive = witness.arms.find(a => a.name === 'glancing-free')!;
    expect(passive.samples.some(s => s.state === 'falling')).toBe(true);
    for (const name of ['square-front-run', 'square-front-run-48']) {
      const square = witness.arms.find(a => a.name === name)!;
      expect(square.samples.some(s => s.state === 'falling')).toBe(true);
      expect(square.samples.some(s => s.state === 'down')).toBe(true);
    }
  });

  it('preserves the recoverable outcome at 48 substeps with closed work and momentum ledgers', () => {
    const clear = witness.arms.find(a => a.name === 'clear-run')!;
    const refined = witness.arms.find(a => a.name === 'glancing-run-48')!;
    expect(refined.samples.every(s => s.state === 'up')).toBe(true);
    expect(refined.samples.some((s, i) => s.vel.x < .95 * clear.samples[i].vel.x
      && s.availability < .99)).toBe(true);
    expect(refined.samples.at(-1)!.vel.x).toBeGreaterThanOrEqual(.95 * clear.samples.at(-1)!.vel.x);
    expect(witness.summaries.find(s => s.name === 'glancing-run-48')!.recoveryTimeAfterContact).not.toBeNull();
    for (const arm of witness.arms) for (const s of arm.samples) {
      expect(s.pairInternalImpulseResidual).toBeLessThan(1e-8);
      expect(Math.abs(s.workResidual)).toBeLessThan(1e-8);
    }
  });
});
