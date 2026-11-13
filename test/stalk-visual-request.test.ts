import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {stalkRequest,type StalkWitness} from './support/stalk-visual-request.js';
import {Rng} from '../src/core/rng.js';
import {CENTER_Y} from '../src/core/field.js';
import {generateTeam,pickOffense,pickDefense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';

const f=JSON.parse(readFileSync(new URL('../config/stalk-visual-request-witness.json',import.meta.url),'utf8'))as StalkWitness;
const delta=(a:{vel:{x:number;y:number}},b:{vel:{x:number;y:number}})=>Math.hypot(a.vel.x-b.vel.x,a.vel.y-b.vel.y);
describe('actual stalk movement from acquired information',()=>{
  it('does not change a far request when only the hidden target changes',()=>{
    const a=stalkRequest(f),b=stalkRequest(f,{hiddenY:.25});
    expect(a.command).toEqual(b.command);expect(a.visualCalls).toBe(1);expect(b.visualCalls).toBe(1);
    expect(a.picture).toEqual(b.picture);expect(a.engageCalls).toBe(0);
  });
  it('responds to a visible quarter-yard target change while the hidden body stays fixed',()=>{
    const a=stalkRequest(f,{fresh:true}),b=stalkRequest(f,{fresh:true,visibleY:.25});
    expect(b.command.vel.y).toBeGreaterThan(a.command.vel.y);
    expect(delta(a.command,b.command)).toBeCloseTo(.289613,6);expect(a.other).toEqual(b.other);
  });
  it('exactly preserves the recorded native request when the acquired picture is fresh',()=>{
    expect(JSON.stringify(stalkRequest(f,{fresh:true}).command)).toBe(JSON.stringify(f.recordedMovementCommand));
  });
  it('retains the adverse held-picture lateral speed loss instead of rescuing it from live coordinates',()=>{
    const old=stalkRequest(f),fresh=stalkRequest(f,{fresh:true});
    expect(old.command.vel.y).toBeCloseTo(2.550517,6);
    expect(fresh.command.vel.y).toBeCloseTo(4.774649,6);
    expect(old.command.vel.y).toBeLessThan(old.picture.vel.y);
  });
  it('does not advance an already projected picture again using its age',()=>{
    const older={...structuredClone(f.presentedPicture),age:.8};
    expect(stalkRequest(f,{picture:older}).command).toEqual(stalkRequest(f).command);
  });
  it('preserves physical engage eligibility even if the visual picture is old',()=>{
    const r=stalkRequest(f,{near:true});expect(r.engageCalls).toBe(1);expect(r.visualCalls).toBe(0);
    expect(r.command.vel).toEqual({x:0,y:0});
  });
  it('keeps an actual generated Agent/PlaySim stalk request independent of a hidden far shift',()=>{
    const formation=FORMATION_BY_ID.ace_12;
    const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'Offense','O',{strength:.55}),'12'),
      defense:pickDefense(generateTeam(new Rng(32),'Defense','D',{strength:.55}),'base43'),
      seed:3,audibles:false,los:40,ballY:CENTER_Y,firstDownX:50,
      offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.wz_strong,label:'WZ'},
      defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'C3'}});
    const actor=sim.slot('Z')!,target=sim.slot('CB_S')!;
    actor.body.pos={...f.actor.body.pos};actor.body.vel={...f.actor.body.vel};actor.body.facing=f.actor.body.facing;
    target.body.pos={...f.target.body.pos};target.body.vel={...f.target.body.vel};sim.t=f.controllerT;
    actor.behavior=new RunBlocker({kind:'stalk',target,drive:{...f.installedDrive}});
    vi.spyOn(sim,'see').mockImplementation((a,d)=>{expect(a).toBe(actor);expect(d).toBe(target);return structuredClone(f.presentedPicture);});
    const rng=structuredClone(sim.rng),a=actor.behavior.update(actor,sim);
    target.body.pos.y+=.25;expect(actor.behavior.update(actor,sim)).toEqual(a);
    expect(structuredClone(sim.rng)).toEqual(rng);
  });
});
