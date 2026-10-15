import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {planRunEntry,runReadAim,type CarrierOptions} from '../src/sim/behaviors/carrier.js';
import {PlaySim} from '../src/sim/playsim.js';
import {previewMovementStep,type MovementObstacle} from '../src/sim/movement-clearance.js';
const saved=JSON.parse(readFileSync('test/fixtures/runner-entry.json','utf8'));
function stage(){
 const f=structuredClone(saved),formation=FORMATION_BY_ID.ace_12;
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'inside'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
 const rb=sim.slot('RB')!;f.body.support.since=-Infinity;rb.body=f.body;sim.t=f.t;
 sim.teammateInformation=(_a,b)=>structuredClone(f.pictures.find((p:any)=>p.idx===b.idx)?.picture??{source:'unavailable'});
 sim.see=(_a,b)=>{if(b.team==='O')throw Error('unowned teammate feed');return structuredClone(f.pictures.find((p:any)=>p.idx===b.idx)?.picture??{pos:{x:80,y:50},vel:{x:0,y:0},facing:0,stance:null});};
 const opts=f.opts as CarrierOptions;
 if(f.opts.run.readKey)opts.run!.readKey=sim.agents[(f.opts.run.readKey as any).agent];
 return{f,sim,rb,opts};
}
describe('run entry choices use the owned picture and executable body',()=>{
 it('collects when the saved faster inside-zone body cannot execute a full-speed crease',()=>{
  const {sim,rb,opts}=stage(),before=structuredClone(rb.body),rng=structuredClone(sim.rng),plan=planRunEntry(rb,sim,opts)!,p=plan.entry;
  expect(p).not.toBeNull();const peers:MovementObstacle[]=sim.teammates(rb).filter(b=>b!==rb).flatMap(b=>{
   const v=sim.teammateInformation(rb,b);return v.source==='unavailable'?[]:[{id:b.idx,pos:v.pos,vel:v.vel,radius:b.profile.radius,mayStop:true}];
  });
  const h=Math.atan2(p.y-rb.pos.y,p.x-rb.pos.x),preview=previewMovementStep(rb.body,
   {vel:{x:Math.cos(h)*rb.profile.vmax,y:Math.sin(h)*rb.profile.vmax},cutSkill:.85+.35*rb.r('elusiveness')},peers,sim.t,1.3,'center');
  expect(preview.gap).toBeLessThan(0);
  const gathered=previewMovementStep(rb.body,plan.command,peers,sim.t,1.3,'center');
  expect(gathered.gap).toBeGreaterThan(preview.gap);expect(gathered.up).toBe(true);
  expect(rb.body).toEqual(before);expect(sim.rng).toEqual(rng);
 });
 it('ignores hidden teammate locations, jobs and opponent engagement wins',()=>{
  const {sim,rb,opts}=stage(),first=runReadAim(rb,sim,opts);
  for(const b of sim.agents)if(b!==rb){b.body.pos={x:70+b.idx,y:3};b.body.vel={x:-9,y:9};b.engagement={win:99} as any;
   b.behavior={kind:'hidden',update:()=>{throw Error('hidden');}};}
  expect(runReadAim(rb,sim,opts)).toEqual(first);
 });
});
