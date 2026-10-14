/** Independent unchanged-World reference. Kernel is deliberately not imported. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {World} from '../../../src/physics/world.js';
import {sourceVersion} from '../../source-version.js';
import {prescribeBoundedSupport} from './grip-bounded-fixtures.js';
import {mixedCases,prepareMixedCase,sha} from './grip-mixed-fixtures.js';
const root='out/grip-mixed';mkdirSync(root,{recursive:true});
const source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
const original=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
if(JSON.stringify(flags)!==JSON.stringify(original.flags))throw Error('Reference settings changed');
const arg=(name:string,fallback:number)=>Number(process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback),
  coarseCount=arg('coarse',32768),fineCount=arg('fine',65536);
if(!Number.isInteger(coarseCount)||fineCount!==2*coarseCount||coarseCount<1||fineCount>1048576)throw Error('Invalid bounded reference budget');
const energy=(b:any)=>.5*b.mass*(b.vel.x*b.vel.x+b.vel.y*b.vel.y)+.5*b.inertia*b.spin*b.spin,
  angular=(b:any)=>b.mass*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+b.inertia*b.spin,
  norm=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y);
if(process.argv.includes('--combine')) {
  const paths=[`${root}/reference-32768-65536.json`,`${root}/reference-controls-32768-65536.json`],
    docs=paths.map(p=>JSON.parse(readFileSync(p,'utf8'))),cases=docs.flatMap(d=>d.cases);
  if(cases.length!==4||cases.some((c:any)=>!c.physical||!c.convergence.converged)
    ||docs.some(d=>d.source!==source||JSON.stringify(d.flags)!==JSON.stringify(flags)
      ||d.helperSha256!==sha(readFileSync(new URL('./grip-mixed-fixtures.ts',import.meta.url)))
      ||d.boundaryHelperSha256!==sha(readFileSync(new URL('./grip-bounded-fixtures.ts',import.meta.url)))))
    throw Error('Incompatible mixed references');
  writeFileSync('config/grip-mixed-reference.json',JSON.stringify({...docs[1],cases,failures:[],
    collections:paths.map((p,i)=>({path:p,sha256:sha(readFileSync(p)),collectorSha256:docs[i].collectorSha256,commit:docs[i].commit})),
    accuracy:{position:5e-7,velocity:2.5e-5,facing:2.5e-6,spin:2.5e-4,attachment:5e-7,legs:1e-6,work:.01,referenceAllowance:1/16}},null,2)+'\n');
  process.exit(0);
}
function run(c:(typeof mixedCases)[number],n:number) {
  const started=performance.now(),v=prepareMixedCase(c),{w,p,joint,attachment,input}=v,H=input.duration,h=H/n,
    before={work:p.args[5].work.grasps,motor:p.args[5].supportMotorWork[v.ib],passive:p.args[5].passiveGraspWork,
      contacts:p.args[5].work.contacts,ground:structuredClone(p.args[5].groundImpulse)},rows=w.jointRows;
  let row:any,capUntil=0,slidingUntil=0,normalDose=0,reelDose=0,maxCapExcess=0,minMobility=Infinity,maxCross=0,normalImpulse=0,tangentImpulse=0;
  const sum={x:0,y:0,qx:0,qy:0,ja:0,jb:0,qa:0,qb:0,dose:0},trace:any[]=[];
  w.jointRows=function(dt:number){const r=rows.call(this,dt);if(r.length!==1)throw Error('Contact graph expanded');row=r[0];return r;};
  for(let k=0;k<n;k++) {
    const args=[...p.args];args[3]=h;args[4]=p.args[4]-k*h;row=undefined;
    w.integrateSubstep(...args);if(!row)throw Error('Missing physical grip row');
    const {nx,ny,ln,lt,reel,limit}=row,x=nx*ln-ny*lt,y=ny*ln+nx*lt,
      ja=(row.ni??0)*ln-(row.ri??0)*lt,jb=(row.nj??0)*ln-(row.rj??0)*lt,q=H-(k+.5)*h,
      dose=Math.hypot(ln-reel,lt),map=w.graspJacobian(joint),
      jnx=map.xx*nx+map.xy*ny,jny=map.xy*nx+map.yy*ny,
      jtx=-map.xx*ny+map.xy*nx,jty=-map.xy*ny+map.yy*nx;
    normalDose+=Math.abs(ln);normalImpulse+=ln;tangentImpulse+=lt;reelDose+=Math.abs(reel);maxCapExcess=Math.max(maxCapExcess,dose-limit);
    minMobility=Math.min(minMobility,attachment.foot.mobility*(jtx*jtx+jty*jty));
    maxCross=Math.max(maxCross,Math.abs(attachment.foot.mobility*(jnx*jtx+jny*jty)));
    if(limit>0&&dose>=limit*(1-1e-9))capUntil=(k+1)*h;
    if(joint.slipping)slidingUntil=(k+1)*h;
    sum.x+=x;sum.y+=y;sum.qx+=q*x;sum.qy+=q*y;sum.ja+=ja;sum.jb+=jb;sum.qa+=q*ja;sum.qb+=q*jb;sum.dose+=dose;
    if(k%Math.max(1,Math.floor(n/1024))===0||k===n-1)trace.push({t:(k+1)*h,normal:ln,reel,tangent:lt,
      legs:joint.legs,slipping:joint.slipping,hold:joint.hold,point:w.graspPoint(joint),material:{...attachment.material},
      foot:{...attachment.foot.offset},mobility:attachment.foot.mobility,jacobian:map});
  }
  const result={a:v.particle(joint.a),b:v.particle(joint.b),point:w.graspPoint(joint),material:{...attachment.material},
    footOffset:{...attachment.foot.offset},legs:joint.legs,hold:joint.hold,slipping:joint.slipping??false,capUntil,slidingUntil,
    impulse:{x:sum.x,y:sum.y},moment:{x:sum.qx,y:sum.qy},angularImpulse:[sum.ja,sum.jb],angularMoment:[sum.qa,sum.qb],
    normalImpulse,tangentImpulse,dose:sum.dose,bodyWork:p.args[5].work.grasps-before.work,motorWork:p.args[5].supportMotorWork[v.ib]-before.motor,
    passiveWork:p.args[5].passiveGraspWork-before.passive};
  const accounting={workResidual:energy(result.a)+energy(result.b)-energy(input.a)-energy(input.b)-result.bodyWork,
    angularResidual:angular(result.a)+angular(result.b)-angular(input.a)-angular(input.b),normalDose,reelDose,maxCapExcess,
    capDoseExcess:sum.dose-input.capacity*H,minMobility,maxCross,broken:joint.broken??false,
    state:[joint.a.support.state,joint.b.support.state],contactWork:p.args[5].work.contacts-before.contacts,
    ground:p.args[5].groundImpulse.map((g:any,i:number)=>norm(g,before.ground[i]))};
  if(sha(v.bytes)!==v.checksum)throw Error('Serialized input mutated');
  return {id:v.id,packetId:c.packetId,packetSha256:v.checksum,input,transform:v.transform,n,result,accounting,trace,seconds:(performance.now()-started)/1000};
}
const prototype:any=World.prototype,feet=prototype.feet,results:any[]=[];
try {
  prototype.feet=prescribeBoundedSupport(feet);
  for(const c of mixedCases.filter(c=>process.argv.includes('--controls')?(c.reverse||!c.packetId.endsWith('3001-1'))
    :process.argv.includes('--all')||(!c.reverse&&c.packetId.endsWith('3001-1')))) {
    const coarse=run(c,coarseCount),fine=run(c,fineCount),x=coarse.result,y=fine.result,
      difference={position:Math.max(norm(x.a.pos,y.a.pos),norm(x.b.pos,y.b.pos)),velocity:Math.max(norm(x.a.vel,y.a.vel),norm(x.b.vel,y.b.vel)),
        facing:Math.max(Math.abs(x.a.facing-y.a.facing),Math.abs(x.b.facing-y.b.facing)),spin:Math.max(Math.abs(x.a.spin-y.a.spin),Math.abs(x.b.spin-y.b.spin)),
        material:norm(x.material,y.material),point:norm(x.point,y.point),foot:norm(x.footOffset,y.footOffset),legs:Math.abs(x.legs-y.legs),
        bodyWork:Math.abs(x.bodyWork-y.bodyWork),motorWork:Math.abs(x.motorWork-y.motorWork),passiveWork:Math.abs(x.passiveWork-y.passiveWork),
        impulse:norm(x.impulse,y.impulse),moment:norm(x.moment,y.moment),angularImpulse:Math.max(...x.angularImpulse.map((v:number,i:number)=>Math.abs(v-y.angularImpulse[i]))),
        angularMoment:Math.max(...x.angularMoment.map((v:number,i:number)=>Math.abs(v-y.angularMoment[i]))),hold:Math.abs(x.hold-y.hold)};
    const converged=Math.max(difference.position/5e-7,difference.velocity/2.5e-5,difference.facing/2.5e-6,difference.spin/2.5e-4,
      difference.material/5e-7,difference.point/5e-7,difference.foot/5e-7,difference.legs/1e-6,
      difference.bodyWork/.01,difference.motorWork/.01,difference.passiveWork/.01,difference.hold/5e-7)<=1/16&&x.slipping===y.slipping;
    const physical=[coarse,fine].every(v=>Math.abs(v.accounting.workResidual)<1e-7&&Math.abs(v.accounting.angularResidual)<1e-7
      &&v.accounting.normalDose>0&&v.accounting.reelDose===0&&!v.accounting.broken&&v.accounting.state.every((s:string)=>s==='up')
      &&v.accounting.ground.every((g:number)=>g===0)&&v.accounting.contactWork===0&&v.accounting.maxCapExcess<1e-9
      &&v.result.passiveWork<=1e-7);
    writeFileSync(`${root}/${fine.id}-${coarseCount}-${fineCount}.json`,JSON.stringify({coarse,fine,difference,converged,physical}));
    results.push({id:fine.id,packetId:fine.packetId,packetSha256:fine.packetSha256,input:fine.input,transform:fine.transform,
      reference:fine.result,accounting:fine.accounting,convergence:{coarse:coarseCount,fine:fineCount,difference,converged},physical,
      seconds:{coarse:coarse.seconds,fine:fine.seconds}});
    console.log(JSON.stringify({id:fine.id,converged,physical,difference,normalDose:fine.accounting.normalDose,reel:fine.accounting.reelDose,legs:fine.result.legs}));
  }
}finally{prototype.feet=feet;}
if(sourceVersion()!==source)throw Error('Runtime changed');
const manifest={source,commit,baseline:original.baseline,referenceCommit:'8e36cce80e138133acd6afc7aba0befc21d5a746',flags,
  node:process.version,collectorSha256:sha(readFileSync(import.meta.filename)),helperSha256:sha(readFileSync(new URL('./grip-mixed-fixtures.ts',import.meta.url))),
  boundaryHelperSha256:sha(readFileSync(new URL('./grip-bounded-fixtures.ts',import.meta.url))),
  scope:'One passive bounded lower grip with acquired changing leg share, declared curved material offset, normal/tangent opening velocity transform from the earlier mixed witness and its lower-opening/reverse/mirrored controls. Free ground, prescribed existing mobility, desired zero, pull zero. No kernel imported.',
  cases:results,failures:results.filter(v=>!v.convergence.converged||!v.physical).map(v=>v.id)};
writeFileSync(`${root}/reference-${process.argv.includes('--controls')?'controls-':''}${coarseCount}-${fineCount}.json`,JSON.stringify(manifest,null,2));
if(!manifest.failures.length&&process.argv.includes('--write-fixture'))writeFileSync('config/grip-mixed-reference.json',JSON.stringify(manifest,null,2)+'\n');
if(manifest.failures.length)process.exitCode=2;
