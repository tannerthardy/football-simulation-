/** Small declared fresh native set; copied unchanged into the 4ded source
 * archive for baseline collection. Only explicit patch/timing API settings.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { World } from '../../src/physics/world.js';
import { rep, type Cell } from '../../scripts/diag/tackle/panel.js';
import { sourceVersion } from '../../scripts/source-version.js';

const source = sourceVersion(), baseline = process.argv.includes('--baseline');
const root = process.argv.find(x => x.startsWith('--out='))?.slice(6) ?? 'out/grip-timing-followup/fresh';
const cells: Cell[] = [
  { angle: 0, speed: 3, cut: false, difficulty: 'ordinary' },
  { angle: 60, speed: 6, cut: false, difficulty: 'difficult' },
  { angle: 135, speed: 6, cut: false, difficulty: 'difficult' },
];
const inputs = cells.flatMap(cell => ([1,-1] as const).map(side => ({ cell, side, seed: 5107 })));
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const profile = JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const rows: any[] = [], oldStep = World.prototype.step;
mkdirSync(root,{recursive:true});
for (const input of inputs) for (const n of [12,96]) {
  const timing = baseline ? 'midpoint' : 'resolved';
  const stats: any = { limited: 0, intervals: 0, trials: 0, workResidual: 0, passiveWork: 0,
    armExcess: 0, supportExcess: 0, firstPositiveGrip: null, firstPositiveTorso: null, falls: [] };
  World.prototype.step = function(intents,dt) {
    const start = this.time, r = oldStep.call(this,intents,dt);
    if(r.gripTiming) { stats.limited+=r.gripTiming.limited; stats.intervals+=r.gripTiming.intervals; stats.trials+=r.gripTiming.trials; }
    stats.workResidual=Math.max(stats.workResidual,Math.abs(r.work.residual));
    stats.passiveWork=Math.max(stats.passiveWork,r.passiveGraspWork);
    for(let i=0;i<this.bodies.length;i++) {
      stats.armExcess=Math.max(stats.armExcess,r.armImpulse[i]-r.armImpulseLimit[i],r.armWork[i]-r.armWorkLimit[i]);
      stats.supportExcess=Math.max(stats.supportExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);
    }
    if(!stats.firstPositiveGrip) {
      const j=this.joints.find(j=>j.kind==='grasp' && (j.force??0)>1e-9);
      if(j) stats.firstPositiveGrip={ interval:[start,this.time], targetPosition:{...j.b.pos}, targetEnergy:j.b.energy };
    }
    if(!stats.firstPositiveTorso && r.contacts.some(c=>c.impulse>1e-9)) stats.firstPositiveTorso={interval:[start,this.time]};
    for(const i of r.falls) stats.falls.push({ i, since:this.bodies[i].support?.since });
    return r;
  };
  const start=performance.now(); let result;
  try { result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:n,gripTiming:timing}); }
  finally { World.prototype.step=oldStep; }
  const row={ ...input,n,timing,seconds:(performance.now()-start)/1000,result,stats };
  rows.push(row); console.log(JSON.stringify({cell:input.cell,side:input.side,n,timing,seconds:row.seconds,ending:result.ending,limited:stats.limited}));
}
if(baseline && source!=='8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c') throw Error('Wrong baseline archive');
if(!baseline) {
  const b=JSON.parse(readFileSync(`${root}/baseline.json`,'utf8'));
  if(sha(b.inputs)!==sha(inputs)||sha(b.flags)!==sha(flags)) throw Error('Unmatched fresh inputs');
}
if(sourceVersion()!==source) throw Error('Source changed');
writeFileSync(`${root}/${baseline?'baseline':'candidate'}.json`,JSON.stringify({source,baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',node:process.version,flags,inputs,inputManifest:sha(inputs),rows},null,2));
