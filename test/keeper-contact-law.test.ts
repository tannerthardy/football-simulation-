import { describe, expect, it } from 'vitest';
import { readWitness, reflectWitness, replayKeeper, stateError } from '../scripts/diag/physics/keeper-contact-law.js';

describe('saved RT/DE_S keeper law boundary',()=>{
  it('retains the exact reduced native baseline step',()=>{
    const w=readWitness(),r=replayKeeper(w,'center');
    expect(stateError(r.bodies,w.expectedAfter)).toBeLessThan(1e-12);
    expect(r.reports[0].substeps).toBe(12);
  });
  it.each([false,true])('exposes the retained passive center defect, reflected %s',mirror=>{
    const w=readWitness(),r=replayKeeper(mirror?reflectWitness(w):w,'center',{free:true});
    expect(r.clean).toBe(true);
    expect(r.angularChange*(mirror?-1:1)).toBeCloseTo(15.153603048967852,8);
  });
  it.each([false,true])('common patch conserves angular momentum and work, reflected %s',mirror=>{
    const w=readWitness();
    for(const substeps of [1,12,48]) {
      const r=replayKeeper(mirror?reflectWitness(w):w,'patch',{free:true,substeps});
      expect(r.clean).toBe(true);
      expect(Math.abs(r.angularChange)).toBeLessThan(1e-8);
      expect(r.linearResidual).toBeLessThan(1e-10);
      for(const q of r.reports) {
        expect(Math.abs(q.work.residual)).toBeLessThan(1e-9);
        q.armImpulse.forEach((j,i)=>expect(j).toBeLessThanOrEqual(q.armImpulseLimit[i]+1e-10));
        q.armWork.forEach((work,i)=>expect(work).toBeLessThanOrEqual(q.armWorkLimit[i]+1e-10));
      }
    }
  });
  it('has the same law under unequal physical-time partitions',()=>{
    const w=readWitness(),r=replayKeeper(w,'patch',{free:true,substeps:1,partitions:[.007,.013,w.dt-.020]});
    expect(r.clean).toBe(true);
    expect(Math.abs(r.angularChange)).toBeLessThan(1e-8);
    expect(r.linearResidual).toBeLessThan(1e-10);
  });
  it('keeps a purely passive tangential grip dissipative',()=>{
    const r=replayKeeper(readWitness(),'patch',{free:true,passiveOnly:true});
    expect(r.clean).toBe(true);
    expect(r.energyChange).toBeLessThanOrEqual(1e-10);
    expect(Math.abs(r.angularChange)).toBeLessThan(1e-8);
  });
  it('leaves force-free co-motion unchanged',()=>{
    const w=readWitness();
    for(const b of w.beforeBodies){b.vel={x:1.2,y:-.7};b.spin=0;}
    for(const j of w.jointInputs){j.push=0;j.hold=0;}
    const r=replayKeeper(w,'patch',{free:true});
    expect(r.clean).toBe(true);
    expect(r.joints[0].tangentForce).toBeCloseTo(0,10);
    expect(r.energyChange).toBeCloseTo(0,9);
    for(const b of r.bodies)expect(b.vel).toEqual({x:1.2,y:-.7});
  });
});
