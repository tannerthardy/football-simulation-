import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/runner-side-recovery.json.gz',import.meta.url))).toString()) as {setup:PlaySetup};
afterEach(()=>vi.restoreAllMocks());

/** Controlled decision geometry with native selected players/capacities.
 * No World tick or claimed native continuation is reconstructed from it.
 */
function scene(signal: boolean | undefined = true) {
  const sim = new PlaySim(structuredClone(fixture.setup)), a = sim.slot('H')!, d = sim.slot('DE_W')!, rb = sim.slot('RB')!;
  for (const other of sim.agents) {
    if (other!==a&&other!==d) other.body.pos={x:80+other.idx*3,y:8};
    other.body.vel={x:0,y:0};
  }
  a.body.pos={x:42,y:CENTER_Y+.3}; d.body.pos={x:40,y:CENTER_Y};
  rb.body.pos={x:35,y:CENTER_Y}; sim.qb.body.pos={x:35,y:CENTER_Y+2};
  a.body.facing=Math.atan2(d.pos.y-a.pos.y,d.pos.x-a.pos.x);
  const controller = new RunBlocker({kind:'drive',target:d,drive:{x:1,y:0}});
  a.behavior=controller; sim.t=1.7;
  const pictures = new Map(sim.agents.map(other=>[other,{
    pos:{...other.pos},vel:{...other.vel},facing:other.facing,stance:null,pose:'up',age:.25,carrying:false,
  } as Perceived]));
  pictures.get(rb)!.carrying=signal;
  const ordinarySee=sim.see.bind(sim);
  const see=vi.spyOn(sim,'see').mockImplementation((observer,target,scale)=>observer===a
    ? structuredClone(pictures.get(target)!) : ordinarySee(observer,target,scale));
  return {sim,a,d,rb,controller,pictures,see,command:()=>controller.update(a,sim)};
}

