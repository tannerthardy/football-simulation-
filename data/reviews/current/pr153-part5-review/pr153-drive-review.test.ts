import {afterEach,expect,it,vi} from 'vitest';
import {contactFixture} from '../scripts/diag/run-contact-technique.js';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
async function command(on:boolean, mode:'pass'|'stretch'|'anchor'|'cleared'|'lost', side:1|-1){
 vi.stubEnv('DRIVE_CONNECT',on?'1':'0'); vi.resetModules();
 const {updateEngagements}=await import('../src/sim/engagement.js');
 const f=contactFixture({type:mode==='pass'?'pass':'run',runBlock:60,passBlock:60,side});
 const {blocker:b,defender:d,engagement:e,sim}=f;
 const drive=e.drive??{x:1,y:0}, across={x:-drive.y,y:drive.x};
 const sep=b.profile.radius+d.profile.radius;
 if(mode!=='pass'){
  d.body.pos={x:b.pos.x+across.x*sep,y:b.pos.y+across.y*sep};
  b.body.facing=Math.atan2(d.pos.y-b.pos.y,d.pos.x-b.pos.x);
  d.body.vel={x:-1.2,y:0};e.nextMoveAt=1e9;
 }
 if(mode==='stretch'){
  sim.offCall.run={...sim.offCall.run!,scheme:'outsideZone'};
  e.surfaceAxis={x:-1,y:0};
 }
 if(mode==='anchor'){
  b.body.vel={x:-.4,y:0}; b.body.support!.felt={x:-b.profile.massKg*9.81,y:0};
 }
 if(mode==='cleared') d.body.pos={x:b.pos.x+5,y:b.pos.y};
 if(mode==='lost') b.body.facing=Math.atan2(d.pos.y-b.pos.y,d.pos.x-b.pos.x)+Math.PI;
 for(let k=0;k<24;k++)sim.perception.record(sim.agents);
 const intents=sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
 updateEngagements(sim,intents);
 return {command:intents[b.idx],attached:!!b.engagement,events:sim.events.map(e=>({type:e.type,note:e.note}))};
}
it.each([1,-1] as const)('preserves pass, stretch and loaded lost-depth anchor requests, side=%s',async side=>{
 for(const mode of ['pass','stretch','anchor'] as const){
  const off=await command(false,mode,side),on=await command(true,mode,side);
  expect(on).toEqual(off);expect(on.attached).toBe(true);
 }
});
it.each([1,-1] as const)('does not retain an unreachable connection or defeated shoulder, side=%s',async side=>{
 for(const mode of ['cleared','lost'] as const){
  const off=await command(false,mode,side),on=await command(true,mode,side);
  expect(on).toEqual(off);expect(on.attached).toBe(false);
 }
});
