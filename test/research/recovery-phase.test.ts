import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { advanceRecoveryPhase, type RecoveryInput } from '../../scripts/diag/tackle/recovery-phase.js';
import { advanceRecovery } from '../../src/physics/support.js';

/** Independent differential-equation oracle: no production/candidate formula.
 * Small midpoint intervals resolve the switched radial law and outside clock.
 * Compare refinements of this oracle too; neither is biomechanical truth.
 */
function oracle(a: RecoveryInput, count: number) {
  let e = a.e, out = e > a.rb ? a.outsideFor : 0;
  const dt = a.h / count;
  const rate = (x: number, clock: number) => x <= a.rb
    ? -a.w * x - a.loadVelocity
    : a.w * (x - a.rb) - a.speed * Math.min(clock / a.latency, 1) - a.loadVelocity;
  for (let k = 0; k < count; k++) {
    const middle = e + dt * rate(e, out) / 2;
    e += dt * rate(middle, middle > a.rb ? out + dt / 2 : 0);
    out = e > a.rb ? out + dt : 0;
  }
  return { e, out };
}
const receipt = JSON.parse(readFileSync('data/reviews/current/loaded-grip-refinement.json', 'utf8'));
const witnesses: RecoveryInput[] = receipt.phaseCrossings.filter((r: any) => r.side === 1 && r.crossing)
  .slice(0, 3).map((r: any) => r.crossing.input);

describe('reconstructed base-crossing experiment', () => {
  it('finds the rear crossing hidden by the midpoint displacement kick',()=>{
    const before=.1555501220085059, displacement=.004818982882903353;
    const a={e:before,rb:.15725727482836993,w:3.2192935497061113,speed:3.402825459004463,
      outsideFor:0,latency:.12,h:.05/12,loadVelocity:-.780079879795501-displacement/(.05/12)};
    const whole=advanceRecoveryPhase(a),fine=oracle(a,64000);
    expect(whole.events[0].kind).toBe('exit-base');
    expect(whole.events[0].t).toBeCloseTo(.0011912103262667266,12);
    expect(whole.outsideFor).toBeCloseTo(.00297545634039994,12);
    expect(Math.abs(whole.next-fine.e)).toBeLessThan(2e-7);
    let e=a.e,out=0;
    for(const fraction of [.11,.36,.03,.5]){
      const part=advanceRecoveryPhase({...a,e,outsideFor:out,h:a.h*fraction});
      e=part.next;out=part.outsideFor;
    }
    expect(e).toBeCloseTo(whole.next,12);expect(out).toBeCloseTo(whole.outsideFor,12);
  });
  it.each(witnesses)('locates an outward crossing and counts only achieved outside time: $e', a => {
    const candidate = advanceRecoveryPhase(a), coarse = oracle(a, 16000), fine = oracle(a, 64000);
    const force = -a.loadVelocity;
    // First crossing derived directly from the inside linear ODE.
    const crossing = Math.log((force - a.w * a.e) / (force - a.w * a.rb)) / a.w;
    expect(candidate.events[0].kind).toBe('exit-base');
    expect(candidate.events[0].t).toBeCloseTo(crossing, 12);
    expect(candidate.outsideFor).toBeCloseTo(a.h - crossing, 12);
    expect(Math.abs(coarse.e - fine.e)).toBeLessThan(2e-7);
    expect(Math.abs(candidate.next - fine.e)).toBeLessThan(2e-7);
    expect(Math.abs(candidate.outsideFor - fine.out)).toBeLessThan(a.h / 16000);
    expect(Math.abs(advanceRecovery(a.e,a.rb,a.w,a.speed,a.outsideFor,a.latency,a.h,a.loadVelocity).next - fine.e)).toBeGreaterThan(1e-5);
  });

  it.each(witnesses)('composes unequal intervals through the same base crossing: $e', a => {
    const whole = advanceRecoveryPhase(a);
    let e = a.e, out = a.outsideFor, weight = 0;
    const schedule = [.07, .19, .04, .31, .39];
    for (const fraction of schedule) {
      const part = advanceRecoveryPhase({ ...a, e, outsideFor: out, h: a.h * fraction });
      // Only scalar recovery/clock composition is claimed. Transverse
      // sensitivity need not compose across rotating radial directions.
      e = part.next; out = part.outsideFor; weight += part.weight;
    }
    expect(e).toBeCloseTo(whole.next, 12);
    expect(out).toBeCloseTo(whole.outsideFor, 12);
    expect(weight).toBeGreaterThan(0);
  });

  it.each([.02,.09,.13])('retains the unforced law across ramp and inward crossings, out=%s', outsideFor => {
    for (const e of [.08,.17,.5]) {
      const a = {e,rb:.15,w:3.2,speed:3.4,outsideFor,latency:.12,h:.05,loadVelocity:0};
      const next = advanceRecoveryPhase(a), baseline=advanceRecovery(e,a.rb,a.w,a.speed,outsideFor,a.latency,a.h);
      expect(next.next).toBeCloseTo(baseline.next, 12);
      expect(next.weight).toBeCloseTo(baseline.weight, 12);
      if (next.next <= a.rb) expect(next.outsideFor).toBe(0);
    }
  });

  it('exposes opposing responses at the base instead of hiding a stick rule', () => {
    expect(() => advanceRecoveryPhase({e:.151,rb:.15,w:3.2,speed:3.4,outsideFor:.12,latency:.12,h:.01,loadVelocity:-1})).toThrow('chatters');
  });
});
