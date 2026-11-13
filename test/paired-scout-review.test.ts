import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serialize } from 'node:v8';
import { afterEach, expect, it } from 'vitest';
import { pairedQueue } from '../scripts/paired-scout-review.js';
import { hash } from '../scripts/film-scout-review.js';
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(d => rmSync(d,{recursive:true,force:true})));
function fixture(change: (files: Record<string, Buffer>) => void = () => {}) {
  const d=mkdtempSync(join(tmpdir(),'paired-review-')); dirs.push(d);
  const id='G1-P006', actor={team:'O',slot:'Y',playerId:'TE2',index:0};
  const identity={commit:'source',engineSha256:'engine',settings:{EXAMPLE:true},node:'v22.23.3',lockfileSha256:'lock'};
  const event={id,play:6,detector:'stuck',t0:2,t1:2.05,players:['Y'],text:'concern',severity:1};
  const setup=Buffer.from('saved constructor'), setupSha256=hash(setup);
  const saved={format:'constructor-play-v1',identity,setup,setupSha256,game:{playId:id},original:{initial:{actors:[actor]}}};
  const step=(stepStart:number)=>({actor,stepStart,endpointTime:stepStart+.05,decision:{evaluated:true,owner:{controller:'RunBlocker'},raw:{vel:{x:0,y:0}}},
    rewrites:[],final:{vel:{x:0,y:0}},start:{body:{support:{state:'up'}},engagement:null},endpoint:{body:{}}});
  const trace={meta:{node:identity.node,engineSha256:'engine',settings:identity.settings,input:{originalPlay:id}},
    verification:{originalVsPlain:null,originalVsTrace:null,traceVsPlain:null,setupSha256,originalIdentity:identity},steps:[step(2),step(2.05)]};
  const json=(x:unknown)=>Buffer.from(JSON.stringify(x));
  const files:Record<string,Buffer>={
    'index.json':json({identity,prefixSteps:24,entries:[{id,setupSha256,actors:[actor],events:[event]}]}),
    'events.json':json({identity,seed:7,events:[event],counts:{'stuck.events':1}}),
    [`${id}/play.bin`]:serialize(saved),[`${id}/trace-0.json`]:json(trace),
    [`${id}/original.html`]:Buffer.from(`const REPLAY = ${JSON.stringify({meta:{sourceSha256:'engine'},plays:[{id,roster:[['O','Y']],frames:{t:[0,3]}}]})};\n`)};
  change(files);
  const manifest:Record<string,string>={};
  for(const [name,bytes] of Object.entries(files)){const path=join(d,name);requireDirectory(path);writeFileSync(path,bytes);manifest[name]=hash(bytes);}
  writeFileSync(join(d,'manifest.json'),JSON.stringify(manifest));return d;
}
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
function requireDirectory(path:string){mkdirSync(dirname(path),{recursive:true});}
function alter(files:Record<string,Buffer>,fn:(trace:any)=>void){const path='G1-P006/trace-0.json';const t=JSON.parse(files[path].toString());fn(t);files[path]=Buffer.from(JSON.stringify(t));}
it('preserves exact producer selection, actor identity and historical missing status',()=>{
 const q=pairedQueue(fixture());expect(q.episodes).toHaveLength(1);expect(q.episodes[0].actor.playerId).toBe('TE2');
 expect(q.recipe.source).toContain('Historical18');expect(q.episodes[0].review).toBeNull();
 expect(q.episodes[0].trace?.command).toContain('G1-P006/play.bin');
});
it('rejects checksum changes',()=>{const d=fixture();writeFileSync(join(d,'G1-P006/play.bin'),'changed');expect(()=>pairedQueue(d)).toThrow('checksum');});
it.each(['input','actor','gap','restore'])('rejects internally inconsistent %s even with recomputed manifest',(kind)=>{
 const d=fixture(files=>alter(files,t=>{if(kind==='input')t.verification.setupSha256='other';if(kind==='actor')t.steps[0].actor.index=1;
 if(kind==='gap')t.steps.pop();if(kind==='restore')t.verification.originalVsTrace={path:'different'};}));
 expect(()=>pairedQueue(d)).toThrow();
});
