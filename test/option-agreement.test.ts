import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RouteRunner} from '../src/sim/behaviors/receiver.js';
import {PlaySim} from '../src/sim/playsim.js';
import {atStickDecision,readStick,stickStem,predictStick} from '../src/sim/option-route.js';
import type {Perceived} from '../src/sim/perception.js';

const offense=pickOffense(generateTeam(new Rng(91),'Option test offense','OT'),'11');
const defense=pickDefense(generateTeam(new Rng(92),'Option test defense','DT'),'nickel');
function fixture(){
  const sim=new PlaySim({offense,defense,seed:45,audibles:false,
    offCall:{formation:FORMATION_BY_ID.gun_trips_11,flip:false,kind:'pass',pass:PASS_BY_ID.stick,label:'stick'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'zone'},
    los:40,ballY:26,firstDownX:50});
  const a=sim.offense.find(a=>a.behavior instanceof RouteRunner&&a.behavior.stickInstall)!;
  const runner=a.behavior as RouteRunner,plan=runner.stickInstall!;
  a.body.pos={x:44,y:plan.origin.y};a.body.vel={x:6,y:0};sim.t=1;
  return {sim,a,runner,plan,stem:stickStem(plan)};
}
function picture(x:number,y:number,vx=0,vy=0):Perceived{
  return {pos:{x,y},vel:{x:vx,y:vy},facing:Math.PI,stance:null,pose:'up',age:.3};
}
function receiverView(f:ReturnType<typeof fixture>,side:number){
  const key=f.sim.slot('LB_M')!;
  vi.spyOn(f.sim,'see').mockImplementation((a,d)=>d===key?
    picture(f.stem.x+1,f.stem.y+side*f.plan.outside):picture(80,50));
  return key;
}
const choice=(f:ReturnType<typeof fixture>)=>Reflect.get(f.runner,'optionDecision');

describe('observed Stick receiver commitment',()=>{
  it('keeps an inside-key choice and movement independent of the true coverage flag and unseen live defender position',()=>{
    const a=fixture(),b=fixture();receiverView(a,-1);const key=receiverView(b,-1);
    b.sim.defAlign.coverage.man=true;key.body.pos={x:90,y:50};
    const drawsA={...a.sim.rng},drawsB={...b.sim.rng};
    expect(a.runner.update(a.a,a.sim)).toEqual(b.runner.update(b.a,b.sim));
    expect(choice(a).branch).toBe('out');expect(choice(b)).toEqual(choice(a));
    expect(a.runner.path).toEqual(b.runner.path);
    expect({...a.sim.rng}).toEqual(drawsA);expect({...b.sim.rng}).toEqual(drawsB);
  });
  it('sits when the observed key protects the outside, even if the hidden flag says man',()=>{
    const f=fixture();receiverView(f,2);f.sim.defAlign.coverage.man=true;
    f.runner.update(f.a,f.sim);expect(choice(f).branch).toBe('sit');
  });
  it('does not let elapsed time commit a receiver delayed before the decision region',()=>{
    const f=fixture();receiverView(f,-1);f.a.body.pos.x=41;f.sim.t=5;
    f.runner.update(f.a,f.sim);expect(choice(f)).toBeNull();expect(Reflect.get(f.runner,'converted')).toBe(false);
    f.a.body.pos.x=44;f.runner.update(f.a,f.sim);expect(choice(f).branch).toBe('out');
  });
  it('keeps a personal commitment when the key subsequently changes leverage',()=>{
    const f=fixture();const see=vi.spyOn(f.sim,'see').mockImplementation(()=>picture(f.stem.x+1,f.stem.y-f.plan.outside));
    f.runner.update(f.a,f.sim);const path=structuredClone(f.runner.path),decision=structuredClone(choice(f));
    see.mockImplementation(()=>picture(f.stem.x+1,f.stem.y+2*f.plan.outside));
    f.runner.update(f.a,f.sim);expect(f.runner.path).toEqual(path);expect(choice(f)).toEqual(decision);
  });
  it('uses an acquired defender picture for settled-window drift instead of hidden live position',()=>{
    const a=fixture(),b=fixture();receiverView(a,-1);const key=receiverView(b,-1);
    for(const f of [a,b]){f.runner.settled=true;f.a.body.pos={x:45.5,y:f.plan.origin.y-.6*f.plan.outside};}
    key.body.pos={x:90,y:50};
    expect(a.runner.update(a.a,a.sim)).toEqual(b.runner.update(b.a,b.sim));
  });
});

describe('shared install with distinct available pictures',()=>{
  it('permits a real leverage disagreement while preserving ordinary agreement',()=>{
    const f=fixture(),fresh=[{i:15,...picture(46,f.stem.y-f.plan.outside)}],stale=[{i:15,...picture(46,f.stem.y+2*f.plan.outside)}];
    expect(readStick(f.plan,fresh).branch).toBe('out');expect(readStick(f.plan,stale).branch).toBe('sit');
    expect(readStick(f.plan,fresh)).toEqual(readStick(f.plan,structuredClone(fresh)));
  });
  it('mirrors the same leverage rule and uses a spatial decision region',()=>{
    const f=fixture(),mirror={...f.plan,origin:{...f.plan.origin,y:53.3-f.plan.origin.y},outside:-f.plan.outside};
    const d={i:15,...picture(46,f.stem.y-f.plan.outside)};
    expect(readStick(f.plan,[d]).branch).toBe(readStick(mirror,[{...d,pos:{x:d.pos.x,y:53.3-d.pos.y}}]).branch);
    expect(atStickDecision(f.plan,{x:43.99,y:20})).toBe(false);
    expect(atStickDecision(f.plan,{x:44,y:20})).toBe(true);
  });
  it('does not invent a nearby key from a visibly grounded body',()=>{
    const f=fixture();expect(readStick(f.plan,[{i:15,...picture(46,f.stem.y),pose:'down'}]).branch).toBe('sit');
    expect(readStick(f.plan,[]).key).toBeNull();
  });
  it('preserves anticipation through physical movement preview without changing the observed body or capabilities',()=>{
    const f=fixture(),seen=picture(44,f.plan.origin.y,6),before=structuredClone(seen),profile=structuredClone(f.a.profile);
    const sit=predictStick(f.plan,'sit',seen,f.a.profile,.8),out=predictStick(f.plan,'out',seen,f.a.profile,.8);
    expect((out.y-sit.y)*f.plan.outside).toBeGreaterThan(1);
    expect(Math.hypot(out.x-seen.pos.x,out.y-seen.pos.y)).toBeLessThan(f.a.profile.vmax*.8);
    expect(seen).toEqual(before);expect(f.a.profile).toEqual(profile);
    expect(predictStick(f.plan,'out',{...seen,age:.8},f.a.profile,.8)).toEqual(out);
  });
});
