import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it} from 'vitest';
import {alignOffense} from '../src/playbook/alignment.js';
import {Agent} from '../src/sim/agent.js';
import {runReadAim} from '../src/sim/behaviors/carrier.js';
import type {PlaySim} from '../src/sim/playsim.js';
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
describe('acquired opponent entry risk without teammate transport',()=>{
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
});
