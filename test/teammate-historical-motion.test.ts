import {describe,expect,it} from 'vitest';
import type {Agent} from '../src/sim/agent.js';
import {TeammateInformation} from '../src/sim/teammate-information.js';
function scene(){
  const actor=(idx:number,x:number)=>({idx,team:'O',pos:{x,y:0},vel:{x:0,y:1},facing:0,engagement:null,eyes:null,
    profile:{reactionTime:.3},mind:{observationDelay:()=>.3},isDown:()=>false});
  const a=actor(0,0),b=actor(1,5),agents=[a,b] as unknown as Agent[];
  const info=new TeammateInformation(agents,new Map());info.sense(agents,0,.05);
  return{a,b,agents,info,query:(t:number)=>info.query(0,1,t,.05)};
}
describe('delivered historical teammate velocity',()=>{
  it('preserves the cap/expiry and sample origin without treating old velocity as current',()=>{
    const s=scene();s.b.pos={x:-10,y:50};s.b.vel={x:9,y:-9};s.info.sense(s.agents,.3,.05);
    expect(s.query(.25)).toEqual({source:'unavailable'});
    for(const t of [.30,.35,.40,1]){
      const p=s.query(t);if(p.source!=='observed'&&p.source!=='remembered')throw Error('Visual sample expected');
      expect(p.sampledVel).toEqual({x:0,y:1});expect(p.sampledAt).toBe(0);expect(p.availableAt).toBeCloseTo(.3,12);
      expect(p.pos).toEqual({x:5,y:.3});expect(p.age).toBe(t);expect(p.predictedFor).toBe(.3);
      expect({x:p.pos.x-p.sampledVel.x*p.predictedFor,y:p.pos.y-p.sampledVel.y*p.predictedFor}).toEqual({x:5,y:0});
      expect(p.vel).toEqual(t<=.30?{x:0,y:1}:{x:0,y:0});
    }
    expect(s.query(1.05)).toEqual({source:'unavailable'});
  });
  it('copies historical vectors and never consults hidden live motion on read',()=>{
    const s=scene();s.b.pos={x:-10,y:50};s.info.sense(s.agents,.3,.05);
    const p=s.query(.4);if(p.source!=='remembered')throw Error('Remembered sample expected');
    p.sampledVel.y=999;p.pos.x=999;p.vel.x=999;
    Object.defineProperty(s.b,'vel',{get(){throw Error('Hidden velocity read');}});
    Object.defineProperty(s.b,'pos',{get(){throw Error('Hidden position read');}});
    for(let i=0;i<3;i++)expect(s.query(.4)).toMatchObject({pos:{x:5,y:.3},vel:{x:0,y:0},sampledVel:{x:0,y:1}});
  });
  it('a real reacquired changed velocity replaces history only after its own latency',()=>{
    const s=scene();s.b.pos={x:-10,y:50};s.info.sense(s.agents,.3,.05);
    s.b.pos={x:6,y:0};s.b.vel={x:2,y:-1};s.info.sense(s.agents,.4,.05);
    expect(s.query(.65)).toMatchObject({sampledAt:0,sampledVel:{x:0,y:1},vel:{x:0,y:0}});
    s.b.pos={x:-10,y:50};s.info.sense(s.agents,.70,.05);
    expect(s.query(.70)).toMatchObject({source:'observed',sampledAt:.4,
      sampledVel:{x:2,y:-1},vel:{x:2,y:-1}});
    const fresh=s.query(.70);if(fresh.source==='unavailable')throw Error('Reacquisition expected');
    expect(fresh.availableAt).toBeCloseTo(.70,12);
  });
  it('does not label installed or tactile velocity as a measured visual sample',()=>{
    const s=scene(),called=new TeammateInformation(s.agents,new Map([[1,{origin:{x:5,y:0},velocity:{x:1,y:0},startsAt:0,until:1,label:'nominal'}]]));
    expect(called.query(0,1,.2,.05)).toMatchObject({source:'called'});
    expect('sampledVel'in called.query(0,1,.2,.05)).toBe(false);
    called.touched(0,1,{x:1,y:0},{x:3,y:0},.2);
    expect(called.query(0,1,.2,.05)).toMatchObject({source:'tactile'});
    expect('sampledVel'in called.query(0,1,.2,.05)).toBe(false);
  });
});
