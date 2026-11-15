import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CALL_MIX, CALL_MIX_PREF, callBucket, callMixWeight, conceptProfile, ROUTE_CLASSES, routeClass } from '../src/game/call-mix.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';

const config = JSON.parse(readFileSync('config/call-mix.json', 'utf8'));

describe('CALL_MIX: route-class preference by down and distance', () => {
  // Re-recorded on the engine defaults (2026-11-15): CALL_MIX was promoted at run-ref-20 (`=0` restores).
  it('is on by default (promoted)', () => {
    expect(CALL_MIX).toBe(true);
  });

  it('keeps the generated table equal to config/call-mix.json', () => {
    expect(CALL_MIX_PREF).toEqual(config.pref);
    expect(config.classes).toEqual(ROUTE_CLASSES);
  });

  it('classes routes by label family and break depth', () => {
    expect(['hitch', 'stick', 'hook', 'quick_out', 'short_in', 'slant'].map(routeClass)).toEqual(Array(6).fill('quick'));
    expect(['curl', 'comeback', 'out', 'deep_out', 'dig'].map(routeClass)).toEqual(Array(5).fill('breaking'));
    expect(['flat', 'arrow', 'back_flat', 'swing', 'checkdown', 'angle', 'bubble'].map(routeClass)).toEqual(Array(7).fill('flat'));
    expect(['shallow', 'shallow_high', 'cross'].map(routeClass)).toEqual(Array(3).fill('cross'));
    expect(['go', 'seam', 'post', 'corner', 'wheel'].map(routeClass)).toEqual(Array(5).fill('vertical'));
  });

  it("profiles a concept by its installed routes, the back's check counting as a flat", () => {
    const p = conceptProfile(PASS_BY_ID.comebacks);
    expect(p.breaking).toBeCloseTo(3 / 6); // comeback, dig, comeback
    expect(p.flat).toBeCloseTo(1 / 6); // the back's check
    expect(Object.values(conceptProfile(PASS_BY_ID.slant_flat)).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('buckets down and distance', () => {
    expect(callBucket(1, 10)).toBe('1st');
    expect(callBucket(2, 3)).toBe('2nd_short');
    expect(callBucket(2, 7)).toBe('2nd_med');
    expect(callBucket(3, 12)).toBe('3rd_long');
    expect(callBucket(4, 1)).toBe('3rd_short');
  });

  it('is neutral with a flat table and favours the classes the situation prefers', () => {
    const flat = Object.fromEntries(Object.keys(CALL_MIX_PREF).map((b) => [b, Object.fromEntries(ROUTE_CLASSES.map((k) => [k, 1]))])) as typeof CALL_MIX_PREF;
    expect(callMixWeight(PASS_BY_ID.comebacks, 1, 10, flat)).toBe(1);
    const pref = { ...flat, '1st': { quick: 2, flat: 1, cross: 1, breaking: 0.5, vertical: 1 } };
    expect(callMixWeight(PASS_BY_ID.hitches, 1, 10, pref)).toBeGreaterThan(1);
    expect(callMixWeight(PASS_BY_ID.comebacks, 1, 10, pref)).toBeLessThan(1);
    expect(callMixWeight(PASS_BY_ID.comebacks, 3, 12, pref)).toBe(1);
  });
});
