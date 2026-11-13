import { describe, expect, it, vi } from 'vitest';
// SAFETY_TEMPO (default on) holds the deep safety's depth until the back
// declares, as tracked; the cap case checks the installed cap it replaces.
vi.hoisted(() => { process.env.SAFETY_TEMPO = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PassProtector, ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';
import { chase, pursuitPoint } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';
import { inBlockReach, traits } from '../src/sim/engagement.js';
import { afterStep as afterTackleStep, gripForce, tryTackles, updateBond } from '../src/sim/tackle.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

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
  it('does not move the perceived intercept behind the runner merely because pursuit skill is lower',()=>{
    const low=stage(),high=stage();
    expect(low.d.profile).toEqual(high.d.profile);
    expect(low.d.body).toEqual(high.d.body);
    const points=[low,high].map(({sim,c,d},i)=>{
      c.body.vel={x:6,y:0};
      // A physically consistent straight-running history. Delayed perception
      // dead-reckons it; the defender does not receive the live target state.
      for(let k=0;k<24;k++){
        const age=(23-k)*sim.dt;
        sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*age,y:a.pos.y-a.vel.y*age},
          vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})));
      }
      const rng=sim.rng.fork('zero-aim-error');
      vi.spyOn(rng,'normal').mockReturnValue(0);
      vi.spyOn(sim.rng,'fork').mockReturnValue(rng);
      d.player.ratings.pursuit=i===0?10:90;
      return pursuitPoint(sim,d,c);
    });
    expect(points[0]).toEqual(points[1]);
    expect(points[0].x).toBeGreaterThan(low.c.pos.x);
  });
  it('keeps imperfect aiming on either side of the intercept without drawing a new error every tick',()=>{
    const points=[-.1,0,.1].map(error=>{
      const {sim,c,d}=stage();c.body.vel={x:6,y:0};observe(sim);
      const rng=sim.rng.fork('aim-error');
      const draw=vi.spyOn(rng,'normal').mockReturnValue(error);
      vi.spyOn(sim.rng,'fork').mockReturnValue(rng);
      const first=pursuitPoint(sim,d,c);
      expect(pursuitPoint(sim,d,c)).toEqual(first);
      expect(draw).toHaveBeenCalledTimes(1);
      return first;
    });
    expect(points[0].x).toBeGreaterThan(points[1].x);
    expect(points[2].x).toBeLessThan(points[1].x);
  });
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
  it('controls cross-body closure instead of asking for a full-speed fly-by',()=>{
    for(const side of [-1,1]){
      const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+side*1.4};
      c.body.vel={x:6,y:0};d.body.vel={x:7,y:0};observe(sim);
      const profile={...d.profile};
      const look=(.12+.12*(1-d.r('awareness')))/Math.max(.1,d.profile.reactionTime);
      const seen=sim.see(d,c,look),dx=seen.pos.x-d.pos.x,dy=seen.pos.y-d.pos.y,dist=Math.hypot(dx,dy);
      const ux=dx/dist,uy=dy/dist;
      d.player.ratings.tackling=99;const controlled=chase(sim,d,c);
      d.player.ratings.tackling=1;const aggressive=chase(sim,d,c);
      // Both track the same runner on the same body. Better control asks
      // for less relative closure, without reducing the body's capacity.
      for(const cmd of [controlled,aggressive]){
        expect((cmd.vel.x-seen.vel.x)*-uy+(cmd.vel.y-seen.vel.y)*ux).toBeCloseTo(0,8);
      }
      const closure=(cmd:typeof controlled)=>(cmd.vel.x-seen.vel.x)*ux+(cmd.vel.y-seen.vel.y)*uy;
      expect(closure(controlled)).toBeLessThan(closure(aggressive));
      expect(Math.hypot(controlled.vel.x,controlled.vel.y)).toBeLessThan(d.profile.vmax);
      expect(d.profile).toEqual(profile);
    }
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
    sim.t=b.snapReadyAt;
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
  const FREE={vel:{x:0,y:0},free:true};
  const stepFree=(sim:PlaySim,n=1)=>{for(let k=0;k<n;k++){sim.world.time=sim.t;sim.world.step(sim.agents.map(()=>FREE),sim.dt);sim.t+=sim.dt;}};
  const totals=(bs:Agent[])=>({x:bs.reduce((s,a)=>s+a.profile.massKg*a.vel.x,0),y:bs.reduce((s,a)=>s+a.profile.massKg*a.vel.y,0),
    ke:bs.reduce((s,a)=>s+.5*a.profile.massKg*a.speed**2,0)});
  it('a wrap acts through the world: momentum is conserved and a passive hold adds no kinetic energy',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+.8};c.body.vel={x:8,y:1};d.body.vel={x:0,y:-2};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    // The grab itself changes no velocity; the hold acts in the next steps.
    const hold=sim.bond!.holds!.get(d)!;hold.pull=0;
    for(let k=0;k<6;k++){
      const prev=totals([c,d]),pe=sim.world.contactEnergy();
      sim.world.time=sim.t;const r=sim.world.step(sim.agents.map(()=>FREE),sim.dt);sim.t+=sim.dt;
      const now=totals([c,d]),g=[c,d].map((a)=>r.groundImpulse[a.idx]),work=r.groundWork[c.idx]+r.groundWork[d.idx];
      // Only the ground (a body that falls slides on it) changes the momentum.
      expect(now.x-prev.x).toBeCloseTo(g[0].x+g[1].x,6);expect(now.y-prev.y).toBeCloseTo(g[0].y+g[1].y,6);
      expect(now.ke+sim.world.contactEnergy()).toBeLessThanOrEqual(prev.ke+pe+Math.max(0,work)+1e-6);
    }
    // The hold has taken a share of the carrier's motion.
    expect(d.vel.x).toBeGreaterThan(.5);
  });
  it('a defender who grabs from inside a block holds with one arm and stays blocked (ONE_ARM_HOLD)',()=>{
    // The blocker's hands stay on him because he chose to tackle: one hand on
    // the runner, no locked wrap, and no second block on the same pair.
    const {sim,c,d}=stage(),b=sim.slot('C')!;
    d.body.pos={x:50,y:CENTER_Y+.7};b.body.pos={x:49.7,y:CENTER_Y+.7};b.downUntil=-1;
    const block=sim.engage(b,d,'run',{x:1,y:0})!;block.win=.8;
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);tryTackles(sim);
    expect(sim.bond?.tacklers).toContain(d);expect(d.engagement).toBe(block);expect(b.engagement).toBe(block);
    expect(sim.bond!.oneArm?.has(d)).toBe(true);
    expect(sim.bond!.holds!.get(d)!.capacity).toBeCloseTo(gripForce(d,sim.bond!.grip!.get(d)!,0,1),6);
    expect(sim.bond!.holds!.get(d)!.capacity).toBeLessThan(gripForce(d,sim.bond!.grip!.get(d)!));
    expect(sim.engage(b,d,'run',{x:1,y:0})).toBeNull();
    void c;
  });
  it('a moving wrap advects with its momentum; the arms tighten it only at their own rate',()=>{
    const {sim,c,d}=stage();d.body.pos={x:49.3,y:CENTER_Y};c.body.vel=d.body.vel={x:8,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    const pull=sim.bond!.holds!.get(d)!.pull??0;
    const mass=c.profile.massKg+d.profile.massKg;
    const centre=()=>(c.pos.x*c.profile.massKg+d.pos.x*d.profile.massKg)/mass;
    for(let k=0;k<4;k++){
      const gap=c.pos.x-d.pos.x,old=centre(),p0=totals([c,d]).x;
      sim.world.time=sim.t;const r=sim.world.step(sim.agents.map(()=>FREE),sim.dt);sim.t+=sim.dt;
      // Only the ground changes the pile's momentum (a body that falls slides
      // on it); the centre advects with that momentum.
      const g=r.groundImpulse[c.idx].x+r.groundImpulse[d.idx].x;
      expect(totals([c,d]).x-p0).toBeCloseTo(g,6);
      expect(centre()-old).toBeCloseTo((p0+0.5*g)/mass*sim.dt,2);
      expect(gap-(c.pos.x-d.pos.x)).toBeLessThanOrEqual(pull*sim.dt+1e-6);
    }
  });
  it('an arriving assist joins the existing pile without changing its momentum',()=>{
    const {sim,c,d}=stage(),assist=sim.slot('SS')!;
    d.body.pos={x:50,y:CENTER_Y+.8};c.body.vel={x:8,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);tryTackles(sim);
    assist.downUntil=-1;assist.body.pos={x:c.pos.x,y:c.pos.y-.8};assist.body.vel={x:0,y:2};
    const bodies=[c,d,assist];
    const before=totals(bodies);tryTackles(sim);
    expect(sim.bond?.tacklers).toEqual([d,assist]);
    expect(totals(bodies).x).toBeCloseTo(before.x,6);expect(totals(bodies).y).toBeCloseTo(before.y,6);
    for(let k=0;k<3;k++){
      const prev=totals(bodies);
      sim.world.time=sim.t;const r=sim.world.step(sim.agents.map(()=>FREE),sim.dt);sim.t+=sim.dt;
      // Internal grasp/contact forces cancel. A member who falls can still
      // exchange momentum with turf even when locomotion is disabled.
      const g=bodies.reduce((s,a)=>({x:s.x+r.groundImpulse[a.idx].x,y:s.y+r.groundImpulse[a.idx].y}),{x:0,y:0});
      expect(totals(bodies).x-prev.x).toBeCloseTo(g.x,6);expect(totals(bodies).y-prev.y).toBeCloseTo(g.y,6);
    }
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
    // This staged slice has not run a decision tick. Supply its actual held
    // standing command and a consistent incoming history, as native ticks do.
    sim.intents[d.idx]={vel:{x:0,y:0},facing:d.facing};
    for(let k=0;k<24;k++){
      const lag=(23-k)*sim.dt;
      sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},
        vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})));
    }
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond).toBeNull();expect(d.nextTackleAt).toBe(0);
  });
  it('a grab at full reach couples only partly, still conserving momentum',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50,y:CENTER_Y+1.4};c.body.vel={x:8,y:2};d.body.vel={x:0,y:0};
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    expect(sim.bond!.grip!.get(d)!).toBeLessThan(.6);
    const before=totals([c,d]);
    stepFree(sim,4);
    expect(c.vel.x).toBeGreaterThan(d.vel.x+2);
    expect(totals([c,d]).x).toBeCloseTo(before.x,6);expect(totals([c,d]).y).toBeCloseTo(before.y,6);
  });
  const park=(sim:PlaySim,keep:Agent[])=>{for(const a of sim.agents)if(!keep.includes(a))a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})} as never;};
  it('a carrier dragging a tackler from behind keeps gaining ground before he goes down',()=>{
    const {sim,c,d}=stage();d.body.pos={x:49.4,y:CENTER_Y};c.body.vel=d.body.vel={x:5,y:0};
    park(sim,[]);c.behavior={kind:'carrier',update:()=>({vel:{x:7,y:0}})} as never;
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);observe(sim);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    const t0=sim.t;
    while(sim.phase==='live'&&sim.t<t0+6)sim.tick();
    expect(sim.phase).toBe('dead');
    // He is carried forward by his momentum through the fall.
    expect(sim.t-t0).toBeGreaterThan(.4);
    expect(sim.endSpot!.x-50).toBeGreaterThan(1.5);
  });
  it('rules forward progress stopped for a held stationary carrier still on his feet',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50.6,y:CENTER_Y};c.body.vel=d.body.vel={x:0,y:0};d.body.facing=Math.PI;
    park(sim,[]);observe(sim);
    vi.spyOn(sim.rng,'chance').mockReturnValue(false);
    tryTackles(sim);expect(sim.bond?.tacklers).toContain(d);
    const t0=sim.t;
    // Isolate officiating from the world: an active pull can physically
    // knock this carrier down first, which exercises a different rule.
    while(sim.phase==='live'&&sim.t<t0+2){
      afterTackleStep(sim);
      sim.t+=sim.dt;
      updateBond(sim,sim.bond!,sim.agents.map(()=>({vel:{x:0,y:0}})));
    }
    expect(c.body.support!.state).toBe('up');expect(sim.phase).toBe('dead');
    expect(sim.t-t0).toBeGreaterThan(.6);expect(sim.t-t0).toBeLessThan(1.2);
    expect(Math.abs(sim.endSpot!.x-50)).toBeLessThan(.3);
  });
  it('records an opponent body bump even when that defender cannot attempt a tackle',()=>{
    const {sim,c,d}=stage();d.body.pos={x:50.3,y:CENTER_Y};d.nextTackleAt=99;
    observe(sim);sim.tick();
    expect(sim.firstContactX).not.toBeNull();expect(sim.bond).toBeNull();
    expect(sim.events.some((e)=>e.type==='carrier_contact')).toBe(true);
  });
});
