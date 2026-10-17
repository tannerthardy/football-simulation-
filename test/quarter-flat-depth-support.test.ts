import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { World } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, playBall, runFit, sawThrow } from '../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { movementObjective } from '../src/sim/movement-objective.js';

const offense=generateTeam(new Rng(401),'Depth O','FDO',{strength:.6});
const defense=generateTeam(new Rng(402),'Depth D','FDD',{strength:.6});
function stage(flip=false,side:'S'|'W'='W') {
  const sim=new PlaySim({offense:pickOffense(offense,'11'),defense:pickDefense(defense,'nickel'),seed:41,
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip,kind:'pass',pass:PASS_BY_ID.four_verts,label:''},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover4,pressure:null,zoneStyle:'match',label:''},
    los:40,ballY:26,firstDownX:50,audibles:false});
  const zone=side==='W'?'curl_flat_w':'curl_flat_s';
  const a=sim.defense.find(d=>d.behavior instanceof CoverageDefender&&d.behavior.zone===zone)!;
  const b=a.behavior as CoverageDefender,r=sim.slot(sim.offAlign.numbering[`${side}2`]!)!,rb=sim.slot('RB')!;
  const out=Math.sign(r.pos.y-sim.ballY),startY=r.pos.y;
  a.body.pos={x:45,y:startY-out*.7};a.body.vel={x:0,y:0};a.body.facing=Math.PI;
  a.recog!.read='pass';
  const pictures=new Map(sim.agents.map(p=>[p.idx,{pos:{...p.pos},vel:{x:0,y:0},facing:p.facing,
    stance:null,pose:'up',carrying:false,age:.2} as Perceived]));
  sim.see=(_observer,target)=>pictures.get(target.idx)!;
  const picture=(target:typeof r,change:Partial<Perceived>)=>pictures.set(target.idx,{...pictures.get(target.idx)!,...change});
  const update=(t:number)=>{sim.t=t;return b.update(a,sim);};
  const flat=()=>{update(.3);picture(r,{pos:{x:41,y:startY+out*2},vel:{x:1,y:out*5}});update(.45);return update(.65);};
  return {sim,a,b,r,rb,out,startY,pictures,picture,update,flat};
}

