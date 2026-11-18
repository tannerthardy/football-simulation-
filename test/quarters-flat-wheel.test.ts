import { describe, expect, it, vi, afterAll } from 'vitest';
// engine-80 (pinned test-only, Rules + Coaching's coverage landing): the scenes stage Palms against an attached #2; QUARTERS_CHECK installs MOD there. The file's owner to re-record with the rule on.
vi.hoisted(() => { process.env.QUARTERS_CHECK = '0'; });
afterAll(() => { delete process.env.QUARTERS_CHECK; });
import { Rng } from '../src/core/rng.js';
import { stepBody } from '../src/physics/kinematics.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { playBall, sawThrow } from '../src/sim/behaviors/defense.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense=generateTeam(new Rng(401),'Flat offense','FWO',{strength:.6});
const defense=generateTeam(new Rng(402),'Flat defense','FWD',{strength:.6});
function stage(coverage='cover4',flip=false) {
  const sim=new PlaySim({offense:pickOffense(offense,'11'),defense:pickDefense(defense,'nickel'),seed:41,
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip,kind:'pass',pass:PASS_BY_ID.four_verts,label:'acquired flat'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[coverage],pressure:null,zoneStyle:'match',label:coverage},
    los:40,ballY:26,firstDownX:50,audibles:false});
  const r=sim.slot(sim.offAlign.numbering.W2!)!,one=sim.slot(sim.offAlign.numbering.W1!)!;
  const a=sim.defense.find(d=>d.behavior instanceof CoverageDefender&&d.behavior.zone==='curl_flat_w')!;
  const b=a.behavior as CoverageDefender,out=Math.sign(r.pos.y-sim.ballY),startY=r.pos.y;
  a.body.pos={x:46,y:startY-out*.7};a.body.vel={x:0,y:0};a.body.facing=Math.PI;
  for(const d of sim.defense)d.recog!.read='pass';
  const pictures=new Map(sim.agents.map(p=>[p.idx,{pos:{...p.pos},vel:{x:0,y:0},facing:p.facing,
    stance:null,pose:'up',carrying:false,age:.2} as Perceived]));
  sim.see=(_observer,target)=>pictures.get(target.idx)!;
  const update=(t:number)=>{sim.t=t;return b.update(a,sim);};
  const picture=(change:Partial<Perceived>)=>pictures.set(r.idx,{...pictures.get(r.idx)!,...change});
  const flat=()=>{
    update(.3);picture({pos:{x:42,y:startY+out*2},vel:{x:1,y:out*5}});update(.45);return update(.65);
  };
  const wheel=()=>{
    picture({pos:{x:46,y:startY+out*4},vel:{x:7,y:0}});update(1);update(1.2);
    picture({pos:{x:51,y:startY+out*4},vel:{x:7,y:0}});return update(1.4);
  };
  return {sim,r,one,a,b,out,startY,pictures,picture,update,flat,wheel};
}

