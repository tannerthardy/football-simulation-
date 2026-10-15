import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';
import {clearCombinationDeparture,departureClearances,gatherCombinationDeparture} from '../src/sim/combination-departure.js';

const saved=JSON.parse(readFileSync(new URL('./fixtures/joined-departure-momentum.json',import.meta.url),'utf8'));
function body(){const b=structuredClone(saved.ownBody);b.support.since=-Infinity;return b;}

describe('achieved combination departure before ending first-level work',()=>{
  it('rejects the saved straight-corridor departure whose residual momentum strikes the acquired DL',()=>{
    const b=body(),before=structuredClone(b),peers=structuredClone(saved.peers),command=structuredClone(saved.command);
    expect(clearCombinationDeparture(b,command,peers,saved.t,saved.horizon,'center')).toBe(false);
    // Independent physical witness: the final command's actual path enters
    // torso touch, even though its eventual destination is on the clear side.
    const path=previewFreeMovement(b,command,saved.t,Math.ceil(saved.horizon/.05),'center');
    const d=peers[0],touch=.9*(b.profile.radius+d.radius);
    expect(Math.min(...path.map(s=>Math.hypot(s.pos.x-d.pos.x-d.vel.x*s.t,s.pos.y-d.pos.y-d.vel.y*s.t))))
      .toBeLessThan(touch);
    expect(b).toEqual(before);expect(peers).toEqual(saved.peers);expect(command).toEqual(saved.command);
  });

  it('allows the same requested route after existing momentum is removed, without changing capability',()=>{
    const b=body();b.vel={x:0,y:0};
    expect(clearCombinationDeparture(b,saved.command,saved.peers,saved.t,saved.horizon,'center')).toBe(true);
    const path=previewFreeMovement(b,saved.command,saved.t,5,'center');
    for(const p of saved.peers){
      const touch=.9*(b.profile.radius+p.radius);
      expect(Math.min(...path.map(s=>Math.hypot(s.pos.x-p.pos.x-p.vel.x*s.t,s.pos.y-p.pos.y-p.vel.y*s.t))))
        .toBeGreaterThanOrEqual(touch-1e-9);
    }
  });

  it('keeps an acquired stationary body in the actual route as an obstruction',()=>{
    const b=body();b.vel={x:0,y:0};
    const path=previewFreeMovement(b,saved.command,saved.t,5,'center');
    const p={pos:{...path[2].pos},vel:{x:0,y:0},radius:.2};
    expect(clearCombinationDeparture(b,saved.command,[p],saved.t,saved.horizon,'center')).toBe(false);
  });

  it('gathers for less predicted intrusion without changing posture, facing, body or information',()=>{
    const b=body(),before=structuredClone(b),peers=structuredClone(saved.peers),command=structuredClone(saved.command);
    const draws=vi.spyOn(Rng.prototype,'nextU32');
    try{
      const changed=gatherCombinationDeparture(b,command,peers,saved.t,saved.horizon,'center');
      expect(changed.vel).toEqual({x:0,y:0});
      const {vel:_,...rest}=changed,{vel:__,...original}=command;expect(rest).toEqual(original);
      const old=departureClearances(b,command,peers,saved.t,saved.horizon,'center');
      const next=departureClearances(b,changed,peers,saved.t,saved.horizon,'center');
      expect(next.clearances[0]).toBeGreaterThan(old.clearances[0]);
      expect(next.clearances[0]).toBeLessThan(0); // no fictitious collision avoidance
      expect(next.clearances[1]).toBeGreaterThanOrEqual(Math.min(0,old.clearances[1])-1e-9);
      expect(b).toEqual(before);expect(peers).toEqual(saved.peers);expect(command).toEqual(saved.command);
      expect(draws).not.toHaveBeenCalled();
    }finally{draws.mockRestore();}
  });

  it('preserves the original clear departure command',()=>{
    const b=body();b.vel={x:0,y:0};
    expect(gatherCombinationDeparture(b,saved.command,saved.peers,saved.t,saved.horizon,'center')).toBe(saved.command);
  });

  it('does not reduce the DL intrusion by worsening another acquired neighbor',()=>{
    const b=body(),gather={...saved.command,vel:{x:0,y:0}};
    const path=previewFreeMovement(b,gather,saved.t,5,'center');
    const peer={pos:{...path[2].pos},vel:{x:0,y:0},radius:.05};
    expect(gatherCombinationDeparture(b,saved.command,[...saved.peers,peer],saved.t,saved.horizon,'center')).toBe(saved.command);
  });

  it('makes the same momentum decision under reflected geometry',()=>{
    const b=body(),middle=26.666666666666668;
    b.pos.y=2*middle-b.pos.y;b.vel.y=-b.vel.y;b.facing=-b.facing;b.spin=-b.spin;b.squeezeHeading=-b.squeezeHeading;
    for(const v of Object.values(b.support) as any[])if(v&&typeof v==='object'&&typeof v.y==='number')v.y=-v.y;
    const peers=saved.peers.map((p:any)=>({...p,pos:{x:p.pos.x,y:2*middle-p.pos.y},vel:{x:p.vel.x,y:-p.vel.y}}));
    const command={...saved.command,vel:{x:saved.command.vel.x,y:-saved.command.vel.y},facing:-saved.command.facing};
    expect(gatherCombinationDeparture(b,command,peers,saved.t,saved.horizon,'center').vel).toEqual({x:0,y:0});
  });
});
