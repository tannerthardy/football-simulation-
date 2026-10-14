import {describe,expect,it,vi} from 'vitest';
import {FIELD_WIDTH} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RouteRunner} from '../src/sim/behaviors/receiver.js';
import {QBPass} from '../src/sim/behaviors/qb.js';
import {PlaySim} from '../src/sim/playsim.js';
import {atMiddleDecision,readMiddle,predictMiddle} from '../src/sim/middle-read.js';
import type {Perceived} from '../src/sim/perception.js';

const offense=pickOffense(generateTeam(new Rng(91),'Middle offense','MO'),'11');
const defense=pickDefense(generateTeam(new Rng(92),'Middle defense','MD'),'nickel');
function fixture(){
  const sim=new PlaySim({offense,defense,seed:45,audibles:false,los:40,ballY:26.65,firstDownX:50,
    offCall:{formation:FORMATION_BY_ID.gun_trips_11,flip:false,kind:'pass',pass:PASS_BY_ID.seam_read,label:'seam read'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:{...COVERAGE_BY_ID.cover2},pressure:null,label:'two high'}});
  const r=sim.offense.find(a=>a.behavior instanceof RouteRunner&&a.behavior.middleInstall)!;
  const runner=r.behavior as RouteRunner,p=runner.middleInstall!,qb=sim.qb.behavior as QBPass;
  r.body.pos={x:48,y:p.origin.y};r.body.vel={x:6,y:0};sim.t=2;
  Reflect.set(qb,'phase','set');Reflect.set(qb,'readIdx',Reflect.get(qb,'reads').indexOf(r));
  return {sim,r,runner,p,qb};
}
const pic=(x:number,y:number,vx=0,vy=0):Perceived=>({pos:{x,y},vel:{x:vx,y:vy},facing:Math.PI,stance:null,pose:'up',age:.25});
function roof(f:ReturnType<typeof fixture>,closed=false){
  const left=f.sim.slot('SS')!,right=f.sim.slot('FS')!,pole=f.sim.slot('LB_M')!;
  return (d:typeof left)=>d===left?pic(58,36):d===right?pic(58,17):d===pole&&closed?pic(54,FIELD_WIDTH/2):pic(80,50);
}
function view(f:ReturnType<typeof fixture>,receiverClosed=false,qbClosed=receiverClosed){
  const wrRoof=roof(f,receiverClosed),qbRoof=roof(f,qbClosed);
  vi.spyOn(f.sim,'see').mockImplementation((a,d)=>d===f.r?{...pic(f.r.pos.x,f.r.pos.y,f.r.vel.x,f.r.vel.y),facing:f.r.facing}:
    (a===f.r?wrRoof:qbRoof)(d));
  vi.spyOn(f.sim.qbMind,'estimate').mockImplementation(qbRoof);
}
const decision=(f:ReturnType<typeof fixture>)=>Reflect.get(f.runner,'optionDecision');
const memory=(f:ReturnType<typeof fixture>)=>Reflect.get(f.qb,'optionMemories').get(f.r);
const predict=(f:ReturnType<typeof fixture>,ahead=1)=>Reflect.get(f.qb,'receiverPrediction').call(f.qb,f.sim.qb,f.sim,f.r,ahead);

describe('observed seam/post installation',()=>{
  it('bends into a observed split roof and keeps the seam against a central pole runner',()=>{
    const f=fixture(),pictures=(closed:boolean)=>f.sim.defense.map(d=>({i:d.idx,...roof(f,closed)(d)}));
    expect(readMiddle(f.p,pictures(false)).branch).toBe('post');
    const held=readMiddle(f.p,pictures(true));
    expect(held.branch).toBe('seam');expect(held.key).toBe(f.sim.slot('LB_M')!.idx);
  });
  it('does not turn a missing roof into permission to bend or treat a fallen body as a pole',()=>{
    const f=fixture();expect(readMiddle(f.p,[]).reason).toBe('unresolved-roof');
    const pictures=f.sim.defense.map(d=>({i:d.idx,...roof(f,true)(d)}));
    pictures.find(d=>d.i===f.sim.slot('LB_M')!.idx)!.pose='down';
    expect(readMiddle(f.p,pictures).branch).toBe('post');
  });
  it('recognizes an observed central carry before roof depth while preserving a shallow hold and lateral release',()=>{
    const f=fixture(),pole=f.sim.slot('LB_M')!.idx;
    const split=f.sim.defense.map(d=>({i:d.idx,...roof(f,false)(d)}));
    const read=(vx:number,y=FIELD_WIDTH/2)=>readMiddle(f.p,
      [...split.filter(d=>d.i!==pole),{i:pole,...pic(49,y,vx)}]);
    expect(read(4)).toMatchObject({branch:'seam',reason:'pole-carry',key:pole});
    expect(read(0).branch).toBe('post');
    expect(read(4,FIELD_WIDTH/2+7).branch).toBe('post');
  });
  it('mirrors the taught branch without reading a coverage flag',()=>{
    const f=fixture(),pictures=f.sim.defense.map(d=>({i:d.idx,...roof(f,false)(d)}));
    const mirrored={...f.p,outside:-f.p.outside,origin:{x:f.p.origin.x,y:FIELD_WIDTH-f.p.origin.y}};
    expect(readMiddle(mirrored,pictures.map(d=>({...d,pos:{x:d.pos.x,y:FIELD_WIDTH-d.pos.y},vel:{x:d.vel.x,y:-d.vel.y}}))).branch)
      .toBe(readMiddle(f.p,pictures).branch);
  });
  it('keeps the chosen branch, request and random state independent of unseen bodies and hidden calls',()=>{
    const a=fixture(),b=fixture();view(a);view(b);
    b.sim.defAlign.coverage.man=true;b.sim.slot('FS')!.body.pos={x:54,y:FIELD_WIDTH/2};
    const rngA={...a.sim.rng},rngB={...b.sim.rng};
    expect(a.runner.update(a.r,a.sim)).toEqual(b.runner.update(b.r,b.sim));
    expect(decision(a).branch).toBe('post');expect(decision(b)).toEqual(decision(a));
    expect(a.runner.path).toEqual(b.runner.path);
    expect({...a.sim.rng}).toEqual(rngA);expect({...b.sim.rng}).toEqual(rngB);
  });
  it('cannot commit a receiver held before his physical read region by waiting out the clock',()=>{
    const f=fixture();view(f);f.r.body.pos.x=43;f.sim.t=5;
    expect(atMiddleDecision(f.p,f.r.pos)).toBe(false);
    f.runner.update(f.r,f.sim);expect(decision(f)).toBeNull();
    f.r.body.pos.x=48;f.runner.update(f.r,f.sim);expect(decision(f).branch).toBe('post');
    view(f,true);f.runner.update(f.r,f.sim);expect(decision(f).branch).toBe('post');
  });
});