describe('Quarters owns the acquired #2 flat and its possible wheel',()=>{
  it.each([false,true])('matches the confirmed flat from above using achieved movement, mirror=%s',flip=>{
    const f=stage('cover4',flip),command=f.flat();
    expect(f.b.recordedRule(.65).reads.find(r=>r.target===f.r.idx)?.release).toBe('flat');
    expect(f.b.job).toBe(`man:${f.r.slot}`);expect(f.b.target).toBe(f.r);
    expect(f.b.recordedMan()?.overTop).toBe(true);expect(command.vel.y*f.out).toBeGreaterThan(0);
    stepBody(f.a.body,command,.05);expect(f.a.vel.y*f.out).toBeGreaterThan(0);
    expect(f.a.pos.x).toBeGreaterThan(f.pictures.get(f.r.idx)!.pos.x);
  });
  it.each([false,true])('keeps the same relationship when a newly observed wheel turns up, mirror=%s',flip=>{
    const f=stage('cover4',flip);f.flat();const entry=f.b.recordedMan()?.initialCushion;
    const command=f.wheel();expect(f.b.job).toBe(`man:${f.r.slot}`);
    expect(f.b.recordedRule(1.4).reads.find(r=>r.target===f.r.idx)?.release).toBe('vertical');
    expect(f.b.recordedMan()?.initialCushion).toBe(entry);expect(command.vel.x).toBeGreaterThan(0);
  });
  it('responds to an ordinary continuing flat without requiring knowledge of a future wheel',()=>{
    const f=stage();f.flat();f.picture({pos:{x:42.5,y:f.startY+f.out*6},vel:{x:.5,y:f.out*5}});
    expect(f.update(.9).vel.y*f.out).toBeGreaterThan(0);expect(f.b.job).toBe(`man:${f.r.slot}`);
  });
  it.each([false,true])('ignores private routes and hidden motion while snapshots advance, mirror=%s',flip=>{
    const a=stage('cover4',flip),b=stage('cover4',flip);a.flat();b.flat();
    b.sim.offCall.pass=PASS_BY_ID.mesh;
    b.r.behavior={kind:'private continuation',update:()=>({vel:{x:-9,y:7}})};
    for(let i=0;i<5;i++){
      b.r.body.pos={x:80+i,y:4+i};b.r.body.vel={x:-9,y:7};
      a.sim.perception.record(a.sim.agents);b.sim.perception.record(b.sim.agents);
      expect(b.update(.7+i*.05)).toEqual(a.update(.7+i*.05));expect(b.sim.rng).toEqual(a.sim.rng);
      const before=structuredClone(b.sim.perception),rng=structuredClone(b.sim.rng);
      b.b.recordedRule(b.sim.t);b.b.recordedMan();
      expect(b.sim.perception).toEqual(before);expect(b.sim.rng).toEqual(rng);
    }
    expect(b.b.job).toBe(`man:${b.r.slot}`);
  });
  it.each(['under','block'] as const)('preserves the existing acquired %s disposition',release=>{
    const f=stage();f.update(.3);
    f.picture(release==='block'?{pos:{x:40.5,y:f.startY},vel:{x:1,y:0},stance:'low'}:
      {pos:{x:42,y:f.startY-f.out*2},vel:{x:1,y:-f.out*5}});
    f.update(.45);f.update(.65);
    expect(f.b.recordedRule(.65).reads.find(r=>r.target===f.r.idx)?.release).toBe(release);
    expect(f.b.job.startsWith('zone:')).toBe(true);
  });
  it('keeps the ordinary seam wall and earned depth delivery',()=>{
    const f=stage();f.update(.3);f.picture({pos:{x:44,y:f.startY},vel:{x:6,y:0}});f.update(.45);f.update(.65);
    expect(f.b.job).toBe(`wall:${f.r.slot}`);
    f.picture({pos:{x:51,y:f.startY},vel:{x:6,y:0}});f.update(.9);
    expect(f.b.job.startsWith('zone:')).toBe(true);
  });
  it('keeps Palms corner-trap / safety-replacement / apex-curl exchange separate',()=>{
    const f=stage('cover4_palms');f.flat();
    expect(f.b.job.startsWith('zone:')).toBe(true);
    for(const slot of ['CB_W','FS']){
      const a=f.sim.slot(slot)!,b=a.behavior as CoverageDefender;
      for(const t of [.3,.45,.65]){f.sim.t=t;b.update(a,f.sim);}
    }
    expect((f.sim.slot('CB_W')!.behavior as CoverageDefender).job).toBe(`trap:${f.r.slot}`);
    expect((f.sim.slot('FS')!.behavior as CoverageDefender).job).toBe(`man:${f.one.slot}`);
  });
  it('uses the installed Palms exchange despite hidden changes to the corner live choice',()=>{
    const a=stage('cover4_palms'),b=stage('cover4_palms');
    const corner=b.sim.slot('CB_W')!;corner.body.pos={x:80,y:2};corner.body.vel={x:-8,y:6};
    corner.behavior={kind:'hidden failed trap',update:()=>({vel:{x:-8,y:6}})};
    // Change the hidden choice before either apex makes its flat decision,
    // rather than checking only after a terminal curl branch is established.
    expect(b.flat()).toEqual(a.flat());
    a.sim.perception.record(a.sim.agents);b.sim.perception.record(b.sim.agents);
    expect(b.update(.8)).toEqual(a.update(.8));expect(b.b.job.startsWith('zone:')).toBe(true);
  });
  it('retains recognized reachable ball priority after the flat match',()=>{
    const f=stage();f.flat();f.sim.throwAt=.01;
    f.sim.ball={kind:'air',flight:{pos:{x:43,y:f.a.pos.y,z:2},vel:{x:20,y:0,z:-1},drag:0},
      thrower:f.sim.qb,target:f.r,releaseT:.01,releaseX:35,intended:{x:f.a.pos.x-.2,y:f.a.pos.y,z:1.2},
      arrivalT:f.sim.t+.1,deflected:false,throwaway:false}; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
    f.sim.ballPath=[{t:f.sim.t+.1,x:f.a.pos.x-.2,y:f.a.pos.y,z:1.2}];
    expect(sawThrow(f.a,f.sim,f.r)).toBe(true);
    const expected=playBall(f.a,f.sim,f.r);expect(f.update(.65)).toEqual(expected);expect(f.a.tags.has('onBall')).toBe(true);
  });
});
