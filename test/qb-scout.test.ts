// QB_SCOUT (QB lane, 2026-11-24): what the passer believes of a defender is a scouting report fixed before the game,
// the position's typical plus his share of a film reading that errs, less with more of the defender on film.
import { describe, expect, it } from 'vitest';
import { scoutReport } from '../src/sim/behaviors/qb.js';

const r01 = (k: string, v: number) => (k === 'x' ? 0 : v);
function man(id: string, position: string, experience: number, ratings: Record<string, number>, profile: Record<string, number>) {
  return { player: { id, position, experience }, profile, r: (k: string) => ratings[k] ?? r01(k, 0.5) } as any;
}
const passer = (id: string, rec: number, exp: number) => man(id, 'QB', exp, { playRecognition: rec }, {});
const corner = (id: string, exp: number, vmax: number) => man(id, 'CB', exp, { ballSkills: 0.9, manCoverage: 0.9 }, { vmax, reach: 1, reactReach: 2.3, maxCatchHeight: 3.2, radius: 0.35 });

describe('QB_SCOUT: the scouting report', () => {
  it('is the same report for the same passer and defender every time, and a new one for a different man', () => {
    const q = passer('q1', 0.8, 6), c = corner('c1', 4, 10.4);
    expect(scoutReport(q, c)).toEqual(scoutReport(q, c));
    expect(scoutReport(q, corner('c2', 4, 10.4)).profile.vmax).not.toBe(scoutReport(q, c).profile.vmax);
  });

  it('a passer who studies more is closer to the man than one who does not, on average', () => {
    let near = 0, far = 0;
    for (let i = 0; i < 200; i++) {
      const c = corner(`c${i}`, 6, 10.9);
      near += Math.abs(scoutReport(passer(`s${i}`, 1, 10), c).profile.vmax - 10.9);
      far += Math.abs(scoutReport(passer(`n${i}`, 0, 0), c).profile.vmax - 10.9);
    }
    expect(near).toBeLessThan(far);
  });

  it('film errs less on a man with more snaps on film, never to zero', () => {
    const spread = (exp: number) => {
      const v: number[] = [];
      for (let i = 0; i < 400; i++) v.push(scoutReport(passer(`q${i}`, 1, 10), corner(`c${exp}-${i}`, exp, 10.4)).profile.vmax);
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
    };
    const rookie = spread(0), vet = spread(12);
    expect(vet).toBeLessThan(rookie);
    expect(vet).toBeGreaterThan(0);
  });
});
