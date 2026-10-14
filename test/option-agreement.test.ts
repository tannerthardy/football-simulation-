import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RouteRunner} from '../src/sim/behaviors/receiver.js';
import {QBPass} from '../src/sim/behaviors/qb.js';
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
  it('lets real press contact delay the decision region without forcing a route conversion on the elapsed clock',()=>{
    const f=fixture(),d=f.sim.slot('NB')!;
    f.a.body.pos={...f.plan.origin};f.a.body.vel={x:0,y:0};f.sim.t=2;
    d.body.pos={x:f.a.pos.x+.9,y:f.a.pos.y+.25};d.body.vel={x:0,y:0};d.body.facing=Math.PI;
    f.sim.defAlign.spots.NB!.press=true;f.sim.defAlign.spots.NB!.manTarget='H';
    let transmitted=0;
    for(let i=0;i<8;i++){
      const command=f.runner.update(f.a,f.sim);
      f.sim.world.step(f.sim.agents.map(a=>a===f.a?command:{vel:{x:0,y:0},facing:a.facing}),f.sim.dt);
      transmitted+=f.sim.world.joints.reduce((sum,j)=>sum+Math.abs(Reflect.get(j,'normalForce')??0)
        +Math.abs(Reflect.get(j,'tangentForce')??0),0)*f.sim.dt;
      f.sim.t+=f.sim.dt;
    }
    expect(transmitted).toBeGreaterThan(1);
    expect(f.a.pos.x).toBeLessThan(f.stem.x-2);
    expect(choice(f)).toBeNull();expect(Reflect.get(f.runner,'converted')).toBe(false);
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
  it('continues an observed receiver already on the out leg instead of forecasting a return to the stem',()=>{
    const f=fixture(),seen=picture(46,f.stem.y+4*f.plan.outside,0,4*f.plan.outside);
    const next=predictStick(f.plan,'out',seen,f.a.profile,1.2);
    expect((next.y-seen.pos.y)*f.plan.outside).toBeGreaterThan(1);
  });
});

function quarterbackView(f:ReturnType<typeof fixture>,keySide:number){
  const qb=f.sim.qb.behavior as QBPass;
  Reflect.set(qb,'phase','set');
  Reflect.set(qb,'readIdx',Reflect.get(qb,'reads').indexOf(f.a));
  const key=f.sim.slot('LB_M')!;
  vi.spyOn(f.sim.qbMind,'estimate').mockImplementation(d=>d===key?
    picture(f.stem.x+1,f.stem.y+keySide*f.plan.outside):picture(80,50));
  vi.spyOn(f.sim,'see').mockImplementation((a,d)=>d===f.a?
    picture(f.a.pos.x,f.a.pos.y,f.a.vel.x,f.a.vel.y):d===key?
      picture(f.stem.x+1,f.stem.y+keySide*f.plan.outside):picture(80,50));
  return qb;
}
function predict(f:ReturnType<typeof fixture>,qb:QBPass,ahead=.8){
  return Reflect.get(qb,'receiverPrediction').call(qb,f.sim.qb,f.sim,f.a,ahead);
}
function expectation(f:ReturnType<typeof fixture>,qb:QBPass){return Reflect.get(qb,'optionMemories').get(f.a);}

