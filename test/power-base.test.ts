import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {RunBlocker,playSideSign} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import {POWER_VARIANTS, RUN_BY_ID} from '../src/playbook/concepts.js';
import {restoreSetup} from '../scripts/diag/saved-play.js';

// Power Base is a separate installed call: the line's play-side end man
// (inline TE, else the tackle) blocks the end man on the line and the pulling
// guard leads up for the first backer. Tracked power kickers leave an end who
// is already on a teammate for a backer on most such plays (run-game/PULLERS.md,
// #93); the kick call is unchanged. Recorded S11-P014 (Ace 12 power vs wide 9).
const saved=JSON.parse(readFileSync(new URL('./fixtures/power-base-s11-p014.json',import.meta.url),'utf8'));
const sim=(run:typeof RUN_BY_ID.power)=>{const st=restoreSetup(Buffer.from(saved.setup,'base64'));st.offCall={...st.offCall,run:{...run}};return new PlaySim(st);};
const plans=(s:PlaySim)=>new Map(s.offense.filter(a=>a.behavior instanceof RunBlocker).map(a=>[a,(a.behavior as RunBlocker).plan]));

describe('Power Base, recorded S11-P014',()=>{
 it('is not a callable default: power stays the kick call',()=>{
  expect(RUN_BY_ID.power.endBlock).toBeUndefined();
  expect(POWER_VARIANTS.kick).toBe(RUN_BY_ID.power);
  expect(POWER_VARIANTS.base.id).toBe('power_base');
 });
 it('the play-side end man blocks the end and the puller leads to a backer; power kicks that end',()=>{
  const kick=sim(RUN_BY_ID.power),kp=plans(kick);
  const puller=[...kp].find(([,p])=>p.kind==='pull')!;
  expect(puller[1].pullRole).toBe('kick');
  const end=puller[1].target!;
  const base=sim(POWER_VARIANTS.base),bp=plans(base),ps=playSideSign(base,base.offCall.run!);
  const bPuller=[...bp].find(([,p])=>p.kind==='pull')!;
  expect(bPuller[1].pullRole).toBe('lead');
  expect(bPuller[1].target?.slot.startsWith('LB')).toBe(true);
  const holder=[...bp].find(([,p])=>p.target?.slot===end.slot)!;
  expect(holder).toBeDefined();
  expect(holder[1].kind).toBe('drive');
  // He is the line's outermost play-side man.
  const line=[...bp].filter(([a,p])=>p.kind!=='pull'&&(a.pos.y-base.ballY)*ps>0&&(['LT','LG','C','RG','RT'].includes(a.slot)||base.offAlign.spots[a.slot]?.inline));
  const outer=line.sort((p,q)=>(q[0].pos.y-p[0].pos.y)*ps)[0][0];
  expect(holder[0].slot).toBe(outer.slot);
 });
});
