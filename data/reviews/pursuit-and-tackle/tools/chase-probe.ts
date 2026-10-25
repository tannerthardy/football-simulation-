import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {CENTER_Y,FIELD_WIDTH} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.js';
import {PASS_BY_ID} from '../../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {chase} from '../../src/sim/behaviors/common.js';
import {World} from '../../src/physics/world.js';
import {newSupport,availability,supportParams} from '../../src/physics/support.js';
import {fatigueFactor} from '../../src/physics/kinematics.js';
import {sourceVersion} from '../../scripts/source-version.js';
const sourceBefore=sourceVersion(),moduleBefore=createHash('sha256').update(readFileSync('src/sim/behaviors/common.ts')).digest('hex');
const out=process.env.APPROACH_AUDIT_OUT??'out/tackle-approach-current/baseline.json';
const make=()=>new PlaySim({offense:pickOffense(generateTeam(new Rng(19),'O','OFF'),'11'),defense:pickDefense(generateTeam(new Rng(20),'D','DEF'),'nickel'),offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'approach audit'},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'audit'},los:40,ballY:CENTER_Y,firstDownX:50,seed:83});
function history(sim:PlaySim){for(let k=0;k<24;k++){const lag=(23-k)*.05;sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})));}}
function setup(spec:any){const sim=make(),a=sim.slot('FS')!,c=sim.slot('Z')!;sim.t=2;sim.world.time=2;
 c.body.pos={x:50,y:CENTER_Y+spec.y};c.body.vel={x:spec.cvx,y:spec.side*spec.cvy};c.body.facing=Math.atan2(c.vel.y,c.vel.x);c.body.support=newSupport();
 a.body.pos={x:50+spec.dx,y:c.pos.y+spec.side*spec.dy};a.body.vel={x:spec.avx,y:spec.side*spec.avy};a.body.facing=spec.facing??Math.atan2(c.pos.y-a.pos.y,c.pos.x-a.pos.x);a.body.support=newSupport();a.body.energy=spec.energy??1;
 a.runFit={kind:spec.role??'alley',side:spec.side,gap:'D',technique:'attack',edge:'box',pace:'stack'};
 a.mind.update(2,.5,a.body.energy,spec.workload??0);history(sim);return {sim,a,c};}
const specs:any[]=[];
for(const side of [-1,1])for(const ratio of [.6999,.7001])specs.push({id:`cone-${side}-${ratio}`,side,y:0,dx:6,dy:0,avx:0,avy:0,cvx:6*ratio,cvy:6*Math.sqrt(1-ratio*ratio)});
for(const side of [-1,1])for(const role of ['force','alley'])specs.push({id:`role-${role}-${side}`,side,role,y:side*12,dx:4,dy:1.5,avx:0,avy:0,cvx:6,cvy:0});
for(const energy of [1,.35])for(const speed of [0,-6])specs.push({id:`incoming-energy${energy}-v${speed}`,side:1,y:0,dx:4,dy:0,avx:speed,avy:0,cvx:6,cvy:0,energy,workload:energy===1?0:1});
specs.push({id:'crossing-fast',side:1,y:0,dx:4,dy:-3,avx:-7,avy:0,cvx:2,cvy:6},{id:'escaping-faster',side:1,y:0,dx:-4,dy:0,avx:6,avy:0,cvx:8,cvy:0},{id:'late-observed-cut',side:1,y:0,dx:4,dy:-3,avx:-7,avy:0,cvx:2,cvy:6,cut:true});
const trials=[];
for(const spec of specs){const {sim,a,c}=setup(spec),initial={actor:structuredClone(a.body),carrier:structuredClone(c.body),focus:a.mind.focus,stress:a.mind.stress,speedScale:a.speedScale,supportAvailability:availability(a.body.support!,supportParams(a.profile),fatigueFactor(a.body.energy))},cmd=chase(sim,a,c),world=new World([a.body,c.body]);world.time=sim.t;
 const rows=[];let closest=Math.hypot(c.pos.x-a.pos.x,c.pos.y-a.pos.y),firstContact:null|number=null,maxWork=0;
 for(let k=0;k<16;k++){const requested=k===0?cmd:chase(sim,a,c);const carrierCommand=spec.cut&&k>=6?{vel:{x:spec.cvx,y:-spec.side*spec.cvy}}:{vel:{x:spec.cvx,y:spec.side*spec.cvy}};
  const seenBefore=sim.see(a,c,(.12+.12*(1-a.r('awareness')))/Math.max(.1,a.profile.reactionTime));const r=world.step([requested,carrierCommand],sim.dt);sim.t+=sim.dt;sim.perception.record(sim.agents);
  const distance=Math.hypot(c.pos.x-a.pos.x,c.pos.y-a.pos.y);closest=Math.min(closest,distance);if(r.contacts.length&&firstContact===null)firstContact=(k+1)*sim.dt;maxWork=Math.max(maxWork,Math.abs(r.work.residual));
  rows.push({t:(k+1)*sim.dt,requested,seenBefore,actor:{pos:{...a.pos},vel:{...a.vel},facing:a.facing,support:a.body.support?.state},carrier:{pos:{...c.pos},vel:{...c.vel}},distance,contacts:r.contacts.length});
 }
 trials.push({spec,initial,command:cmd,requestedSpeed:Math.hypot(cmd.vel.x,cmd.vel.y),closest,firstContact,maxWork,rows});
}
const hidden=[];
for(const liveY of [CENTER_Y-10,CENTER_Y+10]){const f=setup({side:1,y:0,dx:4,dy:-3,avx:-7,avy:0,cvx:2,cvy:6});f.c.body.pos.y=liveY;hidden.push({liveY,command:chase(f.sim,f.a,f.c),rngNext:f.sim.rng.nextU32()});}
const sourceAfter=sourceVersion();writeFileSync(out,JSON.stringify({sourceBefore,sourceAfter,moduleBefore,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),scope:'15 deterministic reduced 2-body World approaches and hidden-picture controls; known profiles/roles, delayed movement, no actual tackle acquisition. Not NFL frequencies or native11v11 outcomes.',trials,hidden}));console.log(JSON.stringify({out,sourceBefore,sourceAfter,trials:trials.map(x=>({id:x.spec.id,speed:x.requestedSpeed,closest:x.closest,contact:x.firstContact,work:x.maxWork})),hidden}));
