// One existing seed per style; stop at 3 s. Diagnostic only; never a panel pass.
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const imp=p=>import(pathToFileURL(join(process.cwd(),p)).href);
const [{HASH_LEFT_Y},{Rng},{generateTeam,pickDefense,pickOffense},{PASS_BY_ID},{COVERAGE_BY_ID,FRONT_BY_ID},{FORMATION_BY_ID},{goTo},{ZoneCoverage},{PlaySim},{sourceVersion}]=await Promise.all(['src/core/field.ts','src/core/rng.ts','src/league/team.ts','src/playbook/concepts.ts','src/playbook/defense.ts','src/playbook/formations.ts','src/sim/behaviors/common.ts','src/sim/behaviors/defense.ts','src/sim/playsim.ts','scripts/source-version.ts'].map(imp));
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
if(JSON.stringify(flags)!==JSON.stringify(profile.flags)||Object.keys(flags).length!==44||process.version!=='v22.23.3')throw Error('Accepted settings required');
const home=generateTeam(new Rng(21),'Home','HOM',{strength:.6}),away=generateTeam(new Rng(22),'Away','AWY',{strength:.6}),formation=FORMATION_BY_ID.gun_doubles_11;
const output={schema:'coverage-gap-prefix-diagnostic-v1',question:'Does the preserved relative gap failure reflect a lost match carry or changed spot lane choice? One seed cannot certify the 24-seed contract.',sourceSha256:sourceVersion(),harnessSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),originalContractSha256:createHash('sha256').update(readFileSync('test/integration/coverage-panel.test.ts')).digest('hex'),flags,worldDefaults:profile.worldDefaults,node:process.version,seed:1,rosterSeeds:[21,22],stopT:3,fullPlays:0,games:0,styles:[]};
for(const style of ['match','spot']){
 const sim=new PlaySim({offense:pickOffense(home,formation.personnel),defense:pickDefense(away,'nickel'),offCall:{formation,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'four_verts'},defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,zoneStyle:style,label:'cover3'},los:35,ballY:HASH_LEFT_Y,firstDownX:45,seed:1,record:true});
 const spot={x:28,y:HASH_LEFT_Y};sim.qb.behavior={kind:'qb-hold',update:a=>goTo(a,spot,{facing:0,speed:.5})};
 const hooks=sim.defense.filter(a=>a.behavior instanceof ZoneCoverage&&a.behavior.zone.startsWith('hook')&&!a.tags.has('matchBust')),ids=new Set(hooks.map(a=>a.idx)),decisions=[],update=ZoneCoverage.prototype.update;
 ZoneCoverage.prototype.update=function(a,s){const before=structuredClone(a.body),q=update.call(this,a,s);if(ids.has(a.idx))decisions.push({t:s.t,actor:a.idx,zone:this.zone,style:this.style,landmark:this.recordedLandmark(),privateRead:s.qbEyes?.idx??null,target:this.target?.idx??null,before,request:structuredClone(q)});return q;};
 sim.event('snap',sim.slot('C')??sim.qb);
 try{while(sim.phase==='live'&&sim.t<3)sim.tick();}finally{ZoneCoverage.prototype.update=update;}
 const frames=sim.frames.filter(f=>f.t<=3),inside=['Y','H'].map(s=>sim.slot(s).idx),at=frames.find(f=>f.t>=2.4)??frames.at(-1),pos=(f,i)=>({x:f.agents[i*3],y:f.agents[i*3+1]});
 const gaps=inside.flatMap(w=>{const f=frames.find(fr=>pos(fr,w).x-35>=14);return f?[{receiver:w,t:f.t,gap:Math.min(...hooks.map(h=>Math.hypot(pos(f,w).x-pos(f,h.idx).x,pos(f,w).y-pos(f,h.idx).y)))}]:[]});
 const depth=hooks.map(h=>({actor:h.idx,depth:pos(at,h.idx).x-35,landmarkDepth:h.behavior.recordedLandmark().x-35}));let facing=0,n=0;
 for(const f of frames.filter(f=>f.t>=1.6))for(const h of hooks){const a=pos(f,h.idx),q=pos(f,sim.qb.idx);facing+=Math.cos(f.agents[h.idx*3+2]-Math.atan2(q.y-a.y,q.x-a.x))>.5?1:0;n++;}
 output.styles.push({style,phase:sim.phase,endT:sim.t,ticks:decisions.length/hooks.length,hookIds:[...ids],gaps,depthAt24:depth,facingQB:facing/Math.max(1,n),decisions,frames:frames.map(f=>({t:f.t,agents:f.agents}))});
}
const dest=process.argv[2];mkdirSync(join(dest,'..'),{recursive:true});writeFileSync(dest,JSON.stringify(output)+'\n');console.log(JSON.stringify(output.styles.map(s=>({style:s.style,endT:s.endT,gaps:s.gaps,depthAt24:s.depthAt24,facingQB:s.facingQB}))));