describe('independent QB middle-route expectation',()=>{
  it('anticipates the installed post before a cut and can disagree with a receiver seeing a late closed middle',()=>{
    const f=fixture();view(f,true,false);f.runner.update(f.r,f.sim);
    const point=predict(f,1.5);
    expect(decision(f).branch).toBe('seam');expect(memory(f).branch).toBe('post');
    expect(-(point.y-f.p.origin.y)*f.p.outside).toBeGreaterThan(2);
  });
  it('does not reveal a committed seam through a changed private path or a later roof picture',()=>{
    const a=fixture(),b=fixture();view(a,false,true);view(b,false,true);
    predict(a);predict(b);
    b.runner.path=[{p:{x:90,y:50},s:1}];b.runner.idx=999;
    vi.spyOn(b.runner,'predict').mockImplementation(()=>{throw Error('Private branch consulted');});
    vi.mocked(b.sim.qbMind.estimate).mockImplementation(roof(b,false));
    a.sim.t+=.05;b.sim.t+=.05;
    expect(predict(a)).toEqual(predict(b));expect(memory(b).branch).toBe('seam');
  });
  it('corrects to post after its achieved inside movement becomes visible',()=>{
    const f=fixture();view(f,false,true);predict(f);expect(memory(f).branch).toBe('seam');
    f.r.body.pos={x:51.5,y:f.p.origin.y-1.5*f.p.outside};f.r.body.vel={x:5,y:-2*f.p.outside};f.sim.t+=.05;
    predict(f);expect(memory(f).branch).toBe('post');expect(memory(f).evidence).toBe('motion');
  });
  it('releases from its own expectation even when the unseen actual receiver chose a different route',()=>{
    const a=fixture(),b=fixture();view(a,true,false);view(b,true,false);
    const launch=(f:ReturnType<typeof fixture>,mutate:boolean)=>{
      const ev={target:f.r,point:{...predict(f),z:1.3},T:1,P:.7,intRisk:0,value:14,depth:14};
      Reflect.get(f.qb,'startThrow').call(f.qb,f.sim.qb,f.sim,ev);
      if(mutate){f.runner.path=[{p:{x:90,y:50},s:1}];Reflect.set(f.runner,'optionDecision',{branch:'post'});}
      f.sim.t+=.25;Reflect.get(f.qb,'release').call(f.qb,f.sim.qb,f.sim,ev);
      return f.sim.ball;
    };
    expect(launch(a,false)).toMatchObject({kind:'air'});
    const bball=launch(b,true);expect(bball).toMatchObject({kind:'air'});
    if(a.sim.ball.kind==='air'&&bball.kind==='air')expect(bball.flight).toEqual(a.sim.ball.flight);
    expect({...a.sim.rng}).toEqual({...b.sim.rng});
  });
  it('continues an acquired post leg instead of forecasting a return toward its old stem',()=>{
    const f=fixture(),picture={...pic(53,f.p.origin.y-2*f.p.outside,6,-3*f.p.outside),facing:0};
    const point=predictMiddle(f.p,'post',picture,f.r.profile,1.2);
    expect(point.x).toBeGreaterThan(picture.pos.x);expect(-(point.y-picture.pos.y)*f.p.outside).toBeGreaterThan(1);
    expect(Math.hypot(point.x-picture.pos.x,point.y-picture.pos.y)).toBeLessThan(f.r.profile.vmax*1.2);
  });
});
