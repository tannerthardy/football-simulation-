import {describe,expect,it} from 'vitest';
import {integrateContinuedRecovery,recoveryControl,type RecoveryState,type RecoveryLoad} from '../../scripts/diag/tackle/continued-recovery.js';

const params:RecoveryLoad={rb:.15,w:3.2,speed:3.4,capacity:1100,mobility:3.4/1100,
  latency:.12,force:{x:0,y:0},source:{x:0,y:0}};
const start=(x=.151,response=.12):RecoveryState=>({xi:{x,y:0},response});
function run(load:number,parts:number[],initial=start(),duration=.8){
  let state=initial,work=0,commandWork=0,dissipation=0;const trace:any[]=[];
  for(let t=0;t<duration-1e-12;){
    for(const dt of parts){
      const h=Math.min(dt,duration-t);if(h<=0)break;
      const flow=integrateContinuedRecovery(state,{...params,force:{x:-load,y:0}},h);
      expect(flow.peakCommandForce).toBeLessThanOrEqual(params.capacity+1e-8);
      expect(flow.peakAnkleTarget).toBeLessThanOrEqual(params.rb+1e-12);
      expect(flow.commandWork).toBeLessThanOrEqual(params.capacity*params.speed*h+1e-8);
      expect(flow.work).toBeLessThanOrEqual(params.capacity*params.speed*h+1e-8);
      expect(Math.abs(flow.commandWork-flow.work-flow.dissipation)).toBeLessThan(1e-7);
      state=flow.state;t+=h;work+=flow.work;commandWork+=flow.commandWork;dissipation+=flow.dissipation;
      trace.push({t,state,flow});
    }
  }
  return {state,trace,work,commandWork,dissipation};
}

