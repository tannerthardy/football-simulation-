/** Read-only upstream eligibility inspection; no new observations or draws. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {axisOf,contactControl,helperSupport,traits} from '../../src/sim/engagement.ts';
import {availability,supportParams} from '../../src/physics/support.ts';
import {fatigueFactor} from '../../src/physics/kinematics.ts';
const out=process.argv[2];assert(out);const snapshots=[];
const sample=(sim,context)=>{
 const controller=sim.slot('RT').behavior,combo=controller.plan.combination;
 if(!combo||combo.released)return;
 const e=combo.defender.engagement;
 if(!e)return;
 const entry={t:sim.t,context,readStates:structuredClone(combo.reads?.map(r=>({nextRead:r.nextRead,secureSince:r.secureSince,readAt:r.readAt,proposal:r.proposal?{climber:r.proposal.climber.idx,keeper:r.proposal.keeper.idx}:null}))),
  actualHelpers:e.helpers.map(a=>a.idx),members:[]};
 for(const climber of combo.members){
  const keeper=combo.members.find(a=>a!==climber),hands=keeper===e.blocker?e.hands:e.helperHands?.get(keeper);
  const axis=axisOf(sim,e),dx=keeper.pos.x-combo.defender.pos.x,dy=keeper.pos.y-combo.defender.pos.y,distance=Math.hypot(dx,dy);
  const phi=Math.atan2(-(dx*(-axis.y)+dy*axis.x),dx*axis.x+dy*axis.y)/(Math.PI/2);
  const bearing=Math.atan2(-dy,-dx),off=Math.abs(Math.atan2(Math.sin(bearing-keeper.facing),Math.cos(bearing-keeper.facing)))/(Math.PI/2);
  const base=keeper.body.support?availability(keeper.body.support,supportParams(keeper.profile),fatigueFactor(keeper.body.energy)):1;
  const contact=!!hands&&hands.a===keeper.body&&hands.b===combo.defender.body&&sim.world.joints.includes(hands);
  const reach=keeper.profile.radius+combo.defender.profile.radius+.3*traits(hands?.actor===combo.defender.body?combo.defender:keeper,'run').arm/36;
  const touching=!!hands&&distance<=reach&&(distance<=hands.extension||Math.hypot(hands.normalForce??0,hands.tangentForce??0)>1e-6);
  const support=helperSupport(sim,e,keeper),useful=keeper===e.blocker||support>=.25;
  const control=contactControl(e,keeper),threshold=-.12+.12*(.5-climber.mind.urgency);
  const reasons=[];if(off>=.65)reasons.push('torso');if(base<=.6)reasons.push('base');if(!contact)reasons.push('acquired contact');
  if(!touching)reasons.push('working reach');if(!useful)reasons.push('useful helper support');if(control===null||control<=threshold)reasons.push('contact control');
  entry.members.push({climber:climber.idx,keeper:keeper.idx,body:structuredClone(keeper.body),distance,phi,off,base,contact,reach,touching,support,useful,control,threshold,reasons,
   hands:hands?{extension:hands.extension,normal:hands.normalForce,tangent:hands.tangentForce}:null});
 }
 snapshots.push(entry);
};
const prepare=PlaySim.prototype.prepareJoinedRunBlocks;
PlaySim.prototype.prepareJoinedRunBlocks=function(){sample(this,'before-joined-read');const value=prepare.call(this);sample(this,'after-joined-read');return value;};
const update=RunBlocker.prototype.update;
RunBlocker.prototype.update=function(a,sim){if(a.idx===2||a.idx===5)sample(sim,`before-${a.slot}-update`);return update.call(this,a,sim);};
process.argv=[process.argv[0],process.argv[1],'run',out,'A030','.9'];
await import('./second-level-access.mjs');
writeFileSync(out+'/eligibility.json.gz',gzipSync(JSON.stringify({qualification:'Read-only exact native eligibility ingredients, no extra sim.see/RNG/World; compare control to its actual observer urgency. Personal visual evidence remains in native reads.',snapshots})));
console.log(JSON.stringify(snapshots.filter(s=>s.context==='before-RG-update'&&[.55,.8].includes(s.t)).map(s=>({t:s.t,context:s.context,readStates:s.readStates,members:s.members.map(m=>({climber:m.climber,keeper:m.keeper,reasons:m.reasons,support:m.support,control:m.control}))}))));
