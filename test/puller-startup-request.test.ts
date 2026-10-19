import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';

describe('puller request scope',()=>{
  const inputs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz',import.meta.url))).toString());
  it('requests drive for the first clearance step, retaining ordinary target fitting and non-puller movement',()=>{
    const sim=new PlaySim(structuredClone(inputs.rows.find((r:{id:string})=>r.id==='K03').setup) as PlaySetup);
    const a=sim.slot('LG')!,controller=a.behavior as RunBlocker;
    sim.t=.2;a.snapReadyAt=0;
    expect(controller.plan.kind).toBe('pull');
    expect(controller.update(a,sim).propulsion).toBe('full');
    Reflect.set(controller,'pullIdx',controller.plan.pullPath!.length);
    expect(controller.update(a,sim).propulsion).toBeUndefined();
    const center=sim.slot('C')!;
    expect(center.behavior.update(center,sim).propulsion).toBeUndefined();
  });
});
