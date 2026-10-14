/** Committed mechanical World checkpoints: original physical profiles and
 * retained acquired coordinates; fresh support history is explicit, not native
 * football evidence. All ground/support/recovery/fatigue operators are real.
 */
import {readFileSync} from 'node:fs';
import {World,type GraspJoint,type Intent} from '../../../src/physics/world.js';
import {newSupport} from '../../../src/physics/support.js';
import {newVirtualFoot} from '../../../src/physics/virtual-foot.js';
import type {Body} from '../../../src/physics/kinematics.js';
import type {PassiveGripSolver,PassiveGripInput} from '../../../src/physics/passive-grip.js';
export function passiveWorldInputs(){return JSON.parse(readFileSync('config/grip-passive-world-inputs.json','utf8')).cases as Array<{
  id:string;packetSha256:string;selector:unknown;input:PassiveGripInput;
  bodies:Array<{profile:Body['profile'];energy:number;posture:number}>;
  joint:Omit<GraspJoint,'a'|'b'|'kind'>;foot:{achieved:{x:number;y:number};force:{x:number;y:number}};transform:string;
}>;}
export function passiveWorldFixture(id:string,mode:'legacy'|'owned'='owned',solver?:PassiveGripSolver,parked=true){
  const c=passiveWorldInputs().find(c=>c.id===id)!;if(!c)throw Error('Missing passive World input');
  const bodies:Body[]=c.bodies.map((b,i)=>{const p=i?c.input.b:c.input.a;return {profile:structuredClone(b.profile),energy:b.energy,
    pos:{...p.pos},vel:{...p.vel},facing:p.facing,spin:p.spin,support:newSupport(b.posture)};});
  if(parked)bodies.push({...structuredClone(bodies[0]),pos:{x:0,y:0},vel:{x:0,y:0},spin:0,support:newSupport(c.bodies[0].posture)});
  const w:any=new World(bodies,{substeps:1,handContact:'patch',...(mode==='owned'?{materialTransport:'owned' as const}:{}),passiveGrip:solver}),
    j:GraspJoint={kind:'grasp',a:bodies[0],b:bodies[1],...structuredClone(c.joint)},foot=newVirtualFoot(bodies[1].pos);
  foot.offset={...c.input.footOffset};foot.achieved={...c.foot.achieved};foot.force={...c.foot.force};
  bodies[1].support!.foot=foot;w.heldBodies.add(bodies[1]);w.joints.push(j);
  w.attachments.set(j,{share:j.recoveryCoupling??j.legs,reference:{x:0,y:0},foot,bounded:true,material:{...c.input.material}});
  const intents:Intent[]=bodies.map(b=>({vel:{...b.vel},facing:b.facing,posture:b.support!.posture}));
  return {w:w as World,bodies,j,foot,intents,fixture:c,material:()=>({...w.attachments.get(j).material})};
}
