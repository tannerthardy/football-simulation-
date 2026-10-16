import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it,vi} from 'vitest';
import * as Preview from '../src/physics/movement-preview.js';
import type {Intent} from '../src/physics/world.js';
import {Agent} from '../src/sim/agent.js';
import {movementObjective,withMovementObjective} from '../src/sim/movement-objective.js';
import {spaceTeammates} from '../src/sim/spacing.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-step.json.gz',import.meta.url))).toString());
const reference=new URL('./fixtures/spacing-forecast-reference.json',import.meta.url);
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
 it('retains the accepted requests while evaluating an identical request object once',()=>{
  const spy=vi.spyOn(Preview,'previewFreeMovement');
  const rows=[];let duplicate=0;
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
   }
   const physical=rows.map(({calls,unique,...r})=>r);
   if(existsSync(reference))expect(physical).toEqual(JSON.parse(readFileSync(reference,'utf8')).rows);
   if(process.env.SPACING_FORECAST_RECORD)writeFileSync(process.env.SPACING_FORECAST_RECORD,JSON.stringify({rows:physical,costs:rows.map(({command,goal,...r})=>r)},null,2)+'\n');
   expect(duplicate).toBe(0);
  }finally{spy.mockRestore();}
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
