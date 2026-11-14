import { describe, expect, it } from 'vitest';
import { environment, numericMismatches, stack } from '../scripts/ref.mjs';

// Numeric flags (a mask read as Number(process.env.NAME ?? n)) are set explicitly by the reference runner,
// zeroed by --off, and can be given to a candidate arm.
describe('reference stack numeric flags', () => {
  it('lists each numeric flag with the default src reads', () => {
    expect(numericMismatches()).toEqual({ notInSrc: [], wrongDefault: [] });
    expect(stack.numeric?.INFO_HONEST).toEqual({ default: 63, legacy: 0 });
  });
  it('sets the default, zeroes it for the legacy arm and does not leak the ambient value', () => {
    expect(environment({ INFO_HONEST: '5' }).INFO_HONEST).toBe('63');
    expect(environment({}, [], true).INFO_HONEST).toBe('0');
    expect(environment({ INFO_HONEST: '63' }, [], true).INFO_HONEST).toBe('0');
  });
  it('lets a candidate arm set one, and refuses a non-integer', () => {
    expect(environment({}, ['INFO_HONEST=7']).INFO_HONEST).toBe('7');
    expect(environment({}, ['INFO_HONEST=0', 'ZONE_RUN=0']).ZONE_RUN).toBe('0');
    expect(() => environment({}, ['INFO_HONEST=x'])).toThrow(/numeric/);
    expect(() => environment({}, ['INFO_HONEST=1.5'])).toThrow(/numeric/);
    expect(() => environment({}, ['INFO_HONEST'])).toThrow(/numeric/);
  });
});
