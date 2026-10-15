import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {alignOffense} from '../src/playbook/alignment.js';
import {Agent} from '../src/sim/agent.js';
import {runReadAim} from '../src/sim/behaviors/carrier.js';
import {PlaySim} from '../src/sim/playsim.js';
import {TeammateInformation} from '../src/sim/teammate-information.js';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/run-entry-information.json.gz',import.meta.url))).toString());
function scene(id:string){
  const r=fixture.scenes.find((s:any)=>s.id===id);
  const actors=r.actors.map((a:any)=>new Agent(a.idx,a.team,a.slot,a.player,a.profile,
    {...structuredClone(a.body),profile:a.profile},{kind:'unused',update(){throw Error('No other decision');}}));
  const pictures=new Map(r.pictures.map((p:any)=>[p.target,p.picture]));
  const sim={t:r.t,dt:.05,los:r.los,ballY:r.ballY,offCall:r.call,offAlign:alignOffense(r.call.formation,r.call.flip,r.los,r.ballY),
    offense:actors.filter((a:Agent)=>a.team==='O'),defense:actors.filter((a:Agent)=>a.team==='D'),attackDir:()=>1,
    opponents:(a:Agent)=>actors.filter((b:Agent)=>a.team!==b.team),see:(_a:Agent,b:Agent)=>structuredClone(pictures.get(b.idx))}as unknown as PlaySim;
  const revive=(v:any):any=>v&&typeof v==='object'?(Object.keys(v).length===1&&'agent'in v?actors[v.agent]
    :Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,v])=>[k,revive(v)]))):v;
  return{sim,actors,read:()=>runReadAim(actors[6],sim,revive(r.opts)),parentEntry:r.parentEntry};
}
describe('portable acquired information without navigation',()=>{
  it('does not use private opponent engagement, fatigue, pose or movement for entry risk',()=>{
    const s=scene('failing'),entry=s.read();expect(entry).not.toBeNull();
    for(const d of s.actors.filter((a:Agent)=>a.team==='D')){
      d.body.pos={x:0,y:0};d.body.vel={x:20,y:20};d.body.energy=.01;d.body.support!.state='down';
      Object.defineProperty(d,'engagement',{get(){throw Error('Private engagement');}});
      Object.defineProperty(d,'speedScale',{get(){throw Error('Private fatigue');}});
      d.isDown=()=>{throw Error('Private current pose');};
    }
    expect(s.read()).toEqual(entry);
  });
  it('preserves the saved contrasting entry without approach policy',()=>{
    const s=scene('waiting-control');expect(s.read()).toEqual(s.parentEntry);
  });
  it('preserves acquisition latency, stale unknown semantics, expiry and pure copied queries',()=>{
    const actor=(idx:number,x:number)=>({idx,team:'O',pos:{x,y:0},vel:{x:0,y:1},facing:0,engagement:null,eyes:null,
      profile:{reactionTime:.3},mind:{observationDelay:()=>.3},isDown:()=>false});
    const a=actor(0,0),b=actor(1,5),agents=[a,b]as unknown as Agent[],info=new TeammateInformation(agents,new Map());
    info.sense(agents,0,.05);expect(info.query(0,1,.25,.05)).toEqual({source:'unavailable'});
    b.pos={x:-10,y:50};b.vel={x:9,y:-9};info.sense(agents,.3,.05);
    expect(info.query(0,1,.3,.05)).toMatchObject({source:'observed',vel:{x:0,y:1}});
    const stale=info.query(0,1,.35,.05);expect(stale).toMatchObject({source:'observed',vel:{x:0,y:0},age:.35,predictedFor:.3});
    if(stale.source==='unavailable')throw Error('Acquired memory expected');
    stale.pos.x=999;
    Object.defineProperty(b,'pos',{get(){throw Error('No live query fallback');}});
    Object.defineProperty(b,'vel',{get(){throw Error('No live query fallback');}});
    for(let i=0;i<3;i++)expect(info.query(0,1,.4,.05)).toMatchObject({source:'remembered',pos:{x:5,y:.3}});
    expect(info.query(0,1,1.05,.05)).toEqual({source:'unavailable'});
  });
  it('preserves guarded queries and catch-readiness sensing alongside one teammate sensing hook',()=>{
    const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(11),'O','OFF'),'11'),
      defense:pickDefense(generateTeam(new Rng(12),'D','DEF'),'nickel'),
      offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.smash,label:'transport'},
      defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover1,pressure:null,label:'transport'},
      los:40,ballY:26,firstDownX:50,seed:77,record:false});
    const rb=sim.slot('RB')!,lg=sim.slot('LG')!,rng=JSON.stringify(sim.rng);
    const sense=vi.spyOn(sim.teammateAwareness,'sense'),catchSense=vi.spyOn(sim.incidentalCatchReadiness,'sense');
    for(const target of [lg,rb,sim.defense[0]])expect(sim.teammateInformation(rb,target)).toEqual({source:'unavailable'});
    expect(sense).not.toHaveBeenCalled();expect(JSON.stringify(sim.rng)).toBe(rng);
    sim.tick();expect(sense).toHaveBeenCalledTimes(1);expect(catchSense).toHaveBeenCalledTimes(1);
  });
});
