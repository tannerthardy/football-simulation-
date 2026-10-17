import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { directionalBrace } from '../scripts/diag/physics/directional-brace.js';

describe('settled moment follows the attained brace direction', () => {
  it('cannot spend forward lean on a transverse couple beyond the ankle allowance', () => {
    const r = directionalBrace({ id: 'transverse', xLoad: 400, coupleForce: 500 });
    const first = r.records[0];
    // Independent force×height witness: equal/opposite transverse forces
    // have no net transverse force, but a 2F*heightOffset moment.
    expect(first.incomingMoment.y).toBeCloseTo(2 * 500 * .4, 10);
    expect(first.achievedBrace.y).toBe(0);
    expect(first.achievedBrace.x).toBeGreaterThan(0);
    expect(first.canceledAlongCouple).toBeLessThanOrEqual(first.ankleMomentBudget + 1e-9);
    expect(first.remainingAlongCouple).toBeCloseTo(r.independentMoment - first.ankleMomentBudget, 10);
  });

  it('preserves the saved accepted collinear execution exactly', () => {
    const saved = JSON.parse(readFileSync('test/fixtures/directional-brace-control.json', 'utf8'));
    // JSON encodes the existing never-transitioned `since=-Infinity` as null.
    // Restore that sentinel only; compare every finite body/state bit exactly.
    for (const b of saved.after) if (b.support.since === null) b.support.since = -Infinity;
    const r = directionalBrace(saved.input);
    expect(r.after).toEqual(saved.after);
    expect(r.records).toEqual(saved.records);
    expect(r.tipAlongCouple).toBe(saved.tip);
    expect(r.deviationAlongCouple).toBe(saved.xi);
  });

  it('keeps a sub-ankle couple supportable without an unrelated lean', () => {
    const r = directionalBrace({ id: 'small', xLoad: 0, coupleForce: 100 });
    expect(r.records[0].canceledAlongCouple).toBeCloseTo(r.independentMoment, 10);
    expect(Math.abs(r.tipAlongCouple)).toBeLessThan(1e-10);
    expect(Math.abs(r.deviationAlongCouple)).toBeLessThan(1e-10);
  });

  it('does not require a lean to use the existing bounded ankle response', () => {
    const r = directionalBrace({ id: 'without-lean', xLoad: 0, coupleForce: 500 });
    expect(r.records[0].remainingAlongCouple)
      .toBeCloseTo(r.independentMoment - r.records[0].ankleMomentBudget, 10);
    expect(r.tipAlongCouple).toBeGreaterThan(0);
  });

  it('handles zero moments and zero brace without introducing a direction or NaN', () => {
    for (const xLoad of [0, 400]) {
      const r = directionalBrace({ id: 'zero', xLoad, coupleForce: 0 });
      expect(r.tipAlongCouple).toBe(0);
      expect(r.records.every(e => e.canceledAlongCouple === 0)).toBe(true);
    }
  });

  it('respects the same transverse moment bound after reflection and rotation', () => {
    const r = directionalBrace({ id: 'base', xLoad: 400, coupleForce: 500 });
    for (const orientation of [{ mirror: -1 }, { angle: .7 }, { angle: 1.2, mirror: -1 }]) {
      const other = directionalBrace({ id: 'transformed', xLoad: 400, coupleForce: 500, ...orientation });
      expect(other.records[0].canceledAlongCouple)
        .toBeLessThanOrEqual(other.records[0].ankleMomentBudget + 1e-9);
      expect(other.tipAlongCouple).toBeCloseTo(r.tipAlongCouple, 10);
      expect(other.deviationAlongCouple).toBeCloseTo(r.deviationAlongCouple, 10);
    }
  });

  it('retains the bound at finer contact subdivision without retuning support', () => {
    const coarse = directionalBrace({ id: '12', xLoad: 400, coupleForce: 500, substeps: 12 });
    const fine = directionalBrace({ id: '48', xLoad: 400, coupleForce: 500, substeps: 48 });
    expect(fine.records[0].remainingAlongCouple)
      .toBeCloseTo(fine.independentMoment - fine.records[0].ankleMomentBudget, 10);
    expect(Math.abs(coarse.deviationAlongCouple - fine.deviationAlongCouple)).toBeLessThan(.001);
    expect(Math.abs(coarse.tipAlongCouple - fine.tipAlongCouple)).toBeLessThan(.02);
  });
});