describe('free first-level recovery screens a personally acquired carrying back',()=>{
  it('uses acquired runner/defender pictures without moving bodies or adding randomness',()=>{
    const f=scene(), bodies=f.sim.agents.map(a=>structuredClone(a.body)), rng=JSON.stringify(f.sim.rng);
    const drive={...f.controller.plan.drive},command=f.command();
    expect(command.posture).toBe(.7);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThan(f.a.profile.vmax);
    expect(f.a.engagement).toBeNull();
    expect(f.controller.target).toBe(f.d);expect(f.controller.plan.drive).toEqual(drive);
    expect(f.sim.agents.map(a=>a.body)).toEqual(bodies);expect(JSON.stringify(f.sim.rng)).toBe(rng);
    expect(Reflect.get(f.controller,'workPicture').source).toBe('acquired');
  });

  it('ignores hidden runner motion and possession changes with the same acquired evidence',()=>{
    const first=scene(), hidden=scene();
    hidden.rb.body.pos={x:95,y:4};hidden.rb.body.vel={x:-8,y:5};
    hidden.sim.ball={kind:'held',carrier:hidden.sim.qb};
    expect(hidden.command()).toEqual(first.command());
    expect(JSON.stringify(hidden.sim.rng)).toBe(JSON.stringify(first.sim.rng));
  });

  it.each([false,undefined])('keeps unavailable/negative possession out of recovery even when the hidden runner carries, %s',signal=>{
    const f=scene();f.pictures.get(f.rb)!.carrying=signal;f.sim.ball={kind:'held',carrier:f.rb};
    const command=f.command();
    // The installed first-level fit, exactly as without an acquired runner.
    expect(command).toEqual(scene(false).command());
    expect(Reflect.get(f.controller,'workPicture').source).toBe('installed');
  });

  it('does not treat a carrying QB at the mesh as an acquired back',()=>{
    const f=scene(false);f.pictures.get(f.sim.qb)!.carrying=true;
    const command=f.command();
    // The installed first-level fit, exactly as without an acquired runner.
    expect(command).toEqual(scene(false).command());
    expect(Reflect.get(f.controller,'workPicture').carrier).toBe(f.sim.qb.idx);
  });

  it('holds the work picture through its normal beat, then responds to a new acquired runner side',()=>{
    const f=scene(), first=f.command(),held=Reflect.get(f.controller,'workPicture');
    f.pictures.get(f.rb)!.pos={x:39,y:CENTER_Y+9};
    f.see.mockClear();
    expect(f.command()).toEqual(first);
    expect(Reflect.get(f.controller,'workPicture')).toBe(held);
    expect(f.see.mock.calls.some(([,b])=>b===f.rb)).toBe(false);
    f.sim.t=held.nextRead;
    const updated=f.command();
    expect(updated).not.toEqual(first);
    expect(Reflect.get(f.controller,'workPicture')).not.toBe(held);
    expect(f.see.mock.calls.some(([,b])=>b===f.rb)).toBe(true);
  });

  it('does not renew the recovery objective after the acquired runner has passed the defender',()=>{
    const f=scene();f.pictures.get(f.rb)!.pos={x:f.d.pos.x+2.51,y:CENTER_Y};
    const command=f.command();
    // The installed first-level fit, exactly as without an acquired runner.
    expect(command).toEqual(scene(false).command());
  });

  it('preserves detached receiver work and an unreleased double',()=>{
    for(const control of ['detached','double'] as const){
      const f=scene();
      if(control==='detached'){
        f.sim.offCall.formation=FORMATION_BY_ID.gun_trips_11;
        Object.assign(f.sim.offAlign,alignOffense(FORMATION_BY_ID.gun_trips_11,false,f.sim.los,f.sim.ballY));
        expect(f.sim.offAlign.spots.H.inline).toBe(false);
      }else{
        const partner=f.sim.slot('LT')!;
        const combination:Combination={members:[f.a,partner],defender:f.d,backer:f.sim.slot('LB_W')!,
          released:false,secureSince:-1,nextRead:10,soloKind:'drive'};
        f.controller.plan.combination=combination;
      }
      // The inline end keeps his line base (posture) either way; the detached wing has none.
      expect(f.command().posture).toBe(control==='detached'?undefined:.7);
      expect(Reflect.get(f.controller,'workPicture')).toBeNull();
      expect(f.controller.target).toBe(f.d);
    }
  });

  it.each([1.099,1.101])('preserves the existing marginal-strike boundary, runner-side phi %s',phi=>{
    const f=scene(),reach=f.a.profile.radius+f.d.profile.radius+.1+f.a.player.measurables.armIn/36*.45;
    const angle=phi*Math.PI/2,radius=reach*.85;
    f.a.body.pos={x:f.d.pos.x-radius*Math.cos(angle),y:f.d.pos.y+radius*Math.sin(angle)};
    f.a.body.facing=Math.atan2(f.d.pos.y-f.a.pos.y,f.d.pos.x-f.a.pos.x);
    const engage=vi.spyOn(f.sim,'engage');f.command();
    if(phi<1.1){
      expect(engage).toHaveBeenCalled();expect(f.a.engagement?.defender).toBe(f.d);
      expect(f.sim.world.joints).toContain(f.a.engagement!.hands);
    }else{
      expect(engage).not.toHaveBeenCalled();expect(f.a.engagement).toBeNull();
    }
  });

  it('leaves an existing physical hold and its hands under the accepted contact motor',()=>{
    const f=scene();f.a.body.pos={x:f.d.pos.x-.65,y:f.d.pos.y+.2};
    f.a.body.facing=Math.atan2(f.d.pos.y-f.a.pos.y,f.d.pos.x-f.a.pos.x);
    const e=f.sim.engage(f.a,f.d,'run',f.controller.plan.drive)!;
    expect(e).not.toBeNull();
    const hands=e.hands, joints=[...f.sim.world.joints],body=structuredClone(f.a.body),rng=JSON.stringify(f.sim.rng);
    f.see.mockClear();const command=f.command();
    expect(command.vel).toEqual({x:0,y:0});expect(f.a.engagement).toBe(e);
    expect(e.hands).toBe(hands);expect(f.sim.world.joints).toEqual(joints);
    expect(f.a.body).toEqual(body);expect(JSON.stringify(f.sim.rng)).toBe(rng);
    expect(f.see).not.toHaveBeenCalled();
  });
});
