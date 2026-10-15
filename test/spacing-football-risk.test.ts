import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {previewFreeMovement} from '../src/physics/movement-preview.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {BallCarrier} from '../src/sim/behaviors/carrier.js';
import {PlaySim} from '../src/sim/playsim.js';
function stage(){
 const formation=FORMATION_BY_ID.ace_12;
 const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.wz_weak,label:'wide'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
 const a=sim.slot('RB')!,d=sim.slot('DE_W')!;sim.t=2;
 a.body.pos={x:40,y:26};a.body.vel={x:4,y:0};a.body.facing=0;
 const carrier=new BallCarrier({run:{scheme:'wideZone',side:1}},a);
 const original=previewFreeMovement(a.body,{vel:{x:8,y:0}},2,12),detour=previewFreeMovement(a.body,{vel:{x:5.657,y:5.657}},2,12);
 let picture={pos:{x:43,y:28.4},vel:{x:0,y:0},facing:Math.PI,pose:'up' as const,stance:null};
 const see=vi.spyOn(sim,'see').mockImplementation((_a,b)=>{
  if(b.team==='O')throw Error('teammate information leak');
  return structuredClone(b===d?picture:{...picture,pos:{x:80,y:50}});
 });
 return{sim,a,d,carrier,original,detour,see,cutback:()=>{picture={...picture,pos:{x:41.5,y:25.3},vel:{x:-1,y:0}};}};
}
describe('spacing detours remain football decisions',()=>{
 it('vetoes an achieved detour toward a visible tackler and accepts the same clear path',()=>{
  const s=stage(),before=structuredClone(s.a.body),rng=structuredClone(s.sim.rng);
  expect(s.carrier.allowSpacingDetour(s.a,s.sim,s.detour,s.original)).toBe(false);
  expect(s.carrier.allowSpacingDetour(s.a,s.sim,s.original,s.original)).toBe(true);
  expect(s.a.body).toEqual(before);expect(s.sim.rng).toEqual(rng);
 });
 it('ignores hidden divergence and only changes its answer for an observed cutback on the next read',()=>{
  const s=stage();expect(s.carrier.allowSpacingDetour(s.a,s.sim,s.detour,s.original)).toBe(false);
  const calls=s.see.mock.calls.length;
  s.d.body.pos={x:41.5,y:25.3};s.d.body.vel={x:-9,y:0};s.d.engagement={win:99} as any;
  s.sim.t+=.05;s.cutback();
  expect(s.carrier.allowSpacingDetour(s.a,s.sim,s.detour,s.original)).toBe(false);
  expect(s.see.mock.calls.length).toBe(calls);
  s.sim.t=2+s.a.mind.decisionInterval;
  expect(s.carrier.allowSpacingDetour(s.a,s.sim,s.detour,s.original)).toBe(true);
  expect(s.see.mock.calls.length).toBeGreaterThan(calls);
 });
});
