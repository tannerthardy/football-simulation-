import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { bodyRadius } from '../src/physics/bodyshape.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier, runReadAim, type CarrierOptions } from '../src/sim/behaviors/carrier.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const home=generateTeam(new Rng(31),'Entry offense','O',{strength:.55});
const away=generateTeam(new Rng(32),'Entry defense','D',{strength:.55});
const slots=['LT','LG','C','RG','RT'] as const;

/** Same bodies and support on both sides. Only the requested traffic picture
 * changes; World, not the test, advances the runner or resolves contact. */
function setup(mirror=false,velocity=2) {
  const sim=new PlaySim({offense:pickOffense(home,'11'),defense:pickDefense(away,'base43'),seed:3,
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'entry'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'c3'},
    los:40,ballY:CENTER_Y,firstDownX:50});
  for(const a of sim.agents) {
    a.body.pos={x:80+a.idx*3,y:5};a.body.vel={x:0,y:0};a.body.spin=0;
    a.behavior={kind:'parked',update:()=>stand()};
  }
  const back=sim.slot('RB')!,sign=mirror?-1:1;
  back.body.pos={x:38.2,y:CENTER_Y};back.body.vel={x:velocity,y:0};back.body.facing=0;
  const opts:CarrierOptions={aim:{x:40.6,y:CENTER_Y},aimUntil:0,run:{scheme:'insideZone',side:sign}};
  const carrier=new BallCarrier(opts,back);back.behavior=carrier;
  sim.ball={kind:'held',carrier:back};sim.t=2.5;
  const locate=(slot:typeof slots[number],x:number,y:number,vy=0)=>{
    const b=sim.slot(slot)!;b.body.pos={x,y:CENTER_Y+sign*y};b.body.vel={x:0,y:sign*vy};b.body.facing=0;
  };
  const observe=()=>{for(let i=0;i<24;i++)sim.perception.record(sim.agents);};
  return {sim,back,carrier,opts,sign,locate,observe};
}
function closed(f:ReturnType<typeof setup>) {
  // C is staggered toward the back. Midpoints beside C are wide enough at
  // the endpoint, but their incoming paths intersect his body.
  f.locate('LT',40.9,-2.4);f.locate('LG',40.9,-1.2);f.locate('C',39.35,0);
  f.locate('RG',40.9,1.2);f.locate('RT',40.9,2.4);f.observe();
}
function open(f:ReturnType<typeof setup>) {
  for(const [i,slot] of slots.entries())f.locate(slot,40.1,[-3,-1.5,1.5,3,4.5][i]);
  f.observe();
}
function move(f:ReturnType<typeof setup>,steps:number) {
  let contacts=0,maximumImpulse=0;
  for(let i=0;i<steps;i++) {
    f.sim.perception.record(f.sim.agents);
    const command=f.carrier.update(f.back,f.sim);
    const report=f.sim.world.step(f.sim.agents.map(a=>a===f.back?command:stand()),f.sim.dt);
    for(const c of report.contacts)if(c.i===f.back.idx||c.j===f.back.idx){contacts++;maximumImpulse=Math.max(maximumImpulse,c.impulse);}
    f.sim.t+=f.sim.dt;
  }
  return {contacts,maximumImpulse};
}

describe('near-line entry approaches',()=>{
  it.each([false,true])('rejects a staggered open endpoint and brakes before an occupied approach, mirror=%s',mirror=>{
    const f=setup(mirror,3);closed(f);
    expect(runReadAim(f.back,f.sim,f.opts)).toBeNull();
    const before=structuredClone(f.back.body),command=f.carrier.update(f.back,f.sim);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThan(.1);
    expect(f.back.body).toEqual(before);
    const native=move(f,12);
    expect(native.contacts).toBe(0);
    expect(f.back.pos.x).toBeLessThan(f.sim.slot('C')!.pos.x-.45);
  });

  it.each([false,true])('keeps a genuine open approach at normal effort, mirror=%s',mirror=>{
    const f=setup(mirror);open(f);
    const point=runReadAim(f.back,f.sim,f.opts)!;
    expect(point.y).toBeCloseTo(CENTER_Y,10);
    const command=f.carrier.update(f.back,f.sim);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeCloseTo(f.back.profile.vmax,10);
    const native=move(f,20);
    expect(native.contacts).toBe(0);
    expect(f.back.pos.x).toBeGreaterThan(40.3);
  });

  it.each([false,true])('retains a physically passable shoulder-turned crease, mirror=%s',mirror=>{
    const f=setup(mirror);f.back.body.squeeze=1;f.back.body.squeezeHeading=0;
    const half=f.back.profile.radius*.76;
    const l=f.sim.slot('LG')!,r=f.sim.slot('C')!;
    f.locate('LT',40.1,-2);f.locate('LG',40.1,-l.profile.radius-half);
    f.locate('C',40.1,r.profile.radius+half);f.locate('RG',40.1,2);f.locate('RT',40.1,3.5);f.observe();
    expect(bodyRadius(f.back.body,0,1)).toBeLessThan(half);
    const point=runReadAim(f.back,f.sim,f.opts);
    expect(point).not.toBeNull();
    expect(Math.abs(point!.y-CENTER_Y)).toBeLessThan(.08);
    expect(move(f,20).contacts).toBe(0);
    expect(f.back.pos.x).toBeGreaterThan(40.3);
  });

  it('changes the entry only after its own delayed blocker picture changes',()=>{
    const f=setup(false,3);closed(f);
    expect(runReadAim(f.back,f.sim,f.opts)).toBeNull();
    f.locate('C',43,4); // The actual body moved, but no new picture was consumed.
    expect(runReadAim(f.back,f.sim,f.opts)).toBeNull();
    f.observe();
    expect(runReadAim(f.back,f.sim,f.opts)).not.toBeNull();
    f.sim.t+=.1;
    expect(Math.hypot(...Object.values(f.carrier.update(f.back,f.sim).vel))).toBeGreaterThan(2);
  });

  it('preserves the installed press instruction before the entry phase',()=>{
    const f=setup();closed(f);
    const carrier=new BallCarrier({...f.opts,aimUntil:4},f.back);
    const command=carrier.update(f.back,f.sim);
    expect(command.vel.x).toBeGreaterThan(0);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeGreaterThan(f.back.profile.vmax*.5);
    expect(f.back.tags.has('run-crease-read')).toBe(false);
  });

  it.each([false,true])('cannot erase unavoidable contact from late braking, mirror=%s',mirror=>{
    const f=setup(mirror,7);closed(f);f.locate('C',38.9,0);f.observe();
    const before={...f.back.vel},command=f.carrier.update(f.back,f.sim);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThan(.1);
    expect(f.back.vel).toEqual(before);
    const native=move(f,5);
    expect(native.contacts).toBeGreaterThan(0);
    expect(native.maximumImpulse).toBeGreaterThan(0);
  });

  it('uses identical capabilities and mirrored native movement on both sides',()=>{
    const a=setup(false,3),b=setup(true,3);closed(a);closed(b);
    expect(a.back.profile).toEqual(b.back.profile);
    const x=move(a,12),y=move(b,12);
    expect(x).toEqual(y);
    expect(a.back.pos.x).toBeCloseTo(b.back.pos.x,10);
    expect(a.back.pos.y-CENTER_Y).toBeCloseTo(CENTER_Y-b.back.pos.y,10);
    expect(a.back.vel.x).toBeCloseTo(b.back.vel.x,10);
    expect(a.back.vel.y).toBeCloseTo(-b.back.vel.y,10);
  });
});
