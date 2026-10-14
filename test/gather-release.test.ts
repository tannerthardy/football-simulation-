import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { World, type Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { spaceTeammates } from '../src/sim/spacing.js';

// Exact entry-2.35 body/support, request and owned teammate pictures, captured
// from snap with all 47 saved candidate state/RNG prefix hashes matching.
const fixture=JSON.parse(readFileSync(new URL('../data/reviews/current/rb-gather-release-state.json',import.meta.url),'utf8'));
function stage() {
  const sim=new PlaySim({
    offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),'12'),
    defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
    offCall:{formation:FORMATION_BY_ID.ace_12,flip:false,kind:'run',run:RUN_BY_ID.wz_strong,label:'gather-release'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over Cover 3'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,
  });
  const a=sim.agents[6];a.body=structuredClone(fixture.body);
  expect(a.player.id).toBe('O-RB1');
  const pictures=fixture.peers.filter((p:any)=>p.information.source!=='unavailable');
  const decide=(visible=pictures)=>{
    const intents:Intent[]=sim.agents.map(b=>b===a?structuredClone(fixture.raw):{vel:{x:0,y:0}});
    spaceTeammates(sim.agents,intents,(observer,target)=>observer===a
      ?visible.find((p:any)=>p.idx===target.idx)?.information??null:null,{now:fixture.now});
    return intents[6];
  };
  return {sim,a,pictures,decide};
}
// Swept surface gap against the acquired constant-velocity estimate. This
// scores physical forecasts; it does not certify the reacting native play.
function minimumGap(body:any,samples:MovementPreview.MovementSample[],peer:any) {
  let x=body.pos.x-peer.information.pos.x,y=body.pos.y-peer.information.pos.y;
  let gap=Math.hypot(x,y)-peer.touch;
  for(const sample of samples) {
    const nextX=sample.pos.x-peer.information.pos.x-peer.information.vel.x*sample.t;
    const nextY=sample.pos.y-peer.information.pos.y-peer.information.vel.y*sample.t;
    const dx=nextX-x,dy=nextY-y,t=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    gap=Math.min(gap,Math.hypot(x+t*dx,y+t*dy)-peer.touch);x=nextX;y=nextY;
  }
  return gap;
}

describe('low-speed gather release',()=>{
  it('keeps gathering from the identical saved state when release curves into acquired traffic',()=>{
    const {a,pictures,decide}=stage(),before=structuredClone(a.body),request=decide();
    expect(Math.hypot(a.vel.x,a.vel.y)).toBeCloseTo(1.8227784363298143,12);
    expect(request).toEqual({...fixture.raw,vel:{x:0,y:0}});
    const released=MovementPreview.previewFreeMovement(a.body,fixture.raw,fixture.now,12);
    const gathered=MovementPreview.previewFreeMovement(a.body,request,fixture.now,12);
    const rt=pictures.find((p:any)=>p.idx===2);
    expect(minimumGap(a.body,released,rt)).toBeLessThan(-.3);
    expect(minimumGap(a.body,gathered,rt)).toBeGreaterThan(.04);
    expect(gathered.every(sample=>sample.support==='up')).toBe(true);
    expect(pictures.every((p:any)=>minimumGap(a.body,gathered,p)>0)).toBe(true);
    expect(a.body).toEqual(before);
  });

  it('keeps the same decision immediately below, at and above the old threshold',()=>{
    const {a,decide}=stage(),speed=Math.hypot(a.vel.x,a.vel.y);
    for(const target of [1.95,2,2.05]) {
      a.body=structuredClone(fixture.body);a.body.vel.x*=target/speed;a.body.vel.y*=target/speed;
      expect(decide()).toEqual({...fixture.raw,vel:{x:0,y:0}});
    }
  });

  it('allows ordinary open-path acceleration from the low-speed body state',()=>{
    const {a,decide}=stage(),world=new World([a.body]);world.time=fixture.now;
    const startSpeed=Math.hypot(a.vel.x,a.vel.y);
    const preview=vi.spyOn(MovementPreview,'previewFreeMovement');
    try {
      for(let k=0;k<12;k++) {
        const request=decide([]);expect(request).toEqual(fixture.raw);
        expect(world.step([request],.05).contacts).toHaveLength(0);
        expect(a.body.support!.state).toBe('up');
      }
      expect(preview).not.toHaveBeenCalled();
    } finally {preview.mockRestore();}
    expect(Math.hypot(a.vel.x,a.vel.y)).toBeGreaterThan(startSpeed+1);
  });

  it.each([0,-4e-51])('preserves acceleration from numerical rest (%s) without a direction normalization or preview',vx=>{
    const {a,decide}=stage();a.body.vel={x:vx,y:0};
    const preview=vi.spyOn(MovementPreview,'previewFreeMovement');
    try {expect(decide([])).toEqual(fixture.raw);expect(preview).not.toHaveBeenCalled();}
    finally {preview.mockRestore();}
  });

  it('uses the same owned pictures after unobserved teammate motion changes',()=>{
    const {sim,a,decide}=stage(),body=structuredClone(a.body),memory=structuredClone(sim.teammateAwareness),rng=structuredClone(sim.rng);
    const first=decide();
    for(const b of sim.agents) if(b!==a) {b.body.pos={x:5+b.idx,y:50};b.body.vel={x:-8,y:4};}
    expect(decide()).toEqual(first);expect(a.body).toEqual(body);
    expect(structuredClone(sim.teammateAwareness)).toEqual(memory);expect(structuredClone(sim.rng)).toEqual(rng);
  });
});
