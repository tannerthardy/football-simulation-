import { describe, expect, it } from 'vitest';
import { environment, mismatches, stack } from '../scripts/ref.mjs';

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
});
