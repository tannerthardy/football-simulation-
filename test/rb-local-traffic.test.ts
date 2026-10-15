import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Agent} from '../src/sim/agent.js';
import {World,CONTACT_SCALE,type Intent} from '../src/physics/world.js';
import {spaceTeammates} from '../src/sim/spacing.js';
import type {Perceived} from '../src/sim/perception.js';
const saved=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/rb-local-traffic.json.gz',import.meta.url))).toString());
function state(id:string){
 const f=saved.states.find((s:any)=>s.id===id);
 const agents:Agent[]=f.actors.map((p:any,i:number)=>new Agent(i,p.team,p.slot,p.player,p.profile,structuredClone(f.bodies[i]),
  {kind:i===6?'carrier':'idle',update:()=>({vel:{x:0,y:0}})}));
 return {f,agents,a:agents[6],pictures:structuredClone(f.pictures) as Record<number,Perceived>};
}
function request(s:ReturnType<typeof state>,context=true){
 const agents=[s.a,...s.agents.slice(0,11).filter(p=>p!==s.a)],intents:Intent[]=agents.map(a=>structuredClone(s.f.raw[a.idx]));
 spaceTeammates(agents,intents,(_a,b)=>s.pictures[b.idx]??{pos:{x:1000,y:1000},vel:{x:0,y:0}},
  context?{now:s.f.t,runCarrier:s.a.body,runCarrierPictures:new Map(agents.filter(a=>a!==s.a).map(a=>[a.body,s.pictures[a.idx]])),constrained:new Set(s.f.joints.flatMap((j:any)=>[s.agents[j.a].body,s.agents[j.b].body]))}:undefined);
 return intents[0];
}
describe('retain a carrier request when radial spacing misreads achievable motion',()=>{
 it.each(['P015-2.60','P019-2.05'])('retains the football request at the saved %s body, without changing information or physics',id=>{
  const s=state(id),before=structuredClone(s.a.body),pictures=structuredClone(s.pictures);
  const corrected=request(s),radial=request(s,false);
  expect(corrected).toEqual(s.f.raw[6]);expect(radial).not.toEqual(corrected);
  expect(s.a.body).toEqual(before);expect(s.pictures).toEqual(pictures);
  const execute=(command:Intent)=>{const body=structuredClone(before),w=new World([body]);w.time=s.f.t;
   for(let k=0;k<12;k++){const r=w.step([command],.05);expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);}
   return body;};
  const a=execute(corrected),b=execute(radial),h=Math.atan2(corrected.vel.y,corrected.vel.x);
  const forward=(p:typeof a)=>(p.pos.x-before.pos.x)*Math.cos(h)+(p.pos.y-before.pos.y)*Math.sin(h);
  expect(forward(a)).toBeGreaterThan(forward(b)+.25);expect(a.support!.state).toBe('up');
 });
 it('retains the genuine moving WZ yield and blocked WZ stop instead of declaring the chosen lane clear',()=>{
  const moving=state('P032-1.70'),blocked=state('P032-2.70');
  expect(request(moving).vel).toEqual({x:moving.f.raw[6].vel.x*.5,y:moving.f.raw[6].vel.y*.5});
  expect(request(blocked).vel).toEqual({x:0,y:0});
 });
 it('yields at a genuinely impassable two-blocker opening under ordinary World contact',()=>{
  const s=state('P015-2.60'),a=s.a,b=s.agents[3],c=s.agents[5];
  a.body.vel={x:1,y:0};a.body.facing=0;
  b.body.pos={x:a.pos.x+1.1,y:a.pos.y-.5};c.body.pos={x:a.pos.x+1.1,y:a.pos.y+.5};
  b.body.vel=c.body.vel={x:0,y:0};
  const aperture=1-CONTACT_SCALE*(b.profile.radius+c.profile.radius);
  expect(aperture).toBeLessThan(2*CONTACT_SCALE*a.profile.radius);
  expect(Math.hypot(b.pos.x-c.pos.x,b.pos.y-c.pos.y)).toBeGreaterThan(b.profile.radius+c.profile.radius);
  const raw:Intent={vel:{x:6,y:0}},known=(_a:Agent,p:Agent)=>({pos:{...p.pos},vel:{...p.vel}});
  const run=(preview:boolean)=>{const commands=[structuredClone(raw),{vel:{x:0,y:0}},{vel:{x:0,y:0}}];
   spaceTeammates([a,b,c],commands,known,preview?{now:s.f.t,runCarrier:a.body,runCarrierPictures:new Map([b,c].map(p=>[p.body,known(a,p)]))}:undefined);return commands;};
  const corrected=run(true);expect(corrected).toEqual(run(false));expect(corrected[0]).not.toEqual(raw);
  const execute=(commands:Intent[])=>{const bodies=[a,b,c].map(p=>structuredClone(p.body)),w=new World(bodies);w.time=s.f.t;let contacts=0,impulse=0;
   for(let k=0;k<12;k++){const r=w.step(commands,.05);const hits=r.contacts.filter(p=>p.i===0||p.j===0);contacts+=hits.length;impulse+=hits.reduce((s,c)=>s+c.impulse,0);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);}return{bodies,contacts,impulse};};
  const yielding=execute(corrected),charging=execute([raw,{vel:{x:0,y:0}},{vel:{x:0,y:0}}]);
  // Yielding can still brush the occupied opening. Require reduced actual
  // contact load and no passage through the wall, rather than zero touches.
  expect(charging.contacts).toBeGreaterThan(0);expect(yielding.impulse).toBeLessThan(charging.impulse);
  expect(yielding.bodies[0].pos.x).toBeLessThan(b.pos.x);
  expect(yielding.bodies[0].support!.state).toBe('up');
 });
 it('ignores hidden peer motion and preserves non-carrier and constrained decisions',()=>{
  const s=state('P019-2.05'),expected=request(s);
  for(const a of s.agents)if(a!==s.a){a.body.pos={x:0,y:0};a.body.vel={x:30,y:30};}
  expect(request(s)).toEqual(expected);
  const other=state('P015-2.60');other.a.behavior={kind:'pursuit',update:()=>({vel:{x:0,y:0}})};
  expect(request(other)).toEqual(request(other,false));
  // No implicit opt-in for receivers/returners or other shared callers.
  const unopted=state('P015-2.60'),plain=[structuredClone(unopted.f.raw[6]),{vel:{x:0,y:0},free:true}];
  const legacy=structuredClone(plain);const peers=[unopted.a,unopted.agents[0]];
  spaceTeammates(peers,plain,(_a,b)=>unopted.pictures[b.idx],{now:unopted.f.t});
  spaceTeammates(peers,legacy,(_a,b)=>unopted.pictures[b.idx]);expect(plain).toEqual(legacy);
  const held=state('P015-2.60');held.f=structuredClone(held.f);held.f.joints.push({a:6,b:0});
  expect(request(held)).toEqual(request(held,false));
 });
 it('requires acquired pictures without treating missing motion or a called track as observed',()=>{
  const s=state('P015-2.60'),peers=[s.a,...s.agents.slice(0,11).filter(a=>a!==s.a)];
  const run=(map:Map<Agent['body'],Perceived>|undefined)=>{const intents=peers.map(a=>({...structuredClone(s.f.raw[a.idx]),...(a===s.a?{}:{free:true})}));
   spaceTeammates(peers,intents,(_a,b)=>({...s.pictures[b.idx],vel:{x:-8,y:0}}),{now:s.f.t,runCarrier:s.a.body,runCarrierPictures:map});
   return intents[0];};
  const pictures=new Map(peers.slice(1).map(a=>[a.body,s.pictures[a.idx]]));
  expect(run(pictures)).toEqual(s.f.raw[6]);
  const missing=new Map(pictures);missing.delete(s.agents[0].body);
  expect(run(missing)).toEqual(run(undefined));expect(run(missing)).not.toEqual(s.f.raw[6]);
 });
 it('leaves real glancing contact to World rather than shrinking a body or awarding an avoidance win',()=>{
  const s=state('P015-2.60'),command=request(s),a=structuredClone(s.a.body),b=structuredClone(s.agents[0].body);
  // Same legitimately consumed picture, but the teammate has moved since it.
  // A shallow physical grazing collision remains possible and is allowed.
  const speed=Math.hypot(a.vel.x,a.vel.y),ux=a.vel.x/speed,uy=a.vel.y/speed;
  const touch=CONTACT_SCALE*(a.profile.radius+b.profile.radius);
  b.pos={x:a.pos.x+ux*.12-uy*(touch-.01),y:a.pos.y+uy*.12+ux*(touch-.01)};
  b.vel={x:0,y:0};const w=new World([a,b]);w.time=s.f.t;let contacts=0;
  for(let k=0;k<8;k++){const r=w.step([command,{vel:{x:0,y:0}}],.05);contacts+=r.contacts.length;
   expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);}
  expect(contacts).toBeGreaterThan(0);expect(a.support!.state).toBe('up');
  expect(a.pos.x).toBeGreaterThan(s.a.pos.x);expect(a.profile.radius).toBe(s.a.profile.radius);
 });
});
