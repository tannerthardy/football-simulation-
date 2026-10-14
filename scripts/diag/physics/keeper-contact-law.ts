/** Exact PR #11 keeper input. The free pair is a law control, not a football
 * outcome. Compare existing modes without changing any solver or controller. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Body } from '../../../src/physics/kinematics.js';
import { supportParams } from '../../../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../../../src/physics/world.js';

export const witnessPath = 'docs/reviews/under-center-zone-keeper-world-witness.json';
type FlatHands=Omit<HandJoint,'a'|'b'|'actor'|'holder'>&{a:number;b:number;actor?:number;holder?:number};
export interface KeeperWitness {
  t: number; dt: number; slots: string[]; beforeBodies: Body[];
  intents: Intent[]; jointInputs: FlatHands[];
  pending: { a: number; b: number; x: number; y: number; height?: number }[];
  expectedAfter: Body[]; worldSha256: string;
}
export const readWitness = (): KeeperWitness => JSON.parse(readFileSync(witnessPath, 'utf8'));
const cross = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x*b.y-a.y*b.x;
export function totals(bodies: Body[]) {
  return bodies.reduce((s, b) => {
    const m=b.profile.massKg, inertia=supportParams(b.profile).yawInertia, spin=b.spin??0;
    s.x+=m*b.vel.x; s.y+=m*b.vel.y;
    s.angular+=m*cross(b.pos,b.vel)+inertia*spin;
    s.energy+=.5*m*(b.vel.x*b.vel.x+b.vel.y*b.vel.y)+.5*inertia*spin*spin;
    return s;
  }, {x:0,y:0,angular:0,energy:0});
}
export function stateError(a: Body[], b: Body[]) {
  return Math.max(...a.flatMap((q,i)=>[
    Math.abs(q.pos.x-b[i].pos.x),Math.abs(q.pos.y-b[i].pos.y),
    Math.abs(q.vel.x-b[i].vel.x),Math.abs(q.vel.y-b[i].vel.y),
    Math.abs(q.facing-b[i].facing),Math.abs((q.spin??0)-(b[i].spin??0))]));
}
export function reflectWitness(source: KeeperWitness): KeeperWitness {
  const w=structuredClone(source);
  // True mechanical reflection, unlike the ace_12 placement contrast.
  const vector=(v:{x:number;y:number}|undefined)=>{if(v) v.y=-v.y;};
  for(const b of [...w.beforeBodies,...w.expectedAfter]) {
    vector(b.pos);vector(b.vel);b.facing=-b.facing;b.spin=-(b.spin??0);
    if(b.squeezeHeading!==undefined)b.squeezeHeading=-b.squeezeHeading;
    if(b.support) for(const v of ['xi','lean','load','felt','feetVel','fall','feltTip','accel','tipAccel'] as const)
      vector(b.support[v]);
  }
  for(const i of w.intents) {vector(i.vel);if(i.facing!==undefined)i.facing=-i.facing;}
  for(const p of w.pending)p.y=-p.y;
  for(const j of w.jointInputs)for(const key of ['drive','tangentForce'] as const)
    if(j[key]!==undefined)j[key]=-j[key]!;
  return w;
}
export function replayKeeper(input: KeeperWitness, mode: 'center'|'patch',
  opts: {free?:boolean;passiveOnly?:boolean;substeps?:number;partitions?:number[]}={}) {
  const bodies=structuredClone(input.beforeBodies);
  if(bodies.some(b=>b.support?.foot))throw Error('Acquire attachment prefix before replaying a foot');
  const world=new World(bodies,{handContact:mode,substeps:opts.substeps});world.time=input.t;
  world.joints=input.jointInputs.map(flat=>{
    if(flat.kind!=='hands')throw Error('This witness supports acquired hands only');
    const {a,b,actor,holder,...rest}=structuredClone(flat);
    const j:HandJoint={...rest,a:bodies[a],b:bodies[b],
      ...(actor!==undefined?{actor:bodies[actor]}:{}),...(holder!==undefined?{holder:bodies[holder]}:{})};
    j.drive=0; // HAND_MOTOR is off in the saved input; keep it explicitly off.
    if(opts.passiveOnly){j.push=0;j.hold=0;}
    return j;
  });
  for(const p of input.pending)world.strike(bodies[p.a],bodies[p.b],{x:p.x,y:p.y},p.height);
  const intents:Intent[]=opts.free?bodies.map(()=>({vel:{x:0,y:0},free:true})):structuredClone(input.intents);
  const before=totals(bodies);
  const reports=(opts.partitions??[input.dt]).map(dt=>world.step(intents,dt));
  const after=totals(bodies);
  return {mode,options:opts,bodies,joints:world.joints.map(j=>j.kind==='hands'?{
    normalForce:j.normalForce,tangentForce:j.tangentForce,forceOnB:j.forceOnB,
    momentOnA:j.momentOnA,momentOnB:j.momentOnB}:{}),reports,
    angularChange:after.angular-before.angular,
    linearResidual:Math.hypot(after.x-before.x-reports.flatMap(r=>r.groundImpulse).reduce((s,p)=>s+p.x,0),
      after.y-before.y-reports.flatMap(r=>r.groundImpulse).reduce((s,p)=>s+p.y,0)),
    energyChange:after.energy-before.energy,
    clean:reports.every(r=>!r.contacts.length&&!r.strikes.length&&r.groundImpulse.every(p=>Math.hypot(p.x,p.y)<1e-10)
      &&r.groundYawImpulse.every(x=>Math.abs(x)<1e-10))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const w=readWitness();
  const native=Object.fromEntries((['center','patch'] as const).map(mode=>[mode,replayKeeper(w,mode)]));
  const controls=[];
  for(const mirror of [false,true])for(const mode of ['center','patch'] as const)for(const substeps of [1,12,48]) {
    const input=mirror?reflectWitness(w):w;
    controls.push({mirror,substeps,...replayKeeper(input,mode,{free:true,substeps})});
  }
  const result={protocol:'keeper-contact-law-v1',comparisonCommit:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
    witnessSha256:createHash('sha256').update(readFileSync(witnessPath)).digest('hex'),
    worldSha256:createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex'),
    nativeMaximumError:stateError(native.center.bodies,w.expectedAfter),native,controls,
    scope:'Existing center/patch laws only. Free control excludes external torque; native angular change includes ground torque. No football endpoint causation established.'};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({nativeMaximumError:result.nativeMaximumError,
    controls:controls.map(r=>({mode:r.mode,mirror:r.mirror,substeps:r.substeps,clean:r.clean,
      angularChange:r.angularChange,linearResidual:r.linearResidual,
      workResidual:Math.max(...r.reports.map(q=>Math.abs(q.work.residual)))}))}));
}
