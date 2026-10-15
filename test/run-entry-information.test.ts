import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import type {Agent} from '../src/sim/agent.js';
import {BallCarrier} from '../src/sim/behaviors/carrier.js';
import {PlaySim} from '../src/sim/playsim.js';
import {chooseRunApproach} from '../src/sim/run-approach.js';
import {TeammateInformation} from '../src/sim/teammate-information.js';

const saved=JSON.parse(readFileSync(new URL('./fixtures/run-entry-approach.json',import.meta.url),'utf8'));
function acquisition(vy:number){
  const actor=(idx:number,x:number)=>({idx,team:'O',pos:{x,y:0},vel:{x:0,y:vy},facing:0,
    engagement:null,eyes:null,profile:{reactionTime:.3},mind:{observationDelay:()=>.3},isDown:()=>false});
  const observer=actor(0,0),target=actor(1,5),agents=[observer,target];
  const info=new TeammateInformation(agents as unknown as Agent[],new Map());
  info.sense(agents as unknown as Agent[],0,.05);
  return{info,target,agents,query:(t:number)=>info.query(0,1,t,.05)};
}
const state=(info:TeammateInformation)=>JSON.stringify(info,(_key,v)=>v instanceof Map?[...v]:v);

describe('minimal run-entry information transport and consumer',()=>{
  it('distinguishes a delivered stationary sample from stale zero even while source is observed',()=>{
    const stopped=acquisition(0),moving=acquisition(1);
    for(const s of [stopped,moving]){
      expect(s.query(.25)).toEqual({source:'unavailable'});
      s.target.pos={x:-10,y:50};s.target.vel={x:9,y:-9};
      s.info.sense(s.agents as unknown as Agent[],.30,.05);
    }
    expect(stopped.query(.30)).toMatchObject({source:'observed',vel:{x:0,y:0},age:.30,predictedFor:.30});
    expect(moving.query(.30)).toMatchObject({source:'observed',vel:{x:0,y:1}});
    expect(moving.query(.35)).toMatchObject({source:'observed',vel:{x:0,y:0},age:.35,predictedFor:.30});
    expect(moving.query(.40)).toMatchObject({source:'remembered',vel:{x:0,y:0}});
    expect(moving.query(1.05)).toEqual({source:'unavailable'});
  });
  it('preserves hidden-divergence invariance, query purity and copied vectors through expiry',()=>{
    const left=acquisition(1),right=acquisition(1),s=structuredClone(saved.clear);
    for(let tick=1;tick<=21;tick++){
      const t=tick*.05;
      left.target.pos={x:-10-t,y:50};left.target.vel={x:-9,y:3};
      right.target.pos={x:-20+t,y:-50};right.target.vel={x:8,y:-4};
      for(const a of [left,right])a.info.sense(a.agents as unknown as Agent[],t,.05);
      const before=state(left.info),p=left.query(t),q=right.query(t);
      expect(p).toEqual(q);expect(left.query(t)).toEqual(p);expect(state(left.info)).toBe(before);
      const peer=(picture:typeof p)=>({id:1,picture,radius:.4,brake:4});
      const a=chooseRunApproach(s.body,s.command,[peer(p)],t,'center');
      const b=chooseRunApproach(s.body,s.command,[peer(q)],t,'center');
      expect(a).toEqual(b);
      if(p.source!=='unavailable'){
        p.pos.x=999;p.vel.y=999;expect(left.query(t)).toEqual(q);
      }
      if(t>.30+1e-9){expect(a.status).toBe('unknown');expect(a.minimumGap).toBeNull();}
    }
  });
  it('consumer keeps unavailable information and cannot fall back to private teammate state',()=>{
    const s=structuredClone(saved.failing),peer=s.peers.find((p:any)=>p.id===5);
    const teammate={idx:5,profile:{radius:peer.radius,brake:peer.brake},
      get body(){throw Error('Private teammate body');},get pos(){throw Error('Private teammate position');},
      get vel(){throw Error('Private teammate velocity');}};
    const rb={idx:6,body:s.body,engagement:null};
    const sim={t:s.t,bond:null,world:{joints:[],handContact:'center'},teammates:()=>[rb,teammate],
      teammateInformation:vi.fn(()=>({source:'unavailable'})),see(){throw Error('No live/perception fallback');}};
    const carrier=new BallCarrier() as unknown as {approach(a:unknown,sim:unknown,command:unknown):ReturnType<typeof chooseRunApproach>};
    const r=carrier.approach(rb,sim,s.command);
    // Identity assertions do not make the test matcher traverse private getters.
    expect(sim.teammateInformation).toHaveBeenCalledTimes(1);
    expect(sim.teammateInformation.mock.calls[0][0]).toBe(rb);
    expect(sim.teammateInformation.mock.calls[0][1]).toBe(teammate);
    expect(r.status).toBe('unknown');expect(r.unknownPeers).toEqual([5]);expect(r.minimumGap).toBeNull();
  });
  it('hosts guarded pure queries and both once-per-tick sensing hooks on accepted PlaySim',()=>{
    const sim=new PlaySim({
      offense:pickOffense(generateTeam(new Rng(11),'O','OFF'),'11'),
      defense:pickDefense(generateTeam(new Rng(12),'D','DEF'),'nickel'),
      offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.smash,label:'transport'},
      defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover1,pressure:null,label:'transport'},
      los:40,ballY:26,firstDownX:50,seed:77,record:false});
    const rb=sim.slot('RB')!,lg=sim.slot('LG')!;
    const sense=vi.spyOn(sim.teammateAwareness,'sense'),catchSense=vi.spyOn(sim.incidentalCatchReadiness,'sense');
    const rng=JSON.stringify(sim.rng);
    for(let i=0;i<3;i++)expect(sim.teammateInformation(rb,lg)).toEqual({source:'unavailable'});
    expect(sim.teammateInformation(rb,rb)).toEqual({source:'unavailable'});
    expect(sim.teammateInformation(rb,sim.defense[0])).toEqual({source:'unavailable'});
    expect(sense).not.toHaveBeenCalled();expect(JSON.stringify(sim.rng)).toBe(rng);
    sim.tick();
    expect(sense).toHaveBeenCalledTimes(1);expect(catchSense).toHaveBeenCalledTimes(1);
    expect(sense).toHaveBeenCalledWith(sim.agents,0,sim.dt);
  });
});
