import { readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { previewFreeMovement } from '../src/physics/movement-preview.js';
import type { Intent } from '../src/physics/world.js';
import { Agent } from '../src/sim/agent.js';
import { chase, runThrough } from '../src/sim/behaviors/common.js';
import type { PlaySim } from '../src/sim/playsim.js';
import { movementObjective, withMovementObjective } from '../src/sim/movement-objective.js';
import { spaceTeammates } from '../src/sim/spacing.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-step.json.gz',import.meta.url))).toString());

// Mechanical contract, not a reconstructed football decision. Reuse exact
// recorded bodies/peer pictures, aiming one second along the recorded request
// to exercise a fixed sprint waypoint without guessing its original objective.
function run(kind='ordinary',objective=true) {
  const first=fixture.rows[0];
  const a=new Agent(fixture.actor,'D','SS',fixture.player,first.body.profile,structuredClone(first.body),
    {kind:'man',update(){throw Error('Do not repeat a football decision');}});
  return (fixture.rows as any[]).map((row:any)=>{
    Object.assign(a.body,structuredClone(row.body));
    const pictures=new Map<number,any>();
    const peers=row.peers.map((p:any)=>{
      const seen=structuredClone(p.seen);
      if(kind==='clear')seen.pos.x+=30;
      if(kind==='obstruction'&&p.idx===19){
        const speed=Math.hypot(a.vel.x,a.vel.y);
        seen.pos={x:a.pos.x+a.vel.x/speed,y:a.pos.y+a.vel.y/speed};seen.vel={x:0,y:0};
      }
      pictures.set(p.idx,seen);
      return {idx:p.idx,team:'D',profile:p.profile,
        get pos(){throw Error('Private peer position');},get vel(){throw Error('Private peer velocity');}} as unknown as Agent;
    });
    const target={x:a.pos.x+row.command.vel.x,y:a.pos.y+row.command.vel.y};
    let command:Intent=runThrough(a,target,{speed:Math.hypot(row.command.vel.x,row.command.vel.y)/a.profile.vmax,cutSkill:row.command.cutSkill});
    const raw={vel:{...command.vel},facing:command.facing,cutSkill:command.cutSkill};
    if(!objective)command=raw;
    if(kind==='unknown-goal')command=withMovementObjective(command,{kind:'moving',point:target});
    const source=structuredClone(a.body),snapshot=structuredClone([...pictures]);let reads=0;
    const intents:Intent[]=[command,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
    spaceTeammates([a,...peers],intents,(_a,p)=>{reads++;return pictures.get(p.idx);},
      {now:row.t,constrained:kind==='loaded'?new Set([a.body]):undefined});
    expect(reads).toBe(10);expect(a.body).toEqual(source);expect([...pictures]).toEqual(snapshot);
    return {row,source,raw,command:intents[0],pictures,target};
  });
}
function clearance(body:Body,command:Intent,now:number,pictures:Map<number,any>,peers:any[]):number {
  const samples=previewFreeMovement(body,command,now,12);
  return Math.min(...peers.map(p=>{
    const seen=pictures.get(p.idx),touch=.9*(body.profile.radius+p.profile.radius);
    let x=body.pos.x-seen.pos.x,y=body.pos.y-seen.pos.y,best=Math.hypot(x,y)-touch;
    for(const s of samples){
      const rx=s.pos.x-seen.pos.x-seen.vel.x*s.t,ry=s.pos.y-seen.pos.y-seen.vel.y*s.t;
      const dx=rx-x,dy=ry-y,u=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      best=Math.min(best,Math.hypot(x+u*dx,y+u*dy)-touch);x=rx;y=ry;
    }
    return best;
  }));
}

describe('run-through carries its already selected fixed objective',()=>{
  it('preserves the numeric sprint command and copies the selected waypoint through modifiers',()=>{
    const row=fixture.rows[0],body=structuredClone(row.body);
    const a=new Agent(21,'D','SS',fixture.player,body.profile,body,{kind:'man',update(){throw Error('unused');}});
    const target={x:a.pos.x+3,y:a.pos.y-4},speed=.9,cutSkill=1.1,facing=.7;
    const cmd=runThrough(a,target,{speed,cutSkill,facing}),point={...target};
    const requested=a.profile.vmax*speed;
    expect(cmd.vel).toEqual({x:3/5*requested,y:-4/5*requested});
    expect(cmd.facing).toBe(facing);expect(cmd.cutSkill).toBe(cutSkill);
    target.x=99;target.y=99;
    expect(movementObjective(cmd)).toEqual({kind:'fixed',point});
    expect(movementObjective({...cmd,vel:{x:0,y:0}})).toEqual({kind:'fixed',point});
  });
  it('retains the selected far-chase waypoint without another observation',()=>{
    const row=fixture.rows[0],body=structuredClone(row.body);
    const a=new Agent(21,'D','SS',fixture.player,body.profile,body,{kind:'man',update(){throw Error('unused');}});
    const runnerBody=structuredClone(body);runnerBody.pos={x:a.pos.x+20,y:a.pos.y};runnerBody.vel={x:3,y:0};
    const runner=new Agent(6,'O','RB',fixture.player,runnerBody.profile,runnerBody,{kind:'carrier',update(){throw Error('unused');}});
    let reads=0;
    const sim={t:2.05,bond:null,rng:new Rng(13),see(observer:Agent,target:Agent){
      expect(observer).toBe(a);expect(target).toBe(runner);reads++;
      return {pos:{...runnerBody.pos},vel:{...runnerBody.vel},age:.15,carrying:true};
    }} as unknown as PlaySim;
    const command=chase(sim,a,runner),goal=movementObjective(command);
    expect(reads).toBe(3); // the existing chase picture plus two pursuit motion samples
    expect(goal?.kind).toBe('fixed');
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeCloseTo(a.profile.vmax*(.75+.2*a.r('workRate')),10);
    if(goal?.kind!=='fixed')throw Error('Missing selected chase waypoint');
    expect(goal.point.x).toBeGreaterThan(a.pos.x);
    expect(movementObjective({...command,vel:{x:0,y:0}})).toEqual(goal);
  });
  it('admits the existing achievable traffic step for a fixed sprint waypoint',()=>{
    const rows=run(),last=rows.at(-1)!,legacy=run('ordinary',false).at(-1)!;
    expect(clearance(last.source,legacy.command,last.row.t,last.pictures,last.row.peers)).toBeLessThan(0);
    expect(clearance(last.source,last.command,last.row.t,last.pictures,last.row.peers)).toBeGreaterThan(.25);
    expect(movementObjective(last.command)).toEqual({kind:'fixed',point:last.target});
    expect(Math.hypot(last.command.vel.x,last.command.vel.y)).toBeLessThanOrEqual(Math.hypot(last.raw.vel.x,last.raw.vel.y));
  });
  it.each(['unknown-goal','loaded'])('retains ordinary yielding for %s instead of certifying a bypass',kind=>{
    expect(run(kind).map(r=>r.command.vel)).toEqual(run(kind,false).map(r=>r.command.vel));
  });
  it('preserves the original request when the acquired lane is clear',()=>{
    expect(run('clear').every(r=>r.command.vel.x===r.raw.vel.x&&r.command.vel.y===r.raw.vel.y)).toBe(true);
  });
  it('leaves a genuinely blocked passing side unresolved',()=>{
    const last=run('obstruction').at(-1)!;
    expect(clearance(last.source,last.command,last.row.t,last.pictures,last.row.peers)).toBeLessThan(0);
  });
});
