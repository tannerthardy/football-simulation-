import { describe, expect, it } from 'vitest';
import { environment, mismatches, stack } from '../scripts/ref.mjs';
import { legacyEnv } from '../config/legacy-env';

describe('reference stack', () => {
  it('is the code default: on flags are read as on unless 0, off and retired flags as off unless 1', () => {
    expect(mismatches()).toEqual({ undeclared: [], notInSrc: [], wrongDefault: [] });
    for (const v of Object.values(stack.flags)) expect(['on', 'off', 'retired']).toContain(v);
  });
  it('sets every listed flag explicitly and refuses a retired one', () => {
    const env = environment({ WRAP_FOOT: '1', DL_GAMES: '1' }, ['ZONE_RUN=0']);
    expect(env.WRAP_FOOT).toBe('0');
    expect(env.DL_GAMES).toBe('0');
    expect(env.ZONE_RUN).toBe('0');
    expect(env.KEY_REACT).toBe('1');
    expect(() => environment({}, ['WRAP_FOOT=1'])).toThrow(/retired/);
    expect(new Set(Object.values(environment({ ZONE_RUN: '1' }, [], true)))).toEqual(new Set(['0']));
  });
  // The legacy pin (vitest.config.ts, config/legacy-env.ts): every `on` flag at 0 and every numeric flag at its `legacy` value; TEST_ENGINE_DEFAULTS=1 pins nothing; TEST_PIN_FLAGS pins only the
  // listed booleans. A suite recorded before a numeric default was promoted must not see it.
  it('pins the legacy suites: on flags at 0, numeric flags at their legacy value, nothing under TEST_ENGINE_DEFAULTS=1', () => {
    const numeric = Object.entries(stack.numeric ?? {}) as [string, { default: number; legacy: number }][];
    expect(numeric.length).toBeGreaterThan(0);
    const env = legacyEnv(stack);
    for (const [name, v] of numeric) expect(env[name], name).toBe(String(v.legacy));
    for (const [name, v] of Object.entries(stack.flags as Record<string, string>)) expect(env[name], name).toBe(v === 'on' ? '0' : undefined);
    expect(legacyEnv(stack, { engineDefaults: true })).toEqual({});
    expect(legacyEnv(stack, { pinOnly: 'KEY_REACT,ZONE_RUN' })).toEqual({ KEY_REACT: '0', ZONE_RUN: '0' });
    expect(legacyEnv(stack, { pinOnly: 'KEY_REACT,BALL_EST' })).toEqual({ KEY_REACT: '0', BALL_EST: String(stack.numeric!.BALL_EST!.legacy) });
    expect(legacyEnv(stack, { pinOnly: '' })).toEqual({});
  });
});
