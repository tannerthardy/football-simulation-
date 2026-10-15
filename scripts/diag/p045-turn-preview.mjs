/** Same-body saved-picture movement previews; no native play execution.
 * NATIVE.json.gz INPUTS.json OUTPUT.json
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Agent} from '../../src/sim/agent.ts';
import {track} from '../../src/sim/behaviors/common.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {sourceVersion} from '../source-version.ts';
const [tracePath,inputPath,out]=process.argv.slice(2),began=performance.now(),
 read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 tape=read(tracePath),frozen=read(inputPath),clip=tape.clips.find(c=>c.id==='spread-air/P45'),
 setup=frozen.clips.find(c=>c.id==='spread-air/P45').setup,rows=[];
assert.equal(sourceVersion(),'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54');
for(const t of [1.15,1.35,1.55]){
 const row=clip.rows.find(r=>r.t===t),decision=row.raw.find(r=>r.actor===18),
  cue=row.cues.slice(decision.cueStart,decision.cueEnd).filter(q=>q.target===8).at(-1).picture,
  body=structuredClone(row.world.before[18]),player=setup.defense.CB_W,
  a=new Agent(18,'D','CB_W',player,body.profile,body,{kind:'idle',update:()=>({vel:{x:0,y:0}})});
 for(const synthetic of [false,...(t===1.35?[true]:[])]){
  const seen=structuredClone(cue);if(synthetic){seen.vel={x:0,y:-5};seen.facing=-Math.PI/2;}
  const before=structuredClone(body),technique=decision.man,deep=seen.pos.x-setup.los,
   cushion=Math.max(1,Math.min(5.5,technique.initialCushion)*(1-Math.min(1,Math.max(0,deep)/8))+Math.min(1,Math.max(0,deep)/8)),
   inside=Math.sign(setup.ballY-seen.pos.y)||1,
   target={x:seen.pos.x+(seen.vel.x>3&&deep>3?cushion*.5:technique.hipsOpen?0:cushion),y:seen.pos.y-inside*.7},
   high=2+a.r('manCoverage'),align=(1+Math.cos(body.facing-Math.atan2(seen.vel.y,seen.vel.x)))/2,
   openingGain=1.6+(high-1.6)*align,
   models=[['original',technique.hipsOpen?high:1.6,technique.hipsOpen?undefined:Math.PI],
    ['turn-same-gain',1.6,undefined],
    ['turn-alignment-gain',technique.hipsOpen?openingGain:1.6,technique.hipsOpen?undefined:Math.PI]];
  const results=[];
  for(const [name,gain,facing] of models){
   const command=track(a,target,seen.vel,{gain,facing,cutSkill:technique.hipsOpen?.85+.35*a.r('manCoverage'):undefined});
   if(!synthetic&&name==='original')assert.ok(Math.hypot(command.vel.x-decision.request.vel.x,command.vel.y-decision.request.vel.y)<1e-9,'Saved straight-stem request reconstruction drift');
   const samples=previewFreeMovement(body,command,t,12);assert.deepEqual(body,before,'Preview mutated source');
   const end=samples.at(-1),goal={x:target.x+seen.vel.x*end.t,y:target.y+seen.vel.y*end.t};
   results.push({name,gain,command,samples,endErrorToMovingGoal:Math.hypot(end.pos.x-goal.x,end.pos.y-goal.y),
    endForwardLead:end.pos.x-(seen.pos.x+seen.vel.x*end.t),endVelocityError:Math.hypot(end.vel.x-seen.vel.x,end.vel.y-seen.vel.y)});
  }
  rows.push({t,kind:synthetic?'fresh-crossing-picture-control':'native-straight-picture',body:before,picture:seen,target,
   man:technique,player,models:results,limits:synthetic?'Counterfactual acquired break on the same body; not an observed native event.':undefined});
 }
}
const result={schema:'p045-cushion-turn-preview-v1',sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),
 nativeTapeSha256:hash(tracePath),inputSha256:hash(inputPath),rows,newNativePlays:0,seconds:(performance.now()-began)/1000,
 limits:'Complete saved body/support; same acquired picture and objective. World predicts held commands in empty space for .6 s, not contact, opponent response, future cuts, or a native ending. Native straight X torso is zero; no new perception/online learning. Turn-same-gain at 1.15 is an explicit causal yaw-only ablation, not a proposed timing rule.'};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,seconds:result.seconds,rows:rows.map(r=>({t:r.t,kind:r.kind,models:r.models.map(m=>({name:m.name,gain:m.gain,request:m.command.vel,end:m.samples.at(-1),error:m.endErrorToMovingGoal,velocityError:m.endVelocityError}))}))}));
