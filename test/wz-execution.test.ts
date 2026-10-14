import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,it,expect} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../src/playbook/defense.js';
import {PlaySim} from '../src/sim/playsim.js';
import {spaceTeammates} from '../src/sim/spacing.js';
import {World,type Intent} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';

const witness=JSON.parse(gunzipSync(readFileSync(new URL('../docs/reviews/wide-zone-opening/first-breakdown.json.gz',import.meta.url))).toString());
function stage(flip=false){
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),'12'),
    defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
    offCall:{formation:FORMATION_BY_ID.ace_12,flip,kind:'run',run:RUN_BY_ID.wz_strong,label:'unit forecast'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'over'},
    los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
  const f=witness.cases.find((c:any)=>c.input.flip===flip&&c.input.concept==='wz_strong').frame;
  for(const a of sim.agents){a.body=structuredClone(f.beforeBodies[a.idx]);if(a.body.support!.since===null)a.body.support!.since=-Infinity;}
  sim.t=.05;
  return {sim,f,rt:sim.slot('RT')!,rg:sim.slot('RG')!,te:sim.slot(flip?'H':'Y')!};
}
function decide(s:ReturnType<typeof stage>,reverse=false){
  const agents=reverse?[...s.sim.agents].reverse():s.sim.agents;
  const intents:Intent[]=agents.map(a=>structuredClone(s.f.requested[a.idx]));
  spaceTeammates(agents,intents,(a,b)=>{const p=s.sim.teammateInformation(a,b);return p.source==='unavailable'?null:p;},{now:s.sim.t});
  return intents[agents.indexOf(s.rt)];
}
describe('achievable wide-zone unit traffic',()=>{
  it.each([false,true])('keeps the useful opening command with every installed neighbor represented, flip %s',flip=>{
    const s=stage(flip),before=structuredClone(s.rt.body);
    const rg=s.sim.teammateInformation(s.rt,s.rg);
    expect(rg.source).toBe('called');if(rg.source==='unavailable')throw Error('Missing installed RG');
    expect(Math.abs(rg.vel.y)).toBeLessThan(.5);
    expect(rg.forecast!.validFor).toBeCloseTo(.55,10);
    expect(decide(s).vel).toEqual(s.f.requested[s.rt.idx].vel);
    expect(s.rt.body).toEqual(before);
    expect(decide(s,true)).toEqual(decide(s));
  });
  it('does not import hidden teammate body, job or support into the copied opening route',()=>{
    const s=stage(),picture=s.sim.teammateInformation(s.rt,s.rg),request=decide(s);
    s.rg.body.pos={x:5,y:50};s.rg.body.vel={x:8,y:8};s.rg.body.energy=.1;
    s.rg.body.support=newSupport(.1);
    s.rg.behavior={kind:'private-job',update:()=>({vel:{x:-9,y:9}})};
    expect(s.sim.teammateInformation(s.rt,s.rg)).toEqual(picture);
    expect(decide(s)).toEqual(request);
    s.sim.t=.65;expect(s.sim.teammateInformation(s.rt,s.rg)).toEqual({source:'unavailable'});
  });
  it('still yields and stops before a genuinely blocked lateral route in the unchanged World',()=>{
    const s=stage(),a=s.rt,b=s.te;
    a.body.pos={x:50,y:26};a.body.vel={x:0,y:0};a.body.facing=-Math.PI/2;a.body.support=newSupport();
    b.body.pos={x:50,y:24.6};b.body.vel={x:0,y:0};b.body.support=newSupport();
    const picture={pos:{...b.pos},vel:{x:0,y:0}},world=new World([a.body,b.body]);world.time=1;
    const requested={vel:{x:0,y:-7},facing:-Math.PI/2};let yielded=false,maximumImpulse=0;
    for(let k=0;k<30;k++){
      const intents:Intent[]=[structuredClone(requested),{vel:{x:0,y:0}}];
      spaceTeammates([a,b],intents,(o,t)=>o===a&&t===b?picture:null,{now:world.time});
      yielded ||= intents[0].vel.y!==requested.vel.y;
      const report=world.step(intents,.05);maximumImpulse=Math.max(maximumImpulse,...report.contacts.map(c=>c.impulse));
      expect(a.body.support!.state).toBe('up');
    }
    expect(yielded).toBe(true);expect(maximumImpulse).toBe(0);
    expect(a.pos.y-b.pos.y).toBeGreaterThan(.9*(a.profile.radius+b.profile.radius));
    expect(a.pos.y).toBeLessThan(26); // Safe progress, not a blanket ban on lateral travel.
  });
  it('accounts for ordinary braking since the same delayed TE sighting without acquiring his live state',()=>{
    const fixture=JSON.parse(readFileSync(new URL('../data/reviews/current/wz-delayed-braking-state.json',import.meta.url),'utf8'));
    const s=stage(),a=s.rt;a.body=structuredClone(fixture.body);a.body.support!.since=-Infinity;
    const decide=()=>{
      const intents:Intent[]=s.sim.agents.map(b=>b===a?structuredClone(fixture.raw):{vel:{x:0,y:0}});
      spaceTeammates(s.sim.agents,intents,(o,t)=>{
        const p=o===a?fixture.peers.find((p:any)=>p.idx===t.idx)?.information:null;
        return p?.source==='unavailable'?null:p;
      },{now:fixture.entry});
      return intents[a.idx];
    };
    const selected=decide();
    expect(Math.hypot(selected.vel.x,selected.vel.y)).toBeLessThan(Math.hypot(fixture.raw.vel.x,fixture.raw.vel.y));
    s.te.body.pos={x:5,y:50};s.te.body.vel={x:9,y:9};s.te.body.support=newSupport();
    expect(decide()).toEqual(selected);
  });
  it('keeps moving alongside an ordinary continuing peer with a separate clear lane',()=>{
    const s=stage(),a=s.rt,b=s.te;
    a.body.pos={x:50,y:26};a.body.vel={x:0,y:-2};a.body.facing=-Math.PI/2;a.body.support=newSupport();
    b.body.pos={x:51.5,y:26};b.body.vel={x:0,y:-2};b.body.support=newSupport();
    const picture={source:'observed' as const,pos:{...b.pos},vel:{...b.vel},sampledAt:.7,availableAt:1,age:.3,predictedFor:.3};
    const requested={vel:{x:0,y:-5},facing:-Math.PI/2};
    const intents:Intent[]=[structuredClone(requested),{vel:{x:0,y:-2}}];
    spaceTeammates([a,b],intents,(o,t)=>o===a&&t===b?picture:null,{now:1});
    expect(intents[0]).toEqual(requested);
    const world=new World([a.body,b.body]);world.time=1;const report=world.step(intents,.05);
    expect(report.contacts).toHaveLength(0);expect(a.pos.y).toBeLessThan(26);
  });
});
