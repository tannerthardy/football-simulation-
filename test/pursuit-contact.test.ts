import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PassProtector, ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';
import { chase, pursuitPoint } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import { inBlockReach, traits } from '../src/sim/engagement.js';
import { tryTackles, updateBond } from '../src/sim/tackle.js';

function make(run=false) {
  return new PlaySim({offense:pickOffense(generateTeam(new Rng(11),'O','OFF'),'11'),
    defense:pickDefense(generateTeam(new Rng(12),'D','DEF'),'base43'),
    offCall:run?{formation:FORMATION_BY_ID.ace_11,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'test'}:
      {formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.smash,label:'test'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'test'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:77});
}
function observe(sim:PlaySim){for(let i=0;i<24;i++)sim.perception.record(sim.agents);}
function stage() {
  const sim=make(),c=sim.slot('Z')!,d=sim.slot('FS')!;
  for(const a of sim.agents){a.body.pos={x:5+a.idx*.1,y:1+a.idx*2};a.body.vel={x:0,y:0};a.downUntil=99;a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})};}
  c.downUntil=d.downUntil=-1;sim.t=2;sim.ball={kind:'held',carrier:c};sim.catchAt=0;
  c.body.pos={x:50,y:CENTER_Y};d.body.pos={x:58,y:CENTER_Y+4};
  return {sim,c,d};
}

describe('pursuit from observed movement',()=>{
  it('does not project a stationary quarterback into a full-speed run',()=>{
    const sim=make(),qb=sim.qb,d=sim.slot('FS')!;
    qb.body.vel={x:0,y:0};observe(sim);
    expect(pursuitPoint(sim,d,qb).x).toBeCloseTo(qb.pos.x,8);
  });
  it('does not square up several yards away on an oblique interception',()=>{
    const {sim,c,d}=stage();d.body.pos.x=55;c.body.vel={x:8,y:0};d.body.vel={x:0,y:0};observe(sim);
    const cmd=chase(sim,d,c);
    // Maintain a sprint angle; the old breakdown branch requested ~3 yd/s.
    expect(Math.hypot(cmd.vel.x,cmd.vel.y)).toBeGreaterThan(d.profile.vmax*.9);
  });
  it('uses perceived movement even if the unseen current carrier state changes',()=>{
    const {sim,c,d}=stage();c.body.vel={x:6,y:0};observe(sim);
    const before=chase(sim,d,c);
    c.body.pos={x:80,y:5};c.body.vel={x:0,y:-8};
    expect(chase(sim,d,c)).toEqual(before);
  });
  it.each([-1,1])('closes the sideline shade into tackle reach, side=%s',(side)=>{
    const {sim,c,d}=stage();
    c.body.pos={x:50,y:side===1?49:4};c.body.vel={x:6,y:0};
    d.body.pos={x:49,y:c.pos.y-side*.8};d.body.vel={x:7,y:0};observe(sim);
    const p=pursuitPoint(sim,d,c);
    expect(Math.abs(p.y-c.pos.y)).toBeLessThan(d.profile.reach*.5);
  });
});

describe('run support and rejected strikes',()=>{
  it('a deep safety who reads run executes the cap before the back crosses the line',()=>{
    const sim=make(true),s=sim.slot('FS')!;
    s.recog!.read='run';s.body.pos={x:50,y:CENTER_Y};observe(sim);
    const fit=s.behavior.update(s,sim);
    s.recog!.read='unsure';const coverage=s.behavior.update(s,sim);
    expect(fit.vel.x).toBeLessThan(-1);
    expect(coverage.vel.x).toBeGreaterThan(0);
  });
  it('a rejected near-shoulder punch keeps the protector moving',()=>{
    const sim=make(),b=sim.slot('LT')!,r=sim.slot('DE_W')!;
    const coord=new ProtectionCoordinator();const behavior=new PassProtector(coord);
    const body=b.profile.radius+r.profile.radius,arm=b.player.measurables.armIn/36;
    const reach=body+.1+arm*.85,punch=body+.1+arm*.55+.3+.3*traits(b).feet;
    expect(punch).toBeGreaterThan(reach);
    const distance=(reach+punch)/2;
    b.body.pos={x:37,y:CENTER_Y-4};r.body.pos={x:36.8,y:b.pos.y-Math.sqrt(distance**2-.2**2)};r.body.vel={x:-6,y:0};
    coord.add(b);
    for(const d of sim.defense)if(d!==r)d.downUntil=99;
    b.behavior=behavior;
    coord.update(sim);expect(coord.assigned.get(b)).toBe(r);
    expect(inBlockReach(b,r,'pass')).toBe(false);
    const engage=vi.spyOn(sim,'engage');
    const cmd=behavior.update(b,sim);
    expect(engage).toHaveBeenCalled();
    expect(Math.hypot(cmd.vel.x,cmd.vel.y)).toBeGreaterThan(.5);
  });
});

