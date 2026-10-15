/** One unloaded-body check against P040's first saved cutoff. Not a reachability oracle. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {savedNativePlay} from './saved-native-play.mjs';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {goTo} from '../../src/sim/behaviors/common.ts';

const [trace='out/pass-set-opening/baseline/trace.json.gz',out='out/pass-set-opening/first-request-probe.json']=process.argv.slice(2);
const row=JSON.parse(gunzipSync(readFileSync(trace))).rows.find(r=>r.index===39&&r.arm==='baseline');
assert(row?.nativeFilmParity&&row.nativeEventParity);
const d=row.decisions.find(d=>d.slot==='LT'&&d.cutoff);
const {sim}=savedNativePlay('spread-air',39);
sim.tick();
const b=sim.slot('LT');
assert.deepEqual(b.pos,d.before.pos);
assert.deepEqual(b.vel,d.before.vel);
// JSON represents the initial support's -Infinity timestamp as null. Compare
// serialized evidence; never hydrate that null into the native physical body.
assert.deepEqual(JSON.parse(JSON.stringify(b.body.support)),d.before.support);
const before=structuredClone(b.body),rng=structuredClone(sim.rng),rows=[];
for(const [label,command] of [
 ['actual',d.raw],
 ['direct-through',goTo(b,d.cutoff.inside,{speed:1,through:b.profile.vmax,
   facing:d.raw.facing,cutSkill:d.raw.cutSkill})],
]){
 const path=previewFreeMovement(b.body,command,sim.t,Math.round(d.cutoff.tau/.05),sim.world.handContact);
 const end=path.at(-1);
 const distance=p=>Math.hypot(end.pos.x-p.x,end.pos.y-p.y);
 rows.push({label,command,path,remainingToInsidePoint:distance(d.cutoff.inside),
   distanceToForecastRusher:distance(d.cutoff.rusherPoint),punchingGate:d.cutoff.contact+.15});
}
assert.deepEqual(b.body,before);
assert.deepEqual(structuredClone(sim.rng),rng);
const result={qualification:'One unloaded body; held command to the old forecast. Does not predict the real defender, contacts, or future controller decisions.',
 t:d.t,deadline:d.cutoff.tau,rows};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(({path,...r})=>r)));
