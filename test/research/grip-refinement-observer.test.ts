import { describe, expect, it } from 'vitest';
import { CASES, digest, native, replay } from '../../scripts/diag/tackle/grip-refinement.js';
import { sourceVersion } from '../../scripts/source-version.js';

describe('loaded-grip diagnostic records without changing the simulation', () => {
  it('tests the proposed held flow against the achieved-motion gravity solution', () => {
    const c=native({angle:45,speed:8,cut:false,difficulty:'difficult'},'patch',1,12);
    const run=(variant:string)=>replay(c.frames,'patch',12,variant,true);
    let tested=0,baselineError=0;
    for(const variant of ['full','achieved-support'])for(const row of run(variant).trace)for(const u of row.supportUpdates){
      const p=u.phase;if(!p||p.input.e<=p.input.rb)continue;
      const {input:a,normal:n,achieved:v}=p,radial=v.x*n.x+v.y*n.y;
      if(radial>=0)continue; // Outward motion cannot cross back inside this step.
      const expected=a.rb+(a.e-a.rb-radial/a.w)*Math.exp(a.w*a.h)+radial/a.w;
      const after=u.after.support.xi;
      const actual=p.result.next+n.x*(after.x-p.predicted.x)+n.y*(after.y-p.predicted.y);
      const error=Math.abs(expected-actual);
      if(variant==='achieved-support'){expect(error).toBeLessThan(1e-10);tested++;}
      else baselineError=Math.max(baselineError,error);
    }
    expect(tested).toBeGreaterThan(0);
    expect(baselineError).toBeGreaterThan(1e-6);
  });

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
      // A proposed held-support change must not suppress an unheld body's
      // fall or recovery. Remove only the holds; preserve the recorded motion.
      const noGrips=structuredClone(observed.frames);
      for(const frame of noGrips)frame.grips=[];
      const plain=replay(noGrips,mode,12,'full'),proposal=replay(noGrips,mode,12,'achieved-support');
      expect(digest(proposal.reports)).toBe(digest(plain.reports));
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
