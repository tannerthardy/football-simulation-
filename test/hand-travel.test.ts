import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// HAND_TRAVEL: an unloaded hand's travel speed has its own constant (5 yd/s, a stated choice inside the sourced punch bracket); ARM_SPEED stays the contact
// solver's loaded ceiling. Off (=0) is ARM_SPEED, bit for bit.
const load = async (flag?: string) => {
  vi.resetModules(); vi.unstubAllEnvs();
  if (flag !== undefined) vi.stubEnv('HAND_TRAVEL', flag);
  const act = await import('../src/physics/actuation.js');
  const eng = await import('../src/sim/engagement.js');
  return { act, eng };
};
const pair = () => ({
  b: { pos: { x: 0, y: 0 }, profile: { radius: 0.3, reactionTime: 0.25 } } as any,
  d: { pos: { x: 1.2, y: 0 }, profile: { radius: 0.3 } } as any,
});
describe('HAND_TRAVEL', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('off: the hand travels at ARM_SPEED, 3 yd/s, as before', async () => {
    const { act, eng } = await load('0');
    expect(act.HAND_TRAVEL).toBe(act.ARM_SPEED);
    expect(act.ARM_SPEED).toBe(3);
    const { b, d } = pair();
    expect(eng.refitTime(b, d)).toBeCloseTo(0.25 + 0.6 / 3, 12);
  });
  it('on (the default): 5 yd/s, the re-fit over a 0.6 yd gap is 0.12 s plus his reaction, and ARM_SPEED is untouched', async () => {
    const { act, eng } = await load();
    expect(act.HAND_TRAVEL).toBe(5);
    expect(act.ARM_SPEED).toBe(3);
    const { b, d } = pair();
    expect(eng.refitTime(b, d)).toBeCloseTo(0.25 + 0.6 / 5, 12);
    d.pos = { x: 0.6, y: 0 };
    expect(eng.refitTime(b, d)).toBeCloseTo(0.25, 12);
  });
  it('the contact solver still reads the loaded ceiling: world.ts names ARM_SPEED and never HAND_TRAVEL', () => {
    const w = readFileSync('src/physics/world.ts', 'utf8');
    expect(w).toMatch(/armCap\[i\] \* ARM_SPEED \* dt/);
    expect(w).not.toMatch(/HAND_TRAVEL/);
  });
  it('the press fit, the HAND_SITE length, the hand offset and the re-fit read HAND_TRAVEL; the club and counter durations stay on ARM_SPEED', () => {
    const e = readFileSync('src/sim/engagement.ts', 'utf8');
    expect(e.match(/step = HAND_TRAVEL \* sim\.dt/g)?.length).toBe(3);
    expect(e).toMatch(/gap \/ HAND_TRAVEL/);
    expect(e.match(/speed = ARM_SPEED \* \(0\.75/g)?.length).toBe(3);
  });
});
