import {describe,it,expect} from 'vitest';
import {mixedSpanInputs} from '../scripts/diag/physics/grip-mixed-span-inputs.js';
import {mixedSpanModel} from '../scripts/diag/physics/grip-mixed-span-model.js';
import {spanEventForce} from '../scripts/diag/physics/grip-span-event-force.js';
import {spanEventInterval} from '../scripts/diag/physics/grip-span-event-interval.js';
import {spanKernelInterval} from '../scripts/diag/physics/grip-span-kernel-interval.js';
import {spanKernelModel} from '../scripts/diag/physics/grip-span-kernel-model.js';
const cases=mixedSpanInputs();
describe('reduced RK stage arithmetic and frame composition',()=>{
  it.each(cases)('retains every PR43 physical result, guard statistic and event: $id',c=>{
    for(const duration of [.0002,.05/12]){const input={...c.input,duration},saved=structuredClone(input);
      expect(spanKernelInterval(input)).toEqual(spanEventInterval(input));expect(input).toEqual(saved);}
  });
  it('keeps derivatives independent of ledger state and bit-identical to the preserved ODE',()=>{
    for(const c of cases){const input={...c.input,duration:.05/12},old=mixedSpanModel(input,spanEventForce(1/input.a.mass+1/input.b.mass)),
      fast=spanKernelModel(input),y=old.initial.slice();
      for(const i of [16,17,18,19,20,21,22,23,24,25,26,28,29,30,31,33,34,35,36])y[i]=i/10;
      expect(fast.derivative(y)).toEqual(old.derivative(old.initial));expect(fast.derivative(y)).toEqual(old.derivative(y));}
  });
  it('preserves exact reflection, rotation and unequal-interval controls from PR43',()=>{
    const input={...cases.find(c=>c.id==='curved-return')!.input,duration:.05/12},angle=.7,
      rotate=(p:{x:number;y:number})=>({x:Math.cos(angle)*p.x-Math.sin(angle)*p.y,y:Math.sin(angle)*p.x+Math.cos(angle)*p.y}),
      mirror=(p:{x:number;y:number})=>({x:p.x,y:-p.y}),inputs=[input,
        {...input,a:{...input.a,pos:rotate(input.a.pos),vel:rotate(input.a.vel),facing:input.a.facing+angle},
          b:{...input.b,pos:rotate(input.b.pos),vel:rotate(input.b.vel),facing:input.b.facing+angle},footOffset:rotate(input.footOffset)},
        {...input,a:{...input.a,pos:mirror(input.a.pos),vel:mirror(input.a.vel),facing:-input.a.facing,spin:-input.a.spin},
          b:{...input.b,pos:mirror(input.b.pos),vel:mirror(input.b.vel),facing:-input.b.facing,spin:-input.b.spin},material:mirror(input.material),footOffset:mirror(input.footOffset)}];
    for(const p of inputs)expect(spanKernelInterval(p)).toEqual(spanEventInterval(p));
    const h=.0007,a=spanKernelInterval({...input,duration:h}),last={...input,duration:input.duration-h,a:a.a,b:a.b,material:a.material,footOffset:a.footOffset};
    expect(a).toEqual(spanEventInterval({...input,duration:h}));expect(spanKernelInterval(last)).toEqual(spanEventInterval(last));
  });
  it('retains refusals without mutating input or changing capacities',()=>{
    const input=cases[0].input,saved=structuredClone(input);
    for(const p of [{...input,capacity:1},{...input,pullSpeed:1},{...input,desired:{x:1,y:0}},
      {...input,hold:1.3},{...input,duration:.05},{...input,a:{...input.a,mass:NaN}}]){
      let slow='',fast='';try{spanEventInterval(p);}catch(e){slow=(e as Error).message;}
      try{spanKernelInterval(p);}catch(e){fast=(e as Error).message;}expect(slow).not.toBe('');expect(fast).toBe(slow);}
    expect(input).toEqual(saved);
  });
});
