import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { TeammateInformation } from '../src/sim/teammate-information.js';
import { spaceTeammates } from '../src/sim/spacing.js';
import type { Intent } from '../src/physics/world.js';
import { installPostMeshTrial, postMeshFallback } from '../scripts/diag/post-mesh-trial.js';

function stage() {
  const sim = new PlaySim({
    offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),'12'),
    defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
    offCall:{formation:FORMATION_BY_ID.ace_12,flip:false,kind:'run',run:RUN_BY_ID.wz_strong,label:'trial control'},
    defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'control'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,
  });
  const calls=installPostMeshTrial(sim), rt=sim.slot('RT')!, rb=sim.slot('RB')!;
  // Isolate post-mesh acquisition; no fabricated pre-snap look.
  const awareness=new TeammateInformation(sim.agents,new Map());
  const query=postMeshFallback(calls,(a,b)=>awareness.query(a.idx,b.idx,sim.t,sim.dt),()=>sim.t);
  rt.body.pos={x:40,y:22.5}; rt.body.vel={x:-2,y:0}; rt.body.facing=0;
  rb.body.pos={x:35,y:22.5}; rb.body.vel={x:4,y:0};
  return {sim,calls,rt,rb,awareness,query};
}
function sample(s:ReturnType<typeof stage>,now:number) {
  s.sim.t=now;s.sim.perception.record(s.sim.agents);
  s.awareness.sense(s.sim.agents,now,s.sim.dt);
  return s.query(s.rt,s.rb);
}
function request(s:ReturnType<typeof stage>) {
  const intents:Intent[]=[{vel:{x:-5,y:0}},{vel:{x:0,y:0}}];
  spaceTeammates([s.rt,s.rb],intents,(a,b)=>{const p=s.query(a,b);return p.source==='unavailable'?null:p;});
  return intents[0];
}

describe('diagnostic post-mesh coordination trial (not production)',()=>{
  it('keeps installed values, availability and requests invariant under advancing hidden divergence',()=>{
    const left=stage(),right=stage();
    let modified=false;
    for(let tick=25;tick<=45;tick++) {
      left.rb.body.pos={x:33-tick*.02,y:22.4};left.rb.body.vel={x:-7,y:2};
      right.rb.body.pos={x:35+tick*.01,y:22.6};right.rb.body.vel={x:6,y:-3};
      const a=sample(left,tick*.05),b=sample(right,tick*.05);
      expect(a).toEqual(b);expect(a.source).toBe('called');
      expect(left.sim.perception.perceive(left.rb.idx,0).pos)
        .not.toEqual(right.sim.perception.perceive(right.rb.idx,0).pos);
      expect(request(left)).toEqual(request(right));
      modified ||= request(left).vel.x !== -5;
    }
    expect(modified).toBe(true); // The installed cue actually affects a request.
  });

  it('lets an actually acquired cutback override the nominal track after latency and alter spacing',()=>{
    const s=stage(),hidden=stage();
    const installed=sample(s,1.25);expect(installed.source).toBe('called');
    sample(hidden,1.25);
    // A new visible cutback crosses in front of RT, against the called motion.
    s.rb.body.pos={x:40.7,y:22.5};s.rb.body.vel={x:-3,y:0};
    expect(sample(s,1.3).source).toBe('called');
    sample(hidden,1.3);
    expect(request(s)).toEqual(request(hidden)); // Same clock; no instantaneous live reaction.
    for(let tick=27;tick<=36;tick++) {
      // Advance the observed physical trajectory as well as its snapshots.
      s.rb.body.pos={x:40.7-3*(tick*.05-1.3),y:22.5};
      sample(s,tick*.05);sample(hidden,tick*.05);
    }
    const cut=s.query(s.rt,s.rb);
    expect(cut.source).toBe('observed');
    if(cut.source==='unavailable')throw new Error('Missing cutback');
    expect(cut.sampledAt).toBeGreaterThanOrEqual(1.3);
    expect(cut.availableAt).toBeGreaterThan(cut.sampledAt);
    expect(cut.vel.x).toBe(-3);
    expect(request(s)).not.toEqual(request(hidden));
  });

  it('copies the install and ends at nominal aim arrival, independent of hidden job, touch or queries',()=>{
    const s=stage(),call=s.calls.get(s.rb.idx)!;
    sample(s,1.5);const before=s.query(s.rt,s.rb);
    s.rb.body.pos={x:90,y:1};s.rb.body.vel={x:-9,y:9};
    s.rb.behavior={kind:'private-cut',update:()=>({vel:{x:0,y:0}})};
    call.origin.x=999;call.velocity.y=999;
    const end=call.until;call.until=999;
    for(let i=0;i<10;i++)expect(s.query(s.rt,s.rb)).toEqual(before);
    s.sim.t=end+.05;expect(s.query(s.rt,s.rb)).toEqual({source:'unavailable'});
    s.sim.t=1.6;s.awareness.touched(s.rt.idx,s.rb.idx,{x:39.4,y:22.5},s.rt.vel,1.6);
    expect(s.query(s.rt,s.rb).source).toBe('tactile');
  });
});
