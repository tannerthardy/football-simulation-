/** Same 10 Hz proximity and displacement definitions as run-game-reference.py.
 * node --import tsx scripts/run-development-lab.ts [reps=12] [seed=7] [out.json]
 * Can be copied into a source archive for paired runs. Missing concepts/forms
 * are omitted, never fabricated; compare common cells only.
 */
import { mkdirSync,writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam,pickOffense,pickDefense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FRONT_BY_ID,COVERAGE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
const [n='12',s='7',output]=process.argv.slice(2),count=Number(n),seed=Number(s);
if(!Number.isInteger(count)||count<1||!Number.isInteger(seed))throw new Error('Expected positive reps and integer seed');
const rng=new Rng(seed),home=generateTeam(rng.fork('offense'),'O','OFF',{strength:.55}),away=generateTeam(rng.fork('defense'),'D','DEF',{strength:.55});
const metrics=(v:number[])=>{v.sort((a,b)=>a-b);return {n:v.length,mean:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,p50:v.length?v[Math.floor((v.length-1)*.5)]:null,p90:v.length?v[Math.floor((v.length-1)*.9)]:null};};
const cells=[];
for(const form of ['ace_11','i_pro_21','gun_doubles_11','gun_wing_12'].filter((id)=>FORMATION_BY_ID[id])) {
 const formation=FORMATION_BY_ID[form];
 for(const concept of ['iz_strong','oz_strong','power','counter','trap','duo','wz_strong','split_zone'].filter((id)=>RUN_BY_ID[id] && (id!=='split_zone'||form==='gun_wing_12'||form==='i_pro_21'))) {
  for(const front of ['over','under','wide9','odd','tite','bear'])for(const flip of [false,true]) {
   const samples:Record<string,number>[]=[];
   for(let i=0;i<count;i++) {
    const personnel=FRONT_BY_ID[front].personnel[0];
    const sim=new PlaySim({offense:pickOffense(home,formation.personnel),defense:pickDefense(away,personnel),
      offCall:{formation,flip,kind:'run',run:RUN_BY_ID[concept],label:concept},
      defCall:{personnel,front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:front},
      los:40,ballY:CENTER_Y,firstDownX:50,seed:rng.fork(`${form}:${concept}:${front}:${flip}:${i}`)});
    const ol=sim.offense.filter((a)=>['LT','LG','C','RG','RT'].includes(a.slot)),start=ol.map((a)=>({...a.pos}));
    const sample:Record<string,number>={},pullers=sim.offense.filter((a)=>a.behavior instanceof RunBlocker&&a.behavior.plan.kind==='pull');
    const plans=sim.offense.filter((a)=>a.behavior instanceof RunBlocker);
    sample.unassignedDL=sim.defense.filter((d)=>d.pos.x<sim.los+2&&Math.abs(d.pos.y-sim.ballY)<9&&!plans.some((a)=>(a.behavior as RunBlocker).target===d)).length;
    let prev=new Set<string>(),previousTime=-.1;
    function snapshot() {
      const time=Math.round(sim.t*100)/100,near=new Set<string>();
      for(const b of ol)for(const d of sim.defense)if(Math.hypot(b.pos.x-d.pos.x,b.pos.y-d.pos.y)<=1)near.add(`${b.idx}:${d.idx}`);
      if(time<=4&&sample.firstSustainedOlProximity===undefined && [...near].some((key)=>prev.has(key)))sample.firstSustainedOlProximity=Math.max(0,previousTime);
      prev=near;previousTime=time;
      if(Math.abs(time-.5)<.001) {
        sample.olForwardAt0p5=ol.reduce((sum,a,j)=>sum+a.pos.x-start[j].x,0)/5;
        sample.olLateralAbsAt0p5=ol.reduce((sum,a,j)=>sum+Math.abs(a.pos.y-start[j].y),0)/5;
      }
      const rb=sim.slot('RB');
      if(rb && sample.timeToLos===undefined && rb.pos.x>=sim.los)sample.timeToLos=time;
    }
    sim.event('snap',sim.qb);snapshot();
    while(sim.phase==='live'&&sim.t<25) {
      sim.tick();
      if(sim.firstContactX!==null && sample.firstContactTime===undefined)sample.firstContactTime=sim.t;
      if(Math.round(sim.t/sim.dt)%2===0)snapshot();
      if(sample.pullerToLos===undefined && pullers.some((a)=>a.pos.x>=sim.los))sample.pullerToLos=sim.t;
    }
    if(sim.phase==='live')sim.whistle('timeout',sim.carrier?.pos??{x:sim.los,y:sim.ballY});
    const result=sim.buildResult();
    sample.yards=result.offenseYards;sample.stuff=Number(result.offenseYards<=0);sample.explosive=Number(result.offenseYards>=10);
    if(result.stats.yardsBeforeContact!==undefined)sample.yardsBeforeContact=result.stats.yardsBeforeContact;
    if(sim.handoffAt>=0)sample.handoffTime=sim.handoffAt;
    const contacts=result.events.filter((e)=>e.type==='block_contact' && e.note==='run');
    if(contacts.length)sample.firstBlockStrike=contacts[0].t;
    const climbs=result.events.filter((e)=>e.type==='block_climb');sample.climbs=climbs.length;
    if(climbs.length)sample.firstClimb=climbs[0].t;
    for(const type of ['block_exchange','block_collect','block_log'])sample[type]=result.events.filter((e)=>e.type===type).length;
    sample.foul=Number(!!result.penalty);sample.timeout=Number(result.outcome==='timeout');
    samples.push(sample);
   }
   const keys=new Set(samples.flatMap((r)=>Object.keys(r)));
   cells.push({form,concept,front,flip,plays:count,metrics:Object.fromEntries([...keys].sort().map((k)=>[k,metrics(samples.filter((r)=>r[k]!==undefined).map((r)=>r[k]))]))});
  }
 }
}
const doc={schemaVersion:1,seed,repsPerCell:count,cohort:'Controlled fixed roster pair, six called fronts, both flips; all physical outcomes including fouls. Not frequency matched to NFL. Each metric has its own n; missing crossings/contact are not zero-imputed.',definitions:{proximity:'Same OL/opponent within 1.0 yd on consecutive 10 Hz samples, first four seconds.',displacement:'Mean five-OL change from snap at 0.5 s; forward signed, lateral absolute.',firstContactTime:'First opponent body impact or successful tackle grasp at 20 Hz, not an NFL event annotation. Older revisions also counted whiffs; do not pool those definitions.',firstBlockStrike:'Engine engagement event, not the tracking proximity proxy.'},cells};
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(doc,null,2)+'\n');}
console.log(`${cells.length} cells, ${cells.length*count} plays, seed ${seed}`);