describe('one-body continued, bounded support response',()=>{
  it('matches the independent fully-reacted affine solution inside the placement band',()=>{
    const force=600,x=.10,h=.01,s=params.speed,b=params.rb,w=params.w;
    const k=w-2*s/b,c=s-w*b+params.mobility*force,equilibrium=-c/k;
    const exact=equilibrium+(x-equilibrium)*Math.exp(k*h);
    const result=integrateContinuedRecovery(start(x),{...params,force:{x:-force,y:0}},h);
    expect(result.state.xi.x).toBeCloseTo(exact,10);
    // Independent integral of the affine step command, not the kernel's work.
    const intX=equilibrium*h+(x-equilibrium)*Math.expm1(k*h)/k;
    expect(result.requested.x).toBeCloseTo(s*(2*intX/b-h),10);
  });
  it('has continuous rates and achieved placement on both sides of both boundaries',()=>{
    for(const boundary of [params.rb,params.rb/2])for(const response of [.02,.12]){
      const a={...params,force:{x:-300,y:0}};
      const left=recoveryControl(start(boundary-1e-10,response),a),right=recoveryControl(start(boundary+1e-10,response),a);
      expect(Math.abs(left.rate.x-right.rate.x)).toBeLessThan(1e-8);
      expect(Math.abs(left.achieved.x-right.achieved.x)).toBeLessThan(1e-8);
    }
  });
  it('continues a reacted step inside the base while load requires it',()=>{
    const r=run(600,[.05]);
    expect(r.state.xi.x).toBeLessThan(params.rb);
    expect(r.state.xi.x).toBeGreaterThan(params.rb/2);
    expect(r.state.response).toBe(params.latency);
    expect(recoveryControl(r.state,{...params,force:{x:-600,y:0}}).requested.x).toBeGreaterThan(0);
  });
  it('increasing sustained loads give progressive deviation with unchanged force ceilings',()=>{
    const rows=[0,20,100,300,600,1000].map(load=>run(load,[.05]));
    for(let k=1;k<rows.length;k++)expect(rows[k].state.xi.x).toBeGreaterThan(rows[k-1].state.xi.x);
    expect(rows.at(-1)!.state.xi.x).toBeLessThan(params.rb);
    // Excessive load is exposed, not held inside by a projection or stronger motor.
    expect(run(1500,[.05]).state.xi.x).toBeGreaterThan(params.rb);
  });
  it('removing the load winds down placement and returns to ordinary inner damping',()=>{
    const loaded=run(600,[.05]),removed=run(0,[.05],loaded.state);
    expect(removed.state.xi.x).toBeLessThan(.01);
    expect(removed.state.response).toBe(0);
    const inner=integrateContinuedRecovery(removed.state,params,.05);
    expect(inner.state.xi.x).toBe(removed.state.xi.x*Math.exp(-params.w*.05));
    expect(inner.requested.x).toBe(0);
  });
  it('a small-error no-load body retains the exact existing ankle/hip response',()=>{
    const r=integrateContinuedRecovery(start(.04,0),params,.05);
    expect(r.state.xi.x).toBe(.04*Math.exp(-params.w*.05));
    expect(r.commandWork+r.work).toBe(0);
  });
  it('tiny transmitted loads approach the same unheld response',()=>{
    const free=run(0,[.05]);let previous=Infinity;
    for(const load of [1e-3,1e-5,1e-7]){
      const held=run(load,[.05]),error=Math.abs(held.state.xi.x-free.state.xi.x);
      expect(error).toBeLessThan(previous);previous=error;
      expect(Math.abs(held.commandWork-free.commandWork)).toBeLessThan(load);
      expect(Math.abs(held.work)).toBeLessThan(load);
    }
    expect(previous).toBeLessThan(1e-8);
  });
  it.each([0,100,600,1000])('equal and unequal time partitions agree, load=%s',load=>{
    const a=run(load,[.05]),b=run(load,[.05/12]),c=run(load,[.03,.017,.003]);
    for(const r of [b,c]){
      expect(Math.abs(r.state.xi.x-a.state.xi.x)).toBeLessThan(1e-8);
      expect(Math.abs(r.work-a.work)).toBeLessThan(1e-7);
      expect(Math.abs(r.commandWork-a.commandWork)).toBeLessThan(1e-6);
    }
  });
  it('outward crossing initiates recovery and inward crossing retains its achieved response',()=>{
    const r=run(600,[.01],start(.04,0),.8);
    const outside=r.trace.find(row=>row.state.xi.x>params.rb);
    expect(outside).toBeDefined();
    const inside=r.trace.find(row=>row.t>outside.t&&row.state.xi.x<params.rb);
    expect(inside).toBeDefined();expect(inside.state.response).toBeGreaterThan(0);
    expect(inside.flow.requested.x).toBeGreaterThan(0);
  });
  it('mirrors both force and command without changing work or clocks',()=>{
    const a=integrateContinuedRecovery(start(.151,.04),{...params,force:{x:-600,y:0}},.05);
    const b=integrateContinuedRecovery(start(-.151,.04),{...params,force:{x:600,y:0}},.05);
    expect(b.state.xi.x).toBe(-a.state.xi.x);expect(b.state.response).toBe(a.state.response);
    expect(b.requested.x).toBe(-a.requested.x);expect(b.work).toBe(a.work);
  });
  it('holds increasing loads and removes them at identical physical times across partitions',()=>{
    const protocol=(parts:number[])=>{
      let state=start(.04,0),work=0;
      for(const load of [0,100,300,600,600,600,0,0,0,0]){
        const r=run(load,parts,state,.1);state=r.state;work+=r.work;
      }
      return {state,work};
    };
    const a=protocol([.05]),b=protocol([.03,.017,.003]);
    expect(Math.abs(a.state.xi.x-b.state.xi.x)).toBeLessThan(1e-8);
    expect(Math.abs(a.work-b.work)).toBeLessThan(1e-7);
    expect(a.state.response).toBe(0);
  });
  it('retains the same response after rotating both the body deviation and the applied load',()=>{
    const angle=.63,c=Math.cos(angle),s=Math.sin(angle);
    const a=integrateContinuedRecovery(start(.151,.06),{...params,force:{x:-300,y:0}},.05);
    const b=integrateContinuedRecovery({xi:{x:.151*c,y:.151*s},response:.06},
      {...params,force:{x:-300*c,y:-300*s}},.05);
    expect(Math.hypot(b.state.xi.x-a.state.xi.x*c,b.state.xi.y-a.state.xi.x*s)).toBeLessThan(1e-9);
    expect(Math.abs(b.work-a.work)).toBeLessThan(1e-7);
  });
  it('passive assisting loads cannot create excess active power',()=>{
    const r=integrateContinuedRecovery(start(.4),{...params,force:{x:10000,y:0}},.001);
    expect(r.peakCommandForce).toBeLessThan(params.capacity);
    expect(r.commandWork).toBeLessThanOrEqual(params.capacity*params.speed*.001+1e-8);
    expect(Math.abs(r.commandWork-r.work-r.dissipation)).toBeLessThan(1e-8);
  });
});
