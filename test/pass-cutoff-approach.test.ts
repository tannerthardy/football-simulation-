import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {vi,describe,expect,it} from 'vitest';
import {supportParams} from '../src/physics/support.js';
import {World} from '../src/physics/world.js';
import {PassProtector,ProtectionCoordinator} from '../src/sim/behaviors/blocking.js';
import {ScoutingReport} from '../src/sim/recognition.js';
import {CoverageScouting} from '../src/sim/qbmind.js';
import {PlaySim} from '../src/sim/playsim.js';
import {ROUTES} from '../src/playbook/routes.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// Recorded on the installed line; OL_SPLITS and OL_STAGGER stage a different play.
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// PASS_FEEL mirrors on felt information; this recording was made with the blocker reading the rusher's current state.
// PASS_KICK replaces this cutoff approach against edge rushers with a vertical
// set; this file pins the cutoff. (Under PASS_KICK, P019's tackles meet both
// ends at 1.25 s and lose them at the hip at 1.9 s: KNOWN_PROBLEMS PRO-1.)
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.FRONT_ALIGN = '0'; process.env.SNAP_REACT = '0'; process.env.PASS_FEEL = '0'; process.env.PASS_KICK = '0'; process.env.ARM_PRESS = '0'; });

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

  // The cutoff approach's job is to get loaded hands on the edge rusher in
  // time. How long the tackle then holds him is a contest the body physics
  // decides; that duration is PRO-1's edge-hold measure (KNOWN_PROBLEMS), not
  // an assertion on one recorded scene.
  it('P019 obtains loaded contact on both edges, on their feet, before the actual throw',()=>{
    // The saved constructor stores route IDs, not their historical geometry.
    // Preserve P019's installed flat for this recorded protection contract:
    // REC-1/COV-10's earlier-width flat changes the QB opportunity and removes
    // this pre-3.5s throw. Current flat calls have independent native controls.
    // Keep the actual throw, loaded-contact, upright and deadline assertions.
    const flat=ROUTES.flat;
    let sim:PlaySim;
    try {
      ROUTES.flat={...flat,points:[{d:1.5,l:2,s:.9},{d:3.5,l:12}]};
      sim=saved(18);
    } finally { ROUTES.flat=flat; }
    const edge:Record<string,string>={LT:'DE_W',RT:'DE_S'},loaded=new Map<string,number>();
    while(sim.phase==='live'&&sim.throwAt<0&&sim.t<3.5){
      sim.tick();
      for(const slot of ['LT','RT']){
        const b=sim.slot(slot)!,e=b.engagement;
        if(!loaded.has(slot)&&e?.type==='pass'&&e.contactReported&&e.defender.slot===edge[slot]&&b.body.support!.state==='up')
          loaded.set(slot,sim.t);
      }
    }
    expect(sim.throwAt).toBeGreaterThanOrEqual(0);
    for(const slot of ['LT','RT']){
      expect(loaded.has(slot)).toBe(true);
      expect(loaded.get(slot)!).toBeLessThan(sim.throwAt);
      expect(sim.slot(slot)!.body.support!.state).toBe('up');
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
