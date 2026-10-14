/** Static adapter: existing sim-export commonPlay + unchanged metrics.py.
 * OUT native-summary...; zero simulation/decision/observation calls.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {commonPlay} from '../mechanics/sim-export.ts';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const [out,...inputs]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const raw=[],normalized=[],sources=[];
for(const input of inputs){
 const packet=JSON.parse(readFileSync(input,'utf8'));sources.push({path:input,sha256:hash(input),provenance:packet.provenance});
 for(const r of packet.rows){
  if(r.gameDisposition.nullified)continue;
  const f=JSON.parse(gunzipSync(readFileSync(r.film.path)));
  const log={kind:'pass',yards:r.result.yards,plan:{concept:r.effectiveConcept,coverage:r.effectiveCoverage},
   replay:{players:f.players.map(a=>({team:a.team,pos:a.position})),
    // Adapter uses only snap ball-y. The observer did not record a ball path;
    // retain unknown x/z instead of inventing ball motion.
    frames:f.frames.map((s,i)=>i===0?{...s,ball:[null,Math.round(r.setup.ballY*10)/10,null]}:s),
    events:r.result.events,los:r.setup.los}};
  const original=commonPlay(log,r.id);if(!original)throw Error(`No common play ${r.id}`);raw.push(original);
  // NFL pass_forward includes thrown-away passes. The legacy adapter looks
  // only for sim 'throw', so correct that label on a copy, retaining both.
  const events=r.result.events.map(e=>e.type==='throwaway'?{...e,type:'throw'}:e);
  normalized.push(commonPlay({...log,replay:{...log.replay,events}},r.id));
 }
}
for(const [name,plays] of [['legacy',raw],['release-normalized',normalized]])
 writeFileSync(join(out,`${name}.jsonl.gz`),gzipSync(plays.map(p=>JSON.stringify(p)).join('\n')+'\n'));
writeFileSync(join(out,'receipt.json'),JSON.stringify({collectorSha256:hash(import.meta.filename),
 commonAdapterSha256:hash('scripts/mechanics/sim-export.ts'),metricSha256:hash('scripts/mechanics/metrics.py'),
 sources,count:raw.length,normalization:'Rename only sim throwaway to throw on an event copy for the existing common adapter; retain exact legacy output too.',
 limits:'Existing shared operator includes outcome frame and scans no-throw dropbacks to min(end,4), including QB running after scramble. Separate exact pocket-only measurements stop at the scramble event.'})+'\n');
console.log(JSON.stringify({out,n:raw.length,newSimulations:0}));
