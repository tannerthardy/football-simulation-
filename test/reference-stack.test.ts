import { describe, expect, it } from 'vitest';
import { environment, experimental, stack } from '../scripts/ref.mjs';

describe('reference stack', () => {
  it('names every off-by-default flag the source reads, and nothing else', () => {
    expect(Object.keys(stack.flags).sort()).toEqual(experimental());
    for (const v of Object.values(stack.flags)) expect(['on', 'off', 'retired']).toContain(v);
  });
  it('sets every listed flag explicitly and refuses a retired one', () => {
    const env = environment({ GUN_STRETCH_T: '1', BACKSIDE_SHOOT: '1' }, ['ZONE_RUN=0']);
    expect(env.GUN_STRETCH_T).toBeUndefined();
    expect(env.BACKSIDE_SHOOT).toBeUndefined();
    expect(env.ZONE_RUN).toBeUndefined();
    expect(env.KEY_REACT).toBe('1');
    expect(() => environment({}, ['WRAP_FOOT=1'])).toThrow(/retired/);
    expect(Object.keys(environment({ ZONE_RUN: '1' }, [], true)).length).toBe(0);
  });
});
