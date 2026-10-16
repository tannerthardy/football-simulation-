import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import * as Preview from '../src/physics/movement-preview.js';
import { World, type Intent } from '../src/physics/world.js';
import { Agent } from '../src/sim/agent.js';
import { track } from '../src/sim/behaviors/common.js';
import { movementObjective, withMovementObjective, type MovementObjective } from '../src/sim/movement-objective.js';
import { spaceTeammates } from '../src/sim/spacing.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-step.json.gz',import.meta.url))).toString());
function run(kind='ordinary',objective=true) {
  const first=fixture.rows[0];
  const a=new Agent(fixture.actor,'D','SS',fixture.player,first.body.profile,structuredClone(first.body),
    {kind:'man',update(){throw Error('Do not repeat the football decision');}});
  const rows=[];
  for(const row of fixture.rows){
    Object.assign(a.body,structuredClone(row.body));
    const pictures=new Map<number,any>();
    const peers=row.peers.map((p:any)=>{
      const seen=structuredClone(p.seen);
      if(kind==='clear')seen.pos.x+=30;
      if(kind==='unknown-peer')seen.vel.y=NaN;
      if(kind==='unknown-age')delete seen.age;
      // Make an actual obstruction on the proposed passing side, without
      // moving or granting knowledge of any private body.
      if(kind==='obstruction'&&p.idx===19){const speed=Math.hypot(a.vel.x,a.vel.y);seen.pos={x:a.pos.x+a.vel.x/speed,y:a.pos.y+a.vel.y/speed};seen.vel={x:0,y:0};}
      pictures.set(p.idx,seen);
      return {idx:p.idx,team:'D',profile:p.profile,
        get pos(){throw Error('Private peer position');},get vel(){throw Error('Private peer velocity');}} as unknown as Agent;
    });
    const raw:Intent=structuredClone(row.command),goal:MovementObjective=structuredClone(row.goal);
    if(kind==='unknown-goal'){goal.kind='moving';if(goal.kind==='moving')delete goal.velocity;}
    const command=kind==='no-goal'||!objective?raw:withMovementObjective(raw,goal);
    const source=structuredClone(a.body),picture=structuredClone([...pictures]);let reads=0;
    const intents:Intent[]=[command,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
    spaceTeammates([a,...peers],intents,(_a,p)=>{reads++;return pictures.get(p.idx);},
      {now:row.t,constrained:kind==='loaded'?new Set([a.body]):undefined});
    expect(reads).toBe(10);expect(a.body).toEqual(source);expect([...pictures]).toEqual(picture);
    rows.push({row,source,command:intents[0],raw,pictures,profile:a.profile});
  }
  return rows;
}
function clearance(body:Body,command:Intent,now:number,peers:Map<number,any>,profiles:any[]) {
  const path=Preview.previewFreeMovement(body,command,now,12);
  return Math.min(...profiles.map(p=>{
    const seen=peers.get(p.idx),touch=.9*(body.profile.radius+p.profile.radius);
    let previous={x:body.pos.x-seen.pos.x,y:body.pos.y-seen.pos.y},best=Math.hypot(previous.x,previous.y)-touch;
    for(const s of path){
      const r={x:s.pos.x-seen.pos.x-seen.vel.x*s.t,y:s.pos.y-seen.pos.y-seen.vel.y*s.t};
      const dx=r.x-previous.x,dy=r.y-previous.y,u=Math.max(0,Math.min(1,-(previous.x*dx+previous.y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      best=Math.min(best,Math.hypot(previous.x+u*dx,previous.y+u*dy)-touch);previous=r;
    }
    return best;
  }));
}
describe('compound traffic movement preserves the football objective',()=>{
  it('uses a real brake-and-transverse action where full, half and gather all overlap',()=>{
    const rows=run(),last=rows.at(-1)!;
    const {source,raw,row,pictures,command}=last;
    for(const scale of [1,.5,0])expect(clearance(source,{...raw,vel:{x:raw.vel.x*scale,y:raw.vel.y*scale}},row.t,pictures,row.peers)).toBeLessThan(0);
    expect(clearance(source,command,row.t,pictures,row.peers)).toBeGreaterThan(.25);
    expect(command.vel).not.toEqual(raw.vel);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThanOrEqual(Math.hypot(raw.vel.x,raw.vel.y));
    expect(movementObjective(command)).toEqual(row.goal);
    const path=Preview.previewFreeMovement(source,command,row.t,12);
    expect(path.every(s=>s.support==='up')).toBe(true);
    const body=structuredClone(source),world=new World([body]);world.time=row.t;
    const report=world.step([command],.05);
    expect(body.pos).toEqual(path[0].pos);expect(body.vel).toEqual(path[0].vel);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });
  it.each(['unknown-goal','unknown-peer','unknown-age','loaded','obstruction'])('does not invent a certified alternative with %s',kind=>{
    const rows=run(kind),native=run(kind,false);
    // Information/constraint controls do not use the new alternative. A
    // genuinely blocked route is allowed to remain blocked.
    if(kind!=='obstruction')expect(rows.map(r=>r.command.vel)).toEqual(native.map(r=>r.command.vel));
    const last=rows.at(-1)!;
    if(kind==='obstruction'){
      expect(clearance(last.source,last.command,last.row.t,last.pictures,last.row.peers)).toBeLessThan(0);
      const blocker=last.row.peers.find((p:any)=>p.idx===19),seen=last.pictures.get(19);
      const body:Body={...structuredClone(last.source),profile:blocker.profile,pos:{...seen.pos},vel:{...seen.vel}};
      const own=structuredClone(last.source),world=new World([own,body]);world.time=last.row.t;
      expect(Math.hypot(own.pos.x-body.pos.x,own.pos.y-body.pos.y)).toBeGreaterThan(.9*(own.profile.radius+body.profile.radius));
      let contact=false;
      for(let k=0;k<12;k++)contact ||= world.step([last.command,{vel:{x:0,y:0}}],.05).contacts.some(c=>c.impulse>0);
      expect(contact).toBe(true);
    }
  });
  it('preserves a genuinely clear route with no forecasts even when its own goal is supplied',()=>{
    const spy=vi.spyOn(Preview,'previewFreeMovement');
    try{const rows=run('clear');expect(rows.every(r=>r.command.vel.x===r.raw.vel.x&&r.command.vel.y===r.raw.vel.y)).toBe(true);expect(spy).not.toHaveBeenCalled();}
    finally{spy.mockRestore();}
  });
  it('copies the consumed moving goal, preserves it through modifiers, and distinguishes unknown from fixed',()=>{
    const first=fixture.rows[0],body=structuredClone(first.body);
    const a=new Agent(21,'D','SS',fixture.player,body.profile,body,{kind:'man',update(){throw Error('unused');}});
    const point={x:58,y:22},velocity={x:0,y:2},command=track(a,point,velocity);
    point.x=99;velocity.y=99;
    expect(movementObjective({...command,vel:{x:0,y:0}})).toEqual({kind:'moving',point:{x:58,y:22},velocity:{x:0,y:2}});
    expect(movementObjective(withMovementObjective({vel:{x:1,y:0}},{kind:'moving',point}))).toEqual({kind:'moving',point,velocity:undefined});
    expect(movementObjective(withMovementObjective({vel:{x:1,y:0}},{kind:'fixed',point}))?.kind).toBe('fixed');
  });
});