describe('quarter-flat widens from above and retains installed support',()=>{
  it.each([false,true])('keeps useful achieved cushion while widening with an acquired flat, mirror=%s',flip=>{
    const f=stage(flip),world=new World([f.a.body]);f.flat();
    const entry=f.b.recordedMan()!.initialCushion;
    for(let k=0;k<16;k++) {
      f.picture(f.r,{pos:{x:41+.05*k,y:f.startY+f.out*(2+.25*k)},vel:{x:1,y:f.out*5}});
      const report=world.step([f.update(.7+.05*k)],.05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    }
    expect(f.a.pos.x-f.pictures.get(f.r.idx)!.pos.x).toBeGreaterThan(2.5);
    expect(f.a.vel.y*f.out).toBeGreaterThan(0);
    expect(f.b.recordedMan()?.initialCushion).toBe(entry);
    f.picture(f.r,{pos:{x:47,y:f.startY+f.out*5},vel:{x:7,y:0}});
    f.update(1.6);const wheel=f.update(1.8);
    expect(wheel.vel.x).toBeGreaterThan(0);
    expect(f.b.job).toBe(`man:${f.r.slot}`);
    expect(f.b.recordedMan()?.initialCushion).toBe(entry);
  });

  it('requests a coherent moving cushion as the acquired receiver advances',()=>{
    const f=stage();f.flat();
    const goal=(x:number,t:number)=>{
      f.picture(f.r,{pos:{x,y:f.startY+f.out*3},vel:{x:1,y:f.out*5},facing:Math.atan2(f.out*5,1)});
      const p=movementObjective(f.update(t));
      if(p?.kind!=='moving'||!p.velocity)throw Error('Missing acquired moving objective');
      return p;
    };
    const a=goal(41.4,.8),b=goal(41.45,.85);
    expect(b.point.x).toBeGreaterThan(a.point.x);
    expect((b.point.x-a.point.x)/.05).toBeCloseTo(a.velocity!.x,6);
    expect(a.point.x-41.4).toBeGreaterThan(2.5);
  });

  it('uses no future wheel, hidden receiver motion or private call to set depth',()=>{
    const a=stage(),b=stage();a.flat();b.flat();
    for(let k=0;k<4;k++){
      b.r.body.pos={x:80+k,y:2+k};b.r.body.vel={x:-8,y:7};
      b.r.behavior={kind:'private wheel',update:()=>({vel:{x:9,y:0}})};
      b.sim.offCall.pass=PASS_BY_ID.mesh;
      a.sim.perception.record(a.sim.agents);b.sim.perception.record(b.sim.agents);
      expect(b.update(.7+k*.05)).toEqual(a.update(.7+k*.05));
      expect(b.sim.rng).toEqual(a.sim.rng);
    }
    expect(b.b.recordedMan()?.initialCushion).toBe(a.b.recordedMan()?.initialCushion);
    expect(b.b.recordedMan()?.topDownFlat).toBe(true);
  });

  it('closes on an acquired carrying receiver behind the line without requiring hidden confirmation',()=>{
    const f=stage(),unknown=stage();f.flat();unknown.flat();
    f.picture(f.r,{pos:{x:39,y:f.startY+f.out*3},vel:{x:1,y:f.out*5},carrying:true});
    unknown.picture(unknown.r,{pos:{x:39,y:unknown.startY+unknown.out*3},vel:{x:1,y:unknown.out*5},carrying:null});
    // Reality still holds the ball with QB: the defender acts on his picture.
    const command=f.update(.7);
    expect(command.vel.x).toBeLessThan(0);
    expect(command.vel.x).toBeLessThan(unknown.update(.7).vel.x);
    new World([f.a.body]).step([command],.05);
    expect(f.a.pos.x).toBeLessThan(45);
  });

  it('does not release prethrow cushion for a hidden catch behind the line',()=>{
    const a=stage(),b=stage();a.flat();b.flat();
    for(const f of [a,b])f.picture(f.r,{pos:{x:39,y:f.startY+f.out*3},vel:{x:1,y:f.out*5},carrying:null});
    b.sim.ball={kind:'held',carrier:b.r};b.sim.catchAt=.5;
    expect(b.update(.7)).toEqual(a.update(.7));
    const command=b.update(.75);
    expect(command).toEqual(a.update(.75));
    expect(movementObjective(command)!.point.x-39).toBeGreaterThan(2.5);
  });

  it.each(['S','W'] as const)('preserves the installed %s-side force, including its inside option',side=>{
    for(const outside of [false,true]) {
      const f=stage(false,side),control=stage(false,side);f.flat();control.flat();
      for(const s of [f,control]){
        expect(s.a.runFit?.kind).toBe('force');
        s.a.recog!.read='run';s.picture(s.rb,{pos:{x:36.8,y:outside?s.startY+s.out*4:26+s.out},
          vel:{x:1.2,y:s.out*1.85},carrying:true});
      }
      const fit=structuredClone(f.a.runFit),command=f.update(.7);
      control.sim.t=.7;
      expect(command).toEqual(runFit(control.a,control.sim,'B',control.out,
        {target:control.rb,cue:control.pictures.get(control.rb.idx)!}));
      expect(f.a.runFit).toEqual(fit);
      expect(f.b.job).toBe(`man:${f.r.slot}`);
      const report=new World([f.a.body]).step([command],.05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(f.a.body.support!.state).toBe('up');
    }
  });

  it('keeps the same keyed force under hidden possession/motion while reality snapshots advance',()=>{
    const a=stage(),b=stage();a.flat();b.flat();
    for(const f of [a,b]){f.a.recog!.read='run';f.picture(f.rb,{pos:{x:36.8,y:26},vel:{x:1,y:2},carrying:true});}
    for(let k=0;k<4;k++){
      b.sim.ball={kind:'held',carrier:b.rb};b.sim.handoffAt=.4;b.sim.isPass=false;
      b.rb.body.pos={x:80+k,y:3+k};b.rb.body.vel={x:-9,y:8};
      a.sim.perception.record(a.sim.agents);b.sim.perception.record(b.sim.agents);
      expect(b.update(.7+k*.05)).toEqual(a.update(.7+k*.05));expect(b.sim.rng).toEqual(a.sim.rng);
    }
  });

  it('does not turn run belief alone or unknown/negative carrying into permission to abandon coverage',()=>{
    for(const read of ['run','pass','unsure'] as const)for(const carrying of [false,null,undefined]){
      const a=stage(),b=stage();a.flat();b.flat();
      a.a.recog!.read=b.a.recog!.read=read;
      a.picture(a.rb,{carrying});b.picture(b.rb,{carrying});
      b.a.runFit!.kind='cutback'; // Opposing unchanged man path, outside the new force contract.
      expect(a.update(.7)).toEqual(b.update(.7));
    }
  });

  it('releases acquired force when possession evidence expires or run belief changes',()=>{
    for(const stop of ['picture','belief'] as const){
      const f=stage(),control=stage();f.flat();control.flat();
      for(const s of [f,control]){s.a.recog!.read='run';s.picture(s.rb,{carrying:true});s.update(.7);}
      if(stop==='picture')for(const s of [f,control])s.picture(s.rb,{carrying:null});
      else f.a.recog!.read=control.a.recog!.read='pass';
      control.a.runFit!.kind='cutback';
      expect(f.update(.8)).toEqual(control.update(.8));
    }
  });

  it('preserves force through unrecognized flight and yields to a recognized reachable contest',()=>{
    const held=stage(),air=stage();held.flat();air.flat();
    for(const f of [held,air]){f.a.recog!.read='run';f.picture(f.rb,{carrying:true});}
    air.sim.throwAt=.7;air.sim.t=.7;
    air.sim.ball={kind:'air',flight:{pos:{x:43,y:air.a.pos.y,z:2},vel:{x:20,y:0,z:-1},drag:0},
      thrower:air.sim.qb,target:air.r,releaseT:.7,releaseX:35,intended:{x:45,y:air.a.pos.y,z:1.2},
      arrivalT:.8,deflected:false,throwaway:false};
    air.sim.ballPath=[{t:.8,x:44.8,y:air.a.pos.y,z:1.2}];
    expect(sawThrow(air.a,air.sim,air.r)).toBe(false);
    expect(air.update(.7)).toEqual(held.update(.7));
    air.sim.throwAt=.01;air.a.tags.add('looking');
    expect(sawThrow(air.a,air.sim,air.r)).toBe(true);
    const expected=playBall(air.a,air.sim,air.r);
    expect(air.update(.7)).toEqual(expected);expect(air.a.tags.has('onBall')).toBe(true);
  });

  it('leaves the ordinary over-top man objective separate from quarter-flat depth',()=>{
    const f=stage();f.picture(f.r,{pos:{x:41,y:f.startY+f.out*2},vel:{x:1,y:f.out*5}});
    const ordinary=new ManCoverage(f.a,f.sim,f.r,false,'B',f.out,{lev:'inside',overTop:true,
      initialPosition:{...f.pictures.get(f.r.idx)!.pos}});
    expect(ordinary.update(f.a,f.sim).vel.x).toBeLessThan(0);
    expect(ordinary.recordedTechnique().topDownFlat).toBeUndefined();
  });
});