describe('physical tackle contact',()=>{
  it('a wrap conserves two-axis momentum and cannot create kinetic energy',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+.8};c.body.vel={x:8,y:1};d.body.vel={x:0,y:-2};
    const momentum=()=>({x:c.vel.x*c.profile.massKg+d.vel.x*d.profile.massKg,y:c.vel.y*c.profile.massKg+d.vel.y*d.profile.massKg});
    const energy=()=>.5*(c.profile.massKg*c.speed**2+d.profile.massKg*d.speed**2);
    const before=momentum(),kinetic=energy();vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    expect(momentum().x).toBeCloseTo(before.x,8);expect(momentum().y).toBeCloseTo(before.y,8);
    expect(energy()).toBeLessThanOrEqual(kinetic);expect(c.vel).toEqual(d.vel);
  });
  it('a wrapped defender releases his block and cannot join a second constraint',()=>{
    const {sim,c,d}=stage(),b=sim.slot('C')!;
    d.body.pos={x:50,y:CENTER_Y+.7};b.body.pos={x:49.7,y:CENTER_Y+.7};b.downUntil=-1;
    const block=sim.engage(b,d,'run',{x:1,y:0})!;block.win=.8;
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);tryTackles(sim);
    expect(sim.bond?.tacklers).toContain(d);expect(d.engagement).toBeNull();expect(b.engagement).toBeNull();
    expect(sim.engage(b,d,'run',{x:1,y:0})).toBeNull();
  });
  it('a moving pile carries its trailing tackler along before closing the grasp',()=>{
    const {sim,c,d}=stage();d.body.pos={x:49,y:CENTER_Y};c.body.vel=d.body.vel={x:8,y:0};
    sim.bond={carrier:c,tacklers:[d],start:sim.t,progressX:c.pos.x,down:false};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    const centre=()=> (c.pos.x*c.profile.massKg+d.pos.x*d.profile.massKg)/(c.profile.massKg+d.profile.massKg);
    const start=c.pos.x-d.pos.x,oldCentre=centre();updateBond(sim,sim.bond,[{vel:{x:8,y:0}}]);
    expect(c.pos.x-d.pos.x).toBeCloseTo(start-4.5*sim.dt,8);
    expect(centre()-oldCentre).toBeCloseTo(c.vel.x*sim.dt,8);
  });
  it('an arriving assist shares momentum with the whole existing pile',()=>{
    const {sim,c,d}=stage(),assist=sim.slot('SS')!;
    d.body.pos={x:50,y:CENTER_Y+.8};c.body.vel={x:8,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);tryTackles(sim);
    assist.downUntil=-1;assist.body.pos={x:c.pos.x,y:c.pos.y-.8};assist.body.vel={x:0,y:2};
    const bodies=[c,d,assist];
    const momentum=()=>({x:bodies.reduce((s,a)=>s+a.profile.massKg*a.vel.x,0),y:bodies.reduce((s,a)=>s+a.profile.massKg*a.vel.y,0)});
    const before=momentum();tryTackles(sim);
    expect(sim.bond?.tacklers).toEqual([d,assist]);
    expect(momentum().x).toBeCloseTo(before.x,8);expect(momentum().y).toBeCloseTo(before.y,8);
  });
  it('a whiff at full reach neither records contact nor slows the carrier',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+1.4};c.body.vel={x:8,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(true);
    tryTackles(sim);
    expect(sim.stats.missedTackles).toBe(1);expect(sim.firstContactX).toBeNull();expect(c.vel.x).toBe(8);
  });
  it('takes a glancing opportunity instead of waiting for unreachable better contact',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+1.4};c.body.vel={x:8,y:2};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);
    expect(sim.bond?.tacklers).toContain(d);expect(sim.firstContactX).toBe(50);
    expect(sim.events.some((e)=>e.type==='tackle_wrap')).toBe(true);
  });
  it('waits for body contact when a head-on carrier is still closing',()=>{
    const {sim,c,d}=stage();d.body.pos={x:51.4,y:CENTER_Y};c.body.vel={x:8,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond).toBeNull();expect(d.nextTackleAt).toBe(0);
  });
  it('a grab at full reach couples only partly, still conserving momentum',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+1.4};c.body.vel={x:8,y:2};d.body.vel={x:0,y:0};
    const momentum=()=>({x:c.vel.x*c.profile.massKg+d.vel.x*d.profile.massKg,y:c.vel.y*c.profile.massKg+d.vel.y*d.profile.massKg});
    const energy=()=>.5*(c.profile.massKg*c.speed**2+d.profile.massKg*d.speed**2);
    const before=momentum(),kinetic=energy();vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    expect(sim.bond!.grip!.get(d)!).toBeLessThan(.6);
    expect(c.vel.x).toBeGreaterThan(d.vel.x);
    expect(momentum().x).toBeCloseTo(before.x,8);expect(momentum().y).toBeCloseTo(before.y,8);
    expect(energy()).toBeLessThanOrEqual(kinetic);
  });
  it('a carrier dragging a tackler from behind keeps gaining ground before he goes down',()=>{
    const {sim,c,d}=stage();d.body.pos={x:49.4,y:CENTER_Y};c.body.vel=d.body.vel={x:5,y:0};
    sim.bond={carrier:c,tacklers:[d],start:sim.t,progressX:c.pos.x,down:false,grip:new Map([[d,1]]),topple:0,toppleRate:1,stalled:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    let ticks=0;
    while(sim.bond&&!sim.bond.down&&ticks<200){updateBond(sim,sim.bond,[...sim.agents.map(()=>({vel:{x:0,y:0}})).fill({vel:{x:7,y:0}},c.idx,c.idx+1)]);sim.t+=sim.dt;ticks++;}
    expect(ticks*sim.dt).toBeGreaterThan(.5);
    expect(sim.endSpot!.x-50).toBeGreaterThan(1.5);
  });
  it('rules forward progress stopped when a squared-up pile stops gaining ground',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50.6,y:CENTER_Y};c.body.vel=d.body.vel={x:0,y:0};
    sim.bond={carrier:c,tacklers:[d],start:sim.t,progressX:c.pos.x,down:false,grip:new Map([[d,1]]),topple:0,toppleRate:.01,stalled:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    let ticks=0;
    while(sim.bond&&!sim.bond.down&&ticks<200){updateBond(sim,sim.bond,sim.agents.map(()=>({vel:{x:0,y:0}})));sim.t+=sim.dt;ticks++;}
    expect(ticks*sim.dt).toBeGreaterThan(.6);expect(ticks*sim.dt).toBeLessThan(1.2);
    expect(Math.abs(sim.endSpot!.x-50)).toBeLessThan(.3);
  });
  it('records an opponent body bump even when that defender cannot attempt a tackle',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50.3,y:CENTER_Y};d.nextTackleAt=99;
    observe(sim);sim.tick();
    expect(sim.firstContactX).not.toBeNull();expect(sim.bond).toBeNull();
    expect(sim.events.some((e)=>e.type==='carrier_contact')).toBe(true);
  });
});
