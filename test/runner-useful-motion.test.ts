import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {fatigueFactor,enduranceFactor,type Body} from '../src/physics/kinematics.js';
import type {Intent} from '../src/physics/world.js';
import type {Agent} from '../src/sim/agent.js';
import type {Perceived} from '../src/sim/perception.js';
import {spaceTeammates} from '../src/sim/spacing.js';
interface Fixture{t:number;body:Body;raw:Intent;ordinary:Intent;peers:{idx:number;profile:Body['profile'];seen:Perceived}[]}
const cases:Fixture[]=JSON.parse(readFileSync(new URL('./fixtures/runner-useful-motion.json',import.meta.url),'utf8'));
function run(f:Fixture){
 const body=structuredClone(f.body),a={idx:6,team:'O',behavior:{kind:'carrier'},body,profile:body.profile,
  get pos(){return body.pos;},get vel(){return body.vel;},isDown:()=>false,
  get speedScale(){return fatigueFactor(body.energy)*enduranceFactor(body)*(1-.08*(body.squeeze??0));}} as unknown as Agent;
 const peers=f.peers.map(p=>({idx:p.idx,team:'O',profile:p.profile,
  get pos(){throw Error('Private position');},get vel(){throw Error('Private velocity');}} as unknown as Agent));
 const commands:Intent[]=[structuredClone(f.raw),...peers.map(()=>({vel:{x:0,y:0},free:true}))];
 spaceTeammates([a,...peers],commands,(_a,b)=>f.peers.find(p=>p.idx===b.idx)!.seen,{now:f.t});
 expect(body).toEqual(f.body);return commands[0];
}
describe('runner request with better achieved progress and clearance',()=>{
 it('restores original action only at the same-picture dominated brake',()=>{
  const f=cases.find(f=>f.t===1.85)!;expect(run(f)).toEqual(f.raw);
 });
 it.each(cases.filter(f=>f.t!==1.85))('keeps the clear or necessary obstruction response at $t',f=>{
  expect(run(f)).toEqual(f.ordinary);
 });
 it('declines an unknown observation timestamp',()=>{
  const f=structuredClone(cases.find(f=>f.t===1.85)!);f.peers[0].seen.age=undefined;
  expect(run(f)).toEqual(f.ordinary);
 });
});
