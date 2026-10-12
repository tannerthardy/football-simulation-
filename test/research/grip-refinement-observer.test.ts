import { describe, expect, it } from 'vitest';
import { CASES, native, replay } from '../../scripts/diag/tackle/grip-refinement.js';
import { sourceVersion } from '../../scripts/source-version.js';

describe('loaded-grip diagnostic records without changing the simulation', () => {
  it.each(CASES.flatMap(c=>[1,-1].map(side=>({...c,side:side as 1|-1}))))(
    'preserves execution and RNG: $mode, side $side', ({mode,angle,speed,side}) => {
      const before=sourceVersion(),cell={angle,speed,cut:false,difficulty:'difficult' as const};
      const observed=native(cell,mode,side,12),unobserved=native(cell,mode,side,12,false);
      expect(observed.endpoint).toBe(unobserved.endpoint);
      expect(observed.decisions).toBe(unobserved.decisions);
      expect(observed.profiles).toBe(unobserved.profiles);
      expect(observed.trace.some(r=>r.rows.length)).toBe(true);
      expect(observed.trace.some(r=>r.supportUpdates.some((u:any)=>u.phase))).toBe(true);
      const a=replay(observed.frames,mode,12,'full',true),b=replay(observed.frames,mode,24,'full',true);
      expect(a.initial).toBe(b.initial);expect(a.decisions).toBe(b.decisions);expect(a.profiles).toBe(b.profiles);
      for(const r of [...a.reports,...b.reports]) {
        expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
        expect(r.passive).toBeLessThanOrEqual(1e-8);
        for(let k=0;k<2;k++){
          expect(r.armWork[k]).toBeLessThanOrEqual(r.armLimit[k]+1e-8);
          expect(r.supportWork[k]).toBeLessThanOrEqual(r.supportLimit[k]+1e-8);
        }
      }
      expect(sourceVersion()).toBe(before);
    });
});