describe('QB option expectation from his own view',()=>{
  it('cannot learn the private route path, index, settled state or choice when the acquired pictures are identical',()=>{
    const a=fixture(),b=fixture(),qa=quarterbackView(a,2),qb=quarterbackView(b,2);
    b.runner.path=[{p:{x:90,y:50},s:1}];b.runner.idx=999;b.runner.settled=true;
    Reflect.set(b.runner,'converted',true);Reflect.set(b.runner,'optionDecision',{branch:'out'});
    vi.spyOn(a.runner,'predict').mockImplementation(()=>{throw Error('Private prediction accessed');});
    vi.spyOn(b.runner,'predict').mockImplementation(()=>{throw Error('Private prediction accessed');});
    expect(predict(a,qa)).toEqual(predict(b,qb));expect(expectation(a,qa).branch).toBe('sit');
  });
  it('can anticipate an out before observing a receiver cut without consulting his private commitment',()=>{
    const f=fixture(),q=quarterbackView(f,-1);f.a.body.pos.x=43.5;
    const draws={...f.sim.rng};vi.spyOn(f.runner,'predict').mockImplementation(()=>{throw Error('Private prediction accessed');});
    // Starting half a yard farther before the stem, .8 s legitimately has
    // only begun the cut. Use a delivery horizon that reaches the out leg.
    const point=predict(f,q,1.2);
    expect((point.y-f.plan.origin.y)*f.plan.outside).toBeGreaterThan(1);
    expect(expectation(f,q).branch).toBe('out');expect(expectation(f,q).committed).toBe(false);
    expect(Reflect.get(f.runner,'converted')).toBe(false);expect({...f.sim.rng}).toEqual(draws);
  });
  it('preserves a receiver/QB disagreement caused by separate key pictures',()=>{
    const f=fixture(),q=quarterbackView(f,2),key=f.sim.slot('LB_M')!;
    vi.mocked(f.sim.see).mockImplementation((a,d)=>d===f.a?picture(44,f.plan.origin.y,6):d===key?
      picture(f.stem.x+1,f.stem.y+(a===f.a?-1:2)*f.plan.outside):picture(80,50));
    f.runner.update(f.a,f.sim);expect(choice(f).branch).toBe('out');
    predict(f,q);expect(expectation(f,q).branch).toBe('sit');expect(expectation(f,q).evidence).toBe('key');
  });
  it('corrects an old expectation only after observable receiver motion reveals the out',()=>{
    const f=fixture(),q=quarterbackView(f,2);predict(f,q);expect(expectation(f,q).branch).toBe('sit');
    vi.mocked(f.sim.qbMind.estimate).mockImplementation(()=>picture(f.stem.x,f.stem.y-f.plan.outside));
    f.sim.t+=.05;f.a.body.pos.x+=.2;predict(f,q);
    expect(expectation(f,q).branch).toBe('sit');
    f.sim.t+=.05;f.a.body.pos={x:46.1,y:f.stem.y+.5*f.plan.outside};f.a.body.vel={x:1,y:2*f.plan.outside};
    predict(f,q);expect(expectation(f,q).branch).toBe('out');expect(expectation(f,q).evidence).toBe('motion');
  });
  it('does not refresh an option receiver during an emergency evaluation while looking at another read',()=>{
    const a=fixture(),b=fixture(),qa=quarterbackView(a,-1),qb=quarterbackView(b,-1);
    for(const q of [qa,qb])Reflect.set(q,'readIdx',Reflect.get(q,'reads').findIndex((r:unknown)=>r!==a.a&&r!==b.a));
    b.a.body.pos={x:80,y:50};b.runner.path=[{p:{x:90,y:50},s:1}];
    const pa=predict(a,qa),pb=predict(b,qb);
    expect(pa).toEqual(pb);expect(a.sim.see).not.toHaveBeenCalled();expect(b.sim.see).not.toHaveBeenCalled();
    expect(expectation(a,qa).observedAt).toBe(0);
  });
  it('retains the existing route prediction for an ordinary non-option receiver',()=>{
    const f=fixture(),q=f.sim.qb.behavior as QBPass;
    const r=f.sim.offense.find(r=>r.behavior instanceof RouteRunner&&!r.behavior.stickInstall)!;
    const route=r.behavior as RouteRunner,expected=route.predict(r,.8);
    expect(Reflect.get(q,'receiverPrediction').call(q,f.sim.qb,f.sim,r,.8)).toEqual(expected);
  });
  it('keeps actual release aim independent of an unseen private branch change',()=>{
    const a=fixture(),b=fixture(),qa=quarterbackView(a,2),qb=quarterbackView(b,2);
    const launch=(f:ReturnType<typeof fixture>,q:QBPass,hidden:boolean)=>{
      const point={...predict(f,q),z:1.3},ev={target:f.a,point,T:.8,P:.7,intRisk:0,value:6,depth:6};
      Reflect.get(q,'startThrow').call(q,f.sim.qb,f.sim,ev);
      if(hidden){f.runner.path=[{p:{x:90,y:50},s:1}];f.runner.idx=999;Reflect.set(f.runner,'converted',true);}
      vi.spyOn(f.runner,'predict').mockImplementation(()=>{throw Error('Private prediction accessed at release');});
      f.sim.t+=.25;Reflect.get(q,'release').call(q,f.sim.qb,f.sim,ev);
      return f.sim.ball;
    };
    const x=launch(a,qa,false),y=launch(b,qb,true);
    expect(x.kind).toBe('air');expect(y.kind).toBe('air');
    if(x.kind==='air'&&y.kind==='air'){
      expect(x.flight).toEqual(y.flight);expect(x.intended).toEqual(y.intended);
    }
    expect({...a.sim.rng}).toEqual({...b.sim.rng});
  });
  it('keeps throw evaluation independent of an unseen live target position or engagement',()=>{
    const a=fixture(),b=fixture(),qa=quarterbackView(a,2),qb=quarterbackView(b,2);
    for(const f of [a,b])vi.mocked(f.sim.see).mockImplementation((observer,d)=>d===f.a?
      picture(44,f.plan.origin.y,6):picture(80,50));
    b.a.body.pos={x:80,y:50};Reflect.set(b.a,'engagement',{win:0});
    const evaluate=(f:ReturnType<typeof fixture>,q:QBPass)=>{
      const ev=Reflect.get(q,'evaluate').call(q,f.sim.qb,f.sim,f.a,0);
      expect(ev).not.toBeNull();const {target:_target,...measured}=ev;return measured;
    };
    expect(evaluate(a,qa)).toEqual(evaluate(b,qb));
  });
});
