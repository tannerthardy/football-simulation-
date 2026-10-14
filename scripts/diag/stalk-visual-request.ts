/** Baseline/candidate actual-controller evidence plus unchanged free actuation.
 * No shadow controller, contact solve, game or football-ending claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {stalkRequest,type StalkWitness} from '../../test/support/stalk-visual-request.js';
import {stepBody} from '../../src/physics/kinematics.js';
import {sourceVersion} from '../source-version.js';
const [mode,input='config/stalk-visual-request-witness.json',output='out/stalk-visual-request/result.json']=process.argv.slice(2);
assert.ok(mode==='accepted'||mode==='candidate');
const bytes=readFileSync(input),f=JSON.parse(bytes.toString())as StalkWitness;
const hash=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,profile.flags);assert.equal(flags.RUN_CONTACT_COMPONENTS,'1');
const rows={held:stalkRequest(f),hidden:stalkRequest(f,{hiddenY:.25}),fresh:stalkRequest(f,{fresh:true}),
 visible:stalkRequest(f,{fresh:true,visibleY:.25}),shiftedFresh:stalkRequest(f,{fresh:true,visibleY:.25,hiddenY:.25}),
 contact:stalkRequest(f,{near:true})};
const difference=(a:typeof rows.held,b:typeof rows.held)=>Math.hypot(a.command.vel.x-b.command.vel.x,a.command.vel.y-b.command.vel.y);
assert.deepEqual(rows.fresh.command,f.recordedMovementCommand);
assert.equal(rows.contact.engageCalls,1);assert.equal(rows.contact.visualCalls,0);
if(mode==='accepted'){
 assert.equal(sourceVersion(),'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54');
 assert.equal(rows.held.visualCalls,0);assert.ok(difference(rows.held,rows.hidden)>0);
 assert.equal(difference(rows.fresh,rows.visible),0);
}else{
 assert.equal(rows.held.visualCalls,1);assert.equal(difference(rows.held,rows.hidden),0);
 assert.ok(difference(rows.fresh,rows.visible)>0);assert.deepEqual(rows.visible.command,rows.shiftedFresh.command);
}
// PR #24's held input is a synthetic picture. Separately show what the normal
// buffer's projection of that archived raw sample would supply; never add age
// to a production Perceived.pos. This is not a native historical observation.
const projected=structuredClone(f.presentedPicture),age=projected.age??0;
projected.pos.x+=projected.vel.x*age;projected.pos.y+=projected.vel.y*age;
const projectedControl=stalkRequest(f,{picture:projected});
const analysis=Object.fromEntries(Object.entries({...rows,projected:projectedControl}).filter(([k])=>k!=='contact').map(([key,r])=>{
 const body=structuredClone(f.actor.body),before=structuredClone(body);
 stepBody(body,r.command,.05);
 const fit={x:Math.max(r.picture.pos.x-1.2,before.pos.x),y:r.picture.pos.y};
 const fitDistance=Math.hypot(fit.x-before.pos.x,fit.y-before.pos.y),brake=.8*before.profile.brake;
 return [key,{fit,fitDistance,unchangedBrakingLimit:Math.sqrt(1+2*brake*Math.max(0,fitDistance-.15)),
  requested:r.command,knownTargetLateralVelocity:r.picture.vel.y,
  requestedRelativeLateralOpening:r.picture.vel.y-r.command.vel.y,
  freeStep:{dt:.05,before,after:body,achievedDelta:{x:body.pos.x-before.pos.x,y:body.pos.y-before.pos.y},
   acceleration:{x:(body.vel.x-before.vel.x)/.05,y:(body.vel.y-before.vel.y)/.05}}}];
}));
const record={schema:'stalk-visual-request-v1',mode,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),harnessSha256:hash(readFileSync(import.meta.filename)),
 supportSha256:hash(readFileSync('test/support/stalk-visual-request.ts')),input:{path:input,sha256:hash(bytes)},
 originPR:'https://github.com/tannerthardy/football-simulation-/pull/24',sourceBase:f.sourceBase,
 historicalComparison:f.comparisonBaseline,node:process.version,flags,worldDefaults:profile.worldDefaults,
 hiddenResponse:difference(rows.held,rows.hidden),visibleResponse:difference(rows.fresh,rows.visible),
 rows,analysis,freeSteps:7,worldTicks:0,newPlays:0,newGames:0,
 limits:'Held input and hidden/visible substitutions are synthetic controller controls. Projection control reconstructs the normal dead-reckoning operator from an archived sample; it is not the actual native perception history. Free steps have no contact loads and are not native continuations or tackle/block endings.'};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({mode,output,hiddenResponse:record.hiddenResponse,visibleResponse:record.visibleResponse,
 heldLateral:rows.held.command.vel.y,freshLateral:rows.fresh.command.vel.y,projectedLateral:projectedControl.command.vel.y}));
