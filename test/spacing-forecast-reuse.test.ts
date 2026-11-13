import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import type {Body} from '../src/physics/kinematics.js';
import * as Preview from '../src/physics/movement-preview.js';
import type {Intent} from '../src/physics/world.js';
import {Agent} from '../src/sim/agent.js';
import {movementObjective,withMovementObjective} from '../src/sim/movement-objective.js';
import {spaceTeammates} from '../src/sim/spacing.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-step.json.gz',import.meta.url))).toString());
const oldReference=JSON.parse(readFileSync(new URL('./fixtures/spacing-forecast-reference.json',import.meta.url),'utf8'));
const reference=new URL('./fixtures/spacing-forecast-paced-reference.json',import.meta.url);
const changedTimes=new Set([2.20,2.25,2.30]);

/** Compare achieved free movement against the same acquired constant-velocity
 * pictures used by the selector. This is not a forecast of future contact. */
function achieved(body:Body,command:Intent,row:any){
 const samples=Preview.previewFreeMovement(body,command,row.t,12),end=samples.at(-1)!;
 const clearances=row.peers.map((p:any)=>{
  const touch=.9*(body.profile.radius+p.profile.radius),seen=p.seen;
  let px=body.pos.x-seen.pos.x,py=body.pos.y-seen.pos.y,minimum=Math.hypot(px,py)-touch;
  for(const sample of samples){
   const x=sample.pos.x-seen.pos.x-seen.vel.x*sample.t,y=sample.pos.y-seen.pos.y-seen.vel.y*sample.t;
   const dx=x-px,dy=y-py,q=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy)));
   minimum=Math.min(minimum,Math.hypot(px+q*dx,py+q*dy)-touch);px=x;py=y;
  }
  return minimum;
 });
 const speed=Math.hypot(row.command.vel.x,row.command.vel.y),flow=row.goal.velocity??{x:0,y:0};
 return {clearances,up:samples.every(sample=>sample.support==='up'),
  progress:((end.pos.x-body.pos.x)*row.command.vel.x+(end.pos.y-body.pos.y)*row.command.vel.y)/speed,
  error:Math.hypot(end.pos.x-row.goal.point.x-flow.x*end.t,end.pos.y-row.goal.point.y-flow.y*end.t)};
}

function scene(row:any){
 const body=structuredClone(row.body);
 const a=new Agent(fixture.actor,'D','SS',fixture.player,body.profile,body,{kind:'man',update(){throw Error('No new decision');}});
 const pictures=new Map<number,any>(row.peers.map((p:any)=>[p.idx,p.seen]));
 const peers=row.peers.map((p:any)=>({idx:p.idx,team:'D',profile:p.profile,
  get pos(){throw Error('Private peer position');},get vel(){throw Error('Private peer velocity');}} as unknown as Agent));
 const raw:Intent=withMovementObjective(structuredClone(row.command),row.goal);
 const run=()=>{
  const source=structuredClone(a.body);
  const intents:Intent[]=[raw,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
  spaceTeammates([a,...peers],intents,(_a,p)=>pictures.get(p.idx),{now:row.t});
  expect(a.body).toEqual(source);
  return {command:structuredClone(intents[0]),goal:movementObjective(intents[0])};
 };
 return {a,raw,run};
}

describe('spacing forecasts are shared only within one physical decision',()=>{
 it('retains reviewed requests and useful clear progress while evaluating an identical request object once',()=>{
  const spy=vi.spyOn(Preview,'previewFreeMovement');
  const rows=[],changed:{row:any;body:Body;command:Intent;previous:Intent}[]=[];let duplicate=0;
  try{
   // Keep the same actor's passing frame across this saved encounter.
   const first=scene(fixture.rows[0]),a=first.a;
   for(const row of fixture.rows){
    const s=scene(row);Object.assign(a.body,structuredClone(s.a.body));
    const peers=row.peers.map((p:any)=>({idx:p.idx,team:'D',profile:p.profile} as Agent));
    const pictures=new Map<number,any>(row.peers.map((p:any)=>[p.idx,p.seen]));
    const intents:Intent[]=[s.raw,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
    const begin=spy.mock.calls.length;
    spaceTeammates([a,...peers],intents,(_a,p)=>pictures.get(p.idx),{now:row.t});
    const calls=spy.mock.calls.slice(begin),unique=new Set(calls.map(c=>c[1])).size;
    duplicate+=calls.length-unique;
    rows.push({t:row.t,command:structuredClone(intents[0]),goal:movementObjective(intents[0]),calls:calls.length,unique});
    const previous=oldReference.rows.find((r:any)=>r.t===row.t);
    if(changedTimes.has(row.t))changed.push({row,body:structuredClone(a.body),command:structuredClone(intents[0]),previous:previous.command});
    else expect({t:row.t,command:structuredClone(intents[0]),goal:movementObjective(intents[0])}).toEqual(previous);
   }
   const physical=rows.map(({calls,unique,...r})=>r);
   expect(physical).toEqual(JSON.parse(readFileSync(reference,'utf8')).rows);
   if(process.env.SPACING_FORECAST_RECORD)writeFileSync(process.env.SPACING_FORECAST_RECORD,JSON.stringify({rows:physical,costs:rows.map(({command,goal,...r})=>r)},null,2)+'\n');
   expect(duplicate).toBe(0);
  }finally{spy.mockRestore();}
  // These three half-speed decisions intentionally change. Keep the original
  // reference intact, and justify the new requests by achieved movement rather
  // than recording an unexplained new golden. Extra previews occur after the
  // cache spy is restored and therefore cannot contaminate its reuse check.
  expect(changed.map(c=>c.row.t)).toEqual([...changedTimes]);
  for(const {row,body,command,previous} of changed){
   const old=achieved(body,previous,row),next=achieved(body,command,row);
   expect(next.up).toBe(true);
   for(const clearance of next.clearances)expect(clearance).toBeGreaterThanOrEqual(0);
   expect(next.progress).toBeGreaterThanOrEqual(old.progress);
   expect(next.error).toBeLessThanOrEqual(old.error);
  }
 });
 it('recomputes after the same command object meets a changed own body on the next call',()=>{
  const s=scene(fixture.rows.at(-1)),spy=vi.spyOn(Preview,'previewFreeMovement');
  try{
   s.run();const first=spy.mock.calls.length,position=spy.mock.results[0].value[0].pos;
   expect(first).toBeGreaterThan(0);
   s.a.body.pos.x+=.1;s.a.body.vel.y*=.95;
   s.run();expect(spy.mock.calls.length).toBeGreaterThan(first);
   expect(spy.mock.calls[first][1]).toBe(s.raw);
   expect(spy.mock.results[first].value[0].pos).not.toEqual(position);
  }finally{spy.mockRestore();}
 });
});
