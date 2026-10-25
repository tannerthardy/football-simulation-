import {describe,expect,it} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {Rng} from '../src/core/rng.js';
import type {Intent} from '../src/physics/world.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {PASS_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {PlaySim} from '../src/sim/playsim.js';
import {spaceTeammates} from '../src/sim/spacing.js';

function stage(){
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(11),'O','OFF'),'11'),
    defense:pickDefense(generateTeam(new Rng(12),'D','DEF'),'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.smash,label:'test'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover1,pressure:null,label:'test'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:77});
  return {sim,a:sim.slot('RB')!,b:sim.slot('LG')!};
}

describe('shared teammate traffic control',()=>{
  it('plans braking before a full-speed runner reaches the old spacing window',()=>{
    for(const direction of [-1,1]){
      const {a,b}=stage();a.body.pos={x:50,y:CENTER_Y};a.body.vel={x:9*direction,y:0};
      a.body.facing=direction===1?0:Math.PI;b.body.pos={x:50+6*direction,y:CENTER_Y};b.body.vel={x:0,y:0};
      const profiles=[{...a.profile},{...b.profile}],positions=[{...a.pos},{...b.pos}];
      const intents:Intent[]=[{vel:{x:9*direction,y:0}},{vel:{x:0,y:0}}];
      spaceTeammates([a,b],intents);
      expect(intents[0].vel.x*direction).toBeLessThan(9);
      expect(intents[0].vel.x*direction).toBeGreaterThan(0);
      expect([a.profile,b.profile]).toEqual(profiles);
      expect([a.pos,b.pos]).toEqual(positions);expect(a.vel.x).toBe(9*direction);
    }
  });
  it('keeps a nearby clean lane instead of slowing for every radial neighbor',()=>{
    for(const side of [-1,1]){
      const {a,b}=stage();a.body.pos={x:50,y:CENTER_Y};a.body.vel={x:5,y:0};
      a.body.facing=0;b.body.pos={x:51,y:CENTER_Y+side};b.body.vel={x:0,y:0};
      const intents:Intent[]=[{vel:{x:5,y:0}},{vel:{x:0,y:0}}];
      spaceTeammates([a,b],intents);expect(intents[0].vel).toEqual({x:5,y:0});
    }
  });
  it('responds to the observed teammate picture rather than his unseen new position',()=>{
    const {sim,a,b}=stage();a.body.pos={x:50,y:CENTER_Y};a.body.vel={x:9,y:0};a.body.facing=0;
    b.body.pos={x:56,y:CENTER_Y};b.body.vel={x:0,y:0};
    for(let k=0;k<24;k++)sim.perception.record(sim.agents);
    const run=()=>{const intents:Intent[]=[{vel:{x:9,y:0}},{vel:{x:0,y:0}}];spaceTeammates([a,b],intents,(a,b)=>sim.see(a,b));return intents[0];};
    const before=run();b.body.pos={x:10,y:1};b.body.vel={x:-7,y:4};
    expect(run()).toEqual(before);
  });
});
