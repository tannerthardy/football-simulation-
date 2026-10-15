import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{runApproachChoices,chooseRunApproach}from'../../src/sim/run-approach.ts';
const n=JSON.parse(gunzipSync(readFileSync(process.argv[2]))),rows=[];
for(const r of n.rows){const times=r.role==='failing-entry'?[1.95]:[2.05];
 for(const t of times){const f=r.frames.find(f=>Math.abs(f.t-t)<1e-8);if(!f)continue;
 const peers=r.cues.filter(c=>c.t===t&&c.kind==='owned'&&c.picture.source!=='unavailable').map(c=>({id:c.target,picture:c.picture,radius:r.input.actors[c.target].profile.radius,brake:r.input.actors[c.target].profile.brake}));
 const result=chooseRunApproach(f.before[6],f.raw[6],peers,t,'center');rows.push({role:r.role,t,raw:f.raw[6],chosen:result.kind,choices:result.choices.map(c=>({kind:c.kind,minimumGap:c.minimumGap,up:c.up,worst:[...c.gaps].sort((a,b)=>a.gap-b.gap)[0],end:c.path.at(-1)}))});}}
writeFileSync(process.argv[3],JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
