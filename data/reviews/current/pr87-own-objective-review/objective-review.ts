import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Agent} from './src/sim/agent.js';
import {track} from './src/sim/behaviors/common.js';
import {containCoverage} from './src/sim/coverage-space.js';
import {movementObjective,withMovementObjective} from './src/sim/movement-objective.js';
import {spaceTeammates} from './src/sim/spacing.js';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./test/fixtures/traffic-step.json.gz',import.meta.url))).toString());
const row=fixture.rows.at(-1);
function actor(shift=0){
 const body=structuredClone(row.body);body.pos.y+=shift;
 return new Agent(21,'D','SS',fixture.player,body.profile,body,{kind:'zone',update(){throw Error('No repeat decision');}});
}
const a=actor(),velocity={x:0,y:0};
const inside=track(a,{x:40.3,y:22},velocity);
assert.deepEqual(movementObjective(inside),{kind:'moving',point:{x:40.3,y:22},velocity});
const lower=track(a,{x:40.3,y:-.1},velocity),clamped=track(a,{x:40.3,y:.3},velocity);
assert.deepEqual(lower.vel,clamped.vel);
assert.notDeepEqual(movementObjective(lower),movementObjective(clamped));
function spacing(normalized:boolean){
 const shift=3.5-row.body.pos.y,own=actor(shift),p=row.peers.find((p:any)=>p.idx===19),seen=structuredClone(p.seen);
 seen.pos.y+=shift;
 assert.ok(seen.pos.y>0);
 const peer={idx:19,team:'D',profile:p.profile,get pos(){throw Error('Private position');},get vel(){throw Error('Private velocity');}} as unknown as Agent;
 const raw=containCoverage(own,track(own,{x:40.3,y:-.1},velocity));
 const command=normalized?withMovementObjective(raw,{kind:'moving',point:{x:40.3,y:.3},velocity}):raw;
 const intents=[command,{vel:{x:0,y:0},free:true}];let reads=0;
 spaceTeammates([own,peer],intents,()=>{reads++;return seen;},{now:row.t});
 assert.equal(reads,1);
 return {ownPosition:own.pos,peerPicture:seen,rawVelocity:raw.vel,selectedVelocity:intents[0].vel,objective:movementObjective(intents[0])};
}
const supplied=spacing(false),effective=spacing(true);
assert.deepEqual(supplied.rawVelocity,effective.rawVelocity);
console.log(JSON.stringify({kind:'bounded metadata review; synthetic sideline translation, not a play outcome',interior:movementObjective(inside),lowerCommand:lower.vel,lowerGoal:movementObjective(lower),clampedGoal:movementObjective(clamped),supplied,effective,spacingSelectionChanged:JSON.stringify(supplied.selectedVelocity)!==JSON.stringify(effective.selectedVelocity)},null,2));
