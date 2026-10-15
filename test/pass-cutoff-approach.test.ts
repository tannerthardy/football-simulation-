import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {describe,expect,it} from 'vitest';
import {supportParams} from '../src/physics/support.js';
import {World} from '../src/physics/world.js';
import {PassProtector,ProtectionCoordinator} from '../src/sim/behaviors/blocking.js';
import {ScoutingReport} from '../src/sim/recognition.js';
import {CoverageScouting} from '../src/sim/qbmind.js';
import {PlaySim} from '../src/sim/playsim.js';

const fixture=JSON.parse(gunzipSync(readFileSync('test/fixtures/pass-cutoff-inputs.json.gz')).toString());
function saved(index:number):PlaySim {
  const row=fixture.rows.find((r:{index:number})=>r.index===index);
  const s=structuredClone(row.setup);
  const sim=new PlaySim({...s,energy:new Map<string,number>(s.energy),
    scouting:Object.assign(new ScoutingReport(),{...s.scouting,cells:new Map(s.scouting.cells)}),
    coverageScouting:Object.assign(new CoverageScouting(),s.coverageScouting)});
  expect({...sim.rng}).toEqual(row.expectedInitialRng);
  return sim;
}

describe('edge cutoff approach execution',()=>{
  it('P040 obtains loaded contact on a better shoulder with the same bodies and normal traffic',()=>{
    const sim=saved(39),b=sim.slot('LT')!,d=sim.slot('DE_W')!;
    const profiles=structuredClone(sim.agents.map(a=>a.profile));
    let phi:number|null=null;
    while(sim.phase==='live'&&sim.t<2&&phi===null){
      sim.tick();
      if(sim.events.some(e=>e.type==='block_contact'&&e.a===b.idx&&e.b===d.idx)){
        const ax=sim.qb.pos.x-d.pos.x,ay=sim.qb.pos.y-d.pos.y;
        const bx=b.pos.x-d.pos.x,by=b.pos.y-d.pos.y;
        phi=Math.atan2(-(-bx*ay+by*ax),bx*ax+by*ay)/(Math.PI/2);
      }
    }
    expect(phi).not.toBeNull();
    const reference=fixture.rows.find((r:{index:number})=>r.index===39);
    expect(Math.abs(phi!)).toBeLessThan(Math.abs(reference.baselineFirstLtPhi));
    expect(sim.agents).toHaveLength(22);
    expect(sim.agents.map(a=>a.profile)).toEqual(profiles);
    expect(b.body.support!.state).toBe('up');
  });

  it('P019 retains useful contact on both edges through the actual throw',()=>{
    const sim=saved(18);
    while(sim.phase==='live'&&sim.throwAt<0&&sim.t<3.5)sim.tick();
    expect(sim.throwAt).toBeGreaterThanOrEqual(0);
    for(const slot of ['LT','RT']){
      const b=sim.slot(slot)!;
      expect(b.engagement?.type).toBe('pass');
      expect(b.engagement?.contactReported).toBe(true);
      expect(b.body.support!.state).toBe('up');
    }
  });

  it.each([-1,1])('the opening request executes with finite acceleration on either side, mirror=%s',mirror=>{
    const sim=saved(39),b=sim.slot('LT')!,d=sim.slot('DE_W')!;
    // A reflected local opening picture isolates the same player's movement
    // law. It is not presented as a native mirrored eleven-player call.
    for(const a of [b,d,sim.qb]){
      a.body.pos.y=sim.ballY+mirror*(a.pos.y-sim.ballY);
      a.body.vel.y*=mirror;a.body.facing*=mirror;
    }
    const coord=new ProtectionCoordinator();coord.add(b);coord.assigned.set(b,d);
    coord.update=()=>{}; // Retain this installed matchup, no new declaration.
    b.behavior=new PassProtector(coord);sim.t=.05;
    const before=structuredClone(b.body),command=b.behavior.update(b,sim);
    expect(b.body).toEqual(before);
    expect(command.vel.y*mirror).toBeGreaterThan(0);
    const report=new World([b.body]).step([command],.05);
    expect(b.vel.y*mirror).toBeGreaterThan(0);
    expect(Math.abs(b.vel.y)).toBeLessThan(Math.abs(command.vel.y));
    expect(Math.hypot(report.groundImpulse[0].x,report.groundImpulse[0].y))
      .toBeLessThanOrEqual(supportParams(b.profile).traction*.05+1e-8);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });
});
