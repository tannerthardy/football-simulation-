/** Frozen World input only. Verifies native/reduced replay and provides a
 * separately labelled free-motion angular-law control. Never changes a law. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { World, type Intent } from '../../src/physics/world.js';
import type { Body } from '../../src/physics/kinematics.js';
import { supportParams } from '../../src/physics/support.js';

type Flat = Record<string, any>;
const clone = <T>(v: T): T => structuredClone(v);
const error = (a: Body[], b: Body[]) => Math.max(...a.flatMap((q, i) => [
  Math.abs(q.pos.x-b[i].pos.x),Math.abs(q.pos.y-b[i].pos.y),Math.abs(q.vel.x-b[i].vel.x),Math.abs(q.vel.y-b[i].vel.y),
  Math.abs(q.facing-b[i].facing),Math.abs((q.spin??0)-(b[i].spin??0))]));
function execute(input: Flat, ids: number[], mode: 'native'|'no-drive'|'free'|'free-no-drive' = 'native') {
  const bodies: Body[] = ids.map(i => clone(input.beforeBodies[i]));
  assert(!bodies.some(b => b.support?.foot), 'Replay attachment prefix before reducing an acquired foot');
  const world = new World(bodies, { handContact: 'center' }); world.time = input.t;
  world.joints = input.jointInputs.filter((j: Flat) => ids.includes(j.a) && ids.includes(j.b)).map((flat: Flat) => {
    const j = clone(flat);
    for (const key of ['a','b','actor','holder']) if (typeof j[key] === 'number') j[key] = bodies[ids.indexOf(j[key])];
    if (mode.includes('no-drive') && j.kind === 'hands') j.drive = 0;
    return j;
  }) as World['joints'];
  for (const p of input.pending) if (ids.includes(p.a) && ids.includes(p.b))
    world.strike(bodies[ids.indexOf(p.a)],bodies[ids.indexOf(p.b)],{x:p.x,y:p.y},p.height);
  const totals = () => ({ x: bodies.reduce((s,b)=>s+b.profile.massKg*b.vel.x,0), y:bodies.reduce((s,b)=>s+b.profile.massKg*b.vel.y,0),
    angular:bodies.reduce((s,b)=>s+b.profile.massKg*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+supportParams(b.profile).yawInertia*(b.spin??0),0) });
  const before=totals(), intents: Intent[]=ids.map(i=>mode.startsWith('free') ? {vel:{x:0,y:0},free:true} : clone(input.intents[i]));
  const report=world.step(intents,input.dt), after=totals();
  return { bodies, report, joints:world.joints.map(j=>({kind:j.kind,...(j.kind==='hands'?{drive:j.drive,normalForce:j.normalForce,tangentForce:j.tangentForce}:{})})),
    linearResidual:Math.hypot(after.x-before.x-report.groundImpulse.reduce((s,p)=>s+p.x,0),after.y-before.y-report.groundImpulse.reduce((s,p)=>s+p.y,0)),
    angularChange:after.angular-before.angular };
}
if (process.argv[2] === '--witness') {
  const saved = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const input = { ...saved, afterBodies: saved.expectedAfter }, all = saved.beforeBodies.map((_b: Body, i: number) => i);
  const driven = execute(input, all), noDrive = execute(input, all, 'no-drive');
  const maximumError = error(driven.bodies, saved.expectedAfter);
  const worldSha256 = createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex');
  if (worldSha256 === saved.worldSha256) assert(maximumError < 1e-9, `Frozen native witness error ${maximumError}`);
  const pair = saved.lawPair.map((slot: string) => saved.slots.indexOf(slot));
  const free = execute(input, pair, 'free'), undriven = execute(input, pair, 'free-no-drive');
  const clean = (r: typeof free) => !r.report.contacts.length && !r.report.strikes.length
    && r.report.groundImpulse.every(p => Math.hypot(p.x,p.y)<1e-10)
    && r.report.groundYawImpulse.every(x => Math.abs(x)<1e-10);
  const result = { worldSha256, referenceWorldSha256: saved.worldSha256, maximumError,
    driven, noDrive, freeControl: { clean: clean(free) && clean(undriven), driven: free, undriven } };
  if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ worldSha256, maximumError, freeAngular: free.angularChange,
    undrivenFreeAngular: undriven.angularChange, freeControlClean: result.freeControl.clean, freeGround: free.report.groundImpulse,
    freeContacts: free.report.contacts.length }));
  process.exit(0);
}
const [path,id,timeText,slotsText,output]=process.argv.slice(2);
const packet=JSON.parse(gunzipSync(readFileSync(path)).toString());
const play=packet.panel.find((p:Flat)=>p.input.id===id), frame=play.frames.find((f:Flat)=>Math.abs(f.t-Number(timeText))<1e-8);
const input={t:frame.t,dt:frame.after-frame.t,...frame.physicsInput}, ids:number[]=slotsText.split(',').map(slot=>play.players.find((p:Flat)=>p.slot===slot).id);
const all=input.beforeBodies.map((_b:Body,i:number)=>i), full=execute(input,all);
const nativeError=error(full.bodies,input.afterBodies);assert(nativeError<1e-9,`Native replay error ${nativeError}`);
// Close the selected group over real constraints and delivered contacts.
let changed=true;while(changed){changed=false;for(const e of [...input.jointInputs,...input.report.contacts,...input.pending]){
  if(ids.includes(e.a)!==ids.includes(e.b)){ids.push(ids.includes(e.a)?e.b:e.a);changed=true;}
}}
ids.sort((a,b)=>a-b);
const reduced=execute(input,ids), reducedError=error(reduced.bodies,ids.map(i=>input.afterBodies[i]));
assert(reducedError<1e-9,`Reduced replay error ${reducedError}; retain larger native group`);
const map=(v:number)=>ids.indexOf(v);
const compact={protocol:'native-hand-action-world-witness-v1',input:play.input,provenance:packet.provenance,t:input.t,dt:input.dt,
  worldSha256:createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex'),
  slots:ids.map(i=>play.players[i].slot),beforeBodies:ids.map(i=>input.beforeBodies[i]),intents:ids.map(i=>input.intents[i]),
  jointInputs:input.jointInputs.filter((j:Flat)=>ids.includes(j.a)&&ids.includes(j.b)).map((j:Flat)=>{
    const q=clone(j);for(const k of ['a','b','actor','holder'])if(typeof q[k]==='number')q[k]=map(q[k]);return q;}),
  pending:input.pending.filter((j:Flat)=>ids.includes(j.a)&&ids.includes(j.b)).map((j:Flat)=>({...j,a:map(j.a),b:map(j.b)})),
  expectedAfter:ids.map(i=>input.afterBodies[i]),nativeError,reducedError,
  noDrive:execute(input,ids,'no-drive'),native:reduced};
// Only the nominated pair is used for this independent law control. It is
// NOT a native football replay: free=true removes the ground reaction.
const pair=slotsText.split(',').map(slot=>play.players.find((p:Flat)=>p.slot===slot).id);
const free=execute(input,pair,'free'), freeNoDrive=execute(input,pair,'free-no-drive');
const clean=(r:typeof free)=>!r.report.contacts.length&&!r.report.strikes.length&&r.report.groundImpulse.every(p=>Math.hypot(p.x,p.y)<1e-10)&&r.report.groundYawImpulse.every(x=>Math.abs(x)<1e-10);
Object.assign(compact,{angularLawControl:{label:'Native bodies/hand request, free-motion counterfactual; not a football outcome',clean:clean(free)&&clean(freeNoDrive),
  driven:free,undriven:freeNoDrive}});
writeFileSync(output,JSON.stringify(compact,null,2)+'\n');
console.log(JSON.stringify({id,t:input.t,slots:compact.slots,nativeError,reducedError,
  freeAngularClean:clean(free)&&clean(freeNoDrive),freeAngularChange:free.angularChange,freeNoDriveAngularChange:freeNoDrive.angularChange}));
