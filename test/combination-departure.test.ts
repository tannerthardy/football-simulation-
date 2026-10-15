import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {clearCombinationDeparture} from '../src/sim/combination-departure.js';
import {PlaySim} from '../src/sim/playsim.js';

const saved=JSON.parse(readFileSync(new URL('./fixtures/joined-departure-momentum.json',import.meta.url),'utf8'));
function body(){const b=structuredClone(saved.ownBody);b.support.since=-Infinity;return b;}

describe('achieved combination departure before ending first-level work',()=>{
  it('rejects the saved straight-corridor departure whose residual momentum strikes the acquired DL',()=>{
    const b=body(),before=structuredClone(b),peers=structuredClone(saved.peers),command=structuredClone(saved.command);
    expect(clearCombinationDeparture(b,command,peers,saved.t,saved.horizon,'center')).toBe(false);
    // Independent physical witness: the final command's actual path enters
    // torso touch, even though its eventual destination is on the clear side.
    const path=previewFreeMovement(b,command,saved.t,Math.ceil(saved.horizon/.05),'center');
    const d=peers[0],touch=.9*(b.profile.radius+d.radius);
    expect(Math.min(...path.map(s=>Math.hypot(s.pos.x-d.pos.x-d.vel.x*s.t,s.pos.y-d.pos.y-d.vel.y*s.t))))
      .toBeLessThan(touch);
    expect(b).toEqual(before);expect(peers).toEqual(saved.peers);expect(command).toEqual(saved.command);
  });

  it('allows the same requested route after existing momentum is removed, without changing capability',()=>{
    const b=body();b.vel={x:0,y:0};
    expect(clearCombinationDeparture(b,saved.command,saved.peers,saved.t,saved.horizon,'center')).toBe(true);
    const path=previewFreeMovement(b,saved.command,saved.t,5,'center');
    for(const p of saved.peers){
      const touch=.9*(b.profile.radius+p.radius);
      expect(Math.min(...path.map(s=>Math.hypot(s.pos.x-p.pos.x-p.vel.x*s.t,s.pos.y-p.pos.y-p.vel.y*s.t))))
        .toBeGreaterThanOrEqual(touch-1e-9);
    }
  });

  it('keeps an acquired stationary body in the actual route as an obstruction',()=>{
    const b=body();b.vel={x:0,y:0};
    const path=previewFreeMovement(b,saved.command,saved.t,5,'center');
    const p={pos:{...path[2].pos},vel:{x:0,y:0},radius:.2};
    expect(clearCombinationDeparture(b,saved.command,[p],saved.t,saved.horizon,'center')).toBe(false);
  });

  it('uses the executed climb command without acquiring another picture or mutating an existing read',()=>{
    const formation=FORMATION_BY_ID.ace_12;
    const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),'12'),
      defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
      offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.wz_weak,label:'saved departure'},
      defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
      los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
    sim.t=saved.t;
    const a=sim.agents[saved.actor],d=sim.agents[saved.defender],k=sim.agents[saved.keeper],lb=sim.agents[saved.backer];
    a.body=body();a.mind.decisionInterval=saved.horizon;
    const behavior=new RunBlocker({kind:'combo',target:d,drive:{x:1,y:0}});a.behavior=behavior;
    const before=structuredClone(a.body),rng=structuredClone(sim.rng),read=Reflect.get(behavior,'climbRead');
    const see=vi.spyOn(sim,'see').mockImplementation(()=>{throw Error('Preflight must reuse existing acquired pictures');});
    const draws=vi.spyOn(Rng.prototype,'nextU32');
    try{
      expect(behavior.canExecuteDeparture(a,sim,d,k,lb,saved.picture)).toBe(false);
      expect(Reflect.get(behavior,'climbRead')).toBe(read);expect(a.body).toEqual(before);expect(sim.rng).toEqual(rng);
      expect(see).not.toHaveBeenCalled();expect(draws).not.toHaveBeenCalled();
      const planned=Reflect.get(behavior,'plannedClimb').call(behavior,a,sim,lb,
        a.profile.radius+lb.profile.radius+.1+a.player.measurables.armIn/36*.45,saved.picture.backer,true);
      behavior.plan.kind='climb';behavior.plan.target=lb;
      const actual=Reflect.get(behavior,'plannedClimb').call(behavior,a,sim,lb,
        a.profile.radius+lb.profile.radius+.1+a.player.measurables.armIn/36*.45,saved.picture.backer);
      expect(actual).toEqual(planned);expect(actual).toEqual(saved.command);
    }finally{see.mockRestore();draws.mockRestore();}
  });
});
