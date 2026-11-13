/** Bare single-body World capability control. No controller ticks or games. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CENTER_Y} from '../../../../src/core/field.js';
import {Rng} from '../../../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../../../src/league/team.js';
import {RUN_BY_ID} from '../../../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../../../src/playbook/formations.js';
import {World} from '../../../../src/physics/world.js';
import {PlaySim} from '../../../../src/sim/playsim.js';
import {sourceVersion} from '../../../../scripts/source-version.js';
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const sourceBefore=sourceVersion(),worldBefore=hash(readFileSync('src/physics/world.ts'));
const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),FORMATION_BY_ID.ace_11.personnel),
 defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
 offCall:{formation:FORMATION_BY_ID.ace_11,flip:false,kind:'run',run:RUN_BY_ID.wz_strong,label:'wz_strong'},
 defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
 los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
const INPUT={rosterSeeds:[31,32],slots:['LT','LG','C','RG','RT'],modes:['center','patch'],substeps:12,dt:.05,ticks:10,
 cases:[{name:'ordinary',request:1.7,facing:0},{name:'max-side',request:'vmax',facing:0},
 {name:'max-open',request:'vmax',facing:Math.PI/4},{name:'called-tempo',request:'.45*vmax',facing:Math.PI/4}]};
const rows:any[]=[];
for(const slot of INPUT.slots)for(const mode of INPUT.modes)for(const c of INPUT.cases){
 const native=sim.slot(slot)!,body=structuredClone(native.body);body.pos={x:0,y:0};body.vel={x:0,y:0};body.facing=0;body.spin=0;
 delete body.support;body.energy=1;
 const world=new World([body],{substeps:INPUT.substeps,handContact:mode as 'center'|'patch'}),profile=structuredClone(body.profile);
 const wanted=typeof c.request==='number'?c.request:c.request==='vmax'?profile.vmax:.45*profile.vmax;
 const samples:any[]=[];
 for(let k=0;k<INPUT.ticks;k++){
  const report=world.step([{vel:{x:0,y:wanted},facing:c.facing,cutSkill:.8+.3*native.r('runBlock')}],INPUT.dt);
  assert(!report.contacts.length);assert(!report.falls.length);assert(Math.abs(report.work.residual)<1e-8);
  samples.push({t:(k+1)*INPUT.dt,y:body.pos.y,vy:body.vel.y,facing:body.facing,groundImpulse:report.groundImpulse[0],yawImpulse:report.groundYawImpulse[0],availability:body.support?.xi});
 }
 rows.push({slot,mode,case:c.name,wanted,facing:c.facing,profile,samples,tempoStraightPredictionAtPoint2:wanted*.2});
}
const sourceAfter=sourceVersion(),worldAfter=hash(readFileSync('src/physics/world.ts'));assert.equal(sourceBefore,sourceAfter);assert.equal(worldBefore,worldAfter);
const median=(xs:number[])=>{const ys=xs.sort((a,b)=>a-b);return ys[Math.floor(ys.length/2)];};
const summaries=INPUT.modes.flatMap(mode=>INPUT.cases.map(c=>{
 const qs=rows.filter(r=>r.mode===mode&&r.case===c.name);
 return {mode,case:c.name,medianPoint2Y:median(qs.map(r=>r.samples[3].y)),medianPoint2Vy:median(qs.map(r=>r.samples[3].vy)),
 medianPoint5Y:median(qs.map(r=>r.samples[9].y)),medianPoint5Vy:median(qs.map(r=>r.samples[9].vy)),
 medianTempoStraightPredictionAtPoint2:median(qs.map(r=>r.tempoStraightPredictionAtPoint2))};
}));
const output = process.argv[2] ?? 'out/zone-motion-envelope.json';
mkdirSync(dirname(output), {recursive:true});
writeFileSync(output,JSON.stringify({sourceBefore,sourceAfter,worldBefore,worldAfter,
 collectorSha256:hash(readFileSync(import.meta.filename)),inputSha256:hash(JSON.stringify(INPUT)),INPUT,summaries,rows}));
console.log(JSON.stringify({sourceBefore,worldBefore,summaries}));
