/** One diagnostic only: restore the old option decision's draw at its exact
 * saved actor/tick. Its result cannot choose the new branch. No runtime flag,
 * capability or production random-consumption workaround is installed.
 * INPUTS BASELINE-SUMMARY OUT
 */
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {RouteRunner} from '../../src/sim/behaviors/receiver.ts';
const [input,baseline,out]=process.argv.slice(2),packet=JSON.parse(readFileSync(input,'utf8'));
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const row=packet.rows.find(r=>r.id==='initial-disguise'),old=JSON.parse(readFileSync(baseline,'utf8'));
assert.equal(old.provenance.sourceSha256,packet.provenance.sourceSha256);
const reference=old.rows.find(r=>r.id===row.id);
assert.equal(reference.setupSha256,createHash('sha256').update(JSON.stringify(row.setup)).digest('hex'));
assert.equal(digest(reference.film.path),reference.film.sha256);
const film=JSON.parse(gunzipSync(readFileSync(reference.film.path))),schedule=[];
for(const step of film.steps)for(const after of step.routesAfter){
 const before=step.routes.find(r=>r.i===after.i);
 if(after.route==='stick'&&before&&!before.converted&&after.converted)schedule.push({t:step.t,i:after.i});
}
assert.equal(schedule.length,1,'This bounded witness has exactly one legacy Stick decision draw');
mkdirSync(out,{recursive:true});const temporary=join(out,'single-input.json');
writeFileSync(temporary,JSON.stringify({...packet,rows:[row]},null,2)+'\n');
const update=RouteRunner.prototype.update,consumed=[];
RouteRunner.prototype.update=function(a,sim){
 const point=schedule.find(s=>s.i===a.idx&&Math.abs(s.t-sim.t)<1e-9);
 if(point){const before=structuredClone(sim.rng),unused=sim.rng.chance(.15*(1-a.r('awareness')));
  consumed.push({...point,actor:a.player.id,before,unused,after:structuredClone(sim.rng)});}
 return update.call(this,a,sim);
};
const args=process.argv.slice();
try{
 process.argv=[...args.slice(0,2),'run',temporary,out,'initial'];
 await import('./option-agreement-panel.mjs');
}finally{process.argv=args;RouteRunner.prototype.update=update;}
assert.equal(consumed.length,1);
writeFileSync(join(out,'draw-control.json'),JSON.stringify({schema:'option-legacy-draw-causal-control-v1',
 collectorSha256:digest(import.meta.filename),baseline:{path:baseline,sha256:digest(baseline)},
 originalInputs:{path:input,sha256:digest(input)},schedule,consumed,
 question:'Does the disguised-play touchdown persist when the original option draw is retained at its exact actor/tick?',
 limits:'Diagnostic execution alignment only. The unused legacy draw cannot alter the observed route choice. All other natural decisions remain live; later changed football can still change random-consumption order.'},null,2)+'\n');
