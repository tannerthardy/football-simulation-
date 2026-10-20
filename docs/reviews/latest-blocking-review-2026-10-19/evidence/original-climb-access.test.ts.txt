import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import type { ClimbAccess } from '../src/sim/climb-access.js';
import type { Perceived } from '../src/sim/perception.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/climb-traffic.json.gz',import.meta.url))).toString()) as {setup:PlaySetup};
function stage(at: number) {
  const sim = new PlaySim(structuredClone(fixture.setup));
  while (sim.phase==='live'&&sim.t<at) sim.tick();
  const y = sim.slot('Y')!, controller = y.behavior as RunBlocker;
  expect(controller.plan.kind).toBe('climb');
  expect(controller.target).toBe(sim.slot('LB_W'));
  expect(y.engagement).toBeNull();
  return {sim,y,controller};
}
function decision(hiddenChange: boolean, clearPicture: boolean) {
  const {sim,y,controller} = stage(.25), end = sim.slot('DE_W')!;
  // Test-controlled acquired pictures are held identical while reality changes.
  // Reading the existing buffer has no acquisition/RNG side effects.
  const pictures = new Map(sim.agents.map(b=>[b,structuredClone(sim.see(y,b))]));
  if (clearPicture) pictures.get(end)!.pos.x+=20;
  if (hiddenChange) {
    end.body.pos={x:end.pos.x+10,y:end.pos.y-12};
    end.body.vel={x:-7,y:4};
  }
  const see = vi.spyOn(sim,'see').mockImplementation((a,b)=>{
    expect(a).toBe(y);
    return structuredClone(pictures.get(b)!) as Perceived;
  });
  const body = structuredClone(y.body), rng = JSON.stringify(sim.rng);
  const command = controller.update(y,sim);
  expect(y.body).toEqual(body);
  expect(JSON.stringify(sim.rng)).toBe(rng);
  expect(controller.target).toBe(sim.slot('LB_W'));
  expect(y.engagement).toBeNull();
  expect(see.mock.calls.some(([a,b])=>a===y&&b===end)).toBe(true);
  see.mockRestore();
  return {command,access:Reflect.get(controller,'climbAccess') as ClimbAccess|null,end:end.idx};
}

describe('assigned climb clears acquired first-level traffic',()=>{
  it('retains the linebacker objective while responding to acquired obstruction, not hidden movement',()=>{
    const original=decision(false,false), hidden=decision(true,false), clear=decision(false,true);
    expect(original.access?.obstacle).toBe(original.end);
    expect(hidden.command).toEqual(original.command);
    expect(hidden.access).toEqual(original.access);
    expect(clear.access).toBeNull();
    expect(clear.command).not.toEqual(original.command);
  });

  it('holds the acquired access objective through the ordinary read beat without extra surface reads or randomness',()=>{
    const {sim,y,controller}=stage(.3), held=Reflect.get(controller,'climbAccess') as ClimbAccess;
    expect(held).not.toBeNull();
    const body=structuredClone(y.body),rng=JSON.stringify(sim.rng),see=vi.spyOn(sim,'see');
    const first=controller.update(y,sim),again=controller.update(y,sim);
    expect(Reflect.get(controller,'climbAccess')).toBe(held);
    expect(see.mock.calls.some(([,b])=>b===sim.slot('DE_W'))).toBe(false);
    expect(again).toEqual(first);
    expect(y.body).toEqual(body);expect(JSON.stringify(sim.rng)).toBe(rng);
    see.mockRestore();
  });

  it('clears the end and acquires real assigned-backer load in the native all22 continuation',()=>{
    const sim=new PlaySim(structuredClone(fixture.setup)),y=sim.slot('Y')!,end=sim.slot('DE_W')!,backer=sim.slot('LB_W')!;
    let incidentalImpulse=0,firstLoad:number|null=null,positiveNormal=false;
    while(sim.phase==='live'&&sim.t<2){
      sim.tick();const report=sim.lastStep!;
      incidentalImpulse+=report.contacts.filter(c=>c.i===y.idx&&c.j===end.idx||c.i===end.idx&&c.j===y.idx)
        .reduce((sum,c)=>sum+c.impulse,0);
      const e=y.engagement;
      if(e?.defender===backer&&e.hands&&Math.hypot(e.hands.normalForce??0,e.hands.tangentForce??0)>1){
        firstLoad??=sim.t;positiveNormal ||= (e.hands.normalForce??0)>0;
        expect(sim.world.joints).toContain(e.hands);
      }
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      for(const a of [y,end,backer])expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx]+1e-8);
    }
    expect(incidentalImpulse).toBe(0);
    expect(firstLoad).not.toBeNull();expect(firstLoad!).toBeLessThanOrEqual(1.6);
    expect(positiveNormal).toBe(true);
    expect(sim.events.some(e=>e.type==='carrier_contact')).toBe(false);
  });
});
