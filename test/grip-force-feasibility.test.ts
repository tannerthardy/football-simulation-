import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dryGripInterval, type DryGripInput, type Particle } from '../scripts/diag/physics/grip-force-interval.js';

type ReferencePose = Pick<Particle, 'pos' | 'vel' | 'facing' | 'spin'>;
const fixture: { cases: Array<{ id: string; input: DryGripInput; reference: { a: ReferencePose; b: ReferencePose } }> } =
  JSON.parse(readFileSync(new URL('../config/grip-force-feasibility.json', import.meta.url), 'utf8'));
const energy=(b:Particle)=>.5*b.mass*(b.vel.x**2+b.vel.y**2)+.5*b.inertia*b.spin**2;
const angular=(b:Particle)=>b.mass*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+b.inertia*b.spin;
const momentum=(a:Particle,b:Particle)=>({x:a.mass*a.vel.x+b.mass*b.vel.x,y:a.mass*a.vel.y+b.mass*b.vel.y});
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

describe('diagnostic grip-within-interval feasibility, no World insertion',()=>{
  it.each(fixture.cases)('preserves the saved mechanical witness/control: $id',({input,reference})=>{
    const saved=structuredClone(input),r=dryGripInterval(input);
    expect(input).toEqual(saved);
    for(const k of ['a','b'] as const) {
      expect(distance(r[k].pos,reference[k].pos)).toBeLessThan(1e-7);
      expect(distance(r[k].vel,reference[k].vel)).toBeLessThan(2.5e-5);
      expect(Math.abs(r[k].facing-reference[k].facing)).toBeLessThan(2.5e-6);
      expect(Math.abs(r[k].spin-reference[k].spin)).toBeLessThan(2.5e-4);
    }
    expect(distance(momentum(r.a,r.b),momentum(input.a,input.b))).toBeLessThan(1e-8);
    expect(Math.abs(angular(r.a)+angular(r.b)-angular(input.a)-angular(input.b))).toBeLessThan(1e-8);
    expect(Math.abs(energy(r.a)+energy(r.b)-energy(input.a)-energy(input.b)-r.work)).toBeLessThan(1e-8);
    expect(r.work).toBeLessThanOrEqual(1e-9);
    expect(r.dose).toBeLessThanOrEqual(input.capacity*input.duration+1e-10);
    expect(r.representationError).toBeLessThan(1e-11);
    // Here the material point has zero relative offset: its movement is the
    // held body's movement. This does not validate a moving support motor.
    expect(r.partitions).toBeLessThanOrEqual(128);
  });
  it('composes unequal physical intervals through impulse, temporal moment and work',()=>{
    const input=fixture.cases[0].input,whole=dryGripInterval(input),h=.0013;
    const first=dryGripInterval({...input,duration:h});
    const second=dryGripInterval({...input,a:first.a,b:first.b,duration:input.duration-h});
    for(const k of ['a','b'] as const) {
      expect(distance(whole[k].pos,second[k].pos)).toBeLessThan(1e-8);
      expect(distance(whole[k].vel,second[k].vel)).toBeLessThan(1e-7);
      expect(Math.abs(whole[k].facing-second[k].facing)).toBeLessThan(1e-8);
      expect(Math.abs(whole[k].spin-second[k].spin)).toBeLessThan(1e-7);
    }
    for(const k of ['x','y'] as const) {
      expect(Math.abs(whole.impulse[k]-first.impulse[k]-second.impulse[k])).toBeLessThan(1e-6);
      expect(Math.abs(whole.moment[k]-first.moment[k]-(input.duration-h)*first.impulse[k]-second.moment[k])).toBeLessThan(1e-8);
    }
    expect(Math.abs(whole.angularMoment-first.angularMoment-(input.duration-h)*first.angularImpulse-second.angularMoment)).toBeLessThan(1e-8);
    expect(Math.abs(whole.work-first.work-second.work)).toBeLessThan(1e-7);
  });
  it('does not manufacture a finite force from zero or tiny capacity',()=>{
    for(const capacity of [0,1e-12,1e-9]) {
      const input={...fixture.cases[0].input,capacity},r=dryGripInterval(input);
      expect(r.dose).toBeLessThanOrEqual(capacity*input.duration+1e-20);
      expect(Math.hypot(r.impulse.x,r.impulse.y)).toBeLessThanOrEqual(r.dose+1e-20);
      expect(r.work).toBeLessThanOrEqual(1e-12);
      expect(Number.isFinite(r.work)).toBe(true);
    }
  });
  it('refuses a normal/reeling/collision branch instead of changing its law',()=>{
    const input=fixture.cases[0].input;
    expect(()=>dryGripInterval({...input,pullSpeed:20})).toThrow('outside dry-grip scope');
    expect(()=>dryGripInterval({...input,minimumDistance:1.3})).toThrow('outside dry-grip scope');
  });
});
