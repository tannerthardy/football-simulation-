/** Export existing native viewer from saved executions. Zero new plays. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {packReplayPlay} from '../replay-data.ts';
import {compactReplayPlays} from '../replay-telemetry-packing.ts';
const dir=process.argv[2]??'out/yac-angle',read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 inputs=read(`${dir}/native-inputs.json`).clips,rows=[];
for(const [label,file,ids] of [
 ['Accepted develop','native-baseline.json.gz',['power-zone/P46','power-zone/P9']],
 ['PR58 recognition only','read58-native.json.gz',['power-zone/P46','power-zone/P9']],
 ['Diagnostic traffic-stop bypass','native-no-fs-stop.json.gz',['power-zone/P46']],
 ['Rejected interception probe','native-near-intercept.json.gz',['power-zone/P9']],
]){
 const packet=read(`${dir}/${file}`);
 for(const c of packet.clips.filter(c=>ids.includes(c.id))){
  const setup=inputs.find(f=>f.id===c.id).setup,players=Object.values({...setup.offense,...setup.defense}),byId=new Map(players.map(p=>[p.id,p])),
   roster=c.players.map(a=>{const p=byId.get(a.id);return {team:a.idx<11?'O':'D',slot:a.slot,name:`${p.firstName} ${p.lastName} (${p.id})`,
    jersey:p.jersey,pos:p.position,weightLb:p.measurables.weightLb};}),r=c.result;
  const telemetry={...c.telemetry,level:'standard',frames:c.telemetry.frames.map(f=>({t:f.t,
   agents:f.agents.map(({kind,job,target,intent,runFit,belief})=>({kind,job,target,intent,runFit,belief})),links:f.links,tackle:f.tackle})),
   unavailable:['Full body/load and consumed pictures remain in saved native traces. Viewer is a lighter export.']};
  rows.push(packReplayPlay({index:rows.length,quarter:1,clock:0,offense:'O',down:setup.down,distance:setup.firstDownX-setup.los,
   yardline:setup.los-10,call:`${label} · ${c.id}`,defense:setup.defCall.label,
   text:`Saved same-input execution; ${label}; actual receiver ${r.stats.receiver}; YAC ${r.stats.yac.toFixed(2)}; source ${packet.provenance.sourceSha256.slice(0,12)}`,
   kind:r.kind,yards:r.yards,score:{home:0,away:0},stats:r.stats,outcome:r.outcome,
   plan:{concept:setup.offCall.pass.id,formation:setup.offCall.formation.id,coverage:setup.defCall.coverage.id,front:setup.defCall.front.id},
   replay:{frames:c.frames,players:roster,events:r.events,los:setup.los,firstDownX:setup.firstDownX,flip:false,telemetry}},0));
 }
}
const data={meta:{title:'YAC diagnosis · exact native controls',seed:0,final:{home:0,away:0},quarters:[],telemetryLevel:'standard',
 home:{name:'Offense',abbr:'O',color:'#1d4f91',text:'#ffffff'},away:{name:'Defense',abbr:'D',color:'#a3302a',text:'#ffffff'}},
 games:[{seed:0,final:{home:0,away:0},quarters:[]}],plays:compactReplayPlays(rows),catalog:{coverage:{},front:{},formation:{}}};
const template=readFileSync('viewer/replay.template.html','utf8'),marker='/*__REPLAY_DATA__*/null';assert.ok(template.includes(marker));
writeFileSync(`${dir}/native-film.html`,'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'+
 template.replace(marker,()=>JSON.stringify(data).replace(/<\//g,'<\\/'))+'\n</body></html>');
console.log(JSON.stringify({plays:rows.length,newSimulations:0,out:`${dir}/native-film.html`}));
