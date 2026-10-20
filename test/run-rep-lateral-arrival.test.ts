import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactCommands, contactFixture } from '../scripts/diag/run-contact-technique.js';
import { traits } from '../src/sim/engagement.js';
import { runContactObservers } from '../src/sim/run-contact-observer.js';

afterEach(() => vi.restoreAllMocks());

function stage(side=1,flow=0) {
  const f=contactFixture({type:'run',runBlock:60,passBlock:60,side});
  f.engagement.surfaceAxis={x:-1,y:0};f.engagement.drive={x:1,y:0};
  f.engagement.nextMoveAt=Infinity;
  f.defender.runFit={gap:'B',side,kind:'interior',technique:'attack',pace:'stack',edge:'box'};
  f.defender.recog!.read='run';
  f.sim.slot('RB')!.body.pos={x:35,y:f.blocker.pos.y};
  for(let k=0;k<24;k++)f.sim.perception.record(f.sim.agents);
  // Fixed acquired picture. Hidden blocker changes below must not move it;
  // this is a controller contract, not a reconstructed NFL contact episode.
  const see=f.sim.see.bind(f.sim),picture={pos:{...f.blocker.pos},vel:{x:0,y:flow},
    facing:0,pose:'up' as const,stance:'low' as const,age:.2};
  vi.spyOn(f.sim,'see').mockImplementation((a,b,...rest)=>a===f.defender&&b===f.blocker
    ? structuredClone(picture) : see(a,b,...rest));
  let aim:{x:number;y:number}|undefined;
  runContactObservers.set(f.sim,(_rep,phase,data)=>{
    if(phase==='movement')aim={...(data.defensiveAim as {x:number;y:number})};
  });
  contactCommands(f);
  if(!aim)throw new Error('No actual contact objective was selected');
  const adoptedAt=f.sim.t;f.sim.t+=.01;
  return {...f,get aim(){return aim!;},picture,adoptedAt};
}

describe('ordinary run-rep lateral arrival',()=>{
  it.each([-1,1])('closes a near shoulder without reversing its request for small velocity changes, side=%s',side=>{
    const f=stage(side),cap=traits(f.defender).lateral;
    f.defender.body.pos.y=f.aim.y-side*.08;
    const requests=[];
    for(const speed of [-.4,0,.4]) {
      f.defender.body.vel={x:0,y:side*speed};
      const body=structuredClone(f.defender.body),hands=f.engagement.hands;
      const command=contactCommands(f)[f.defender.idx];
      requests.push(command.vel.y*side);
      expect(command.vel.y*side).toBeGreaterThan(0);
      expect(Math.abs(command.vel.y)).toBeLessThan(cap);
      expect(f.defender.body).toEqual(body);
      expect(f.engagement.hands).toBe(hands);
    }
    expect(Math.max(...requests)-Math.min(...requests)).toBeLessThan(.3);
  });

  it.each([-1,1])('brakes a genuinely fast arrival without assigning instant reversed movement, side=%s',side=>{
    const f=stage(side);f.defender.body.pos.y=f.aim.y-side*.08;
    f.defender.body.vel={x:0,y:side*3};
    const c=contactCommands(f)[f.defender.idx];
    expect(c.vel.y*side).toBeGreaterThan(0);
    expect(c.vel.y*side).toBeLessThan(3);
    expect(f.defender.vel.y).toBe(side*3);
  });

  it('matches a personally acquired moving shoulder at zero offset',()=>{
    const f=stage();f.picture.vel.y=1.5;
    f.sim.t+=f.defender.mind.decisionInterval+.01;
    contactCommands(f);f.sim.t+=.01;
    f.defender.body.pos.y=f.aim.y+1.5*.01;
    expect(contactCommands(f)[f.defender.idx].vel.y).toBeCloseTo(1.5,10);
  });

  it('keeps the acquired shoulder moving during the held decision, rather than steering back to its old position',()=>{
    const f=stage(1,-.45);f.sim.t=f.adoptedAt+.15;
    // The frozen point is right of him, but its acquired motion has carried
    // the selected shoulder left. No new sighting is needed to predict that.
    f.defender.body.pos.y=f.aim.y-.04;
    expect(contactCommands(f)[f.defender.idx].vel.y).toBeLessThan(0);
  });

  it('does not add picture age again or accumulate prediction when queried repeatedly',()=>{
    const f=stage(1,-.45);f.sim.t=f.adoptedAt+.10;
    f.defender.body.pos.y=f.aim.y-.045;
    const before=contactCommands(f)[f.defender.idx];
    f.picture.age=.8;
    const after=contactCommands(f)[f.defender.idx];
    expect(before.vel.y).toBeCloseTo(-.45,10);
    expect(after.vel).toEqual(before.vel);
  });

  it('holds its selected flow with the point until the next ordinary adoption',()=>{
    const unchanged=stage(1,-.45),changed=stage(1,-.45);
    changed.picture.vel.y=1.5;
    for(const f of [unchanged,changed]) {
      f.sim.t=f.adoptedAt+.10;f.defender.body.pos.y=f.aim.y-.045;
    }
    expect(contactCommands(changed)[changed.defender.idx].vel)
      .toEqual(contactCommands(unchanged)[unchanged.defender.idx].vel);
    changed.sim.t+=changed.defender.mind.decisionInterval+.01;
    expect(contactCommands(changed)[changed.defender.idx].vel.y).toBeGreaterThan(0);
  });

  it('responds to a real changed shoulder on the next existing decision',()=>{
    const f=stage();f.defender.body.pos.y=f.aim.y;
    f.picture.pos.y=f.aim.y-1;
    f.picture.vel.y=-1;
    f.sim.t+=f.defender.mind.decisionInterval+.01;
    expect(contactCommands(f)[f.defender.idx].vel.y).toBeLessThan(0);
  });

  it('does not infer a new shoulder from hidden blocker motion during the held decision',()=>{
    const a=stage(),b=stage();
    b.blocker.body.pos.y+=.2;b.blocker.body.vel.y=4;
    // Neither fixture has transmitted tactile load. The acquired picture and
    // held objective remain identical; private movement is not a new cue.
    const ca=contactCommands(a)[a.defender.idx],cb=contactCommands(b)[b.defender.idx];
    expect(cb.vel.y).toBe(ca.vel.y);
  });
});
