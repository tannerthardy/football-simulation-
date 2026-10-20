import {afterEach,describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {cornerSpeed} from '../src/physics/kinematics.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {goTo} from '../src/sim/behaviors/common.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';

const formation=FORMATION_BY_ID.ace_11;
const offense=generateTeam(new Rng(31),'O','O',{strength:.55});
const defense=generateTeam(new Rng(32),'D','D',{strength:.55});

function stage(side=1,role:'kick'|'trap'|'lead'='kick',obsoleteNext=4.8){
  const run=structuredClone(RUN_BY_ID.counter);run.direction='strong';
  const sim=new PlaySim({offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,'base43'),
    offCall:{formation,flip:false,kind:'run',run,label:'Counter'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
  sim.offAlign.strongSign=side;
  const a=sim.slot('RG')!,target=sim.slot('DE_W')!;
  for(const other of sim.offense)if(other!==a){other.body.pos.x=42;other.body.vel={x:0,y:0};}
  a.body.pos={x:38.8,y:CENTER_Y+side*3.8};a.body.vel={x:0,y:side*2};
  target.body.pos={x:41,y:CENTER_Y+side*5.65};target.body.vel={x:0,y:0};
  const path=[{x:38.75,y:CENTER_Y+side*2},{x:38.85,y:CENTER_Y+side*4.6},
    {x:39.9,y:CENTER_Y+side*obsoleteNext}];
  const controller=new RunBlocker({kind:'pull',pullRole:role,target,drive:{x:.3,y:side},pullPath:path});
  // Restore an already earned wall-clearance state. This test isolates the
  // subsequent landmark snapshot, without granting motion or a contact.
  a.behavior=controller;Reflect.set(controller,'pullIdx',1);Reflect.set(controller,'pullCleared',true);
  Object.defineProperty(a.mind,'placementError',{get:()=>0});
  sim.t=.5;sim.world.time=.5;
  const picture:Perceived={pos:{x:41,y:CENTER_Y+side*5.65},vel:{x:0,y:0},facing:Math.PI,stance:'low',age:.25};
  const ordinarySee=sim.see.bind(sim);
  const see=vi.spyOn(sim,'see').mockImplementation((observer,other,scale)=>{
    if(observer===a&&other===target)return structuredClone(picture);
    const p=ordinarySee(observer,other,scale);
    return observer===a?{...p,pos:{x:42,y:other.pos.y},vel:{x:0,y:0}}:p;
  });
  const reads=()=>see.mock.calls.filter(([observer,other])=>observer===a&&other===target).length;
  return {sim,a,target,controller,path,picture,reads};
}

afterEach(()=>vi.restoreAllMocks());

describe('puller lookahead and progress share the acquired landmark picture',()=>{
  it.each([['kick',1],['kick',-1],['trap',1],['trap',-1]] as const)(
    '%s lookahead ignores obsolete outgoing coordinates, side=%s',(role,side)=>{
      const first=stage(side,role,4.8),second=stage(side,role,7.4);
      const a=first.controller.update(first.a,first.sim),b=second.controller.update(second.a,second.sim);
      const current={x:38.85,y:first.picture.pos.y-side*.65};
      const outgoing={x:39.9,y:first.picture.pos.y-side*.45};
      expect(first.path[1]).toEqual(current);expect(first.path[2]).toEqual(outgoing);
      expect(second.path[2]).toEqual(outgoing);
      expect(a).toEqual(b);
      expect(a).toEqual(goTo(first.a,current,{speed:.95,through:cornerSpeed(first.a.body,current,outgoing,.65)}));
      expect(first.controller.plan.target).toBe(first.target);
      expect(first.a.engagement).toBeNull();expect(first.sim.world.joints).toHaveLength(0);
    });

  it('preserves earned arrival at the held landmark when a fresh picture changes the next job',()=>{
    const f=stage();f.controller.update(f.a,f.sim);
    const heldGoal={...f.path[1]};expect(f.reads()).toBe(1);
    // Stage achieved arrival independently of this decision. The previous
    // command owned this goal; the fresh cue cannot undo that useful progress.
    f.a.body.pos={...heldGoal};f.a.body.vel={x:0,y:0};
    f.sim.t+=f.a.mind.decisionInterval+.05;f.picture.pos.y+=1;
    const before=structuredClone(f.a.body),command=f.controller.update(f.a,f.sim);
    expect(command.facing).toBeDefined();expect(f.reads()).toBe(2);
    expect(Reflect.get(f.controller,'pullIdx')).toBe(2);
    expect(f.path[1]).toEqual(heldGoal);
    expect(f.a.body).toEqual(before);expect(f.a.engagement).toBeNull();expect(f.sim.world.joints).toHaveLength(0);
  });

  it('preserves acquired landmark depth when near-wall clearance refines the requested x position',()=>{
    const f=stage(),center=f.sim.slot('C')!;
    center.body.pos={x:f.a.pos.x+.8,y:f.a.pos.y+.2};
    const current={x:f.a.pos.x-.35,y:f.picture.pos.y-.65};
    const outgoing={x:f.path[2].x,y:f.picture.pos.y-.45};
    const before=structuredClone(f.a.body),command=f.controller.update(f.a,f.sim);
    expect(command).toEqual(goTo(f.a,current,{speed:.95,through:cornerSpeed(f.a.body,current,outgoing,.65)}));
    expect(command.vel.x).toBeLessThan(0);
    expect(f.a.body).toEqual(before);expect(f.a.engagement).toBeNull();expect(f.sim.world.joints).toHaveLength(0);
  });

  it('holds one acquired picture despite private movement, then refreshes both landmarks on the normal beat',()=>{
    const f=stage();const first=f.controller.update(f.a,f.sim);expect(f.reads()).toBe(1);
    f.target.body.pos.y+=8;f.picture.pos.y+=1;f.sim.t+=f.a.mind.decisionInterval/2;
    expect(f.controller.update(f.a,f.sim)).toEqual(first);expect(f.reads()).toBe(1);
    expect(f.path[2].y).toBeCloseTo(CENTER_Y+5.2,12);
    f.sim.t+=f.a.mind.decisionInterval;
    f.controller.update(f.a,f.sim);expect(f.reads()).toBe(2);
    expect(f.path[1].y).toBeCloseTo(CENTER_Y+6,12);
    expect(f.path[2].y).toBeCloseTo(CENTER_Y+6.2,12);
  });

  it('retains installed phase zero without acquiring the later target',()=>{
    const f=stage();Reflect.set(f.controller,'pullIdx',0);
    const before=structuredClone(f.path);f.controller.update(f.a,f.sim);
    expect(f.reads()).toBe(0);expect(f.path).toEqual(before);
  });

  it('keeps a legitimate reached kick landmark and an acquired penetrator available for fitting',()=>{
    const reached=stage();reached.a.body.pos={x:38.85,y:CENTER_Y+5};reached.a.body.vel={x:0,y:0};
    expect(reached.controller.update(reached.a,reached.sim).facing).toBeDefined();
    expect(Reflect.get(reached.controller,'pullIdx')).toBe(2);
    const penetration=stage(1,'trap');penetration.picture.pos.x=38;
    expect(penetration.controller.update(penetration.a,penetration.sim).facing).toBeDefined();
    expect(penetration.controller.plan.target).toBe(penetration.target);
    expect(penetration.a.engagement).toBeNull();expect(penetration.sim.world.joints).toHaveLength(0);
  });

  it('preserves the wrapper\'s distinct installed route',()=>{
    const f=stage(1,'lead');const before=structuredClone(f.path);
    const command=f.controller.update(f.a,f.sim);
    expect(f.path).toEqual(before);
    expect(command).toEqual(goTo(f.a,before[1],{speed:.95,through:cornerSpeed(f.a.body,before[1],before[2],.65)}));
  });
});
