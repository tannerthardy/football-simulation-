/** A staged local movement question, not a new football policy or population
 * claim. The actor repeatedly tracks the same owned goal through real World
 * movement, using delayed acquired peer pictures. Teammates keep standing;
 * contacts remain physical. No future route or live peer state is supplied.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {CENTER_Y} from '../../../src/core/field.js';
import {newSupport} from '../../../src/physics/support.js';
import {World,type Intent} from '../../../src/physics/world.js';
import type {Body} from '../../../src/physics/kinematics.js';
import {Agent} from '../../../src/sim/agent.js';
import {track} from '../../../src/sim/behaviors/common.js';
import {movementObjective} from '../../../src/sim/movement-objective.js';
import {PerceptionBuffer} from '../../../src/sim/perception.js';
import {spaceTeammates} from '../../../src/sim/spacing.js';
import {sourceVersion} from '../../source-version.js';

const fixturePath='test/fixtures/traffic-step.json.gz';
const fixture=JSON.parse(gunzipSync(readFileSync(fixturePath)).toString());
const modes=['single','mirror','head-on','cluster','clear'] as const;
export function localPassage(mode:typeof modes[number]) {
  const side=mode==='mirror'?-1:1;
  const own:Body={...structuredClone(fixture.rows[0].body),pos:{x:50,y:CENTER_Y},vel:{x:4,y:0},
    facing:0,energy:1,support:newSupport(),spin:0,squeeze:0};
  const a=new Agent(0,'D','SS',fixture.player,own.profile,own,{kind:'zone',update(){throw Error('The selected goal is supplied, not a new football read');}});
  const goal={x:58,y:CENTER_Y};
  const positions=mode==='clear'?[{x:53,y:CENTER_Y+4}]
    :mode==='cluster'?[{x:53,y:CENTER_Y},...[-1,1].map(n=>({x:52.4,y:CENTER_Y+n*.8}))]
    :mode==='head-on'?[{x:53,y:CENTER_Y}]
    :[{x:53,y:CENTER_Y+side*.1}];
  const peers=positions.map((pos,i)=>{
    const profile=fixture.rows[0].peers[i].profile;
    const body:Body={pos,vel:{x:0,y:0},facing:0,energy:1,profile,support:newSupport(),spin:0};
    return new Agent(i+1,'D','FS',fixture.player,profile,body,{kind:'zone',update(){throw Error('Stationary peer control');}});
  });
  const agents=[a,...peers],world=new World(agents.map(a=>a.body));world.time=2;
  const pictures=new PerceptionBuffer(agents.length,.05);pictures.record(agents);
  const initial=structuredClone(agents.map(a=>a.body)),states=[];
  for(let k=0;k<60;k++) {
    const now=2+k*.05,raw=track(a,goal,{x:0,y:0},{speed:.7,gain:3,facing:0});
    const commands:Intent[]=[raw,...peers.map(()=>({vel:{x:0,y:0},free:true}))];
    const acquired:unknown[]=[];
    spaceTeammates(agents,commands,(_actor,peer)=>{
      const picture=pictures.perceive(peer.idx,.05);acquired.push({peer:peer.idx,picture:structuredClone(picture)});return picture;
    },{now});
    const before=structuredClone(agents.map(a=>a.body)),report=world.step(commands,.05);pictures.record(agents);
    states.push({t:now,before:before.map(b=>({pos:b.pos,vel:b.vel,state:b.support?.state})),raw:{...raw,objective:movementObjective(raw)},
      acquired,command:structuredClone(commands[0]),after:agents.map(a=>({pos:{...a.pos},vel:{...a.vel},state:a.body.support?.state})),
      contacts:report.contacts,workResidual:report.work.residual});
  }
  return {mode,side,goal,initial,states,result:{progress:a.pos.x-50,goalError:Math.hypot(goal.x-a.pos.x,goal.y-a.pos.y),
    lateral:a.pos.y-CENTER_Y,speed:Math.hypot(a.vel.x,a.vel.y),state:a.body.support?.state,
    contactIntervals:states.filter(s=>s.contacts.length).map(s=>({t:s.t,contacts:s.contacts})),
    maximumWorkResidual:Math.max(...states.map(s=>Math.abs(s.workResidual)))}};
}
function main(){
const start=performance.now(),output=process.argv[2];assert.equal(process.argv.length,3,'Usage: local-passage.ts OUTPUT.json');
const source=sourceVersion(),rows=modes.map(localPassage);assert.equal(sourceVersion(),source);
const result={question:'Can the existing local traffic controller pass an acquired stationary teammate and resume its owned goal?',
  source,node:process.version,toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  fixtureSha256:createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),
  limitations:['Staged command/World mechanism test, not natural football transfer.','Peer stance is an ordinary zero request, not frozen or collision-disabled body.',
    'Every actor receives its acquired picture with original delay; no extra physical information enters the controller.','The baseline bounded maneuver is still restricted to existing man/zone behaviors.'],
  rows,wallSeconds:(performance.now()-start)/1000};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,source,rows:rows.map(r=>({mode:r.mode,result:r.result})),wallSeconds:result.wallSeconds},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
