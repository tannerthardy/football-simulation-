/** Failure attribution, not an NFL calibration target.
 * node --import tsx scripts/pursuit-contact-lab.ts [runs|open] [reps] [out.json]
 * Copy this script into a git archive to compare identical roster/play seeds.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { Pursuit } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

const [mode = 'runs', repsArg = '40', output] = process.argv.slice(2);
const reps = Number(repsArg);
if (!['runs','open'].includes(mode) || !Number.isInteger(reps) || reps < 1) throw new Error('Expected runs/open and positive integer reps');
type Summary = Record<string, number | null>;
const cells: Array<{ key: string; plays: number; metrics: Summary; trace: unknown[] }> = [];

function sample(sim: PlaySim, startX: number, trace: boolean) {
  let nearest = Infinity, freeNearest = Infinity, readyRangeTicks = 0, contactX: number | null = null, attempted = false;
  let eventIndex=0,missed=0,broken=0;
  const snapshots: unknown[] = [];
  while (sim.phase === 'live' && sim.t < 25) {
    const c = sim.carrier;
    if (c?.team === 'O' && (sim.handoffAt >= 0 || sim.catchAt >= 0)) {
      for (const d of sim.opponents(c)) {
        if (d.isDown(sim.t)) continue;
        const distance = Math.hypot(d.pos.x-c.pos.x, d.pos.y-c.pos.y);
        nearest = Math.min(nearest, distance);
        if (d.engagement || sim.bond?.tacklers.includes(d)) continue;
        freeNearest = Math.min(freeNearest, distance);
        if (sim.t >= d.nextTackleAt && distance <= c.profile.radius+d.profile.radius+d.profile.reach) readyRangeTicks++;
      }
      if (trace && Math.round(sim.t/sim.dt)%10 === 0) snapshots.push({ t:sim.t, carrier:[c.pos.x,c.pos.y,c.vel.x,c.vel.y],
        defenders:sim.opponents(c).map((d)=>({slot:d.slot,pos:[d.pos.x,d.pos.y],vel:[d.vel.x,d.vel.y],blocked:!!d.engagement,down:d.isDown(sim.t)})) });
    }
    sim.tick();
    // Observe bonds every tick: older engines do not log low-impact wraps.
    attempted ||= sim.bond?.carrier.team === 'O';
    for(const e of sim.events.slice(eventIndex)) {
      const carrierIndex=e.type==='broken_tackle'?e.a:e.b;
      if(carrierIndex===undefined || sim.agents[carrierIndex].team!=='O')continue;
      if(e.type==='missed_tackle'){missed++;attempted=true;}
      if(e.type==='broken_tackle'){broken++;attempted=true;}
      if(e.type==='hit')attempted=true;
    }
    eventIndex=sim.events.length;
    if (contactX === null && sim.firstContactX !== null) contactX = sim.firstContactX;
  }
  if (sim.phase === 'live') sim.whistle('timeout',sim.carrier?.pos??sim.qb.pos);
  const result = sim.buildResult(), yards = result.offenseYards-(startX-sim.los);
  const touchdown=result.score?.team==='O' && result.score.kind==='TD';
  return {metrics:{yards,stuff:Number(yards<=0),explosive:Number(yards>=10),touchdown:Number(touchdown),
    untouchedExplosive:Number(yards>=10 && !attempted),untouchedTd:Number(touchdown && !attempted),
    attempt:Number(attempted),missed,broken,turnover:Number(result.turnover),
    nearest:Number.isFinite(nearest)?nearest:null,freeNearest:Number.isFinite(freeNearest)?freeNearest:null,
    readyRangeTicks,firstContactGain:contactX===null?null:contactX-startX,
    timeout:Number(result.outcome==='timeout')},trace:snapshots};
}
function add(key: string, sims: Array<{ sim: PlaySim; x: number }>) {
  const samples = sims.map(({sim,x},i)=>sample(sim,x,i===0));
  const keys=Object.keys(samples[0].metrics) as Array<keyof typeof samples[0]['metrics']>;
  const metrics:Summary={};
  for(const key of keys){const values=samples.map((s)=>s.metrics[key]).filter((v):v is number=>v!==null);metrics[key]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;metrics[`${key}N`]=values.length;}
  cells.push({key,plays:samples.length,metrics,trace:samples[0].trace});
}

for(const seed of [7,19,31,43]) {
  const rng=new Rng(seed),off=generateTeam(rng.fork('offense'),'O','OFF',{strength:.55}),def=generateTeam(rng.fork('defense'),'D','DEF',{strength:.55});
  const build=(key:string,i:number,concept?:string,form='ace_11',front='over',flip=false)=>new PlaySim({
    offense:pickOffense(off,FORMATION_BY_ID[form].personnel),defense:pickDefense(def,FRONT_BY_ID[front].personnel[0]),
    offCall:concept?{formation:FORMATION_BY_ID[form],flip,kind:'run',run:RUN_BY_ID[concept],label:concept}:
      {formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.smash,label:'lab'},
    defCall:{personnel:FRONT_BY_ID[front].personnel[0],front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'lab'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:rng.fork(`${key}:${i}`)});
  if(mode==='runs') {
    for(const concept of ['iz_strong','oz_strong','power','counter','trap','duo'])for(const form of ['ace_11','gun_doubles_11'])for(const front of ['over','tite'])for(const flip of [false,true]) {
      const key=`${seed}:${concept}:${form}:${front}:${flip}`;
      add(key,Array.from({length:reps},(_,i)=>({sim:build(key,i,concept,form,front,flip),x:40})));
    }
  } else {
    for(const policy of ['straight','evade'])for(const [name,dx,dy] of [['square',8,0],['angle',8,4],['wide',6,6],['chase',-2,1],['sideline',8,3]] as const)for(const mirror of [-1,1]) {
      const key=`${seed}:${policy}:${name}:${mirror}`;
      add(key,Array.from({length:reps},(_,i)=>{
        const sim=build(key,i),c=sim.slot('Z')!,d=sim.slot('FS')!;
        for(const a of sim.agents){a.body.pos={x:5+a.idx*.1,y:a.idx*2+1};a.body.vel={x:0,y:0};a.downUntil=99;a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})};}
        const y=name==='sideline'?(mirror===1?FIELD_WIDTH-4:4):CENTER_Y;
        c.downUntil=-1;c.body.pos={x:50,y};c.body.vel={x:6,y:0};c.body.facing=0;
        c.behavior=policy==='straight'?{kind:'straight',update:()=>({vel:{x:6,y:0}})}:new BallCarrier({},c);
        sim.ball={kind:'held',carrier:c};sim.catchAt=0;sim.catchX=50;
        sim.segments.splice(0,sim.segments.length,{team:'O',carrier:c.player.id,how:'catch',startX:50,endX:50,end:'live'});
        d.downUntil=-1;d.body.pos={x:50+dx,y:y+mirror*dy};d.body.vel={x:dx>0?-2:6,y:0};d.body.facing=dx>0?Math.PI:0;d.behavior=new Pursuit();
        for(let j=0;j<16;j++)sim.perception.record(sim.agents);
        return {sim,x:50};
      }));
    }
  }
}
const doc={schemaVersion:1,mode,repsPerCell:reps,definitions:{yards:'Offensive possession gain from the starting point; lost fumbles end at the offensive fumble spot, never the defensive return spot. Raw physical plays including fouls.',touchdown:'Offensive touchdowns only.',attempt:'Any observed tackle bond, hit, missed tackle or broken tackle against an offensive carrier. Observe bonds each tick because older engines omit low-impact wrap events.',untouchedTd:'Offensive touchdowns with no observed tackle attempt; may include non-tackle body bumps.',readyRangeTicks:'Pre-integration 20 Hz samples of free, standing, ready defenders inside body radii + arm reach. May be occluded; not guaranteed tackle opportunities.',firstContactGain:'Engine firstContactX. Baseline includes whiffs; updated engine excludes whiffs and includes body impacts. Definitions differ; not an NFL event or directly comparable contact metric.',trace:'First repetition per cell, sampled every 0.5 s. No extra behavior calls or RNG draws.'},cells};
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(doc,null,2)+'\n');}
console.log(`${mode}: ${cells.length} cells, ${cells.length*reps} plays`);
